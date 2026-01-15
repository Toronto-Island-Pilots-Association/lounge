import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAuth()
    const supabase = await createClient()

    // Get threads
    const { data: threads, error: threadsError } = await supabase
      .from('threads')
      .select('*')
      .order('created_at', { ascending: false })

    if (threadsError) {
      return NextResponse.json({ error: threadsError.message }, { status: 400 })
    }

    // Get author info for each thread
    const userIds = [...new Set(threads?.map(t => t.created_by).filter((id): id is string => id !== null) || [])]
    const { data: authors } = userIds.length > 0 ? await supabase
      .from('user_profiles')
      .select('id, full_name, email, profile_picture_url')
      .in('id', userIds) : { data: [] }

    const authorsMap = new Map(authors?.map(a => [a.id, a]) || [])

    // Get comment counts for each thread
    const threadIds = threads?.map(t => t.id) || []
    const { data: commentCounts } = await supabase
      .from('comments')
      .select('thread_id')
      .in('thread_id', threadIds)

    const countsMap = new Map<string, number>()
    commentCounts?.forEach(c => {
      countsMap.set(c.thread_id, (countsMap.get(c.thread_id) || 0) + 1)
    })

    // Add comment counts and author info to threads
    const threadsWithCounts = threads?.map(thread => ({
      ...thread,
      comment_count: countsMap.get(thread.id) || 0,
      author: authorsMap.get(thread.created_by)
    }))

    return NextResponse.json({ threads: threadsWithCounts || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { title, content, category, image_urls } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['aircraft_shares', 'instructor_availability', 'gear_for_sale', 'other']
    const threadCategory = category && validCategories.includes(category) ? category : 'other'

    // Validate image_urls (should be an array of strings, max 5)
    const imageUrls = Array.isArray(image_urls) 
      ? image_urls.filter((url): url is string => typeof url === 'string').slice(0, 5)
      : []

    const supabase = await createClient()

    // Get user email before creating thread
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    const { data, error } = await supabase
      .from('threads')
      .insert({
        title,
        content,
        category: threadCategory,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        created_by: user.id,
        author_email: userProfile?.email || user.email || null
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

    return NextResponse.json({ thread: { ...data, comment_count: 0, author } })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Authentication required' ? 403 : 500 }
    )
  }
}

