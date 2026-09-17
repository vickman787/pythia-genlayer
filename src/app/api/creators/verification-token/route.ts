import { NextRequest, NextResponse } from 'next/server'
import { isAddress, getAddress } from 'viem'
import { createClient } from '@/utils/supabase/server'
import { generateCreatorVerificationToken } from '@/lib/registration/verification'

export async function POST(request: NextRequest) {
  try {
    let walletAddress: string | null = null

    try {
      const body = await request.json()
      if (body?.walletAddress && isAddress(body.walletAddress)) {
        walletAddress = getAddress(body.walletAddress).toLowerCase()
      }
    } catch {
      // Body parse optional
    }

    if (!walletAddress) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('id', user.id)
          .single()
        if (profile?.wallet_address && isAddress(profile.wallet_address)) {
          walletAddress = getAddress(profile.wallet_address).toLowerCase()
        }
      }
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Valid wallet address is required to generate verification token.' },
        { status: 400 }
      )
    }

    const token = generateCreatorVerificationToken(walletAddress)

    return NextResponse.json({
      success: true,
      token,
      snippets: {
        metaTag: `<meta name="pythia-verification" content="${token}" />`,
        htmlComment: `<!-- pythia-verification: ${token} -->`,
        wellKnownPath: `/.well-known/pythia.txt`,
        wellKnownContent: token,
      },
    })
  } catch (err: any) {
    console.error('Failed to generate verification token:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
