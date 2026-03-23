import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'
import ConnectStripeButton from './ConnectStripeButton'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'

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
                    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
                    const port = process.env.NODE_ENV === 'development' ? ':3000' : ''
                    const url = org.custom_domain
                      ? `${protocol}://${org.custom_domain}${port}`
                      : `${protocol}://${org.subdomain}.${ROOT_DOMAIN}${port}`

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
                          <div className="pt-4 border-t space-y-2">
                            <p className="text-xs font-medium text-gray-600">DNS setup for custom domain</p>
                            <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-xs space-y-1.5">
                              <div className="flex gap-3"><span className="text-gray-400 w-10">Type</span><span>CNAME</span></div>
                              <div className="flex gap-3"><span className="text-gray-400 w-10">Host</span><span className="break-all">{org.custom_domain}</span></div>
                              <div className="flex gap-3"><span className="text-gray-400 w-10">Value</span><span>cname.vercel-dns.com</span></div>
                            </div>
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
                    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
                    const port = process.env.NODE_ENV === 'development' ? ':3000' : ''
                    const url = org.custom_domain
                      ? `${protocol}://${org.custom_domain}${port}`
                      : `${protocol}://${org.subdomain}.${ROOT_DOMAIN}${port}`

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
