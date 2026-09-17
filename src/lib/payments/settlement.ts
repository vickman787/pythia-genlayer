import { createAdminClient } from '@/utils/supabase/admin'
import { executeTreasuryPayout } from '@/lib/payments/evm-treasury'
import crypto from 'crypto'

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value || undefined
}

export interface SettleLicenseParams {
  sourceId: string
  authorizationId: string
  amount: number
  userId?: string
}

export async function settleCitationLicense({
  sourceId,
  authorizationId,
  amount,
  userId,
}: SettleLicenseParams) {
  const admin = createAdminClient()

  const { data: source, error: sourceError } = await admin
    .from('sources')
    .select('price_usdc, creator_id, content_hash, creator_profiles(profiles(wallet_address))')
    .eq('id', sourceId)
    .single()

  if (sourceError || !source) {
    throw new Error('Source not found')
  }

  if (amount < parseFloat(source.price_usdc)) {
    throw new Error('Insufficient payment amount')
  }

  const creatorProfile = firstRelation((source as any).creator_profiles)
  const creatorUserProfile = firstRelation(creatorProfile?.profiles)
  const recipientWallet = creatorUserProfile?.wallet_address
  if (!recipientWallet) {
    throw new Error('Creator wallet not found')
  }

  const { data: paymentAuth, error: authError } = await admin
    .from('payment_authorizations')
    .select('id, status, source_id, amount_usdc, recipient_address, research_sessions!inner(user_id, consensus_receipt)')
    .eq('authorization_id', authorizationId)
    .single()

  const sessionOwner = (paymentAuth as any)?.research_sessions?.user_id
  const consensusReceipt = (paymentAuth as any)?.research_sessions?.consensus_receipt
  const evidence = Array.isArray(consensusReceipt?.sourceEvidence)
    ? consensusReceipt.sourceEvidence.find((item: any) => item.sourceId === sourceId)
    : undefined
  const citedByConsensus = consensusReceipt?.citationsUsed?.includes(sourceId)
  const isOwnerValid =
    !evidence?.ownerId ||
    evidence.ownerId === (source as any).creator_id ||
    evidence.ownerId === '00000000-0000-0000-0000-000000000000'
  const hasValidEvidence = Boolean(
    evidence &&
      Array.isArray(evidence.evidenceHashes) &&
      evidence.evidenceHashes.length > 0 &&
      evidence.registeredContentHash
  )

  if (
    authError ||
    !paymentAuth ||
    (userId && sessionOwner && sessionOwner !== userId) ||
    paymentAuth.source_id !== sourceId ||
    paymentAuth.recipient_address?.toLowerCase() !== recipientWallet.toLowerCase() ||
    parseFloat(paymentAuth.amount_usdc) !== parseFloat(source.price_usdc) ||
    amount !== parseFloat(paymentAuth.amount_usdc) ||
    !consensusReceipt ||
    !citedByConsensus ||
    !isOwnerValid ||
    !hasValidEvidence
  ) {
    throw new Error('Invalid or unverified payment authorization')
  }

  if (paymentAuth.status === 'settled') {
    const { data: existing } = await admin
      .from('payment_settlements')
      .select('gateway_settlement_id')
      .eq('authorization_id', authorizationId)
      .single()
    if (existing) {
      return { gatewaySettlementId: existing.gateway_settlement_id }
    }
    throw new Error('Payment settlement is incomplete')
  }

  const { data: claimed } = await admin
    .from('payment_authorizations')
    .update({ status: 'processing' })
    .eq('authorization_id', authorizationId)
    .eq('status', 'pending')
    .select('authorization_id')
    .single()
  if (!claimed) throw new Error('Payment authorization is already being settled')

  let gatewaySettlementId: string
  try {
    const platformFeePercent = 0.2
    const price = parseFloat(source.price_usdc)
    const creatorPayout = (price * (1 - platformFeePercent)).toFixed(6)
    gatewaySettlementId = await executeTreasuryPayout(recipientWallet, creatorPayout)
  } catch (apiError: any) {
    await admin
      .from('payment_authorizations')
      .update({ status: 'pending' })
      .eq('authorization_id', authorizationId)
      .eq('status', 'processing')
    throw new Error(apiError.message || 'Payment execution failed at Treasury')
  }

  const { error: settlementError } = await admin.from('payment_settlements').insert({
    authorization_id: authorizationId,
    gateway_settlement_id: gatewaySettlementId,
    status: 'settled',
  })

  if (settlementError) {
    await admin
      .from('payment_authorizations')
      .update({ status: 'pending' })
      .eq('authorization_id', authorizationId)
      .eq('status', 'processing')
    throw new Error('Payment already settled or failed to record settlement')
  }

  await admin
    .from('payment_authorizations')
    .update({ status: 'settled' })
    .eq('authorization_id', authorizationId)

  const receiptPayload = `${sourceId}:${authorizationId}:${Date.now()}`
  const signingSecret = process.env.RECEIPT_SIGNING_SECRET
  if (!signingSecret) throw new Error('RECEIPT_SIGNING_SECRET is not configured')
  const receiptSignature = crypto
    .createHmac('sha256', signingSecret)
    .update(receiptPayload)
    .digest('hex')

  return {
    payload: receiptPayload,
    signature: receiptSignature,
    gatewaySettlementId,
  }
}
