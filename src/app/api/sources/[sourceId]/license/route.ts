import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import crypto from 'crypto'

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value || undefined
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params
    const supabase = await createClient()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('sources')
      .select('price_usdc, creator_id, creator_profiles(user_id, profiles(wallet_address))')
      .eq('id', sourceId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    const source = data as any
    const creatorProfile = firstRelation(source.creator_profiles)
    const creatorUserProfile = firstRelation(creatorProfile?.profiles)
    const walletAddress = creatorUserProfile?.wallet_address

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Creator has not configured a wallet address' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        message: 'Payment Required',
        amount: source.price_usdc,
        currency: 'USDC',
        recipient: walletAddress,
        network: 'arc-testnet',
        paymentEndpoint: `/api/sources/${sourceId}/license`
      },
      { status: 402 }
    )
  } catch (error: any) {
    console.error('License GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()

    const { authorizationId, amount } = body

    if (!authorizationId || typeof amount !== 'number' || !Number.isFinite(amount)) {
      return NextResponse.json({ error: 'Missing payment authorization payload' }, { status: 400 })
    }

    const { settleCitationLicense } = await import('@/lib/payments/settlement')
    const receipt = await settleCitationLicense({
      sourceId,
      authorizationId,
      amount,
      userId: user.id,
    })

    return NextResponse.json({ success: true, receipt })
  } catch (error: any) {
    console.error('License POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
