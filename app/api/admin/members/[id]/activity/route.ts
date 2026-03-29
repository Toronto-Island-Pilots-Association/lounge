import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Admin endpoint to get member activity data
 * 
 * GET /api/admin/members/[id]/activity
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const orgId = request.headers.get('x-org-id')
    if (!orgId) {
      return NextResponse.json({ error: 'Missing org context' }, { status: 400 })
    }
    const supabase = await createClient()

    // Map the admin URL param (member_profiles.id = org_memberships.id) to auth user id.
    const { data: memberRow, error: memberFetchError } = await supabase
      .from('member_profiles')
      .select('user_id')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (memberFetchError || !memberRow) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const userId = memberRow.user_id

    // Get threads created by this user
    const { data: threads } = await supabase
      .from('threads')
      .select('id, title, category, created_at, comment_count:comments(count)')
      .eq('created_by', userId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get comment count for each thread
    const threadIds = threads?.map(t => t.id) || []
    const { data: commentCounts } = threadIds.length > 0 ? await supabase
      .from('comments')
      .select('thread_id')
      .in('thread_id', threadIds)
      .eq('org_id', orgId) : { data: [] }

    const countsMap = new Map<string, number>()
    commentCounts?.forEach(c => {
      countsMap.set(c.thread_id, (countsMap.get(c.thread_id) || 0) + 1)
    })

    const threadsWithCounts = threads?.map(thread => ({
      ...thread,
      comment_count: countsMap.get(thread.id) || 0,
    })) || []

    // Get comments made by this user
    const { data: comments } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        thread:threads!comments_thread_id_fkey (
          id,
          title,
          category
        )
      `)
      .eq('created_by', userId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get reactions given by this user
    const { data: reactions } = await supabase
      .from('reactions')
      .select(`
        id,
        reaction_type,
        created_at,
        thread:threads!reactions_thread_id_fkey (
          id,
          title
        ),
        comment:comments!reactions_comment_id_fkey (
          id,
          content
        )
      `)
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get events created by this user
    const { data: events } = await supabase
      .from('events')
      .select('id, title, start_time, created_at')
      .eq('created_by', userId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get payments for this user
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .order('payment_date', { ascending: false })
      .limit(20)

    // Calculate statistics
    const stats = {
      threads_created: threads?.length || 0,
      comments_made: comments?.length || 0,
      reactions_given: reactions?.length || 0,
      events_created: events?.length || 0,
      payments_count: payments?.length || 0,
      total_paid: payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
    }

    return NextResponse.json({
      stats,
      threads: threadsWithCounts,
      comments: comments || [],
      reactions: reactions || [],
      events: events || [],
      payments: payments || [],
    })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Get member activity error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
