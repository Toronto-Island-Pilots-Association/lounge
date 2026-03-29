import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getOrgDuesBillingMode, getOrgDuesUiStatus } from '@/lib/org-dues-billing'
import { syncOrgStripeOnboardingFromStripe } from '@/lib/platform-stripe-onboarding'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import ConnectStripeButton from '../../../ConnectStripeButton'
import StripeDashboardButton from '../../../StripeDashboardButton'
import MembershipLevelsForm from './MembershipLevelsForm'

export default async function PlatformMembershipSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/platform/login')

  const db = createServiceRoleClient()
  const { data: orgStripeRow } = await db
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', orgId)
    .maybeSingle()

  if (orgStripeRow?.stripe_account_id) {
    await syncOrgStripeOnboardingFromStripe(orgId)
  }

  const { data: org } = await db
    .from('organizations')
    .select(
      'id, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled',
    )
    .eq('id', orgId)
    .maybeSingle()

  const billingStatus = await getOrgBillingActivationStatus(orgId)
  const duesBillingMode = getOrgDuesBillingMode(org)
  const stripeStatus = org ? getOrgDuesUiStatus(org) : 'not_connected'
  const returnTo = `/platform/dashboard/${orgId}/settings/membership`

  return (
    <div className="min-w-0 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-2xl min-w-0 space-y-6">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Membership</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure membership tiers, annual fees, and optional trial periods for this lounge.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <MembershipLevelsForm orgId={orgId} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Member dues</h2>
            <p className="text-sm text-gray-500 mt-1">
              {duesBillingMode === 'direct'
                ? 'This lounge uses its existing Stripe account for member dues. No Stripe Connect setup is needed here.'
                : 'Connect Stripe here when you are ready to collect dues online. Stripe processing fees apply, plus a 2% ClubLounge platform fee on dues payments.'}
            </p>
          </div>

          {billingStatus.requiresActivation ? (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              {duesBillingMode === 'direct'
                ? 'Add billing details before collecting dues.'
                : 'Add billing details before connecting Stripe and collecting dues.'}
              {' '}
              <Link href={`/platform/dashboard/${orgId}/billing`} className="font-medium underline underline-offset-2">
                Open billing
              </Link>
              .
            </div>
          ) : stripeStatus === 'direct_ready' ? (
            <div className="space-y-3">
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                Member dues are using this lounge&apos;s existing Stripe account. Stripe Connect is not required.
              </div>
            </div>
          ) : stripeStatus === 'fully_ready' ? (
            <div className="space-y-3">
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                Stripe is connected and ready to accept member payments.
              </div>
              <StripeDashboardButton orgId={orgId} />
            </div>
          ) : stripeStatus === 'payments_active_payouts_pending' ? (
            <div className="space-y-3">
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Member payments are on, but Stripe still needs a few payout details before funds can reach your bank.
              </div>
              <StripeDashboardButton orgId={orgId} />
            </div>
          ) : stripeStatus === 'pending' ? (
            <div className="space-y-3">
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Stripe setup is in progress. Resume it to finish accepting dues.
              </div>
              <ConnectStripeButton orgId={orgId} isPending returnTo={returnTo} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                {duesBillingMode === 'direct'
                  ? 'This lounge is set to use a direct Stripe setup for dues, but payments are not marked as ready yet.'
                  : 'Stripe isn&apos;t connected yet.'}
              </div>
              {duesBillingMode === 'connect' ? (
                <ConnectStripeButton orgId={orgId} isPending={false} returnTo={returnTo} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
