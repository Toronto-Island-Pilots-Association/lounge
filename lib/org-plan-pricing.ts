import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPlanDef, type PlanKey } from '@/lib/plans'
import { getPlanPriceMonthly } from '@/lib/settings'

export type OrgPlanPricingBreakdown = {
  planKey: PlanKey
  memberCount: number
  billableMemberCount: number
  baseMonthly: number
  baseMonthlyCents: number
  includedMembers: number | null
  additionalMemberPriceCents: number | null
  overageMembers: number
  overageMonthly: number
  overageMonthlyCents: number
  totalMonthly: number
  totalMonthlyCents: number
}

export async function getBillableOrgMemberCount(orgId: string): Promise<number> {
  const db = createServiceRoleClient()
  const { count, error } = await db
    .from('org_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'approved')
    .eq('role', 'member')

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function getOrgPlanPricingBreakdown(
  orgId: string,
  planKey: PlanKey,
  memberCountOverride?: number,
): Promise<OrgPlanPricingBreakdown> {
  const planDef = getPlanDef(planKey)
  const memberCount =
    typeof memberCountOverride === 'number' ? memberCountOverride : await getBillableOrgMemberCount(orgId)
  const billableMemberCount = Math.max(memberCount, 0)
  const baseMonthly = await getPlanPriceMonthly(planKey, orgId)
  const baseMonthlyCents = Math.round(baseMonthly * 100)
  const includedMembers = planDef.includedMembers
  const additionalMemberPriceCents = planDef.additionalMemberPriceCents
  const overageMembers =
    includedMembers != null && additionalMemberPriceCents != null
      ? Math.max(billableMemberCount - includedMembers, 0)
      : 0
  const overageMonthlyCents = overageMembers * (additionalMemberPriceCents ?? 0)
  const totalMonthlyCents = baseMonthlyCents + overageMonthlyCents

  return {
    planKey,
    memberCount: billableMemberCount,
    billableMemberCount,
    baseMonthly,
    baseMonthlyCents,
    includedMembers,
    additionalMemberPriceCents,
    overageMembers,
    overageMonthly: overageMonthlyCents / 100,
    overageMonthlyCents,
    totalMonthly: totalMonthlyCents / 100,
    totalMonthlyCents,
  }
}

export function formatMemberOverageRate(cents: number | null): string | null {
  if (cents == null) return null
  return `$${(cents / 100).toFixed(2)}`
}
