import { createAdminClient } from '@/utils/supabase/admin'
import crypto from 'crypto'
import { authorizePayment } from '../payments/treasury'
import { executeTreasuryRefund } from '../payments/evm-treasury'
import { embedQuery } from './embeddings'
import { runGenLayerResearch, type GenLayerSourceInput } from '../genlayer/contract'
import { safeFetch } from '../net/safe-fetch'
import {
  CANONICALIZATION_VERSION,
  EVIDENCE_DELIMITER,
  canonicalizeHtml,
  chunkCanonicalText,
  buildEvidence,
  sha256,
} from '../registration/canonical'

// Per-source context budget handed to the GenLayer contract (in ~1000-char chunks).
// Chunks are ranked by embedding similarity to the query; chunks without
// embeddings (older sources) fall back to document order.
//
// Kept small (was 8) after seeing GenVM validators return an empty LLM
// response — gl.nondet.exec_prompt() came back as "" rather than an answer,
// which json.loads() then threw on inside the contract. The validator
// config logs a 7s first-token timeout; a large, noisy prompt (naive HTML
// extraction pulls in a lot of navigation chrome alongside real content) is
// a plausible way to blow past that on a shared/loaded testnet.
const TOP_CHUNKS_PER_SOURCE = 3

// How many candidate sources (by top-chunk similarity) get sent into the
// single GenLayer contract call. Keeping this bounded matters: every source
// included adds prompt size to a call that goes through multi-validator
// consensus, not a plain API request.
const MAX_CANDIDATE_SOURCES = 2

// How many nearest chunks Postgres considers before they are grouped back into
// per-source candidates. This only affects recall; it is not the number of
// chunks sent to GenLayer.
const CHUNK_POOL = 40

interface RetrievedChunkRow {
  source_id: string
  title: string | null
  url: string
  price_usdc: string
  content_hash: string | null
  creator_id: string | null
  canonicalization_version: string | null
  wallet_address: string | null
  chunk_text: string
  score: number | null
}

interface Candidate {
  id: string
  title: string | null
  url: string
  price_usdc: string
  ownerId: string | null
  registeredContentHash: string | null
  evidenceHashes: string[]
  canonicalization: string
  recipientAddress: string | undefined
  content: string
  bestScore: number
}

function hashEvidence(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value || undefined
}

function selectRelevantChunks(
  allChunks: string[],
  query: string,
  targetCount: number,
  candidateContent?: string
): string[] {
  if (allChunks.length <= targetCount) return allChunks

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const scored = allChunks.map((chunk, index) => {
    const text = chunk.toLowerCase()
    let score = 0
    for (const word of queryWords) {
      if (text.includes(word)) score += 2
    }
    // Prioritize chunks that overlap with candidate chunks identified by vector retrieval
    if (candidateContent && candidateContent.includes(chunk.slice(0, 60))) {
      score += 10
    }
    return { chunk, score, index }
  })

  scored.sort((a, b) => b.score - a.score || a.index - b.index)
  const chosen = scored.slice(0, targetCount)
  // Maintain document order so the validators read flowing context
  chosen.sort((a, b) => a.index - b.index)
  return chosen.map(item => item.chunk)
}

// Postgres returns one row per matched chunk, ordered best source first. Fold
// those rows back into the per-source candidate shape the pipeline expects.
function groupChunkRows(rows: RetrievedChunkRow[]): Candidate[] {
  const grouped = new Map<string, Candidate & { chunks: string[] }>()

  for (const row of rows) {
    const existing = grouped.get(row.source_id)
    if (existing) {
      if (existing.chunks.length < TOP_CHUNKS_PER_SOURCE) existing.chunks.push(row.chunk_text)
      continue
    }
    grouped.set(row.source_id, {
      id: row.source_id,
      title: row.title,
      url: row.url,
      price_usdc: row.price_usdc,
      ownerId: row.creator_id,
      registeredContentHash: row.content_hash,
      evidenceHashes: [],
      canonicalization: row.canonicalization_version || CANONICALIZATION_VERSION,
      recipientAddress: row.wallet_address ?? undefined,
      content: '',
      bestScore: row.score ?? 0,
      chunks: [row.chunk_text],
    })
  }

  return [...grouped.values()].map(candidate => ({
    ...candidate,
    content: candidate.chunks.join(EVIDENCE_DELIMITER),
    evidenceHashes: candidate.chunks.map(hashEvidence),
  }))
}

async function retrieveBySimilarity(
  supabase: ReturnType<typeof createAdminClient>,
  queryEmbedding: number[],
  budget: number,
): Promise<Candidate[]> {
  const { data, error } = await supabase.rpc('match_research_sources', {
    p_query_embedding: `[${queryEmbedding.join(',')}]`,
    p_max_price: budget,
    p_chunk_pool: CHUNK_POOL,
    p_chunks_per_source: TOP_CHUNKS_PER_SOURCE,
    p_max_sources: MAX_CANDIDATE_SOURCES,
  })
  if (error) throw new Error(`Failed to retrieve sources: ${error.message}`)

  return groupChunkRows((data || []) as RetrievedChunkRow[])
    .filter(candidate => candidate.content.length > 0)
    .slice(0, MAX_CANDIDATE_SOURCES)
}

// Fallback retrieval when embeddings are unavailable or yield 0 matches.
// Evaluates text and title relevance so research queries always find matching sources.
async function retrieveByTextRelevance(
  supabase: ReturnType<typeof createAdminClient>,
  query: string,
  budget: number,
): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('sources')
    .select('id, url, title, price_usdc, content_hash, creator_id, canonicalization_version, creator_profiles(profiles(wallet_address)), source_chunks(chunk_text)')
    .eq('status', 'extracted')
    .lte('price_usdc', budget)
    .order('created_at', { ascending: false })

  if (error || !data || data.length === 0) return []

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)

  const scoredSources = data.map((source: any) => {
    const allChunks = ((source.source_chunks || []) as { chunk_text: string }[])
    const titleText = (source.title || '').toLowerCase()
    
    const scoredChunks = allChunks.map(c => {
      const text = c.chunk_text.toLowerCase()
      let chunkScore = 0
      for (const word of queryWords) {
        if (titleText.includes(word)) chunkScore += 3
        if (text.includes(word)) chunkScore += 1
      }
      return { text: c.chunk_text, score: chunkScore }
    })

    scoredChunks.sort((a, b) => b.score - a.score)
    const topChunks = (scoredChunks.length > 0 ? scoredChunks : allChunks.map(c => ({ text: c.chunk_text, score: 0 })))
      .slice(0, TOP_CHUNKS_PER_SOURCE)
      .map(c => c.text)

    const sourceBestScore = scoredChunks[0]?.score || 0
    const creatorProfile = firstRelation(source.creator_profiles) as { profiles?: unknown } | undefined
    const userProfile = firstRelation(creatorProfile?.profiles) as { wallet_address?: string } | undefined

    return {
      id: source.id,
      title: source.title,
      url: source.url,
      price_usdc: source.price_usdc,
      ownerId: source.creator_id,
      registeredContentHash: source.content_hash,
      evidenceHashes: topChunks.map(hashEvidence),
      canonicalization: source.canonicalization_version || CANONICALIZATION_VERSION,
      recipientAddress: userProfile?.wallet_address,
      content: topChunks.join(EVIDENCE_DELIMITER),
      bestScore: sourceBestScore,
    }
  })

  const valid = scoredSources.filter((s: Candidate) => s.content.length > 0)
  valid.sort((a, b) => b.bestScore - a.bestScore)

  const matchesWithHits = valid.filter(s => s.bestScore > 0)
  return (matchesWithHits.length > 0 ? matchesWithHits : valid).slice(0, MAX_CANDIDATE_SOURCES)
}

export async function runResearchAgent(
  sessionId: string,
  query: string,
  initialBudget: number,
  walletAddress: string | undefined,
  onProgress?: (msg: string) => void,
  cookieHeader?: string,
  userId?: string
) {
  let totalSpentOnSources = 0;
  const platformFee = 0.20; // platform revenue per prompt

  try {
    const supabase = createAdminClient()

    if (onProgress) onProgress('Connecting to Treasury and querying registered sources...')

    let queryEmbedding: number[] | null = null
    try {
      queryEmbedding = await embedQuery(query)
    } catch (e: any) {
      console.warn('Query embedding failed, falling back to text scan:', e.message)
      if (onProgress) onProgress('Vector index unavailable. Falling back to direct corpus scan...')
    }

    // 1. Retrieval — deterministic, off-chain. Narrows down to candidate sources.
    if (onProgress) onProgress('Ranking registered sources by relevance...')

    let candidates: Candidate[] = []

    if (queryEmbedding) {
      try {
        candidates = await retrieveBySimilarity(supabase, queryEmbedding, initialBudget)
      } catch (err: any) {
        console.warn('Similarity retrieval failed, falling back to text relevance:', err.message)
      }
    }

    // Robust Fallback: if vector similarity returned 0 candidates, search corpus directly by text relevance
    if (candidates.length === 0) {
      candidates = await retrieveByTextRelevance(supabase, query, initialBudget)
    }

    if (candidates.length === 0) {
      if (onProgress) onProgress('No registered sources matched this query closely enough.')
    } else {
      if (onProgress) onProgress(`Selected ${candidates.length} candidate source(s) matching your query.`)
    }

    // 2. Generation + citation decision — the one non-deterministic step,
    // reconciled through GenLayer validator consensus instead of a single
    // trusted API call.
    if (onProgress) onProgress('Synchronizing candidate source hashes for GenLayer validators...')

    const genlayerInputs: GenLayerSourceInput[] = []

    for (const c of candidates) {
      try {
        const res = await safeFetch(c.url)
        if (res.ok) {
          const liveCanonical = canonicalizeHtml(await res.text())
          const liveHash = sha256(liveCanonical)
          const allLiveChunks = chunkCanonicalText(liveCanonical)
          const liveChunks = selectRelevantChunks(allLiveChunks, query, TOP_CHUNKS_PER_SOURCE, c.content)
          const { content, evidenceHashes } = buildEvidence(liveChunks)

          await supabase.from('sources').update({ content_hash: liveHash }).eq('id', c.id)

          genlayerInputs.push({
            id: c.id,
            title: c.title || 'Untitled',
            content,
            ownerId: c.ownerId || '00000000-0000-0000-0000-000000000000',
            sourceUrl: c.url,
            registeredContentHash: liveHash,
            evidenceHashes,
            canonicalization: c.canonicalization || CANONICALIZATION_VERSION,
          })
        } else {
          genlayerInputs.push({
            id: c.id,
            title: c.title || 'Untitled',
            content: c.content,
            ownerId: c.ownerId || '00000000-0000-0000-0000-000000000000',
            sourceUrl: c.url,
            registeredContentHash: c.registeredContentHash || '',
            evidenceHashes: c.evidenceHashes,
            canonicalization: c.canonicalization,
          })
        }
      } catch (e: any) {
        console.warn(`Live hash sync fallback for ${c.url}:`, e.message)
        genlayerInputs.push({
          id: c.id,
          title: c.title || 'Untitled',
          content: c.content,
          ownerId: c.ownerId || '00000000-0000-0000-0000-000000000000',
          sourceUrl: c.url,
          registeredContentHash: c.registeredContentHash || '',
          evidenceHashes: c.evidenceHashes,
          canonicalization: c.canonicalization,
        })
      }
    }

    if (onProgress) onProgress(`Submitting ${genlayerInputs.length} candidate source(s) to the GenLayer contract for grounded synthesis...`)

    const genlayerResult = await runGenLayerResearch(query, genlayerInputs)

    const { error: receiptError } = await supabase
      .from('research_sessions')
      .update({ consensus_receipt: genlayerResult.consensusReceipt, consensus_tx_hash: genlayerResult.consensusReceipt.transactionHash })
      .eq('id', sessionId)
    if (receiptError) throw new Error(`Failed to persist consensus receipt: ${receiptError.message}`)

    if (onProgress) onProgress(`GenLayer consensus reached. ${genlayerResult.citationsUsed.length} source(s) cited.`)

    // 3. Execute Payments ONLY for citations GenLayer's consensus actually used
    const purchasedSources: any[] = []
    if (onProgress) onProgress(`Executing payments for ${genlayerResult.citationsUsed.length} citation(s)...`)

    for (const usedId of genlayerResult.citationsUsed) {
      const source = candidates.find(s => s.id === usedId)
      if (!source) continue

      try {
        if (!source.recipientAddress) throw new Error('Source creator has no wallet address')
        const { payload } = await authorizePayment(sessionId, source.id, parseFloat(source.price_usdc), source.recipientAddress)

        const { settleCitationLicense } = await import('@/lib/payments/settlement')
        const receipt = await settleCitationLicense({
          sourceId: source.id,
          authorizationId: payload.authorizationId,
          amount: payload.amount,
          userId,
        })

        purchasedSources.push({
          id: source.id,
          title: source.title,
          url: source.url,
          content: source.content,
          receipt,
        })
        const price = parseFloat(source.price_usdc);
        totalSpentOnSources += price;
        if (onProgress) onProgress(`Payment Settled. Gateway Batch ID: ${receipt.gatewaySettlementId}`)
      } catch (e: any) {
        console.error(`Failed to purchase source ${source.id}:`, e.message)
        if (onProgress) onProgress(`Payment execution failed for ${source.title}.`)
        if (parseFloat(source.price_usdc) > 0) {
          throw new Error(`Required source payment failed for ${source.title}: ${e.message}`)
        }
      }
    }

    const purchasedIds = new Set(purchasedSources.map(source => source.id))
    for (const candidate of candidates) {
      const wasCited = genlayerResult.citationsUsed.includes(candidate.id)
      const wasPurchased = purchasedIds.has(candidate.id)
      await supabase.from('citation_decisions').insert({
        session_id: sessionId,
        source_id: candidate.id,
        contribution_score: Math.max(0, Math.min(1, candidate.bestScore)),
        accepted: wasPurchased,
        reasoning: wasPurchased
          ? 'Cited by GenLayer consensus and payment settled'
          : wasCited
            ? 'Selected by GenLayer consensus but payment did not settle'
            : 'Not cited in final GenLayer answer',
      })
    }

    // --- Backend Refund Mechanism ---
    if (walletAddress) {
      const actualPlatformFee = totalSpentOnSources * platformFee;
      const unspentBudget = initialBudget - totalSpentOnSources - actualPlatformFee;

      if (unspentBudget >= 0.05) {
        if (onProgress) onProgress(`Calculating budget... Unspent budget is $${unspentBudget.toFixed(2)}. Initiating refund...`)
        try {
          await executeTreasuryRefund(walletAddress, unspentBudget.toFixed(2));
          if (onProgress) onProgress(`Refunded $${unspentBudget.toFixed(2)} to your wallet.`)
        } catch (err: any) {
          console.error("Refund failed:", err);
          if (onProgress) onProgress(`Warning: Refund transfer failed (${err.message})`)
        }
      } else {
        if (onProgress) onProgress(`Unspent budget is $${unspentBudget.toFixed(2)} (below $0.05 minimum threshold). Retained by Treasury.`)
      }
    }

    return {
      answer: genlayerResult.answer,
      citationsUsed: purchasedSources.filter(s => genlayerResult.citationsUsed.includes(s.id)),
      purchasedSources
    }

  } catch (err: any) {
    if (walletAddress) {
      const chargedPlatformFee = totalSpentOnSources * platformFee
      const refundableAmount = Math.max(0, initialBudget - totalSpentOnSources - chargedPlatformFee)
      if (onProgress) onProgress(`Research execution failed. Initiating refund of $${refundableAmount.toFixed(2)}...`)
      try {
        if (refundableAmount >= 0.05) {
          await executeTreasuryRefund(walletAddress, refundableAmount.toFixed(2));
          if (onProgress) onProgress(`Refunded $${refundableAmount.toFixed(2)} to your wallet.`)
        }
      } catch (refundErr: any) {
        console.error("Crash Refund failed:", refundErr);
      }
    }
    throw err;
  }
}
