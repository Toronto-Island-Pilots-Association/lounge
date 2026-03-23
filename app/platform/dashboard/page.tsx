import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildOrgUrl } from '@/lib/org'
import SignOutButton from './SignOutButton'
import ConnectStripeButton from './ConnectStripeButton'
import { CnameRecord } from '@/components/platform/CnameRecord'

export default async function PlatformDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/platform/login')

  const db = createServiceRoleClient()
  const { data: profiles } = await db
    .from('user_profiles')
    .select('org_id, role, organizations(*)')
    .eq('user_id', user.id)
    .in('status', ['approved', 'active'])

  const memberships = (profiles ?? [])
    .filter((p: any) => p.organizations)
    .map((p: any) => ({ org: p.organizations, role: p.role as string }))

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

                    return (
                      <div key={org.id} className="bg-white rounded-xl border p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <h2 className="font-semibold">{org.name}</h2>
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
