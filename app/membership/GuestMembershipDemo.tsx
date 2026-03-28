import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { clubShortFromDisplayName } from '@/lib/org'
import { getOrgIdentity, getFeatureFlags } from '@/lib/settings'
import MembershipCard from '@/components/MembershipCard'
import MembershipActivitySidebar, {
  type MembershipSidebarThread,
} from '@/components/membership/MembershipActivitySidebar'
import { Event, Resource, MemberProfile, getMembershipLevelLabel } from '@/types/database'

function buildDemoMemberProfile(orgId: string): MemberProfile {
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)
  const joined = new Date()
  joined.setMonth(joined.getMonth() - 8)
  const isoJoin = joined.toISOString()
  return {
    id: '00000000-0000-4000-8000-000000000001',
    user_id: '00000000-0000-4000-8000-000000000002',
    org_id: orgId,
    role: 'member',
    status: 'approved',
    membership_level: 'Full',
    membership_class: null,
    member_number: '2471',
    membership_expires_at: expires.toISOString(),
    invited_at: null,
    last_reminder_sent_at: null,
    reminder_count: 0,
    stripe_subscription_id: 'sub_demo_preview',
    stripe_customer_id: null,
    paypal_subscription_id: null,
    subscription_cancel_at_period_end: false,
    statement_of_interest: null,
    interests: null,
    how_did_you_hear: null,
    is_copa_member: null,
    join_copa_flight_32: null,
    copa_membership_number: null,
    pilot_license_type: null,
    aircraft_type: null,
    call_sign: null,
    how_often_fly_from_ytz: null,
    is_student_pilot: false,
    flight_school: null,
    instructor_name: null,
    custom_data: null,
    created_at: isoJoin,
    updated_at: isoJoin,
    email: 'jamie.rivera@example.com',
    full_name: 'Jamie Rivera',
    first_name: 'Jamie',
    last_name: 'Rivera',
    phone: null,
    street: null,
    city: 'Toronto',
    province_state: 'ON',
    postal_zip_code: null,
    country: 'Canada',
    profile_picture_url: null,
    notify_replies: true,
  } as MemberProfile
}

export default async function GuestMembershipDemo() {
  const h = await headers()
  const orgId = h.get('x-org-id')
  if (!orgId) redirect('/login')

  const [identity, flags] = await Promise.all([getOrgIdentity(), getFeatureFlags()])
  const supabase = createServiceRoleClient()

  const { data: orgBranding } = await supabase
    .from('organizations')
    .select('name, logo_url')
    .eq('id', orgId)
    .maybeSingle()

  const now = new Date().toISOString()
  const [{ data: resources }, { data: events }, { data: threads }] = await Promise.all([
    supabase
      .from('resources')
      .select('id, title, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('events')
      .select('id, title, start_time, end_time, location, description')
      .eq('org_id', orgId)
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(5),
    supabase
      .from('threads')
      .select('id, title, created_at, created_by')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  let topThreads: MembershipSidebarThread[] = []
  if (threads && threads.length > 0) {
    const threadUserIds = [...new Set(threads.map((t) => t.created_by).filter((id): id is string => id !== null))]
    const threadIds = threads.map((t) => t.id)
    const [{ data: threadAuthors }, { data: threadCommentCounts }] = await Promise.all([
      threadUserIds.length > 0
        ? supabase.from('user_profiles').select('user_id, full_name, email').in('user_id', threadUserIds)
        : Promise.resolve({ data: [] }),
      threadIds.length > 0
        ? supabase.from('comments').select('thread_id').in('thread_id', threadIds)
        : Promise.resolve({ data: [] }),
    ])
    const threadAuthorsMap = new Map(threadAuthors?.map((a) => [a.user_id, a]) || [])
    const threadCountsMap = new Map<string, number>()
    threadCommentCounts?.forEach((c) => {
      threadCountsMap.set(c.thread_id, (threadCountsMap.get(c.thread_id) || 0) + 1)
    })
    topThreads = threads.map((thread) => ({
      id: thread.id,
      title: thread.title,
      created_at: thread.created_at,
      comment_count: threadCountsMap.get(thread.id) || 0,
      author: threadAuthorsMap.get(thread.created_by) || null,
    }))
  }

  const demoProfile = buildDemoMemberProfile(orgId)
  const discussionsSidebarTitle = `Recent ${flags.discussionsLabel}`
  const displayForBrand = identity.displayName?.trim() || orgBranding?.name || 'Club'

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Membership</h1>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
              <MembershipCard
                user={{ profile: demoProfile, user_metadata: {} }}
                isPending={false}
                isRejected={false}
                isPaid
                isExpired={false}
                membershipLevelDisplay={getMembershipLevelLabel('Full')}
                clubBrand={{
                  shortName: clubShortFromDisplayName(displayForBrand),
                  tagline: displayForBrand,
                  logoUrl: orgBranding?.logo_url ?? null,
                }}
              />
            </div>
          </div>
          <MembershipActivitySidebar
            upcomingEvents={(events as Event[]) || []}
            topResources={(resources as Resource[]) || []}
            topThreads={topThreads}
            discussionsTitle={discussionsSidebarTitle}
          />
        </div>
      </div>
    </div>
  )
}
