import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags } from '@/lib/settings'
import { NextResponse } from 'next/server'

// PATCH - Update event (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const flags = await getFeatureFlags()
    if (!flags.events) {
      return NextResponse.json({ error: 'Events are not enabled for this organization' }, { status: 403 })
    }
    const orgId = user.profile.org_id
    const { id } = await params

    // Check if user is admin
    if (user.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const updates = await request.json()
    const supabase = await createClient()

    // Prevent cross-tenant updates if a malicious client includes `org_id`.
    if ('org_id' in updates) delete (updates as any).org_id

    // Handle image_url: only save storage paths, not signed URLs (which expire)
    if (updates.image_url !== undefined) {
      // If it's a signed URL (starts with http:// or https://), it means the image wasn't changed
      // Fetch the existing storage path from the database to preserve it
      if (updates.image_url && 
          typeof updates.image_url === 'string' &&
          (updates.image_url.startsWith('http://') || updates.image_url.startsWith('https://'))) {
        // This is a signed URL from the form (existing image, not changed)
        // Fetch the existing storage path from the database
        const { data: existingEvent } = await supabase
          .from('events')
          .select('image_url')
          .eq('id', id)
          .eq('org_id', orgId)
          .single()
        
        if (existingEvent && existingEvent.image_url) {
          // Use the existing storage path from the database
          updates.image_url = existingEvent.image_url
        } else {
          // No existing image, remove it
          updates.image_url = null
        }
      } else if (updates.image_url === null || updates.image_url === '') {
        // Explicitly removing the image
        updates.image_url = null
      } else if (updates.image_url && typeof updates.image_url === 'string') {
        // This is a storage path (new/changed image) - save it as-is
        // Storage paths don't start with http:// or https://
        updates.image_url = updates.image_url
      } else {
        // Invalid value, remove it
        updates.image_url = null
      }
    }

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ event: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// DELETE - Delete event (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const flags = await getFeatureFlags()
    if (!flags.events) {
      return NextResponse.json({ error: 'Events are not enabled for this organization' }, { status: 403 })
    }
    const orgId = user.profile.org_id
    const { id } = await params

    // Check if user is admin
    if (user.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

