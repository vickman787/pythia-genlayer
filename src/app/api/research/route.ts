import { NextRequest, NextResponse } from 'next/server'
import { runResearchAgent } from '@/lib/ai/research-agent'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { verifyOnChainPayment } from '@/lib/payments/evm-treasury'
import { z } from 'zod'

const researchRequestSchema = z.object({
  query: z.string().min(5),
  maxBudget: z.number().min(0).max(100),
  txHash: z.string().optional(),
  walletAddress: z.string().optional(),
  challengeId: z.string().optional(),
  userToken: z.string().optional(),
})

// Polyfill BigInt serialization globally for serverless route
if (typeof (BigInt.prototype as any).toJSON === 'undefined') {
  ;(BigInt.prototype as any).toJSON = function () {
    return this.toString()
  }
}

export async function GET() {
  const treasuryAddress =
    process.env.NEXT_PUBLIC_AGENT_TREASURY_ADDRESS ||
    process.env.AGENT_TREASURY_ADDRESS ||
    ''
  return NextResponse.json({ treasuryAddress })
}

export async function POST(request: NextRequest) {
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please connect your wallet first.' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = researchRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { query, maxBudget, txHash, walletAddress, challengeId } = parsed.data

    let funding
    try {
      const treasuryAddress = process.env.AGENT_TREASURY_ADDRESS || ''
      const paymentTx = txHash || (challengeId ? `tx_${challengeId}` : `mock_tx_${Date.now()}`)
      funding = await verifyOnChainPayment(paymentTx, maxBudget, treasuryAddress)
    } catch (verifyError: any) {
      console.error('Funding verification failed:', verifyError)
      return NextResponse.json({ error: `Payment verification failed: ${verifyError.message}` }, { status: 402 })
    }

    const supabase = createAdminClient()

    let refundAddress = walletAddress || funding.payerAddress
    if (!refundAddress || refundAddress === '0x0000000000000000000000000000000000000000') {
      const { data: profile } = await userClient
        .from('profiles')
        .select('wallet_address')
        .eq('id', user.id)
        .single()
      refundAddress = profile?.wallet_address || undefined
    }

    const { data: sessionId, error: sessionError } = await supabase.rpc('create_funded_research_session', {
      p_user_id: user.id,
      p_query: query,
      p_budget: maxBudget,
      p_transaction_id: funding.transactionId,
      p_amount: maxBudget,
    })

    if (sessionError || !sessionId) {
      if (sessionError?.code === '23505') return NextResponse.json({ error: 'This payment has already been used to fund a research session' }, { status: 409 })
      console.error("Session creation error:", sessionError)
      return NextResponse.json({ error: 'Failed to create research session', details: sessionError?.message || "Unknown DB Error" }, { status: 500 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        const pushUpdate = (type: string, payload: any) => {
          try {
            const serialized = JSON.stringify({ type, payload }, (_key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            )
            controller.enqueue(encoder.encode(serialized + '\n'))
          } catch (e: any) {
            console.error('Failed to serialize stream chunk:', e)
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', payload: String(payload) }) + '\n'))
          }
        }

        try {
          const result = await runResearchAgent(
            sessionId,
            query,
            maxBudget,
            refundAddress,
            (msg) => pushUpdate('progress', msg),
            request.headers.get('cookie') || undefined
          )

          await supabase
            .from('research_sessions')
            .update({ status: 'completed', result: result })
            .eq('id', sessionId)

          pushUpdate('done', { result, sessionId })
          controller.close()
        } catch (error: any) {
          await supabase.from('research_sessions').update({ status: 'failed', result: { error: error.message } }).eq('id', sessionId)
          pushUpdate('error', error.message)
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Research API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
