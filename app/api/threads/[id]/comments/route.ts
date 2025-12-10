import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    const userIds = [...new Set(comments?.map(c => c.created_by) || [])]
    const { data: authors } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, profile_picture_url')
      .in('id', userIds)

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

    // Verify thread exists
    const { data: thread } = await supabase
      .from('threads')
      .select('id')
      .eq('id', id)
      .single()

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        thread_id: id,
        content: content.trim(),
        created_by: user.id
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Get author info
    const { data: author } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, profile_picture_url')
      .eq('id', user.id)
      .single()

    return NextResponse.json({ comment: { ...data, author } })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Authentication required' ? 403 : 500 }
    )
  }
}

