// Typed entry point into the deployed Intelligent Contract (see
// contracts/research_contract.py). This is where the "AI aspect" of the app
// actually happens: given a query and the candidate source chunks retrieval
// already narrowed down, the contract's validators decide which sources are
// genuinely relevant and synthesize the grounded answer, reconciled through
// GenLayer's consensus (equivalence principle) rather than a single trusted
// API call.
//
// Deliberately ONE contract call per research query, not one call per
// candidate source. Looping validator consensus per-source would multiply
// latency and cost by the number of sources under consideration — bad for a
// pay-per-prompt, real-time demo. The contract receives all candidate chunks
// at once and returns its citation decision in a single transaction.
//
// Waits for ACCEPTED, not FINALIZED — confirmed from the genlayer-js README:
// ACCEPTED is the point where validator consensus is already done; FINALIZED
// only lands after a longer finality window closes on top of that. Waiting
// for FINALIZED in an interactive request is what caused the timeout seen in
// testing. The same README also warns a transaction can reach either status
// with a *failed* execution, so the execution result is checked explicitly
// below rather than trusting `result.result` just because a status was hit.

import { getRelayerClient } from './relayer'
import { TransactionStatus, type CalldataEncodable } from 'genlayer-js/types'

// Global polyfill for BigInt JSON serialization in serverless runtimes
if (typeof (BigInt.prototype as any).toJSON === 'undefined') {
  ;(BigInt.prototype as any).toJSON = function () {
    return this.toString()
  }
}

export function safeJsonStringify(obj: any, indent?: number): string {
  try {
    return JSON.stringify(
      obj,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      indent
    )
  } catch {
    return String(obj)
  }
}

export interface GenLayerSourceInput {
  id: string
  title: string
  content: string
  ownerId: string
  sourceUrl: string
  registeredContentHash: string
  evidenceHashes: string[]
  canonicalization: string
}

export interface GenLayerResearchResult {
  answer: string
  citationsUsed: string[] // source IDs the contract's consensus deemed relevant
  consensusReceipt: {
    transactionHash: string
    contractAddress: string
    sourceEvidence: Array<{ sourceId: string, ownerId: string, sourceUrl: string, registeredContentHash: string, evidenceHashes: string[], canonicalization: string }>
    citationsUsed: string[]
  }
}

interface StudioResult {
  status?: string
  payload?: unknown
}

function decodeResearchResult(value: unknown): Omit<GenLayerResearchResult, 'consensusReceipt'> | undefined {
  let decoded = value

  if (decoded && typeof decoded === 'object' && 'readable' in decoded) {
    decoded = (decoded as { readable?: unknown }).readable
  }

  if (typeof decoded === 'string') {
    const rawString = decoded
    try {
      decoded = JSON.parse(rawString)
    } catch {
      // StudioNet's calldata renderer currently emits Python dictionaries as
      // almost-JSON: adjacent fields may lack a comma and arrays may retain a
      // trailing comma. Repair only those two observed serialization quirks.
      const repaired = rawString
        .replace(/"\s*"citationsUsed"\s*:/, '","citationsUsed":')
        .replace(/,\s*([}\]])/g, '$1')
      try {
        decoded = JSON.parse(repaired)
      } catch {
        return undefined
      }
    }
  }

  if (!decoded || typeof decoded !== 'object') return undefined
  const candidate = decoded as Partial<GenLayerResearchResult>
  if (typeof candidate.answer !== 'string') return undefined

  return {
    answer: candidate.answer,
    citationsUsed: Array.isArray(candidate.citationsUsed)
      ? candidate.citationsUsed.filter((id): id is string => typeof id === 'string')
      : [],
  }
}

export async function runGenLayerResearch(
  query: string,
  sources: GenLayerSourceInput[]
): Promise<GenLayerResearchResult> {
  const contractAddress = process.env.GENLAYER_CONTRACT_ADDRESS
  if (!contractAddress) throw new Error('GENLAYER_CONTRACT_ADDRESS is not set')

  const { client, account } = getRelayerClient()

  let fees: any = undefined
  if (typeof (client as any).estimateTransactionFees === 'function') {
    for (let fAttempt = 1; fAttempt <= 3; fAttempt++) {
      try {
        fees = await (client as any).estimateTransactionFees({})
        break
      } catch (err) {
        console.warn(`GenLayer fee estimation attempt ${fAttempt}/3 failed:`, err)
        if (fAttempt < 3) await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  // Consensus v0.6 requires non-zero fee deposit. If RPC times out, use calibrated fallback
  if (!fees) {
    fees = {
      distribution: {
        leaderTimeunitsAllocation: 100n,
        validatorTimeunitsAllocation: 200n,
        appealRounds: 0n,
        executionBudgetPerRound: 25000000000000000n,
        executionConsumed: 0n,
        totalMessageFees: 0n,
        rotations: [3n],
        maxPriceGenPerTimeUnit: 2n,
        storageFeeMaxGasPrice: 300000000n,
        receiptFeeMaxGasPrice: 300000000n,
      },
      feeValue: 100000000000010352n,
    }
  }

  const receipt = await client.writeContract({
    account,
    address: contractAddress as `0x${string}`,
    functionName: 'research',
    args: [query, sources.map((source) => ({ ...source })) as unknown as CalldataEncodable],
    value: BigInt(0),
    ...(fees ? { fees } : {}),
  })

  // studionet has been inconsistent in testing — the same call sometimes
  // reaches ACCEPTED within one wait and sometimes doesn't, even with
  // identical input. Since the transaction already exists on-chain once
  // writeContract returns (we have its hash), retrying the wait re-polls
  // the same transaction rather than resubmitting it — safe to retry, no
  // risk of double execution or double payment.
  const MAX_WAIT_ATTEMPTS = 8
  let result: Awaited<ReturnType<typeof client.waitForTransactionReceipt>> | undefined
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_WAIT_ATTEMPTS; attempt++) {
    try {
      result = await (client as any).waitForTransactionReceipt({
        hash: receipt,
        waitUntil: 'decided',
        retries: 50,
        interval: 3000,
      })
      break
    } catch (err) {
      lastError = err
      console.warn(`GenLayer wait attempt ${attempt}/${MAX_WAIT_ATTEMPTS} failed for tx ${receipt}:`, err)
    }
  }

  if (!result) {
    throw lastError instanceof Error
      ? lastError
      : new Error(`GenLayer transaction ${receipt} never reached ACCEPTED after ${MAX_WAIT_ATTEMPTS} attempts.`)
  }

  // Per genlayer-js docs: reaching ACCEPTED/FINALIZED doesn't guarantee the
  // execution itself succeeded — check before trusting the returned value.
  const executionResult = (result as any)?.txExecutionResultName
    ?? (result as any)?.txExecutionResult
    ?? (result as any)?.executionResult
  if (executionResult && executionResult !== 'FINISHED_WITH_RETURN' && executionResult !== 'FINISHED') {
    throw new Error(`GenLayer contract execution did not finish successfully: ${executionResult} (tx ${receipt})`)
  }

  const transactionData = (result as any)?.data
  const consensusData = (result as any)?.consensus_data
    ?? (result as any)?.consensusData
    ?? transactionData?.consensus_data
    ?? transactionData?.consensusData
  const leaderReceiptValue = consensusData?.leader_receipt ?? consensusData?.leaderReceipt
  const leaderReceipts = Array.isArray(leaderReceiptValue)
    ? leaderReceiptValue
    : leaderReceiptValue ? [leaderReceiptValue] : []

  for (const leaderReceipt of leaderReceipts) {
    const studioResult = leaderReceipt?.result as StudioResult | undefined
    if (studioResult?.status && studioResult.status !== 'return') {
      const message = typeof studioResult.payload === 'string'
        ? studioResult.payload
        : JSON.stringify(studioResult.payload)
      throw new Error(`GenLayer contract failed: ${message || studioResult.status} (tx ${receipt})`)
    }

    const decoded = decodeResearchResult(studioResult?.payload)
    if (decoded) return withConsensusReceipt(decoded, receipt, contractAddress, sources)
  }

  // Check top-level result, data.result, consensusData.final_result, or txDataDecoded
  const candidatePayloads = [
    (result as any)?.result,
    (result as any)?.data?.result,
    (result as any)?.txDataDecoded,
    consensusData?.final_result,
    consensusData?.result,
  ]

  for (const payload of candidatePayloads) {
    const decoded = decodeResearchResult(payload)
    if (decoded) return withConsensusReceipt(decoded, receipt, contractAddress, sources)
  }

  console.error('GenLayer raw receipt (unexpected shape):', safeJsonStringify(result, 2))
  throw new Error(
    `GenLayer contract returned an unexpected result shape for tx ${receipt}. Raw receipt logged to the server console.`
  )
}

function withConsensusReceipt(
  result: Omit<GenLayerResearchResult, 'consensusReceipt'>,
  transactionHash: string,
  contractAddress: string,
  sources: GenLayerSourceInput[],
): GenLayerResearchResult {
  return {
    ...result,
    consensusReceipt: {
      transactionHash,
      contractAddress,
      sourceEvidence: sources.map(({ id, ownerId, sourceUrl, registeredContentHash, evidenceHashes, canonicalization }) => ({ sourceId: id, ownerId, sourceUrl, registeredContentHash, evidenceHashes, canonicalization })),
      citationsUsed: result.citationsUsed,
    },
  }
}
