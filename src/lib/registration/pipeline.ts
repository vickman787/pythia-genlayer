import { URL } from 'url'
import { createAdminClient } from '@/utils/supabase/admin'
import { embedDocuments, serializeVector } from '@/lib/ai/embeddings'
import { safeFetch } from '@/lib/net/safe-fetch'
import {
  CANONICALIZATION_VERSION,
  canonicalizeHtml,
  chunkCanonicalText,
  extractTitle,
  sha256,
} from '@/lib/registration/canonical'

import { verifyContentOwnership } from '@/lib/registration/verification'

export async function registerArticle(targetUrl: string, creatorId: string, price = 0, expectedWallet: string) {
  const supabase = createAdminClient()

  try {
    const normalizedUrl = new URL(targetUrl).toString()

    let title = 'Untitled'
    let readableText = ''

    const response = await safeFetch(normalizedUrl)
    if (!response.ok) throw new Error(`Failed to fetch article: ${response.statusText}`)
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) throw new Error('Invalid content type. Expected text/html.')
    const html = await response.text()
    const verification = await verifyContentOwnership(html, normalizedUrl, expectedWallet)
    if (!verification.verified) {
      throw new Error(verification.error || 'Ownership verification failed.')
    }
    const extracted = { title: extractTitle(html), readableText: canonicalizeHtml(html) }
    title = extracted.title
    readableText = extracted.readableText

    const contentHash = sha256(readableText)

    const { data: existing } = await supabase
      .from('sources')
      .select('id, creator_id, status')
      .eq('url', normalizedUrl)
      .single()

    let sourceId: string;

    if (existing) {
      if (existing.creator_id !== creatorId) {
        throw new Error('This article is already registered by another creator.')
      }
      if (existing.status !== 'deleted') {
        throw new Error('Article already registered (Duplicate)')
      }

      const { data: updated, error } = await supabase
        .from('sources')
        .update({
          status: 'extracted',
          title,
          content_hash: contentHash,
          price_usdc: price,
          ownership_status: 'verified',
          ownership_proof_type: verification.proofType || 'opaque_meta_tag',
          verified_owner_wallet: expectedWallet.toLowerCase(),
          ownership_verified_at: new Date().toISOString(),
          canonicalization_version: CANONICALIZATION_VERSION,
        })
        .eq('id', existing.id)
        .select('id')
        .single()

      if (error) throw error
      sourceId = updated.id

      const { error: deleteError } = await supabase.from('source_chunks').delete().eq('source_id', sourceId)
      if (deleteError) throw deleteError
    } else {
      const { data: inserted, error } = await supabase
        .from('sources')
        .insert({
          url: normalizedUrl,
          title,
          content_hash: contentHash,
          price_usdc: price,
          creator_id: creatorId,
           status: 'extracted',
           ownership_status: 'verified',
           ownership_proof_type: verification.proofType || 'opaque_meta_tag',
           verified_owner_wallet: expectedWallet.toLowerCase(),
           ownership_verified_at: new Date().toISOString(),
           canonicalization_version: CANONICALIZATION_VERSION
        })
        .select('id')
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Article already registered (Duplicate)')
        }
        throw error
      }
      sourceId = inserted.id
    }

    // Chunking uses the shared helper so evidence hashes stay reproducible.
    const chunks = chunkCanonicalText(readableText)

    let embeddings: number[][] | null = null
    if (chunks.length > 0) {
      try {
        embeddings = await embedDocuments(chunks)
      } catch (embedError: any) {
        console.warn(`Embedding failed for ${normalizedUrl}, storing chunks without vectors:`, embedError.message)
      }
    }

    if (chunks.length > 0) {
      const chunkInserts = chunks.map((chunk, i) => ({
        source_id: sourceId,
        chunk_text: chunk,
        ...(embeddings ? { embedding: serializeVector(embeddings[i]) } : {})
      }))

      const { error: chunkInsertError } = await supabase.from('source_chunks').insert(chunkInserts)
      if (chunkInsertError) throw chunkInsertError
    }

    return { success: true, sourceId }

  } catch (error: any) {
    console.error('Registration error:', error.message)
    return { success: false, error: error.message }
  }
}
