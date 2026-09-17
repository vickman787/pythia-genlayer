// Reproducible end-to-end check of the contract input + relayer path.
//
//   npm run verify:genlayer
//   npm run verify:genlayer -- <https url> "<query>"
//
// It builds a GenLayer source input exactly the way the research agent does
// (canonicalized HTML, registered content hash, per-chunk evidence hashes),
// submits it through the real backend relayer via runGenLayerResearch(), and
// fails with a non-zero exit code unless the transaction reaches ACCEPTED and
// returns a non-empty answer whose citations are all valid supplied IDs.
//
// Requires GENLAYER_NETWORK, GENLAYER_RELAYER_PRIVATE_KEY, and a
// GENLAYER_CONTRACT_ADDRESS pointing at a deployment of the *current*
// contracts/research_contract.py. It performs no Supabase or Circle calls, so
// it never moves funds.

import fs from 'fs'
import { runGenLayerResearch, type GenLayerSourceInput } from '../src/lib/genlayer/contract'
import { safeFetch } from '../src/lib/net/safe-fetch'
import {
  CANONICALIZATION_VERSION,
  canonicalizeHtml,
  chunkCanonicalText,
  buildEvidence,
  sha256,
} from '../src/lib/registration/canonical'

// A tiny, static, publicly reachable page keeps the run reproducible: every
// validator must fetch identical bytes for strict-equality consensus, so
// dynamic or personalized pages are unsuitable for a determinism check.
const DEFAULT_URL = 'https://test-server.genlayer.com/static/genvm/hello.html'
const DEFAULT_QUERY = 'According to the provided source, what text does the page contain?'

// Matches TOP_CHUNKS_PER_SOURCE in the research agent.
const MAX_EVIDENCE_CHUNKS = 2

function loadEnvFiles() {
  for (const file of ['.env', '.env.local']) {
    if (!fs.existsSync(file)) continue
    for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const separator = line.indexOf('=')
      if (separator < 1) continue
      const key = line.slice(0, separator).trim()
      if (process.env[key]) continue
      const value = line.slice(separator + 1).trim()
      process.env[key] = value.replace(/^"(.*)"$/s, '$1').replace(/^'(.*)'$/s, '$1')
    }
  }
}

async function fetchCanonical(url: string): Promise<string> {
  const response = await safeFetch(url)
  if (!response.ok) throw new Error(`Source URL returned ${response.status} ${response.statusText}`)
  return canonicalizeHtml(await response.text())
}

async function main() {
  loadEnvFiles()

  const [urlArg, queryArg] = process.argv.slice(2)
  const sourceUrl = urlArg || DEFAULT_URL
  const query = queryArg || DEFAULT_QUERY

  for (const required of ['GENLAYER_CONTRACT_ADDRESS', 'GENLAYER_RELAYER_PRIVATE_KEY']) {
    if (!process.env[required]) throw new Error(`${required} is not set`)
  }
  if (!sourceUrl.startsWith('https://')) throw new Error('Source URL must use https://')

  console.log(`network           ${process.env.GENLAYER_NETWORK || 'studionet'}`)
  console.log(`contract          ${process.env.GENLAYER_CONTRACT_ADDRESS}`)
  console.log(`source            ${sourceUrl}`)

  // Fetch twice: an unstable page can never satisfy validator strict equality,
  // so fail here with a clear cause instead of inside consensus.
  const canonical = await fetchCanonical(sourceUrl)
  const canonicalAgain = await fetchCanonical(sourceUrl)
  if (canonical !== canonicalAgain) {
    throw new Error('Source page is not byte-stable between fetches; pick a static page')
  }
  if (!canonical) throw new Error('Source page produced no canonical text')

  const registeredContentHash = sha256(canonical)
  const chunks = chunkCanonicalText(canonical).slice(0, MAX_EVIDENCE_CHUNKS)
  const { content, evidenceHashes } = buildEvidence(chunks)

  const sourceId = `verify-${sha256(sourceUrl).slice(0, 12)}`
  const input: GenLayerSourceInput = {
    id: sourceId,
    title: 'Verification source',
    content,
    ownerId: `owner-${sourceId}`,
    sourceUrl,
    registeredContentHash,
    evidenceHashes,
    canonicalization: CANONICALIZATION_VERSION,
  }

  console.log(`registered hash   ${registeredContentHash}`)
  console.log(`evidence chunks   ${chunks.length}`)
  console.log('submitting to GenLayer via the backend relayer...')

  const started = Date.now()
  const result = await runGenLayerResearch(query, [input])
  const seconds = ((Date.now() - started) / 1000).toFixed(1)

  const failures: string[] = []
  if (!result.answer.trim()) failures.push('answer was empty')
  if (result.citationsUsed.length === 0) failures.push('no citations were returned')
  const invalid = result.citationsUsed.filter(id => id !== sourceId)
  if (invalid.length > 0) failures.push(`invalid citation ids: ${invalid.join(', ')}`)
  if (!/^0x[0-9a-f]{64}$/i.test(result.consensusReceipt.transactionHash)) {
    failures.push('consensus receipt has no transaction hash')
  }
  const receiptEvidence = result.consensusReceipt.sourceEvidence.find(item => item.sourceId === sourceId)
  if (receiptEvidence?.registeredContentHash !== registeredContentHash) {
    failures.push('consensus receipt does not carry the registered content hash')
  }

  console.log('')
  console.log(`transaction       ${result.consensusReceipt.transactionHash}`)
  console.log(`elapsed           ${seconds}s`)
  console.log(`citations         ${result.citationsUsed.join(', ') || '(none)'}`)
  console.log(`answer            ${result.answer.slice(0, 240)}${result.answer.length > 240 ? '…' : ''}`)

  if (failures.length > 0) {
    console.error('')
    console.error('FAILED:')
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exitCode = 1
    return
  }

  console.log('')
  console.log('PASSED: accepted transaction, non-empty answer, valid citations.')
}

main().catch((error: unknown) => {
  console.error('')
  console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
