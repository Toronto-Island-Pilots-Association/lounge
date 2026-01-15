import { createClient } from '@/lib/supabase/server'
import { sendDiscussionDigestEmail } from '@/lib/resend'
import { NextResponse } from 'next/server'

// This endpoint should be protected with a secret token or Vercel Cron
// For Vercel Cron, add this to vercel.json
// For external cron services, use a secret token in the Authorization header

export async function GET(request: Request) {
  try {
    // Verify the request is from a trusted source
    // For Vercel Cron, check for the Authorization header with "Bearer <vercel-secret>"
    // For external cron services, check CRON_SECRET environment variable
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // If CRON_SECRET is set, require it to match (for external cron services)
    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }
    // If CRON_SECRET is not set, we assume Vercel Cron is being used
    // Vercel automatically adds authentication headers to cron requests
    // In development/testing, you can call this endpoint directly

    const supabase = await createClient()

    // Get the last 7 days of discussions
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    // Fetch the last 7 discussion threads created in the past 7 days
    const { data: threads, error: threadsError } = await supabase
      .from('threads')
      .select('*')
      .gte('created_at', sevenDaysAgoISO)
      .order('created_at', { ascending: false })
      .limit(7)

    if (threadsError) {
      console.error('Error fetching threads:', threadsError)
      return NextResponse.json(
        { error: 'Failed to fetch threads', details: threadsError.message },
        { status: 500 }
      )
    }

    // If no threads, return early
    if (!threads || threads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No discussions in the past 7 days',
        threadsSent: 0,
        membersNotified: 0,
      })
    }

    // Get author info for each thread
    const userIds = [...new Set(threads.map(t => t.created_by).filter((id): id is string => id !== null))]
    const { data: authors } = userIds.length > 0 ? await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds) : { data: [] }

    const authorsMap = new Map(authors?.map(a => [a.id, a]) || [])

    // Get comment counts for each thread
    const threadIds = threads.map(t => t.id)
    const { data: commentCounts } = await supabase
      .from('comments')
      .select('thread_id')
      .in('thread_id', threadIds)

    const countsMap = new Map<string, number>()
    commentCounts?.forEach(c => {
      countsMap.set(c.thread_id, (countsMap.get(c.thread_id) || 0) + 1)
    })

    // Prepare threads with author info and comment counts
    const threadsWithData = threads.map(thread => ({
      id: thread.id,
      title: thread.title,
      content: thread.content,
      category: thread.category,
      created_at: thread.created_at,
      author: authorsMap.get(thread.created_by) || null,
      comment_count: countsMap.get(thread.id) || 0,
    }))

    // Get all approved members
    const { data: members, error: membersError } = await supabase
      .from('user_profiles')
      .select('email, full_name, first_name, last_name')
      .eq('status', 'approved')
      .not('email', 'is', null)

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch members', details: membersError.message },
        { status: 500 }
      )
    }

    if (!members || members.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No approved members found',
        threadsSent: threadsWithData.length,
        membersNotified: 0,
      })
    }

    // Send emails to all members
    const emailPromises = members.map(member => {
      const name = member.full_name || 
                  (member.first_name && member.last_name 
                    ? `${member.first_name} ${member.last_name}` 
                    : member.email?.split('@')[0] || 'Member')
      
      return sendDiscussionDigestEmail(
        member.email!,
        name,
        threadsWithData
      ).catch(err => {
        console.error(`Error sending digest to ${member.email}:`, err)
        return { success: false, error: err }
      })
    })

    // Wait for all emails to be sent (or fail)
    const results = await Promise.allSettled(emailPromises)
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    return NextResponse.json({
      success: true,
      message: `Digest sent to ${successful} members`,
      threadsSent: threadsWithData.length,
      membersNotified: successful,
      membersFailed: failed,
    })
  } catch (error: any) {
    console.error('Error in discussion digest cron:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send discussion digest',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
