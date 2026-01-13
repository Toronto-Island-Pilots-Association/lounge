import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserIncludingPending } from '@/lib/auth'
import { getMembershipFee } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'
// import { appendMemberToSheet } from '@/lib/google-sheets' // Not used - Google Sheets append happens on status change
import { Resource, Event } from '@/types/database'
import PayPalButton from '@/components/PayPalButton'
import MembershipCard from '@/components/MembershipCard'

export default async function DashboardPage() {
  const user = await getCurrentUserIncludingPending()

  if (!user) {
    redirect('/login')
  }

  const isPending = user.profile.status === 'pending' && user.profile.role !== 'admin'
  const isRejected = user.profile.status === 'rejected' && user.profile.role !== 'admin'

  // Check if user was invited and needs to change password
  const wasInvited = user.user_metadata?.invited_by_admin === true
  const needsPasswordChange = wasInvited && user.profile.status === 'pending'

  // Note: Google Sheets append is handled in:
  // 1. /api/auth/signup - for password signups
  // 2. /api/profile PATCH - when profile is completed
  // The appendMemberToSheet function now checks for duplicates before appending

  const membershipFee = await getMembershipFee()
  const isPaid = user.profile.membership_level === 'Active' || user.profile.membership_level === 'Lifetime'
  const isExpired = user.profile.membership_expires_at
    ? new Date(user.profile.membership_expires_at) < new Date()
    : false

  // Fetch top resources, events, and threads (only for approved users)
  const supabase = await createClient()
  let topResources: Resource[] = []
  let upcomingEvents: Event[] = []
  let topThreads: any[] = []

  if (!isPending && !isRejected) {
    // Fetch only minimal fields needed for display
    const { data: resources } = await supabase
      .from('resources')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    const now = new Date().toISOString()
    const { data: events } = await supabase
      .from('events')
      .select('id, title, start_time')
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(5)

    topResources = (resources as Resource[]) || []
    upcomingEvents = (events as Event[]) || []

    // Fetch top threads with minimal fields
    const { data: threads } = await supabase
      .from('threads')
      .select('id, title, created_at, created_by')
      .order('created_at', { ascending: false })
      .limit(5)

    if (threads && threads.length > 0) {
      // Get author info for threads
      const threadUserIds = [...new Set(threads.map(t => t.created_by).filter((id): id is string => id !== null))]
      const { data: threadAuthors } = threadUserIds.length > 0 ? await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', threadUserIds) : { data: [] }

      const threadAuthorsMap = new Map(threadAuthors?.map(a => [a.id, a]) || [])

      // Get comment counts for threads
      const threadIds = threads.map(t => t.id)
      const { data: threadCommentCounts } = threadIds.length > 0 ? await supabase
        .from('comments')
        .select('thread_id')
        .in('thread_id', threadIds) : { data: [] }

      const threadCountsMap = new Map<string, number>()
      threadCommentCounts?.forEach(c => {
        threadCountsMap.set(c.thread_id, (threadCountsMap.get(c.thread_id) || 0) + 1)
      })

      topThreads = threads.map(thread => ({
        id: thread.id,
        title: thread.title,
        created_at: thread.created_at,
        comment_count: threadCountsMap.get(thread.id) || 0,
        author: threadAuthorsMap.get(thread.created_by) || null
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                  Welcome, {user.profile.full_name || user.profile.email}!
                </h1>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                  {/* Wallet-Sized Membership Card - Only for approved members */}
                  {!isPending && !isRejected && (
                    <MembershipCard
                      user={user}
                      isPending={isPending}
                      isRejected={isRejected}
                      isPaid={isPaid}
                      isExpired={isExpired}
                    />
                  )}

                  {/* Subscription box hidden for now */}
                  {false && !isPaid && (
                    <div className="bg-[#f0f4f6] rounded-lg p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Upgrade to Paid Membership
                      </h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Unlock exclusive content and benefits with a paid membership.
                      </p>
                      <div className="border-t border-[#d9e2e6] pt-4">
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          Annual Membership: ${membershipFee.toFixed(2)}/year
                        </p>
                        <PayPalButton />
                      </div>
                    </div>
                  )}

                </div>

                {needsPasswordChange ? (
                  <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                          Action Required: Change Your Password
                        </h3>
                        <p className="text-yellow-800 mb-4">
                          You were invited by an administrator. Please change your temporary password to secure your account and activate full access.
                        </p>
                        <Link
                          href="/change-password"
                          className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium transition-colors"
                        >
                          Change Password Now
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : isPending ? (
                  <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                          Account Pending Approval
                        </h3>
                        <p className="text-yellow-800 mb-4">
                          Thank you for joining TIPA! Your account is currently pending review by an administrator.
                        </p>
                        <p className="text-sm text-yellow-700">
                          You will receive access to all platform features once your account has been approved. This usually takes 1-2 business days.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isRejected ? (
                  <div className="mt-8 bg-red-50 border-l-4 border-red-400 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-red-900 mb-2">
                          Account Rejected
                        </h3>
                        <p className="text-red-800 mb-4">
                          Your account application has been rejected. You do not have access to TIPA platform features including discussions, resources, and events.
                        </p>
                        <p className="text-sm text-red-700">
                          If you believe this is an error, please contact an administrator.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Quick Links
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <a
                        href="/resources"
                        className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-[#0d1e26] hover:shadow-md transition"
                      >
                        <h3 className="font-medium text-gray-900">Resources</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Access member resources
                        </p>
                      </a>
                      {user.profile.role === 'admin' && (
                        <a
                          href="/admin"
                          className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-[#0d1e26] hover:shadow-md transition"
                        >
                          <h3 className="font-medium text-gray-900">Admin Panel</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Manage members and resources
                          </p>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {!isPending && !isRejected && (
            <div className="lg:col-span-1 space-y-6 order-1 lg:order-2">
              {/* Top Threads Section */}
              {topThreads.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Recent Discussions
                    </h2>
                    <div className="space-y-3">
                      {topThreads.map((thread) => {
                        const formatDate = (dateString: string) => {
                          const date = new Date(dateString)
                          const now = new Date()
                          const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
                          
                          if (diffInSeconds < 60) return 'just now'
                          if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
                          if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
                          if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
                          
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }
                        return (
                          <Link
                            key={thread.id}
                            href={`/discussions/${thread.id}`}
                            className="block text-sm text-[#0d1e26] hover:text-[#0a171c] hover:underline py-2 border-b border-gray-200 last:border-b-0"
                          >
                            <div className="font-medium line-clamp-1">{thread.title}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <span>{thread.author?.full_name || thread.author?.email || 'Anonymous'}</span>
                              <span>•</span>
                              <span>{formatDate(thread.created_at)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {thread.comment_count || 0}
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                    <Link
                      href="/discussions"
                      className="mt-4 block text-sm font-medium text-[#0d1e26] hover:text-[#0a171c] flex items-center gap-1"
                    >
                      See More
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )}
              {/* Events Section */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Events
                  </h2>
                  {upcomingEvents.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {upcomingEvents.map((event) => {
                          const eventDate = new Date(event.start_time)
                          const dateStr = eventDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                          return (
                            <Link
                              key={event.id}
                              href="/events"
                              className="block text-sm text-[#0d1e26] hover:text-[#0a171c] hover:underline py-2 border-b border-gray-200 last:border-b-0"
                            >
                              <div className="font-medium">{event.title}</div>
                              <div className="text-xs text-gray-500 mt-1">{dateStr}</div>
                            </Link>
                          )
                        })}
                      </div>
                      <Link
                        href="/events"
                        className="mt-4 block text-sm font-medium text-[#0d1e26] hover:text-[#0a171c] flex items-center gap-1"
                      >
                        See More
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 mb-4">No upcoming events scheduled.</p>
                      <Link
                        href="/events"
                        className="block text-sm font-medium text-[#0d1e26] hover:text-[#0a171c] flex items-center gap-1"
                      >
                        View All Events
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Resources Section */}
              {topResources.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Resources
                    </h2>
                    <div className="space-y-3">
                      {topResources.map((resource) => (
                        <Link
                          key={resource.id}
                          href={`/resources/${resource.id}`}
                          className="block text-sm text-[#0d1e26] hover:text-[#0a171c] hover:underline py-2 border-b border-gray-200 last:border-b-0"
                        >
                          {resource.title}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href="/resources"
                      className="mt-4 block text-sm font-medium text-[#0d1e26] hover:text-[#0a171c] flex items-center gap-1"
                    >
                      See More
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

