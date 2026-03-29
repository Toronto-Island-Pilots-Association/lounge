import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags } from '@/lib/settings'
import { isOrgManagerRole } from '@/lib/org-roles'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const flags = await getFeatureFlags()
    if (!flags.discussions) {
      return NextResponse.json({ error: 'Discussions are not enabled for this organization' }, { status: 403 })
    }
    const orgId = user.profile?.org_id
    if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('threads')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Get author info
    const { data: author } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email, profile_picture_url')
      .eq('user_id', data.created_by)
      .single()

    return NextResponse.json({ thread: { ...data, author } })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const flags = await getFeatureFlags()
    if (!flags.discussions) {
      return NextResponse.json({ error: 'Discussions are not enabled for this organization' }, { status: 403 })
    }
    const orgId = user.profile?.org_id
    if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    const { id } = await params
    const supabase = await createClient()

    // Get thread to check ownership
    const { data: thread } = await supabase
      .from('threads')
      .select('created_by')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const isAdmin = isOrgManagerRole(user.profile.role)
    const isOwner = thread.created_by === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own threads' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('threads')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Thread deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

const VALID_CATEGORIES = ['introduce_yourself', 'aircraft_shares', 'instructor_availability', 'gear_for_sale', 'flying_at_ytz', 'general_aviation', 'training_safety_proficiency', 'wanted', 'building_a_better_tipa', 'other'] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const flags = await getFeatureFlags()
    if (!flags.discussions) {
      return NextResponse.json({ error: 'Discussions are not enabled for this organization' }, { status: 403 })
    }
    const orgId = user.profile?.org_id
    if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    const { id } = await params
    const supabase = await createClient()

    const { data: thread } = await supabase
      .from('threads')
      .select('created_by')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    if (thread.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own threads' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, category, image_urls } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const threadCategory = category && VALID_CATEGORIES.includes(category) ? category : undefined
    const imageUrls = Array.isArray(image_urls)
      ? image_urls.filter((url: unknown): url is string => typeof url === 'string').slice(0, 5)
      : undefined

    const updatePayload: { title: string; content: string; category?: string; image_urls?: string[] | null } = {
      title: String(title).trim(),
      content: String(content).trim(),
    }
    if (threadCategory) updatePayload.category = threadCategory
    if (imageUrls !== undefined) updatePayload.image_urls = imageUrls.length > 0 ? imageUrls : null

    const { data, error } = await supabase
      .from('threads')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ thread: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    const status = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
