import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { z } from 'zod'

const updateSchema = z.object({
  price: z.number().min(0, 'Price must be greater than or equal to 0').max(100, 'Price cannot exceed 100 USDC'),
})

async function getAuthenticatedCreator(sourceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, creator_profiles(id)')
    .eq('id', user.id)
    .single()

  const creatorProfile = (profile as any)?.creator_profiles
  const creatorId = Array.isArray(creatorProfile) ? creatorProfile[0]?.id : creatorProfile?.id

  if (profileError || !creatorId) {
    return { error: 'Creator profile not found', status: 404 }
  }

  const admin = createAdminClient()
  const { data: source, error: sourceError } = await admin
    .from('sources')
    .select('id, creator_id, price_usdc, status, title, url')
    .eq('id', sourceId)
    .single()

  if (sourceError || !source) {
    return { error: 'Source not found', status: 404 }
  }

  if (source.creator_id !== creatorId) {
    return { error: 'Forbidden: You do not own this source', status: 403 }
  }

  return { admin, source, creatorId }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params
    const auth = await getAuthenticatedCreator(sourceId)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { admin, source } = auth

    if (source.status === 'deleted') {
      return NextResponse.json({ error: 'Cannot update fee for a deleted source' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data: updated, error: updateError } = await admin
      .from('sources')
      .update({
        price_usdc: parsed.data.price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceId)
      .select('id, title, url, price_usdc, status, created_at, updated_at')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ success: true, source: updated })
  } catch (error: any) {
    console.error('Failed to update source fee:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params
    const auth = await getAuthenticatedCreator(sourceId)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { admin, source } = auth

    if (source.status === 'deleted') {
      return NextResponse.json({ error: 'Source is already deleted' }, { status: 400 })
    }

    // Unindex chunks so future research queries do not match or retrieve this content
    const { error: chunkError } = await admin
      .from('source_chunks')
      .delete()
      .eq('source_id', sourceId)

    if (chunkError) {
      console.error('Failed to delete source chunks during deletion:', chunkError)
    }

    // Soft-delete source record to keep foreign key references in payment_authorizations and citation_decisions intact
    const { error: deleteError } = await admin
      .from('sources')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true, message: 'Source deleted successfully' })
  } catch (error: any) {
    console.error('Failed to delete source:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
