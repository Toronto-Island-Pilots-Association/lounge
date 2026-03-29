import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { syncOrgStripeOnboardingFromStripe } from '@/lib/platform-stripe-onboarding'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'
const platformBase =
  process.env.NODE_ENV === 'development'
    ? `http://${ROOT_DOMAIN}:3000`
    : `https://${ROOT_DOMAIN}`

function getOrgSettingsPath(orgId: string, tab?: string) {
  const normalizedTab = tab?.toLowerCase()

  switch (normalizedTab) {
    case 'features':
      return `${platformBase}/platform/dashboard/${orgId}/settings/features`
    case 'signup':
      return `${platformBase}/platform/dashboard/${orgId}/settings/signup`
    case 'membership':
      return `${platformBase}/platform/dashboard/${orgId}/settings/membership`
    case 'integrations':
      return `${platformBase}/platform/dashboard/${orgId}/settings/integrations`
    case 'club':
    case 'emails':
    default:
      return `${platformBase}/platform/dashboard/${orgId}/settings/general`
  }
}

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

  if (sp.stripe === 'return' || sp.stripe === 'refresh') {
    const h = await headers()
    const orgId = h.get('x-org-id')
    if (orgId) {
      await syncOrgStripeOnboardingFromStripe(orgId)
      redirect(getOrgSettingsPath(orgId, 'integrations'))
    }
    redirect(getOrgSettingsPath(user.profile.org_id, 'integrations'))
  }

  redirect(getOrgSettingsPath(user.profile.org_id, sp.tab))
}
