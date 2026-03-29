import Link from 'next/link'
import { Event, Resource } from '@/types/database'

export type MembershipSidebarThread = {
  id: string
  title: string
  created_at: string
  comment_count: number
  author: { full_name: string | null; email: string | null } | null
}

type Props = {
  upcomingEvents: Event[]
  topResources: Resource[]
  topThreads: MembershipSidebarThread[]
  discussionsTitle?: string
}

export default function MembershipActivitySidebar({
  upcomingEvents,
  topResources,
  topThreads,
  discussionsTitle = 'Recent Hangar Talk',
}: Props) {
  return (
    <div className="hidden lg:block lg:col-span-1 space-y-6 order-1 lg:order-2">
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
                  const endDate = event.end_time ? new Date(event.end_time) : null
                  const dateStr = eventDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                  const timeStr = eventDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                  const endTimeStr = endDate
                    ? endDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : null
                  return (
                    <Link
                      key={event.id}
                      href="/events"
                      className="block text-sm text-[var(--color-primary)] hover:text-[#0a171c] hover:bg-gray-50 rounded-md p-2 -mx-2 transition-colors border-b border-gray-200 last:border-b-0"
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {dateStr}
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {timeStr}
                          {endTimeStr ? ` - ${endTimeStr}` : ''}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="line-clamp-1">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
              <Link
                href="/events"
                className="mt-4 block text-sm font-medium text-[var(--color-primary)] hover:text-[#0a171c] flex items-center gap-1"
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
                className="block text-sm font-medium text-[var(--color-primary)] hover:text-[#0a171c] flex items-center gap-1"
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

      {topResources.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Announcements
            </h2>
            <div className="space-y-3">
              {topResources.map((resource) => (
                <Link
                  key={resource.id}
                  href={`/resources/${resource.id}`}
                  className="block text-sm text-[var(--color-primary)] hover:text-[#0a171c] hover:underline py-2 border-b border-gray-200 last:border-b-0"
                >
                  {resource.title}
                </Link>
              ))}
            </div>
            <Link
              href="/resources"
              className="mt-4 block text-sm font-medium text-[var(--color-primary)] hover:text-[#0a171c] flex items-center gap-1"
            >
              See More
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {topThreads.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {discussionsTitle}
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
                    className="block text-sm text-[var(--color-primary)] hover:text-[#0a171c] hover:underline py-2 border-b border-gray-200 last:border-b-0"
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
              className="mt-4 block text-sm font-medium text-[var(--color-primary)] hover:text-[#0a171c] flex items-center gap-1"
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
  )
}
