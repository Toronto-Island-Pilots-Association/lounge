/** UI states for org Stripe Connect + member dues (minimal, no extra Stripe fields). */
export type OrgStripeDuesUiStatus =
  | 'not_connected'
  | 'pending'
  | 'payments_active_payouts_pending'
  | 'fully_ready'

export function orgStripeDuesUiStatus(org: {
  stripe_account_id: string | null | undefined
  stripe_charges_enabled: boolean | null | undefined
  stripe_payouts_enabled: boolean | null | undefined
}): OrgStripeDuesUiStatus {
  if (!org.stripe_account_id) return 'not_connected'
  if (!org.stripe_charges_enabled) return 'pending'
  if (!org.stripe_payouts_enabled) return 'payments_active_payouts_pending'
  return 'fully_ready'
}
