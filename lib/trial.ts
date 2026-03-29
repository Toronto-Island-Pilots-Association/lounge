/**
 * Client-side trial display using server-computed `trial_end` from `/api/admin/members`.
 * Trial rules live in admin Membership settings (`lib/settings` + `membership_levels_config`).
 */
export function isOnTrialFromTrialEnd(
  status: string | null | undefined,
  trialEndIso: string | null | undefined,
): boolean {
  if (status !== 'approved' || !trialEndIso) return false
  return new Date(trialEndIso) > new Date()
}

export function trialUntilLabel(trialEndIso: string | null | undefined): string {
  if (!trialEndIso) return ''
  return new Date(trialEndIso).toLocaleDateString('en-US', { timeZone: 'UTC' })
}
