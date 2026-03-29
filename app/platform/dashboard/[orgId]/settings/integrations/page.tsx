import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { syncOrgStripeOnboardingFromStripe } from '@/lib/platform-stripe-onboarding'
import IntegrationsPageClient from './IntegrationsPageClient'

export default async function PlatformIntegrationsSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams: Promise<{ stripe?: string }>
}) {
  const { orgId } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  if (sp.stripe === 'return' || sp.stripe === 'refresh') {
    await syncOrgStripeOnboardingFromStripe(orgId)
    redirect(`/platform/dashboard/${orgId}/settings/integrations`)
  }

  const { data: orgStripeRow } = await db
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', orgId)
    .maybeSingle()
  if (orgStripeRow?.stripe_account_id) {
    await syncOrgStripeOnboardingFromStripe(orgId)
  }

  return (
    <div className="min-w-0 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-2xl min-w-0">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Integrations</h1>
          <p className="mt-1 text-sm text-gray-500">Subdomain and custom domain settings for your lounge.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <IntegrationsPageClient orgId={orgId} />
        </div>
      </div>
    </div>
  )
}
