import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isAddress, getAddress } from 'viem'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Valid EVM wallet address is required' }, { status: 400 })
    }

    const normalizedAddress = getAddress(address).toLowerCase()
    const supabase = await createClient()

    const secretSalt = process.env.RECEIPT_SIGNING_SECRET || 'pythia-auth-secret'
    const password = crypto.createHash('sha256').update(normalizedAddress + secretSalt).digest('hex')

    const email = `${normalizedAddress}@pythia.local`
    const legacyEmail = `${normalizedAddress}@citeflow-genlayer.local`

    let userId: string | null = null

    // 1. Try signing in with the primary pythia email
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // 2. If not found, try the legacy email (for users registered prior to rebrand)
    if (signInError) {
      const legacySignIn = await supabase.auth.signInWithPassword({
        email: legacyEmail,
        password,
      })
      if (!legacySignIn.error && legacySignIn.data.user) {
        signInData = legacySignIn.data
        signInError = null
      }
    }

    // 3. If account does not exist, sign up
    if (signInError) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        console.error('Supabase Auth SignUp Error:', signUpError)
        return NextResponse.json({ error: 'Failed to create internal user session' }, { status: 500 })
      }
      userId = signUpData.user?.id || null
    } else {
      userId = signInData.user?.id || null
    }

    // 4. Update profiles and ensure creator_profile exists
    if (userId) {
      const admin = createAdminClient()

      await admin
        .from('profiles')
        .update({ wallet_address: normalizedAddress })
        .eq('id', userId)

      const { data: existingCreator } = await admin
        .from('creator_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!existingCreator) {
        await admin
          .from('creator_profiles')
          .insert({ user_id: userId })
      }
    }

    return NextResponse.json({
      success: true,
      walletAddress: normalizedAddress,
    })
  } catch (error: any) {
    console.error('EVM Wallet Login Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to authenticate wallet' }, { status: 500 })
  }
}
