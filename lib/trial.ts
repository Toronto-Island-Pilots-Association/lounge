import type { MembershipLevel } from '@/types/database'

/**
 * Trial end date for a membership level (client-safe, mirrors lib/settings.ts).
 * - Full / Associate: trial until next Sept 1
 * - Student: 12 months from profile created_at
 * - Others: no trial
 */
export function getTrialEndDate(
  level: MembershipLevel | null | undefined,
  profileCreatedAt: string | null | undefined
): Date | null {
  if (!level) return null
  const now = new Date()
  if (level === 'Full' || level === 'Associate') {
    const year = now.getFullYear()
    const sep1 = new Date(year, 8, 1) // Sept 1
    return now < sep1 ? sep1 : new Date(year + 1, 8, 1)
  }
  if (level === 'Student' && profileCreatedAt) {
    const created = new Date(profileCreatedAt)
    const trialEnd = new Date(created)
    trialEnd.setFullYear(trialEnd.getFullYear() + 1)
    return trialEnd
  }
  return null
}

/** True if member is currently on trial (approved, has trial end date, and today is before it). */
export function isOnTrial(
  level: MembershipLevel | null | undefined,
  profileCreatedAt: string | null | undefined,
  status: string | null | undefined
): boolean {
  if (status !== 'approved') return false
  const end = getTrialEndDate(level, profileCreatedAt)
  return end !== null && new Date() < end
}
