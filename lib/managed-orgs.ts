import { TIPA_ORG_ID } from '@/types/database'
import type { StripeBillingMode } from '@/lib/settings'
import type { PlanKey } from '@/lib/plans'

export type ManagedOrgConfig = {
  forcedPlan?: PlanKey
  stripeBillingMode?: StripeBillingMode
  billingManagedByPlatform?: boolean
  allowSelfServePlanChanges?: boolean
  monthlyPriceOverrides?: Partial<Record<PlanKey, number>>
}

export const MANAGED_ORGS: Record<string, ManagedOrgConfig> = {
  [TIPA_ORG_ID]: {
    forcedPlan: 'club_pro',
    stripeBillingMode: 'direct',
    billingManagedByPlatform: true,
    allowSelfServePlanChanges: false,
    monthlyPriceOverrides: {
      club_pro: 0,
    },
  },
}

export function getManagedOrgConfig(orgId: string | null | undefined): ManagedOrgConfig | null {
  if (!orgId) return null
  return MANAGED_ORGS[orgId] ?? null
}

export function isManagedOrg(orgId: string | null | undefined): boolean {
  return Boolean(getManagedOrgConfig(orgId))
}
