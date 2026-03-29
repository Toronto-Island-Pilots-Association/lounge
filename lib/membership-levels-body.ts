import type { OrgMembershipLevel } from '@/lib/settings'

const TRIAL_TYPES = ['none', 'months'] as const

/** Shared validation for admin + platform membership level PUT bodies. */
export function parseMembershipLevelsBody(body: unknown): OrgMembershipLevel[] | null {
  if (!Array.isArray(body) || body.length === 0) return null
  const levels: OrgMembershipLevel[] = []
  for (const item of body) {
    if (typeof item !== 'object' || item === null) return null
    const { key, label, fee, trialType, trialMonths, enabled } = item as Record<string, unknown>
    if (typeof key !== 'string' || !key) return null
    if (typeof label !== 'string') return null
    if (typeof fee !== 'number' || fee < 0) return null
    if (!TRIAL_TYPES.includes(trialType as (typeof TRIAL_TYPES)[number])) return null
    if (typeof enabled !== 'boolean') return null
    const level: OrgMembershipLevel = {
      key,
      label,
      fee,
      trialType: trialType as OrgMembershipLevel['trialType'],
      enabled,
    }
    if (trialType === 'months') {
      level.trialMonths = typeof trialMonths === 'number' && trialMonths >= 1 ? trialMonths : 12
    }
    levels.push(level)
  }
  return levels
}
