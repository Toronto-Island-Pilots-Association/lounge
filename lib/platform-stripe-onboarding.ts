import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'

/** After Stripe Connect onboarding redirect, refresh `charges_enabled` into our DB. */
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
    if (account.charges_enabled) {
      await db.from('organizations').update({ stripe_onboarding_complete: true }).eq('id', orgId)
    }
  } catch (e) {
    console.error('syncOrgStripeOnboardingFromStripe', e)
  }
}
