import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPlanDef, type PlanKey } from '@/lib/plans'
import { getPlanPriceMonthly } from '@/lib/settings'

export type OrgBillingActivationStatus = {
  planKey: PlanKey
  planLabel: string
  priceMonthly: number
  activated: boolean
  requiresActivation: boolean
}

export async function getOrgBillingActivationStatus(orgId: string): Promise<OrgBillingActivationStatus> {
  const db = createServiceRoleClient()
  const { data: org, error } = await db
    .from('organizations')
    .select('plan, stripe_subscription_id')
    .eq('id', orgId)
    .maybeSingle()

  if (error || !org) {
    throw new Error(error?.message ?? `Organization not found (${orgId})`)
  }

  const planKey = ((org.plan ?? 'hobby') as PlanKey)
  const planLabel = getPlanDef(planKey).label
  const priceMonthly = await getPlanPriceMonthly(planKey, orgId)
  const activated = priceMonthly <= 0 || Boolean(org.stripe_subscription_id)

  return {
    planKey,
    planLabel,
    priceMonthly,
    activated,
    requiresActivation: !activated,
  }
}
