import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Thread, DiscussionCategory, ThreadWithData, ThreadAuthor } from '@/types/database'
import ThreadSort from './ThreadSort'
import Sidebar from './Sidebar'

const CATEGORY_LABELS: Record<DiscussionCategory, string> = {
  aircraft_shares: 'Aircraft Shares / Block Time',
  instructor_availability: 'Instructor Availability',
  gear_for_sale: 'Gear for Sale',
  lounge_feedback: 'Lounge Feedback',
  other: 'Other',
}

export default async function DiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; category?: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Redirect pending users to approval page
  if (user.profile.status !== 'approved' && user.profile.role !== 'admin') {
    redirect('/pending-approval')
  }

  const supabase = await createClient()
  const params = await searchParams
  const sortBy = params?.sort || 'latest'
  const categoryParam = params?.category
  const categoryFilter = categoryParam && categoryParam !== 'all' 
    ? (categoryParam as DiscussionCategory)
    : undefined

  // Build query
  let query = supabase
    .from('threads')
    .select('*')
    .order('created_at', { ascending: false })

  // Apply category filter if specified
  if (categoryFilter) {
    query = query.eq('category', categoryFilter)
  }

  // Get threads
  const { data: threads, error: threadsError } = await query

  if (threadsError) {
    console.error('Error fetching threads:', threadsError)
  }

  // Type the threads as Thread[]
  const typedThreads = (threads || []) as Thread[]

  // Get author info for each thread
  const userIds = [...new Set(threads?.map(t => t.created_by).filter((id): id is string => id !== null) || [])]
  const { data: authors } = userIds.length > 0 ? await supabase
    .from('user_profiles')
    .select('id, full_name, email, profile_picture_url')
    .in('id', userIds) : { data: [] }

  const authorsMap = new Map(authors?.map(a => [a.id, a]) || [])

  // Get comment data for each thread (count and most recent comment time)
  const threadIds = typedThreads.map(t => t.id)
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
  let threadsWithData: ThreadWithData[] = typedThreads.map(thread => {
    const author = authorsMap.get(thread.created_by) as ThreadAuthor | undefined
    return {
      id: thread.id,
      title: thread.title,
      content: thread.content,
      category: thread.category,
      created_by: thread.created_by,
      author_email: thread.author_email,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      comment_count: countsMap.get(thread.id) || 0,
      latest_comment_at: latestCommentMap.get(thread.id) || null,
      author
    }
  })

  // Sort threads based on sortBy parameter
  if (sortBy === 'hot') {
    // Calculate hot score: combines comment count with recency
    // Recent threads with comments rank higher
    // Calculate hot score: use current time for sorting
    // Note: This runs on server, so we use a stable reference
    const now = new Date().getTime()
    threadsWithData = [...threadsWithData].sort((a, b) => {
      // Calculate hot score for each thread
      const calculateHotScore = (thread: ThreadWithData) => {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Discussions</h1>
            <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
              {threadsWithData.length > 0 && (
                <Suspense fallback={<div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse" />}>
                  <ThreadSort />
                </Suspense>
              )}
              <Link
                href={categoryFilter 
                  ? `/discussions/new?category=${categoryFilter}`
                  : '/discussions/new'}
                className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#0d1e26] text-white text-sm font-medium rounded-lg hover:bg-[#0a171c] transition-colors shadow-sm hover:shadow-md whitespace-nowrap ml-auto sm:ml-0"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Post New</span>
                <span className="sm:hidden">New</span>
              </Link>
            </div>
          </div>
          {categoryFilter && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-sm font-medium bg-[#0d1e26]/10 text-[#0d1e26] rounded-md">
                {CATEGORY_LABELS[categoryFilter]}
              </span>
              <Link
                href="/discussions"
                className="text-sm text-[#0d1e26] hover:text-[#0a171c] hover:underline"
              >
                Clear filter
              </Link>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Suspense fallback={<div className="space-y-6"><div className="h-64 bg-gray-100 rounded-lg animate-pulse" /></div>}>
              <Sidebar currentCategory={categoryFilter} />
            </Suspense>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">

            {!threadsWithData || threadsWithData.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 sm:p-12 text-center">
                <div className="max-w-md mx-auto">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 mb-6">
                    {categoryFilter
                      ? `No discussions in this category yet. Be the first to post!`
                      : 'No discussions yet. Be the first to start a discussion!'}
                  </p>
                  <Link
                    href={categoryFilter 
                      ? `/discussions/new?category=${categoryFilter}`
                      : '/discussions/new'}
                    className="inline-flex items-center px-5 py-2.5 bg-[#0d1e26] text-white text-sm font-semibold rounded-lg hover:bg-[#0a171c] transition-colors shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Start First Discussion
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Forum Header - Desktop Only */}
                <div className="hidden md:block bg-gray-50 border-b border-gray-200 px-4 py-3">
                  <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    <div className="col-span-6">Topic</div>
                    <div className="col-span-2 text-center">Author</div>
                    <div className="col-span-2 text-center">Replies</div>
                    <div className="col-span-2 text-center">Last Activity</div>
                  </div>
                </div>

                {/* Forum Threads */}
                <div className="divide-y divide-gray-200">
                  {threadsWithData.map((thread) => {
                    const author = thread.author
                    const lastActivity = thread.latest_comment_at || new Date(thread.created_at)
                    
                    return (
                      <Link
                        key={thread.id}
                        href={`/discussions/${thread.id}`}
                        className="block hover:bg-gray-50 transition-colors touch-manipulation"
                      >
                        {/* Mobile Card Layout - Topics First */}
                        <div className="md:hidden p-4 sm:p-5 active:bg-gray-100 transition-colors">
                          {/* Topic Title - Most Prominent */}
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 line-clamp-3 leading-snug">
                            {thread.title}
                          </h3>
                          
                          {/* Category and Metadata Row */}
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className="px-2.5 py-1 text-xs font-semibold bg-[#0d1e26]/10 text-[#0d1e26] rounded-md">
                              {CATEGORY_LABELS[thread.category]}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span className="font-medium text-gray-700">{thread.comment_count || 0}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(thread.latest_comment_at ? new Date(thread.latest_comment_at).toISOString() : thread.created_at)}
                            </span>
                          </div>
                          
                          {/* Author Info - Secondary */}
                          <div className="flex items-center gap-2">
                            {author?.profile_picture_url ? (
                              <div className="relative w-6 h-6 rounded-full overflow-hidden border border-gray-300 flex-shrink-0">
                                <Image
                                  src={author?.profile_picture_url}
                                  alt={author?.full_name || author?.email || 'User'}
                                  fill
                                  className="object-cover"
                                  sizes="24px"
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border border-gray-300 flex-shrink-0">
                                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                            <span className={`text-xs ${!thread.created_by && thread.author_email ? 'text-gray-500 italic' : 'text-gray-600'}`}>
                              {!thread.created_by && thread.author_email 
                                ? `${thread.author_email.split('@')[0]}...`
                                : (author?.full_name?.split(' ')[0] || author?.email?.split('@')[0] || 'Anonymous')}
                            </span>
                          </div>
                        </div>

                        {/* Desktop Table Layout */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-4 items-center">
                          {/* Topic */}
                          <div className="col-span-6 min-w-0">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {author?.profile_picture_url ? (
                                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300">
                                    <Image
                                      src={author?.profile_picture_url}
                                      alt={author?.full_name || author?.email || 'User'}
                                      fill
                                      className="object-cover"
                                      sizes="32px"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border border-gray-300">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 hover:text-[#0d1e26] line-clamp-2 mb-1">
                                  {thread.title}
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 text-xs font-medium bg-[#0d1e26]/10 text-[#0d1e26] rounded">
                                    {CATEGORY_LABELS[thread.category]}
                                  </span>
                                  <span className="text-xs text-gray-500 line-clamp-1">
                                    {thread.content.substring(0, 60)}...
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Author */}
                          <div className="col-span-2 text-center">
                            <div className="text-xs text-gray-600">
                              <div className={`font-medium ${!thread.created_by && thread.author_email ? 'text-gray-500 italic' : 'text-gray-900'}`}>
                                {!thread.created_by && thread.author_email 
                                  ? `${thread.author_email.split('@')[0]}...`
                                  : (author?.full_name?.split(' ')[0] || author?.email?.split('@')[0] || 'Anonymous')}
                              </div>
                            </div>
                          </div>

                          {/* Replies */}
                          <div className="col-span-2 text-center">
                            <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span className="font-medium">{thread.comment_count || 0}</span>
                            </div>
                          </div>

                          {/* Last Activity */}
                          <div className="col-span-2 text-center">
                            <div className="text-xs text-gray-500">
                              {formatDate(thread.latest_comment_at ? new Date(thread.latest_comment_at).toISOString() : thread.created_at)}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
