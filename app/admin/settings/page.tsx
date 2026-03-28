import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { syncOrgStripeOnboardingFromStripe } from '@/lib/platform-stripe-onboarding'
import AdminLayout from '@/components/AdminLayout'
import SettingsPageClient from './SettingsPageClient'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'
const platformBase =
  process.env.NODE_ENV === 'development'
    ? `http://${ROOT_DOMAIN}:3000`
    : `https://${ROOT_DOMAIN}`

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; stripe?: string }>
}) {
  let user: Awaited<ReturnType<typeof requireAdmin>>
  try {
    user = await requireAdmin()
  } catch {
    redirect('/membership')
  }

  const sp = await searchParams
  if (sp.tab === 'Membership') {
    redirect(`${platformBase}/platform/dashboard/${user.profile.org_id}/settings/membership`)
  }

  if (sp.tab === 'Integrations') {
    redirect(`${platformBase}/platform/dashboard/${user.profile.org_id}/settings/integrations`)
  }

  if (sp.stripe === 'return' || sp.stripe === 'refresh') {
    const h = await headers()
    const orgId = h.get('x-org-id')
    if (orgId) {
      await syncOrgStripeOnboardingFromStripe(orgId)
      redirect(`${platformBase}/platform/dashboard/${orgId}/settings/integrations`)
    }
    redirect('/admin/settings')
  }

  return (
    <AdminLayout>
      <SettingsPageClient />
    </AdminLayout>
  )
}
