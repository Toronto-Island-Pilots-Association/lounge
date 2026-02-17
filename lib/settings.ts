import { createClient } from './supabase/server'

const MEMBERSHIP_LEVELS = ['Full', 'Student', 'Associate', 'Corporate', 'Honorary'] as const
export type MembershipLevelKey = (typeof MEMBERSHIP_LEVELS)[number]

const DEFAULT_FEES: Record<MembershipLevelKey, number> = {
  Full: 45,
  Student: 25,
  Associate: 25,
  Corporate: 125,
  Honorary: 0,
}

export async function getSetting(key: string): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) {
    return null
  }

  return data.value
}

/** Fee for a specific membership level (CAD). Admin-configurable via settings. */
export async function getMembershipFeeForLevel(level: MembershipLevelKey): Promise<number> {
  const key = `membership_fee_${level.toLowerCase()}`
  const value = await getSetting(key)
  if (value !== null && !Number.isNaN(parseFloat(value))) {
    return parseFloat(value)
  }
  return DEFAULT_FEES[level]
}

/** All membership fees keyed by level. For admin UI and display. */
export async function getAllMembershipFees(): Promise<Record<MembershipLevelKey, number>> {
  const result = { ...DEFAULT_FEES }
  for (const level of MEMBERSHIP_LEVELS) {
    const key = `membership_fee_${level.toLowerCase()}`
    const value = await getSetting(key)
    if (value !== null && !Number.isNaN(parseFloat(value))) {
      result[level] = parseFloat(value)
    }
  }
  return result
}

/** Set fee for one level. Key format: membership_fee_full, etc. */
export async function setMembershipFeeForLevel(
  level: MembershipLevelKey,
  fee: number
): Promise<void> {
  const supabase = await createClient()
  const key = `membership_fee_${level.toLowerCase()}`
  const { error } = await supabase.from('settings').upsert(
    { key, value: String(fee), updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (error) {
    throw new Error(`Failed to save fee for ${level}: ${error.message}`)
  }
}

/** Single global fee (legacy). Returns Full level fee. */
export async function getMembershipFee(): Promise<number> {
  return getMembershipFeeForLevel('Full')
}

/** Trial type per level: none, sept1 (until next Sept 1), or months from sign-up */
export type TrialType = 'none' | 'sept1' | 'months'

export type TrialConfigItem = { type: TrialType; months?: number }

const DEFAULT_TRIAL_CONFIG: Record<MembershipLevelKey, TrialConfigItem> = {
  Full: { type: 'sept1' },
  Associate: { type: 'sept1' },
  Student: { type: 'months', months: 12 },
  Corporate: { type: 'none' },
  Honorary: { type: 'none' },
}

/** Load trial config from settings (admin-editable). Falls back to DEFAULT_TRIAL_CONFIG when keys missing. */
export async function getTrialConfig(): Promise<Record<MembershipLevelKey, TrialConfigItem>> {
  const supabase = await createClient()
  const keys = [
    ...MEMBERSHIP_LEVELS.map((l) => `trial_type_${l.toLowerCase()}`),
    ...MEMBERSHIP_LEVELS.map((l) => `trial_months_${l.toLowerCase()}`),
  ]
  const { data: rows } = await supabase.from('settings').select('key, value').in('key', keys)
  const map = new Map<string, string>()
  for (const r of rows ?? []) {
    map.set(r.key, r.value)
  }
  const result = { ...DEFAULT_TRIAL_CONFIG } as Record<MembershipLevelKey, TrialConfigItem>
  for (const level of MEMBERSHIP_LEVELS) {
    const typeKey = `trial_type_${level.toLowerCase()}`
    const typeVal = map.get(typeKey)
    if (typeVal === 'none' || typeVal === 'sept1' || typeVal === 'months') {
      result[level] = { type: typeVal }
      if (typeVal === 'months') {
        const monthsKey = `trial_months_${level.toLowerCase()}`
        const m = map.get(monthsKey)
        const n = m != null ? parseInt(m, 10) : NaN
        result[level] = { type: 'months', months: Number.isNaN(n) || n < 1 ? 12 : n }
      }
    }
  }
  return result
}

/** Compute trial end date from config. Returns null if no trial or missing created_at when type is months. */
function computeTrialEndFromConfig(
  config: TrialConfigItem,
  profileCreatedAt: string | null
): Date | null {
  if (config.type === 'none') return null
  const now = new Date()
  if (config.type === 'sept1') {
    const year = now.getFullYear()
    const sep1 = new Date(year, 8, 1)
    return now < sep1 ? sep1 : new Date(year + 1, 8, 1)
  }
  if (config.type === 'months' && profileCreatedAt) {
    const created = new Date(profileCreatedAt)
    const end = new Date(created)
    end.setMonth(end.getMonth() + (config.months ?? 12))
    return end
  }
  return null
}

/** Trial end date for a membership level (reads admin config from DB). Use this on the server. */
export async function getTrialEndDateAsync(
  level: MembershipLevelKey,
  profileCreatedAt: string | null
): Promise<Date | null> {
  const config = await getTrialConfig()
  return computeTrialEndFromConfig(config[level], profileCreatedAt)
}

/** Save trial config for one level. Used by admin settings. */
export async function setTrialConfigForLevel(
  level: MembershipLevelKey,
  item: TrialConfigItem
): Promise<void> {
  const supabase = await createClient()
  const typeKey = `trial_type_${level.toLowerCase()}`
  const typeVal = item.type
  await supabase.from('settings').upsert(
    { key: typeKey, value: typeVal, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (item.type === 'months') {
    const monthsKey = `trial_months_${level.toLowerCase()}`
    await supabase.from('settings').upsert(
      { key: monthsKey, value: String(item.months ?? 12), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  }
}

/**
 * Trial end date for a membership level (sync, default config only).
 * Use getTrialEndDateAsync on the server when admin-editable config is required.
 */
export function getTrialEndDate(
  level: MembershipLevelKey,
  profileCreatedAt: string | null
): Date | null {
  return computeTrialEndFromConfig(DEFAULT_TRIAL_CONFIG[level], profileCreatedAt)
}

/**
 * Membership expiry when syncing from Stripe.
 * If the subscription started before Sept 1st (trial period), extend to Sept 1st next year
 * so the member gets trial remainder + full year. Otherwise use Stripe's current_period_end.
 */
export function getMembershipExpiresAtFromSubscription(
  stripeCurrentPeriodEnd: Date,
  stripeCurrentPeriodStart: Date
): string {
  const year = stripeCurrentPeriodStart.getFullYear()
  const sep1ThisYear = new Date(year, 8, 1) // Sept 1
  if (stripeCurrentPeriodStart < sep1ThisYear) {
    return new Date(year + 1, 8, 1).toISOString() // Sept 1 next year
  }
  return stripeCurrentPeriodEnd.toISOString()
}

