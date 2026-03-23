import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100

export type NotificationType = 'reply' | 'mention'

export interface NotificationItem {
  id: string
  type: NotificationType
  thread_id: string
  comment_id: string
  actor_id: string | null
  read_at: string | null
  created_at: string
  thread_title?: string
  actor?: { id: string; full_name: string | null; profile_picture_url: string | null }
}

/** GET /api/notifications - list notifications for current user with unread count */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const orgId = user.profile?.org_id
    if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    )
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0
    const unreadOnly = searchParams.get('unread_only') === 'true'

    const query = supabase
      .from('notifications')
      .select('id, type, thread_id, comment_id, actor_id, read_at, created_at')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query.is('read_at', null)
    }

    const { data: notifications, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .is('read_at', null)

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({
        notifications: [],
        unreadCount: unreadCount ?? 0,
      })
    }

    const threadIds = [...new Set(notifications.map((n) => n.thread_id))]
    const actorIds = [...new Set(notifications.map((n) => n.actor_id).filter(Boolean))] as string[]

    const [threadsRes, actorsRes] = await Promise.all([
      threadIds.length > 0
        ? supabase.from('threads').select('id, title').in('id', threadIds)
          .eq('org_id', orgId)
        : { data: [] },
      actorIds.length > 0
        ? supabase.from('user_profiles').select('id, full_name, profile_picture_url').in('id', actorIds)
          .eq('org_id', orgId)
        : { data: [] },
    ])

    const threadMap = new Map((threadsRes.data || []).map((t) => [t.id, t]))
    const actorMap = new Map((actorsRes.data || []).map((a) => [a.id, a]))

    const items: NotificationItem[] = (notifications || []).map((n) => ({
      id: n.id,
      type: n.type as NotificationType,
      thread_id: n.thread_id,
      comment_id: n.comment_id,
      actor_id: n.actor_id,
      read_at: n.read_at,
      created_at: n.created_at,
      thread_title: threadMap.get(n.thread_id)?.title,
      actor: n.actor_id ? actorMap.get(n.actor_id) : undefined,
    }))

    return NextResponse.json({
      notifications: items,
      unreadCount: unreadCount ?? 0,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: message },
      { status: message === 'Forbidden: Authentication required' ? 403 : 500 }
    )
  }
}

/** PATCH /api/notifications - mark notifications as read (by ids or by thread_id) */
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    const orgId = user.profile?.org_id
    if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    const supabase = await createClient()
    const body = await request.json().catch(() => ({}))
    const { ids, thread_id: threadId } = body as { ids?: string[]; thread_id?: string }

    const now = new Date().toISOString()

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .in('id', ids)
        .select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ marked: data?.length ?? 0 })
    }

    if (threadId && typeof threadId === 'string') {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .eq('thread_id', threadId)
        .select('id')
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ marked: data?.length ?? 0 })
    }

    return NextResponse.json({ error: 'Provide ids (array) or thread_id' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: message },
      { status: message === 'Forbidden: Authentication required' ? 403 : 500 }
    )
  }
}
