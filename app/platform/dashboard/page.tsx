import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildOrgUrl } from '@/lib/org'
import SignOutButton from './SignOutButton'
import ConnectStripeButton from './ConnectStripeButton'
import OrgPlanUpgradeControls from './OrgPlanUpgradeControls'
import { CnameRecord } from '@/components/platform/CnameRecord'

export default async function PlatformDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/platform/login')

  const db = createServiceRoleClient()
  const { data: memberProfiles } = await db
    .from('org_memberships')
    .select('org_id, role, status')
    .eq('user_id', user.id)

  const membershipsForUser = (memberProfiles ?? []).filter((p: any) => p.org_id)
  const orgIds = [...new Set(membershipsForUser.map((m: any) => m.org_id))]

  const [orgsResult, memberCountsResult] = await Promise.all([
    orgIds.length > 0
      ? db.from('organizations').select('*').in('id', orgIds)
      : Promise.resolve({ data: [] }),
    orgIds.length > 0
      ? db.from('org_memberships').select('org_id, role').in('org_id', orgIds).eq('status', 'approved')
      : Promise.resolve({ data: [] }),
  ])

  const orgs = orgsResult.data
  const memberCounts = new Map<string, number>()
  ;(memberCountsResult.data ?? []).forEach((m: any) => {
    if (m.role !== 'admin') memberCounts.set(m.org_id, (memberCounts.get(m.org_id) ?? 0) + 1)
  })

  const orgById = new Map((orgs ?? []).map((o: any) => [o.id, o]))
  const memberships = membershipsForUser
    .map((m: any) => {
      const org = orgById.get(m.org_id)
      return org ? { org, role: m.role as string } : null
    })
    .filter(Boolean) as { org: any; role: string }[]

  const adminOrgs = memberships.filter(m => m.role === 'admin').map(m => m.org)
  const memberOrgs = memberships.filter(m => m.role !== 'admin').map(m => ({ ...m.org, memberRole: m.role }))

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <Link href="/platform" className="font-bold tracking-tight">ClubLounge</Link>
        <SignOutButton />
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your lounges</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your club spaces.</p>
          </div>
          <Link
            href="/platform/signup"
            className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            + New lounge
          </Link>
        </div>

        {memberships.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center space-y-4">
            <p className="text-gray-500">You don&apos;t have any lounges yet.</p>
            <Link
              href="/platform/signup"
              className="inline-block bg-black text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Create your first lounge
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {adminOrgs.length > 0 && (
              <div className="space-y-4">
                {adminOrgs.length > 0 && memberOrgs.length > 0 && (
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Admin</h2>
                )}
                <div className="grid gap-4">
                  {adminOrgs.map((org: any) => {
                    const url = buildOrgUrl(org)
                    const stripeStatus = org.stripe_onboarding_complete
                      ? 'connected'
                      : org.stripe_account_id
                        ? 'pending'
                        : 'not_connected'

                    const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null
                    const trialActive = trialEndsAt && trialEndsAt > new Date()
                    const trialDaysLeft = trialActive
                      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                      : null

                    const nonAdminMemberCount = memberCounts.get(org.id) ?? 0
                    const setupSteps = [
                      { done: true,                             label: 'Create your lounge' },
                      { done: stripeStatus === 'connected',     label: 'Connect Stripe to collect dues' },
                      { done: !!(org.logo_url || org.display_name), label: 'Customize your club (logo / name)' },
                      { done: nonAdminMemberCount > 0,          label: 'Add your first member' },
                    ]
                    const allDone = setupSteps.every(s => s.done)

                    return (
                      <div key={org.id} className="bg-white rounded-xl border p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="font-semibold">{org.name}</h2>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize shrink-0">
                                {(org.plan ?? 'hobby').replace('_', ' ')}
                              </span>
                              {trialActive && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0">
                                  Trial — {trialDaysLeft}d left
                                </span>
                              )}
                            </div>
                            <a
                              href={url}
                              target="_blank"
                              className="text-sm text-blue-600 hover:underline font-mono truncate block"
                            >
                              {url}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={`/platform/dashboard/${org.id}/billing`}
                              className="border rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              Billing
                            </Link>
                            <a
                              href={url}
                              target="_blank"
                              className="border rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              Open
                            </a>
                          </div>
                        </div>

                        {/* Setup checklist — shown until all steps complete */}
                        {!allDone && (
                          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Setup checklist</p>
                            {setupSteps.map((step, i) => (
                              <div key={i} className="flex items-center gap-2.5">
                                {step.done ? (
                                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                                )}
                                <span className={`text-sm ${step.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                  {step.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-4 border-t flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              stripeStatus === 'connected' ? 'bg-green-500' :
                              stripeStatus === 'pending' ? 'bg-yellow-400' :
                              'bg-gray-300'
                            }`} />
                            <span className="text-sm text-gray-600">
                              {stripeStatus === 'connected' && 'Stripe connected — accepting payments'}
                              {stripeStatus === 'pending' && 'Stripe onboarding incomplete'}
                              {stripeStatus === 'not_connected' && 'Stripe not connected'}
                            </span>
                          </div>
                          {stripeStatus !== 'connected' && (
                            <ConnectStripeButton orgId={org.id} isPending={stripeStatus === 'pending'} />
                          )}
                        </div>

                        {stripeStatus === 'connected' && (
                          <OrgPlanUpgradeControls
                            orgId={org.id}
                            currentPlan={org.plan ?? 'hobby'}
                          />
                        )}

                        {org.custom_domain && (
                          <div className="pt-4 border-t">
                            <CnameRecord host={org.custom_domain} label="DNS setup for custom domain" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {memberOrgs.length > 0 && (
              <div className="space-y-4">
                {adminOrgs.length > 0 && memberOrgs.length > 0 && (
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Member</h2>
                )}
                <div className="grid gap-4">
                  {memberOrgs.map((org: any) => {
                    const url = buildOrgUrl(org)
                    return (
                      <div key={org.id} className="bg-white rounded-xl border p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h2 className="font-semibold">{org.name}</h2>
                              <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 capitalize">{org.memberRole}</span>
                            </div>
                            <a
                              href={url}
                              target="_blank"
                              className="text-sm text-blue-600 hover:underline font-mono truncate block"
                            >
                              {url}
                            </a>
                          </div>
                          <a
                            href={url}
                            target="_blank"
                            className="shrink-0 border rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Open
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
