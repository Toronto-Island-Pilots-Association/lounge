import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags, getOrgPlan } from '@/lib/settings'
import { getPlanDef } from '@/lib/plans'
import FeaturesForm from './FeaturesForm'

export default async function PlatformFeaturesSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/platform/login')

  const [features, plan] = await Promise.all([getFeatureFlags(orgId), getOrgPlan(orgId)])
  const planDef = getPlanDef(plan)

  return (
    <div className="min-w-0 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-2xl min-w-0">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Features</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enable or disable sections of the member portal for this lounge.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <FeaturesForm
            initial={features}
            initialPlan={plan}
            initialPlanLabel={planDef.label}
            initialPlanFeatures={planDef.features}
            orgId={orgId}
          />
        </div>
      </div>
    </div>
  )
}
