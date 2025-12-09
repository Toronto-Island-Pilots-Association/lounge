import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { getMembershipFee } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'
import { Resource, Event } from '@/types/database'
import PayPalButton from '@/components/PayPalButton'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const membershipFee = await getMembershipFee()
  const isPaid = user.profile.membership_level === 'cadet' || user.profile.membership_level === 'captain'
  const isExpired = user.profile.membership_expires_at
    ? new Date(user.profile.membership_expires_at) < new Date()
    : false

  // Fetch top resources and upcoming events
  const supabase = await createClient()
  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const now = new Date().toISOString()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('start_time', now)
    .order('start_time', { ascending: true })
    .limit(5)

  const topResources = (resources as Resource[]) || []
  const upcomingEvents = (events as Event[]) || []

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                  Welcome, {user.profile.full_name || user.profile.email}!
                </h1>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Membership Status
                    </h2>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span className="font-medium text-gray-900">
                          {user.profile.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Level:</span>
                        <span className="font-medium text-gray-900">
                          {user.profile.membership_level ? user.profile.membership_level.charAt(0).toUpperCase() + user.profile.membership_level.slice(1) : 'Basic'}
                        </span>
                      </div>
                      {user.profile.membership_expires_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expires:</span>
                          <span className={`font-medium ${
                            isExpired ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {new Date(user.profile.membership_expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

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

                  {isPaid && !isExpired && (
                    <div className="bg-green-50 rounded-lg p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Active {user.profile.membership_level === 'captain' ? 'Captain' : 'Cadet'} Membership
                      </h2>
                      <p className="text-sm text-gray-600">
                        Thank you for your support! You have access to all premium features.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Quick Links
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {(topResources.length > 0 || upcomingEvents.length > 0) && (
            <div className="lg:col-span-1 space-y-6">
              {/* Events Section */}
              {upcomingEvents.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Events
                    </h2>
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
                  </div>
                </div>
              )}

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
                          href="/resources"
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

