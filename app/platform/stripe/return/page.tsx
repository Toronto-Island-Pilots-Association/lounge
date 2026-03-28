import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { syncOrgStripeOnboardingFromStripe } from '@/lib/platform-stripe-onboarding'

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

  const { data: org } = await db
    .from('organizations')
    .select('id, stripe_account_id')
    .eq('id', org_id)
    .maybeSingle()

  if (org?.stripe_account_id) {
    await syncOrgStripeOnboardingFromStripe(org_id)
  }

  redirect('/platform/dashboard')
}
