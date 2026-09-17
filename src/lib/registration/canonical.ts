import crypto from 'crypto'

// Single source of truth for how raw HTML becomes verifiable evidence text.
//
// Registration, the research agent, the GenLayer contract, and the repository
// verification script must all agree byte-for-byte, otherwise the contract's
// independent fetch will never reproduce the registered content hash. The
// Python implementation inside contracts/research_contract.py mirrors these
// exact steps; change both together and bump the version rather than
// silently reinterpreting existing hashes.
export const CANONICALIZATION_VERSION = 'html-text-v1'

// Delimiter joining the selected evidence chunks handed to validators. The
// contract splits on this same delimiter before checking each chunk against
// the independently fetched page.
export const EVIDENCE_DELIMITER = '\n[...]\n'

export const CHUNK_SIZE = 1000

export function canonicalizeHtml(html: string): string {
  return html
    .replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
    .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, '')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return titleMatch ? titleMatch[1].trim() : 'Untitled'
}

export function chunkCanonicalText(text: string): string[] {
  return text.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) || []
}

export function buildEvidence(chunks: string[]): { content: string, evidenceHashes: string[] } {
  return {
    content: chunks.join(EVIDENCE_DELIMITER),
    evidenceHashes: chunks.map(sha256),
  }
}
