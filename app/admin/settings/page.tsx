import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { syncOrgStripeOnboardingFromStripe } from '@/lib/platform-stripe-onboarding'
import AdminLayout from '@/components/AdminLayout'
import SettingsPageClient from './SettingsPageClient'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; stripe?: string }>
}) {
  try {
    await requireAdmin()
  } catch {
    redirect('/membership')
  }

  const sp = await searchParams
  if (sp.stripe === 'return' || sp.stripe === 'refresh') {
    const h = await headers()
    const orgId = h.get('x-org-id')
    if (orgId) {
      await syncOrgStripeOnboardingFromStripe(orgId)
    }
    redirect('/admin/settings?tab=Integrations')
  }

  return (
    <AdminLayout>
      <SettingsPageClient />
    </AdminLayout>
  )
}
