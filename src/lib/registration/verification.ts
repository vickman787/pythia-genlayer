import crypto from 'crypto'
import { safeFetch } from '@/lib/net/safe-fetch'

/**
 * Generates an opaque, privacy-preserving verification token for a creator's wallet.
 * Uses HMAC-SHA256 so the creator's wallet address is never published or exposed
 * in public website HTML or crawled by external scrapers.
 */
export function generateCreatorVerificationToken(walletAddress: string): string {
  const secret = process.env.RECEIPT_SIGNING_SECRET || 'pythia-ownership-verification-salt'
  const normalizedWallet = walletAddress.trim().toLowerCase()
  const hash = crypto.createHmac('sha256', secret).update(`creator-verify:${normalizedWallet}`).digest('hex').slice(0, 32)
  return `pythia_verify_${hash}`
}

export type OwnershipProofType =
  | 'opaque_meta_tag'
  | 'html_comment'
  | 'well_known_file'
  | 'legacy_meta_tag'

export interface OwnershipVerificationResult {
  verified: boolean
  proofType?: OwnershipProofType
  error?: string
}

/**
 * Verifies that the publisher of an article controls the URL without requiring
 * them to expose their Ethereum wallet address.
 *
 * Supported methods:
 * 1. Opaque Meta Tag: <meta name="pythia-verification" content="pythia_verify_..." />
 * 2. Hidden HTML Comment: <!-- pythia-verification: pythia_verify_... -->
 * 3. Domain Well-Known File: https://domain.com/.well-known/pythia.txt
 * 4. Legacy Meta Tag: <meta name="pythia-owner" content="0x..." /> (backward compatibility)
 */
export async function verifyContentOwnership(
  html: string,
  targetUrl: string,
  expectedWallet: string
): Promise<OwnershipVerificationResult> {
  const expectedToken = generateCreatorVerificationToken(expectedWallet)
  const normalizedWallet = expectedWallet.trim().toLowerCase()

  // 1. Check for opaque meta tag: <meta name="pythia-verification" content="pythia_verify_...">
  const opaqueMetaMatch =
    html.match(/<meta[^>]+name=["'](?:pythia|citeflow)-verification["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["'](?:pythia|citeflow)-verification["'][^>]*>/i)

  if (opaqueMetaMatch && opaqueMetaMatch[1].trim() === expectedToken) {
    return { verified: true, proofType: 'opaque_meta_tag' }
  }

  // 2. Check for hidden HTML comment: <!-- pythia-verification: pythia_verify_... -->
  const commentMatch = html.match(/<!--\s*(?:pythia|citeflow)-verification:\s*([a-zA-Z0-9_-]+)\s*-->/i)
  if (commentMatch && commentMatch[1].trim() === expectedToken) {
    return { verified: true, proofType: 'html_comment' }
  }

  // 3. Direct occurrence check (in case user pasted token into body, tag, or custom container)
  if (html.includes(expectedToken)) {
    return { verified: true, proofType: 'opaque_meta_tag' }
  }

  // 3. Check for well-known verification file at origin: https://domain.com/.well-known/pythia.txt
  try {
    const parsed = new URL(targetUrl)
    const wellKnownUrl = `${parsed.protocol}//${parsed.host}/.well-known/pythia.txt`
    const wellKnownRes = await safeFetch(wellKnownUrl)
    if (wellKnownRes.ok) {
      const wellKnownText = await wellKnownRes.text()
      if (wellKnownText.includes(expectedToken)) {
        return { verified: true, proofType: 'well_known_file' }
      }
    }
  } catch {
    // Ignore well-known fetch failure and fall through
  }

  // 4. Fallback: Legacy meta tag <meta name="pythia-owner" content="0x..."> (for backward compatibility)
  const legacyMetaMatch =
    html.match(/<meta[^>]+name=["'](?:pythia|citeflow)-owner["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["'](?:pythia|citeflow)-owner["'][^>]*>/i)

  if (legacyMetaMatch && legacyMetaMatch[1].trim().toLowerCase() === normalizedWallet) {
    return { verified: true, proofType: 'legacy_meta_tag' }
  }

  return {
    verified: false,
    error: 'Ownership verification failed. Please add the privacy-preserving pythia-verification meta tag or HTML comment to your article.',
  }
}
