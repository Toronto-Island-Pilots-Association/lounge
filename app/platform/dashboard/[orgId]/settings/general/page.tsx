import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getOrgIdentity } from '@/lib/settings'
import GeneralForm from './GeneralForm'

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/platform/login')

  const identity = await getOrgIdentity(orgId)
  const db = createServiceRoleClient()
  const { data: orgRow } = await db
    .from('organizations')
    .select('logo_url, favicon_url')
    .eq('id', orgId)
    .maybeSingle()

  return (
    <div className="min-w-0 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-2xl min-w-0">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl font-semibold text-gray-900">General</h1>
          <p className="mt-1 text-sm text-gray-500">Basic info displayed throughout the member portal.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <GeneralForm
            initial={identity}
            initialLogoUrl={orgRow?.logo_url ?? ''}
            initialFaviconUrl={orgRow?.favicon_url ?? ''}
            orgId={orgId}
          />
        </div>
      </div>
    </div>
  )
}
