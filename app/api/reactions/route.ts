import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags } from '@/lib/settings'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const flags = await getFeatureFlags()
    if (!flags.discussions) {
      return NextResponse.json({ error: 'Discussions are not enabled for this organization' }, { status: 403 })
    }
    const orgId = user.profile?.org_id
    if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    const body = await request.json()
    const { thread_id, comment_id, reaction_type } = body

    if (!reaction_type || reaction_type !== 'like') {
      return NextResponse.json(
        { error: 'Invalid reaction type. Only "like" is supported' },
        { status: 400 }
      )
    }

    if (!thread_id && !comment_id) {
      return NextResponse.json(
        { error: 'Either thread_id or comment_id is required' },
        { status: 400 }
      )
    }

    if (thread_id && comment_id) {
      return NextResponse.json(
        { error: 'Cannot react to both thread and comment' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify the target belongs to the current org to prevent cross-tenant linking.
    if (thread_id) {
      const { data: eventThread, error: threadError } = await supabase
        .from('threads')
        .select('id')
        .eq('id', thread_id)
        .eq('org_id', orgId)
        .single()
      if (threadError || !eventThread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
      }
    } else if (comment_id) {
      const { data: eventComment, error: commentError } = await supabase
        .from('comments')
        .select('id')
        .eq('id', comment_id)
        .eq('org_id', orgId)
        .single()
      if (commentError || !eventComment) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
      }
    }

    // Check if user already has a reaction of this type
    const { data: existingReaction } = await supabase
      .from('reactions')
      .select('id, reaction_type')
      .eq('user_id', user.id)
      .eq(thread_id ? 'thread_id' : 'comment_id', thread_id || comment_id)
      .eq('org_id', orgId)
      .single()

    if (existingReaction) {
      if (existingReaction.reaction_type === reaction_type) {
        // User is removing their reaction (toggling off)
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id)
          .eq('org_id', orgId)

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ message: 'Reaction removed', removed: true })
      } else {
        // User is changing their reaction type
        const { error } = await supabase
          .from('reactions')
          .update({ reaction_type })
          .eq('id', existingReaction.id)
          .eq('org_id', orgId)

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ message: 'Reaction updated' })
      }
    }

    // Create new reaction
    const { data, error } = await supabase
      .from('reactions')
      .insert({
        thread_id: thread_id || null,
        comment_id: comment_id || null,
        user_id: user.id,
        org_id: orgId,
        reaction_type,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ reaction: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

