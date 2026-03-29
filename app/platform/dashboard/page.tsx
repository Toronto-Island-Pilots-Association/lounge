import Image from 'next/image'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildOrgUrl, ROOT_DOMAIN } from '@/lib/org'
import { getPlanDef } from '@/lib/plans'
import SignOutButton from './SignOutButton'

function loungeAddressLabel(org: { subdomain: string; custom_domain?: string | null; custom_domain_verified?: boolean | null }) {
  const isDev = process.env.NODE_ENV === 'development'
  if (!isDev && org.custom_domain && org.custom_domain_verified) return org.custom_domain
  return `${org.subdomain}.${ROOT_DOMAIN}`
}

export default async function PlatformDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/platform/login')

  const db = createServiceRoleClient()
  const { data: memberProfiles } = await db
    .from('org_memberships')
    .select('org_id, role, status')
    .eq('user_id', user.id)

  const membershipsForUser = (memberProfiles ?? []).filter((p: { org_id: string | null }) => p.org_id)
  const orgIds = [...new Set(membershipsForUser.map((m: { org_id: string }) => m.org_id))]

  const orgsResult =
    orgIds.length > 0
      ? await db.from('organizations').select('*').in('id', orgIds)
      : { data: [] }

  const orgs = orgsResult.data
  const orgById = new Map((orgs ?? []).map((o: { id: string }) => [o.id, o]))
  const memberships = membershipsForUser
    .map((m: { org_id: string; role: string }) => {
      const org = orgById.get(m.org_id)
      return org ? { org, role: m.role as string } : null
    })
    .filter(Boolean) as { org: Record<string, unknown> & { id: string; name: string; subdomain: string; logo_url?: string | null; custom_domain?: string | null; plan?: string | null }; role: string }[]

  const adminOrgs = memberships.filter(m => m.role === 'admin').map(m => m.org)
  const memberOrgs = memberships.filter(m => m.role !== 'admin').map(m => ({ ...m.org, memberRole: m.role }))

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/platform" className="font-bold tracking-tight text-gray-900">
          ClubLounge
        </Link>
        <SignOutButton />
      </nav>

      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Your lounges</h1>
            <p className="text-sm text-gray-500 mt-1">
              Pick a lounge to open settings in the sidebar, or visit the live site.
            </p>
          </div>
          <Link
            href="/platform/signup"
            className="shrink-0 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors text-center"
          >
            + New lounge
          </Link>
        </div>

        {memberships.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-4">
            <p className="text-gray-500">You don&apos;t have any lounges yet.</p>
            <Link
              href="/platform/signup"
              className="inline-block bg-gray-900 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Create your first lounge
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {adminOrgs.length > 0 && (
              <section className="space-y-4">
                {memberOrgs.length > 0 && (
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">You administer</h2>
                )}
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {adminOrgs.map(org => {
                    const url = buildOrgUrl(org)
                    const address = loungeAddressLabel(org)
                    const plan = (org.plan ?? 'hobby') as string
                    const planLabel = getPlanDef(plan).label
                    const initial = (org.name || '?').slice(0, 1).toUpperCase()
                    const logo = org.logo_url as string | null | undefined

                    return (
                      <li
                        key={org.id}
                        className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 shadow-sm hover:border-gray-300 transition-colors"
                      >
                        <div className="flex gap-3 min-w-0">
                          <div className="relative h-11 w-11 shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-500">
                            {logo ? (
                              <Image
                                src={logo}
                                alt=""
                                width={44}
                                height={44}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              initial
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                            <p className="text-xs text-gray-500 truncate font-mono">{address}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 capitalize">
                                {planLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                          <Link
                            href={`/platform/dashboard/${org.id}/settings/general`}
                            className="inline-flex items-center justify-center rounded-lg bg-gray-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-gray-800 transition-colors"
                          >
                            Settings
                          </Link>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Open lounge
                          </a>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {memberOrgs.length > 0 && (
              <section className="space-y-4">
                {adminOrgs.length > 0 && (
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Member</h2>
                )}
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {memberOrgs.map(org => {
                    const url = buildOrgUrl(org)
                    const address = loungeAddressLabel(org)
                    const initial = (org.name || '?').slice(0, 1).toUpperCase()
                    const logo = org.logo_url as string | null | undefined

                    return (
                      <li
                        key={org.id}
                        className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 shadow-sm hover:border-gray-300 transition-colors"
                      >
                        <div className="flex gap-3 min-w-0">
                          <div className="relative h-11 w-11 shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-500">
                            {logo ? (
                              <Image
                                src={logo}
                                alt=""
                                width={44}
                                height={44}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              initial
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                            <p className="text-xs text-gray-500 truncate font-mono">{address}</p>
                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 capitalize mt-2">
                              {org.memberRole}
                            </span>
                          </div>
                        </div>
                        <div className="pt-1 border-t border-gray-100">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Open lounge
                          </a>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
