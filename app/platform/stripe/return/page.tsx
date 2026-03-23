import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'

export default async function StripeReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ org_id?: string }>
}) {
  const { org_id } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/platform/login')
  if (!org_id) redirect('/platform/dashboard')

  const db = createServiceRoleClient()

  // Get org and verify admin
  const { data: org } = await db
    .from('organizations')
    .select('id, stripe_account_id')
    .eq('id', org_id)
    .single()

  if (org?.stripe_account_id) {
    try {
      const stripe = getPlatformStripeInstance()
      const account = await stripe.accounts.retrieve(org.stripe_account_id)

      // Mark onboarding complete if Stripe confirms charges are enabled
      if (account.charges_enabled) {
        await db
          .from('organizations')
          .update({ stripe_onboarding_complete: true })
          .eq('id', org_id)
      }
    } catch (e) {
      console.error('Error verifying Stripe account:', e)
    }
  }

  redirect('/platform/dashboard')
}
