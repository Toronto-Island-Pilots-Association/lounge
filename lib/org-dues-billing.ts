import type { StripeBillingMode } from '@/lib/settings'

export type OrgDuesBillingMode = 'direct' | 'connect'

export type OrgDuesUiStatus =
  | 'direct_ready'
  | 'not_connected'
  | 'pending'
  | 'payments_active_payouts_pending'
  | 'fully_ready'

type OrgDuesBillingShape = {
  stripe_billing_mode?: StripeBillingMode | null
  stripe_account_id?: string | null
  stripe_charges_enabled?: boolean | null
  stripe_payouts_enabled?: boolean | null
}

export function getOrgDuesBillingMode(org: OrgDuesBillingShape | null | undefined): OrgDuesBillingMode {
  if (!org) return 'connect'
  if (org.stripe_billing_mode === 'direct') return 'direct'
  if (org.stripe_billing_mode === 'connect') return 'connect'
  if (org.stripe_account_id) return 'connect'
  if (org.stripe_charges_enabled) return 'direct'
  return 'connect'
}

export function isOrgDirectStripeMode(org: OrgDuesBillingShape | null | undefined): boolean {
  return getOrgDuesBillingMode(org) === 'direct'
}

export function getOrgDuesUiStatus(org: OrgDuesBillingShape): OrgDuesUiStatus {
  if (getOrgDuesBillingMode(org) === 'direct') {
    return org.stripe_charges_enabled ? 'direct_ready' : 'not_connected'
  }

  if (!org.stripe_account_id) return 'not_connected'
  if (!org.stripe_charges_enabled) return 'pending'
  if (!org.stripe_payouts_enabled) return 'payments_active_payouts_pending'
  return 'fully_ready'
}

export function canOrgAcceptMemberStripePayments(org: OrgDuesBillingShape): boolean {
  if (getOrgDuesBillingMode(org) === 'direct') {
    return org.stripe_charges_enabled === true
  }

  return Boolean(org.stripe_account_id) && org.stripe_charges_enabled === true
}
