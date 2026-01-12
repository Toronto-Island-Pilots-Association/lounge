import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Thread, Comment, ClassifiedCategory } from '@/types/database'
import CommentForm from './CommentForm'
import ReactionButton from './ReactionButton'
import DeleteThreadButton from './DeleteThreadButton'
import DeleteCommentButton from './DeleteCommentButton'

const CATEGORY_LABELS: Record<ClassifiedCategory, string> = {
  aircraft_shares: 'Aircraft Shares / Block Time',
  instructor_availability: 'Instructor Availability',
  gear_for_sale: 'Gear for Sale',
  lounge_feedback: 'Lounge Feedback',
  other: 'Other',
}

export default async function ClassifiedPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params
  const supabase = await createClient()

  // Get thread
  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .select('*')
    .eq('id', id)
    .single()

  if (threadError || !thread) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Classified Not Found</h2>
            <p className="text-gray-600 mb-6">The classified you're looking for doesn't exist.</p>
            <Link
              href="/classifieds"
              className="inline-block px-6 py-2 bg-[#0d1e26] text-white font-semibold rounded-lg hover:bg-[#0a171c] transition-colors"
            >
              Back to Classifieds
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Get author info (if created_by is not null)
  const { data: author } = thread.created_by ? await supabase
    .from('user_profiles')
    .select('id, full_name, email, profile_picture_url')
    .eq('id', thread.created_by)
    .single() : { data: null }
  
  // If user is deleted but we have author_email, show email with (deleted)
  const isThreadAuthorDeleted = !thread.created_by && thread.author_email
  const threadDisplayName = isThreadAuthorDeleted
    ? `${thread.author_email} (deleted)`
    : (author?.full_name || author?.email || 'Anonymous')

  // Get comments
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('*')
    .eq('thread_id', id)
    .order('created_at', { ascending: true })

  if (commentsError) {
    console.error('Error fetching comments:', commentsError)
  }

  // Get author info for each comment
  const commentUserIds = [...new Set(comments?.map(c => c.created_by).filter((id): id is string => id !== null) || [])]
  const { data: commentAuthors } = commentUserIds.length > 0 ? await supabase
    .from('user_profiles')
    .select('id, full_name, email, profile_picture_url')
    .in('id', commentUserIds) : { data: [] }

  const commentAuthorsMap = new Map(commentAuthors?.map(a => [a.id, a]) || [])

  // Add author info to comments
  const commentsWithAuthors = comments?.map(comment => ({
    ...comment,
    author: commentAuthorsMap.get(comment.created_by)
  })) || []

  // Get reactions for thread
  const { data: threadReactions } = await supabase
    .from('reactions')
    .select('*')
    .eq('thread_id', id)

  const threadReactionCounts = {
    like: threadReactions?.filter(r => r.reaction_type === 'like').length || 0,
    upvote: threadReactions?.filter(r => r.reaction_type === 'upvote').length || 0,
    downvote: threadReactions?.filter(r => r.reaction_type === 'downvote').length || 0,
  }

  const userThreadReaction = threadReactions?.find(r => r.user_id === user.id)?.reaction_type || null

  // Get reactions for comments
  const commentIds = comments?.map(c => c.id) || []
  const { data: commentReactions } = await supabase
    .from('reactions')
    .select('*')
    .in('comment_id', commentIds)

  const commentReactionsMap = new Map<string, typeof commentReactions>()
  commentReactions?.forEach(r => {
    if (r.comment_id) {
      const existing = commentReactionsMap.get(r.comment_id) || []
      commentReactionsMap.set(r.comment_id, [...existing, r])
    }
  })

  // Add reaction data to comments
  const commentsWithReactions = commentsWithAuthors.map(comment => {
    const reactions = commentReactionsMap.get(comment.id) || []
    const reactionCounts = {
      like: reactions.filter(r => r.reaction_type === 'like').length,
      upvote: reactions.filter(r => r.reaction_type === 'upvote').length,
      downvote: reactions.filter(r => r.reaction_type === 'downvote').length,
    }
    const userReaction = reactions.find(r => r.user_id === user.id)?.reaction_type || null

    return {
      ...comment,
      reactionCounts,
      userReaction,
    }
  })

  const threadWithAuthor: Thread & { author?: any } = { ...thread, author }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const threadAuthor = threadWithAuthor.author || {}

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/classifieds"
            className="text-[#0d1e26] hover:text-[#0a171c] text-sm font-medium"
          >
            ← Back to Classifieds
          </Link>
        </div>

        {/* Thread */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{threadWithAuthor.title}</h1>
              <span className="inline-block px-3 py-1 text-sm font-medium bg-[#0d1e26]/10 text-[#0d1e26] rounded-md">
                {CATEGORY_LABELS[thread.category as ClassifiedCategory]}
              </span>
            </div>
            <DeleteThreadButton
              threadId={id}
              isOwner={thread.created_by === user.id && thread.created_by !== null}
              isAdmin={user.profile.role === 'admin'}
            />
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            {threadAuthor.profile_picture_url ? (
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-300">
                <Image
                  src={threadAuthor.profile_picture_url}
                  alt={threadAuthor.full_name || threadAuthor.email || 'User'}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
            <div>
              <div className={`text-sm font-medium ${isThreadAuthorDeleted ? 'text-gray-600 italic' : 'text-gray-900'}`}>
                {threadDisplayName}
              </div>
              <div className="text-xs text-gray-500">{formatDate(threadWithAuthor.created_at)}</div>
            </div>
          </div>

          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap mb-4">
            {threadWithAuthor.content}
          </div>

          {/* Thread Reactions */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <ReactionButton
              targetId={id}
              targetType="thread"
              initialReactions={threadReactionCounts}
              userReaction={userThreadReaction}
            />
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {commentsWithAuthors.length} {commentsWithAuthors.length === 1 ? 'Comment' : 'Comments'}
          </h2>

          {/* Comment Form */}
          <div className="mb-8">
            <CommentForm threadId={id} />
          </div>

          {/* Comments List */}
          {commentsWithReactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
          ) : (
            <div className="space-y-6">
              {commentsWithReactions.map((comment: Comment & { author?: any; author_email?: string | null; reactionCounts?: any; userReaction?: string | null }) => {
                const commentAuthor = comment.author || {}
                // If user is deleted (created_by is null) but we have author_email, show email with (deleted)
                const isDeleted = !comment.created_by && comment.author_email
                const displayName = isDeleted 
                  ? `${comment.author_email} (deleted)`
                  : (commentAuthor.full_name || commentAuthor.email || 'Anonymous')
                
                return (
                  <div key={comment.id} className="border-t border-gray-200 pt-6 first:border-t-0 first:pt-0">
                    <div className="flex items-start gap-3">
                      {commentAuthor.profile_picture_url ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-300 flex-shrink-0">
                          <Image
                            src={commentAuthor.profile_picture_url}
                            alt={commentAuthor.full_name || commentAuthor.email || 'User'}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300 flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`text-sm font-medium ${isDeleted ? 'text-gray-600 italic' : 'text-gray-900'}`}>
                              {displayName}
                            </div>
                            <div className="text-xs text-gray-500">{formatDate(comment.created_at)}</div>
                          </div>
                          <DeleteCommentButton
                            commentId={comment.id}
                            isOwner={comment.created_by === user.id && comment.created_by !== null}
                            isAdmin={user.profile.role === 'admin'}
                          />
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap mb-3">
                          {comment.content}
                        </div>
                        {/* Comment Reactions */}
                        <div className="mt-2">
                          <ReactionButton
                            targetId={comment.id}
                            targetType="comment"
                            initialReactions={comment.reactionCounts || { like: 0, upvote: 0, downvote: 0 }}
                            userReaction={comment.userReaction || null}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
