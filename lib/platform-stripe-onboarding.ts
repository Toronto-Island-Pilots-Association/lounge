import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'
import type Stripe from 'stripe'

export function stripeConnectRowFromAccount(account: Stripe.Account): {
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  stripe_onboarding_complete: boolean
} {
  const charges = !!account.charges_enabled
  return {
    stripe_charges_enabled: charges,
    stripe_payouts_enabled: !!account.payouts_enabled,
    // Legacy column: keep aligned with “can charge on this connected account”
    stripe_onboarding_complete: charges,
  }
}

/** After Connect onboarding or account.updated: persist charges/payouts from Stripe. */
export async function syncOrgStripeOnboardingFromStripe(orgId: string): Promise<void> {
  const db = createServiceRoleClient()
  const { data: org } = await db
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', orgId)
    .maybeSingle()

  if (!org?.stripe_account_id) return

  try {
    const stripe = getPlatformStripeInstance()
    const account = await stripe.accounts.retrieve(org.stripe_account_id)
    await db
      .from('organizations')
      .update(stripeConnectRowFromAccount(account))
      .eq('id', orgId)
  } catch (e) {
    console.error('syncOrgStripeOnboardingFromStripe', e)
  }
}

/** Platform webhook: resolve org by connected account id and sync. */
export async function syncOrgStripeByConnectedAccountId(stripeAccountId: string): Promise<void> {
  const db = createServiceRoleClient()
  const { data: org } = await db
    .from('organizations')
    .select('id')
    .eq('stripe_account_id', stripeAccountId)
    .maybeSingle()
  if (!org?.id) return
  await syncOrgStripeOnboardingFromStripe(org.id)
}
