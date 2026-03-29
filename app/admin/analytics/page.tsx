import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getOrgPlan } from '@/lib/settings'
import { getPlanDef, getRequiredPlan } from '@/lib/plans'
import AdminLayout from '@/components/AdminLayout'
import AnalyticsPageClient from './AnalyticsPageClient'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'
const platformBase =
  process.env.NODE_ENV === 'development'
    ? `http://${ROOT_DOMAIN}:3000`
    : `https://${ROOT_DOMAIN}`

export default async function AnalyticsPage() {
  let user
  try {
    user = await requireAdmin()
  } catch {
    redirect('/membership')
  }

  const plan = await getOrgPlan()
  const planDef = getPlanDef(plan)

  if (!planDef.features.analytics) {
    const requiredPlan = getRequiredPlan('analytics')
    const requiredLabel = requiredPlan ? getPlanDef(requiredPlan).label : 'Growth'
    const orgId = user.profile.org_id
    const billingUrl = `${platformBase}/platform/dashboard/${orgId}/billing`

    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="max-w-md">
            <div className="text-4xl mb-4">📊</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Analytics</h1>
            <p className="text-gray-600 mb-6">
              Track member growth, revenue, event attendance, and engagement over time.
              Available on the <strong>{requiredLabel}</strong> plan and above.
            </p>
            <a
              href={billingUrl}
              className="inline-block rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Upgrade to {requiredLabel}
            </a>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <AnalyticsPageClient />
    </AdminLayout>
  )
}
