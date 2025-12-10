import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET reactions for a thread or comment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ target: string }> }
) {
  try {
    await requireAuth()
    const { target } = await params
    const supabase = await createClient()
    const url = new URL(request.url)
    const type = url.searchParams.get('type') // 'thread' or 'comment'

    if (!type || !['thread', 'comment'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "thread" or "comment"' },
        { status: 400 }
      )
    }

    const { data: reactions, error } = await supabase
      .from('reactions')
      .select('*')
      .eq(type === 'thread' ? 'thread_id' : 'comment_id', target)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Count reactions by type
    const counts = {
      like: 0,
      upvote: 0,
      downvote: 0,
    }

    reactions?.forEach(r => {
      if (r.reaction_type in counts) {
        counts[r.reaction_type as keyof typeof counts]++
      }
    })

    return NextResponse.json({
      reactions: reactions || [],
      counts,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

