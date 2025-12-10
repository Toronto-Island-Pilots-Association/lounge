import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Thread } from '@/types/database'
import ThreadSort from './ThreadSort'

export default async function DiscussionPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()
  const params = await searchParams
  const sortBy = params?.sort || 'latest'

  // Get threads
  const { data: threads, error: threadsError } = await supabase
    .from('threads')
    .select('*')
    .order('created_at', { ascending: false })

  if (threadsError) {
    console.error('Error fetching threads:', threadsError)
  }

  // Get author info for each thread
  const userIds = [...new Set(threads?.map(t => t.created_by) || [])]
  const { data: authors } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, profile_picture_url')
    .in('id', userIds)

  const authorsMap = new Map(authors?.map(a => [a.id, a]) || [])

  // Get comment data for each thread (count and most recent comment time)
  const threadIds = threads?.map(t => t.id) || []
  const { data: comments } = await supabase
    .from('comments')
    .select('thread_id, created_at')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: false })

  const countsMap = new Map<string, number>()
  const latestCommentMap = new Map<string, Date>()
  
  comments?.forEach(c => {
    countsMap.set(c.thread_id, (countsMap.get(c.thread_id) || 0) + 1)
    // Track the most recent comment time for each thread
    const existing = latestCommentMap.get(c.thread_id)
    if (!existing || new Date(c.created_at) > existing) {
      latestCommentMap.set(c.thread_id, new Date(c.created_at))
    }
  })

  // Add comment counts and author info to threads
  let threadsWithData = threads?.map(thread => ({
    ...thread,
    comment_count: countsMap.get(thread.id) || 0,
    latest_comment_at: latestCommentMap.get(thread.id) || null,
    author: authorsMap.get(thread.created_by)
  })) || []

  // Sort threads based on sortBy parameter
  if (sortBy === 'hot') {
    // Calculate hot score: combines comment count with recency
    // Recent threads with comments rank higher
    const now = Date.now()
    threadsWithData = [...threadsWithData].sort((a, b) => {
      // Calculate hot score for each thread
      const calculateHotScore = (thread: typeof threadsWithData[0]) => {
        const commentCount = thread.comment_count || 0
        const threadAge = now - new Date(thread.created_at).getTime()
        const hoursSinceThread = threadAge / (1000 * 60 * 60)
        
        // If thread has comments, use most recent comment time, otherwise use thread creation time
        const lastActivity = thread.latest_comment_at 
          ? new Date(thread.latest_comment_at).getTime()
          : new Date(thread.created_at).getTime()
        const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60)
        
        // Hot score: comment count weighted by recency
        // More recent activity = higher score
        // Threads with recent comments get a boost
        const recencyWeight = Math.max(0, 1 - hoursSinceActivity / 168) // Decay over 7 days
        const commentWeight = Math.log10(commentCount + 1) // Logarithmic scale for comments
        
        return commentCount * recencyWeight + commentWeight * 10
      }
      
      const scoreA = calculateHotScore(a)
      const scoreB = calculateHotScore(b)
      
      // Sort by hot score (descending)
      if (scoreB !== scoreA) {
        return scoreB - scoreA
      }
      
      // Tiebreaker: most recent activity
      const lastActivityA = a.latest_comment_at ? new Date(a.latest_comment_at).getTime() : new Date(a.created_at).getTime()
      const lastActivityB = b.latest_comment_at ? new Date(b.latest_comment_at).getTime() : new Date(b.created_at).getTime()
      return lastActivityB - lastActivityA
    })
  } else {
    // Sort by created_at (descending) - already sorted, but ensure it's correct
    threadsWithData = [...threadsWithData].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Discussion Board</h1>
            <p className="mt-1.5 text-sm sm:text-base text-gray-600">
              Connect with other TIPA members and share your thoughts
            </p>
          </div>
          {threadsWithData.length > 0 && (
            <div className="flex items-center justify-end gap-3">
              <Suspense fallback={<div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse" />}>
                <ThreadSort />
              </Suspense>
              <Link
                href="/discussion/new"
                className="inline-flex items-center justify-center w-8 h-8 bg-[#0d1e26] text-white rounded-lg hover:bg-[#0a171c] transition-colors shadow-sm hover:shadow-md"
                title="New Thread"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            </div>
          )}
          {threadsWithData.length === 0 && (
            <div className="flex items-center justify-end gap-3">
              <Link
                href="/discussion/new"
                className="inline-flex items-center justify-center w-8 h-8 bg-[#0d1e26] text-white rounded-lg hover:bg-[#0a171c] transition-colors shadow-sm hover:shadow-md"
                title="New Thread"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {!threadsWithData || threadsWithData.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-600 mb-6">No threads yet. Be the first to start a discussion!</p>
              <Link
                href="/discussion/new"
                className="inline-flex items-center px-5 py-2.5 bg-[#0d1e26] text-white text-sm font-semibold rounded-lg hover:bg-[#0a171c] transition-colors shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Thread
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {threadsWithData.map((thread: Thread & { author?: any; comment_count?: number }) => {
              const author = thread.author || {}
              return (
                <Link
                  key={thread.id}
                  href={`/discussion/${thread.id}`}
                  className="block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      {/* Author Avatar */}
                      <div className="flex-shrink-0">
                        {author.profile_picture_url ? (
                          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-gray-200">
                            <Image
                              src={author.profile_picture_url}
                              alt={author.full_name || author.email || 'User'}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-2 border-gray-200">
                            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Thread Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 hover:text-[#0d1e26] transition-colors line-clamp-2">
                          {thread.title}
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                          {thread.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-700">
                              {author.full_name || author.email || 'Anonymous'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatDate(thread.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="font-medium">
                              {thread.comment_count || 0} {thread.comment_count === 1 ? 'comment' : 'comments'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

