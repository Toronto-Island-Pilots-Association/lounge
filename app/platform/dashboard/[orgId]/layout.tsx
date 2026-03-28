import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildOrgUrl } from '@/lib/org'
import PlatformSideNav from './PlatformSideNav'

export default async function OrgAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/platform/login')

  const db = createServiceRoleClient()
  const { data: membership } = await db
    .from('org_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .eq('role', 'admin')
    .maybeSingle()

  if (!membership) redirect('/platform/dashboard')

  const { data: org } = await db
    .from('organizations')
    .select('id, name, plan, subdomain, custom_domain, trial_ends_at')
    .eq('id', orgId)
    .maybeSingle()

  if (!org) redirect('/platform/dashboard')

  const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null
  const trialActive = trialEndsAt && trialEndsAt > new Date()
  const orgUrl = buildOrgUrl(org)
  const planLabel = (org.plan ?? 'hobby').replace('_', ' ')

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 fixed inset-y-0 left-0 bg-white border-r border-gray-200 flex flex-col z-10">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <Link
            href="/platform/dashboard"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All lounges
          </Link>
          <div className="space-y-1">
            <p className="font-semibold text-sm text-gray-900 truncate">{org.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 capitalize">
                {planLabel}
              </span>
              {trialActive && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                  Trial
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <PlatformSideNav orgId={orgId} />

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100">
          <a
            href={orgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            Visit lounge
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </aside>

      {/* Content */}
      <div className="ml-56 flex-1 min-h-screen">
        {children}
      </div>
    </div>
  )
}
