import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendReplyNotificationEmail, sendMentionNotificationEmail } from '@/lib/resend'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const supabase = await createClient()

    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Get author info for each comment
    const userIds = [...new Set(comments?.map(c => c.created_by).filter((id): id is string => id !== null) || [])]
    const { data: authors } = userIds.length > 0 ? await supabase
      .from('user_profiles')
      .select('id, full_name, email, profile_picture_url')
      .in('id', userIds) : { data: [] }

    const authorsMap = new Map(authors?.map(a => [a.id, a]) || [])

    // Add author info to comments
    const commentsWithAuthors = comments?.map(comment => ({
      ...comment,
      author: authorsMap.get(comment.created_by)
    }))

    return NextResponse.json({ comments: commentsWithAuthors || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify thread exists and get thread details for notifications
    const { data: thread } = await supabase
      .from('threads')
      .select('id, title, created_by')
      .eq('id', id)
      .single()

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Get commenter's profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    const { data, error } = await supabase
      .from('comments')
      .insert({
        thread_id: id,
        content: content.trim(),
        created_by: user.id,
        author_email: userProfile?.email || user.email || null
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Get author info for response
    const { data: author } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, profile_picture_url')
      .eq('id', user.id)
      .single()

    // Send reply notifications (non-blocking)
    sendReplyNotifications({
      supabase,
      threadId: id,
      threadTitle: thread.title,
      threadAuthorId: thread.created_by,
      commenterId: user.id,
      commenterName: userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Someone',
      commentContent: content.trim(),
    }).catch(err => console.error('Error sending reply notifications:', err))

    return NextResponse.json({ comment: { ...data, author } })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Authentication required' ? 403 : 500 }
    )
  }
}

function extractMentionedUserIds(content: string): string[] {
  const mentionRegex = /@\[[^\]]+\]\(([^)]+)\)/g
  const ids: string[] = []
  let match
  while ((match = mentionRegex.exec(content)) !== null) {
    ids.push(match[1])
  }
  return ids
}

async function sendReplyNotifications({
  supabase,
  threadId,
  threadTitle,
  threadAuthorId,
  commenterId,
  commenterName,
  commentContent,
}: {
  supabase: any
  threadId: string
  threadTitle: string
  threadAuthorId: string | null
  commenterId: string
  commenterName: string
  commentContent: string
}) {
  // Extract @mentioned user IDs from the comment
  const mentionedUserIds = new Set(
    extractMentionedUserIds(commentContent).filter(id => id !== commenterId)
  )

  // Collect reply notification recipients: thread author + previous commenters (excluding mentions, handled separately)
  const replyUserIds = new Set<string>()

  if (threadAuthorId && threadAuthorId !== commenterId) {
    replyUserIds.add(threadAuthorId)
  }

  const { data: previousComments } = await supabase
    .from('comments')
    .select('created_by')
    .eq('thread_id', threadId)
    .not('created_by', 'is', null)
    .neq('created_by', commenterId)

  previousComments?.forEach((c: { created_by: string }) => {
    replyUserIds.add(c.created_by)
  })

  // Remove mentioned users from reply set — they get the mention email instead
  mentionedUserIds.forEach(id => replyUserIds.delete(id))

  const allUserIds = new Set([...replyUserIds, ...mentionedUserIds])
  if (allUserIds.size === 0) return

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, notify_replies')
    .in('id', Array.from(allUserIds))
    .eq('notify_replies', true)

  if (!profiles || profiles.length === 0) return

  const emailPromises = profiles.map((profile: { id: string; email: string; full_name: string | null }) => {
    const recipientName = profile.full_name?.split(' ')[0] || profile.email.split('@')[0]

    if (mentionedUserIds.has(profile.id)) {
      return sendMentionNotificationEmail(
        profile.email,
        recipientName,
        threadTitle,
        threadId,
        commenterName,
        commentContent,
      )
    }

    const reason = profile.id === threadAuthorId ? 'thread_author' as const : 'participant' as const
    return sendReplyNotificationEmail(
      profile.email,
      recipientName,
      threadTitle,
      threadId,
      commenterName,
      commentContent,
      reason
    )
  })

  await Promise.allSettled(emailPromises)
}

