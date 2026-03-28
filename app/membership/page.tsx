import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserIncludingPending, shouldRequireProfileCompletion, shouldRequirePayment, isOrgPublic } from '@/lib/auth'
import {
  getMembershipFeeForLevel,
  getTrialEndDateAsync,
  getTrialConfig,
  getTrialConfigItemForLevel,
  computeTrialEndFromConfig,
  getFeatureFlags,
  getOrgIdentity,
  type MembershipLevelKey,
} from '@/lib/settings'
import { clubShortFromDisplayName } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { Resource, Event, TIPA_ORG_ID, getMembershipLevelLabel } from '@/types/database'
import { Suspense } from 'react'
import MembershipCard from '@/components/MembershipCard'
import SubscriptionSection from '@/components/SubscriptionSection'
import MembershipPageClient from './MembershipPageClient'
import StripeSuccessHandler from './StripeSuccessHandler'
import GuestMembershipDemo from './GuestMembershipDemo'
import MembershipActivitySidebar from '@/components/membership/MembershipActivitySidebar'

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ subscription?: string; session_id?: string }>
}) {
  const user = await getCurrentUserIncludingPending()
  const params = await searchParams

  if (!user) {
    if (!(await isOrgPublic())) {
      redirect('/login')
    }
    return <GuestMembershipDemo />
  }

  if (shouldRequireProfileCompletion(user.profile)) {
    redirect('/complete-profile')
  }

  // Allow page to load when returning from Stripe so StripeSuccessHandler can confirm the session
  const returningFromStripe =
    params?.subscription === 'success' && typeof params?.session_id === 'string'

  if (shouldRequirePayment(user.profile) && !returningFromStripe) {
    redirect('/add-payment')
  }

  const featureFlags = await getFeatureFlags()

  const isPending = user.profile.status === 'pending' && user.profile.role !== 'admin'
  const isRejected = user.profile.status === 'rejected' && user.profile.role !== 'admin'
  const isExpiredStatus = user.profile.status === 'expired' && user.profile.role !== 'admin'

  // Check if user was invited (admin, member, or bulk) and needs to change password
  const wasInvited =
    user.user_metadata?.invited_by_admin === true ||
    user.user_metadata?.invited_by_member === true
  const needsPasswordChange = wasInvited && user.profile.status === 'pending'

  const membershipLevel = (user.profile.membership_level || 'Full') as MembershipLevelKey
  const membershipFee = await getMembershipFeeForLevel(membershipLevel)
  const trialEnd = await getTrialEndDateAsync(
    membershipLevel,
    user.profile.created_at ?? null,
    user.profile.org_id,
  )
  const isOnTrial = trialEnd != null && trialEnd > new Date()
  const hasStripeSubscription = !!user.profile.stripe_subscription_id
  // If already subscribed in Stripe, do not show trial label or trial-based validity
  const showTrial = isOnTrial && !hasStripeSubscription
  const isPaid = user.profile.membership_level === 'Full' || user.profile.membership_level === 'Corporate' || user.profile.membership_level === 'Honorary'
  // Prefer DB membership_expires_at when set; otherwise use trial end only when showing trial (not subscribed)
  let hasMembershipExpiry = !!user.profile.membership_expires_at
  if (!hasMembershipExpiry && user.profile.stripe_subscription_id) {
    const { syncSubscriptionByUserId } = await import('@/lib/subscription-sync')
    await syncSubscriptionByUserId(user.id)
    const supabase = await createClient()
    const { data: updated } = await supabase
      .from('user_profiles')
      .select('membership_expires_at')
      .eq('id', user.id)
      .single()
    if (updated?.membership_expires_at) {
      user.profile.membership_expires_at = updated.membership_expires_at
      hasMembershipExpiry = true
    }
  }
  const isExpired = hasMembershipExpiry
    ? new Date(user.profile.membership_expires_at!) < new Date()
    : showTrial && trialEnd
      ? trialEnd < new Date()
      : false
  const validThruDate = hasMembershipExpiry ? null : (showTrial && trialEnd ? trialEnd.toISOString() : null)

  const membershipLevelDisplay = showTrial
    ? `${getMembershipLevelLabel(membershipLevel)} (trial)`
    : getMembershipLevelLabel(membershipLevel)

  const levelLabel = getMembershipLevelLabel(membershipLevel)
  const article = (membershipLevel === 'Associate' || membershipLevel === 'Honorary') ? 'an' : 'a'
  const trialCfg = await getTrialConfig(user.profile.org_id)
  const pendingTrialItem = getTrialConfigItemForLevel(trialCfg, membershipLevel)
  const pendingTrialEnd = computeTrialEndFromConfig(
    pendingTrialItem,
    user.profile.created_at ?? null,
  )
  const pendingTrialCopy =
    pendingTrialEnd && pendingTrialItem?.type === 'months'
      ? (
          <>
            Once approved, you will be registered as {article} <strong>{levelLabel} member</strong> with a trial
            until{' '}
            <strong>
              {pendingTrialEnd.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </strong>
            .
          </>
        )
      : (
          <>Once approved, you will be registered as {article} <strong>{levelLabel} member</strong>.</>
        )

    // Fetch top resources, events, and threads (only for approved users)
    const supabase = await createClient()
    let topResources: Resource[] = []
    let upcomingEvents: Event[] = []
    let topThreads: any[] = []

    if (!isPending && !isRejected && !isExpiredStatus) {
      // Fetch only minimal fields needed for display
      const { data: resources } = await supabase
        .from('resources')
        .select('id, title, created_at')
        .eq('org_id', user.profile.org_id)
        .order('created_at', { ascending: false })
        .limit(5)

      const now = new Date().toISOString()
      const { data: events } = await supabase
        .from('events')
        .select('id, title, start_time, end_time, location, description')
        .eq('org_id', user.profile.org_id)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(5)

    topResources = (resources as Resource[]) || []
    upcomingEvents = (events as Event[]) || []

    // Fetch top threads with minimal fields
    const { data: threads } = await supabase
      .from('threads')
      .select('id, title, created_at, created_by')
      .eq('org_id', user.profile.org_id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (threads && threads.length > 0) {
      // Get author info for threads
      const threadUserIds = [...new Set(threads.map(t => t.created_by).filter((id): id is string => id !== null))]
      const { data: threadAuthors } = threadUserIds.length > 0 ? await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .in('user_id', threadUserIds) : { data: [] }

      const threadAuthorsMap = new Map(threadAuthors?.map(a => [a.user_id, a]) || [])

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

  const supabaseForBrand = await createClient()
  const [identity, orgBrandingResult] = await Promise.all([
    getOrgIdentity(),
    supabaseForBrand
      .from('organizations')
      .select('name, logo_url')
      .eq('id', user.profile.org_id)
      .maybeSingle(),
  ])
  const orgBranding = orgBrandingResult.data
  const displayForBrand = identity.displayName?.trim() || orgBranding?.name || 'Club'
  const clubBrandForCard = {
    shortName: clubShortFromDisplayName(displayForBrand),
    tagline: displayForBrand,
    logoUrl: orgBranding?.logo_url ?? null,
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <Suspense fallback={null}>
        <StripeSuccessHandler />
      </Suspense>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
              Membership
            </h1>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {/* Wallet-Sized Membership Card - Only for approved members */}
              {!isPending && !isRejected && !isExpiredStatus && (
                <MembershipCard
                      user={user}
                      isPending={isPending}
                      isRejected={isRejected}
                      isPaid={isPaid}
                      isExpired={isExpired}
                      membershipLevelDisplay={membershipLevelDisplay}
                      validThruDate={validThruDate}
                      isOnTrial={showTrial}
                      clubBrand={clubBrandForCard}
                      preferTipaMarkWhenNoLogo={user.profile.org_id === TIPA_ORG_ID}
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
                      </div>
                    </div>
                  )}
                </div>

                {/* Show expired/rejected/pending messages first for better UX */}
                {isExpiredStatus ? (
                  <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-amber-900 mb-2">
                          Membership Expired
                        </h3>
                        <p className="text-amber-800 mb-4">
                          Your membership has lapsed due to non-payment. You do not have access to TIPA platform features including discussions, announcements, and events.
                        </p>
                        <p className="text-sm text-amber-700">
                          To restore access, please renew your membership using the payment options below or contact an administrator.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Subscription Section first - Show for all users except rejected */}
                {!isRejected && (
                  <div className="mt-6">
                    <SubscriptionSection user={user} />
                  </div>
                )}

                {/* Payment History - Show for approved and expired members */}
                {!isPending && !isRejected && (
                  <div className="mt-6">
                    <MembershipPageClient membershipLevel={user.profile.membership_level} />
                  </div>
                )}

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
                          Membership Pending Approval
                        </h3>
                        <p className="text-yellow-800 mb-3">
                          Thank you for applying for membership with TIPA! Your membership application is currently pending review by an administrator.
                        </p>
                        <div className="bg-yellow-100 border border-yellow-300 rounded-md p-3 mb-3 text-left">
                          <p className="text-sm text-yellow-900 mb-2">
                            <strong>What happens next:</strong>
                          </p>
                          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                            <li>{pendingTrialCopy}</li>
                            <li>Your access to the platform may be revoked if you do not pay your membership fees after that date</li>
                          </ul>
                        </div>
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
                          Your account application has been rejected. You do not have access to TIPA platform features including discussions, announcements, and events.
                        </p>
                        <p className="text-sm text-red-700">
                          If you believe this is an error, please contact an administrator.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
          </div>

          {/* Sidebar - Hidden on Mobile */}
          {!isPending && !isRejected && !isExpiredStatus && (
            <MembershipActivitySidebar
              upcomingEvents={upcomingEvents}
              topResources={topResources}
              topThreads={topThreads}
              discussionsTitle={`Recent ${featureFlags.discussionsLabel}`}
            />
          )}
        </div>
      </div>
    </div>
  )
}
