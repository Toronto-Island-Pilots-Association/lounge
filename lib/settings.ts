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
  await supabase.from('settings').upsert(
    { key, value: String(fee), updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
}

/** Single global fee (legacy). Returns Full level fee. */
export async function getMembershipFee(): Promise<number> {
  return getMembershipFeeForLevel('Full')
}

/**
 * Trial end date for a membership level, if applicable.
 * - Full: trial until next Sept 1
 * - Associate: trial until next Sept 1
 * - Student: 12 months from profile created_at
 * - Others: no trial
 */
export function getTrialEndDate(
  level: MembershipLevelKey,
  profileCreatedAt: string | null
): Date | null {
  const now = new Date()
  if (level === 'Full' || level === 'Associate') {
    const year = now.getFullYear()
    const sep1 = new Date(year, 8, 1) // Sept 1
    const trialEnd = now < sep1 ? sep1 : new Date(year + 1, 8, 1)
    return trialEnd
  }
  if (level === 'Student' && profileCreatedAt) {
    const created = new Date(profileCreatedAt)
    const trialEnd = new Date(created)
    trialEnd.setFullYear(trialEnd.getFullYear() + 1) // 12 months from sign-up
    return trialEnd
  }
  return null
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

