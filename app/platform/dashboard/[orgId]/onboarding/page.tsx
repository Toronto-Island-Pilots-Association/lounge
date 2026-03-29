import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildOrgUrl } from '@/lib/org'
import { getOrgDuesBillingMode, getOrgDuesUiStatus } from '@/lib/org-dues-billing'
import { confirmOrgPlanCheckoutSession } from '@/lib/platform-org-billing'
import { syncOrgStripeOnboardingFromStripe } from '@/lib/platform-stripe-onboarding'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { PLAN_KEYS, PLANS, type PlanKey } from '@/lib/plans'
import { getOrgIdentity, getPlanPriceMonthly, getStripeBillingMode } from '@/lib/settings'
import { getBillableOrgMemberCount, getOrgPlanPricingBreakdown } from '@/lib/org-plan-pricing'
import MembershipLevelsForm from '../settings/membership/MembershipLevelsForm'
import PlanSelector from '../billing/PlanSelector'
import ManageOrgBillingButton from '../billing/ManageOrgBillingButton'
import ConnectStripeButton from '../../ConnectStripeButton'
import CopyJoinLinkButton from './CopyJoinLinkButton'
import ClubProfileSetupForm from './ClubProfileSetupForm'

export default async function OrgOnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams: Promise<{ created?: string; checkout?: string; session_id?: string; stripe?: string; plan?: string }>
}) {
  const { orgId } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/platform/login')

  const db = createServiceRoleClient()
  const { data: membership } = await db
    .from('org_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .eq('role', 'admin')
    .maybeSingle()

  if (!membership) redirect('/platform/dashboard')

  let notice: { tone: 'success' | 'warning'; text: string } | null = null

  if (sp.checkout === 'success' && typeof sp.session_id === 'string' && sp.session_id.trim()) {
    const sessionId = sp.session_id.trim()
    try {
      if (sessionId.includes('{CHECKOUT_SESSION_ID}')) {
        throw new Error('Missing checkout session id')
      }
      await confirmOrgPlanCheckoutSession(orgId, sessionId)
      notice = { tone: 'success', text: 'Billing details saved.' }
    } catch {
      notice = { tone: 'warning', text: 'Billing return could not be confirmed automatically. Open billing and try again if your plan still looks inactive.' }
    }
  } else if (sp.checkout === 'cancelled') {
    notice = { tone: 'warning', text: 'Billing setup was cancelled.' }
  }

  const { data: orgStripeRow } = await db
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', orgId)
    .maybeSingle()

  if (orgStripeRow?.stripe_account_id) {
    await syncOrgStripeOnboardingFromStripe(orgId)
    if (sp.stripe === 'return') {
      notice = { tone: 'success', text: 'Stripe setup updated.' }
    }
  }

  const { data: org } = await db
    .from('organizations')
    .select(
      'id, name, plan, subdomain, custom_domain, custom_domain_verified, stripe_account_id, stripe_customer_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled, stripe_subscription_id',
    )
    .eq('id', orgId)
    .maybeSingle()

  if (!org) redirect('/platform/dashboard')

  const currentPlan = (org.plan as PlanKey) ?? 'hobby'
  const selectedPlan =
    typeof sp.plan === 'string' && PLAN_KEYS.includes(sp.plan as PlanKey)
      ? (sp.plan as PlanKey)
      : null
  const identity = await getOrgIdentity(orgId)
  const memberCount = await getBillableOrgMemberCount(orgId)
  const planPrices = Object.fromEntries(
    await Promise.all(
      PLAN_KEYS.map(async (planKey) => [planKey, await getPlanPriceMonthly(planKey, orgId)] as const),
    ),
  ) as Record<PlanKey, number>
  const pricingByPlan = Object.fromEntries(
    await Promise.all(
      PLAN_KEYS.map(async (planKey) => [planKey, await getOrgPlanPricingBreakdown(orgId, planKey, memberCount)] as const),
    ),
  ) as Record<PlanKey, Awaited<ReturnType<typeof getOrgPlanPricingBreakdown>>>
  const billingStatus = await getOrgBillingActivationStatus(orgId)
  const stripeBillingMode = await getStripeBillingMode(orgId)
  const duesBillingMode = getOrgDuesBillingMode({ stripe_billing_mode: stripeBillingMode })
  const stripeStatus = getOrgDuesUiStatus({ ...org, stripe_billing_mode: stripeBillingMode })
  const orgUrl = buildOrgUrl(org)
  const joinLink = `${orgUrl}/become-a-member`
  const onboardingPath = `/platform/dashboard/${orgId}/onboarding`

  return (
    <div className="min-w-0 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-4xl space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Set up {org.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Finish the key setup steps here, then move into the full platform settings.
              </p>
            </div>
            <a
              href={orgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Open lounge
            </a>
          </div>

          {sp.created === '1' && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              {selectedPlan && selectedPlan !== 'hobby'
                ? `Your lounge is live. You selected ${PLANS[selectedPlan].label}, so finish billing below to switch this club off Hobby.`
                : 'Your lounge is live. Set dues, pick a plan, and connect Stripe when you’re ready to collect payments.'}
            </div>
          )}

          {notice && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                notice.tone === 'success'
                  ? 'border-green-200 bg-green-50 text-green-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              {notice.text}
            </div>
          )}
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Step 1</div>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">Tell us about your club</h2>
            <p className="mt-1 text-sm text-gray-500">
              Pick the closest club type and size so the lounge starts with more sensible defaults.
            </p>
          </div>
          <ClubProfileSetupForm
            orgId={orgId}
            initial={{
              clubType: identity.clubType,
              clubSize: identity.clubSize,
              websiteUrl: identity.websiteUrl,
              contactEmail: identity.contactEmail,
            }}
          />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Step 2</div>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">Set membership fees</h2>
            <p className="mt-1 text-sm text-gray-500">
              Define the levels you want members to join and the annual amount for each one.
            </p>
          </div>
          <MembershipLevelsForm orgId={orgId} hideIntro />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Step 3</div>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">Choose your plan</h2>
              <p className="mt-1 text-sm text-gray-500">
                Pick the plan that fits this club and add billing details before inviting members.
              </p>
            </div>
            {org.stripe_customer_id && planPrices[currentPlan] > 0 ? (
              <ManageOrgBillingButton orgId={orgId} />
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <span className="font-medium text-gray-900">Current:</span> {PLANS[currentPlan].label} at ${pricingByPlan[currentPlan].totalMonthly.toFixed(2)}/mo CAD
            {pricingByPlan[currentPlan].includedMembers != null && pricingByPlan[currentPlan].additionalMemberPriceCents != null
              ? ` for ${memberCount} active members`
              : ''}
          </div>

          {selectedPlan && selectedPlan !== currentPlan && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Selected from marketing: <span className="font-medium">{PLANS[selectedPlan].label}</span>. Add billing details to move this lounge from {PLANS[currentPlan].label} to {PLANS[selectedPlan].label}.
            </div>
          )}

          <PlanSelector
            orgId={orgId}
            currentPlan={currentPlan}
            pricingByPlan={pricingByPlan}
            billingActivated={billingStatus.activated}
            returnTo={onboardingPath}
          />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Step 4</div>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              {duesBillingMode === 'direct' ? 'Review dues payments' : 'Connect Stripe for dues'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {duesBillingMode === 'direct'
                ? 'This lounge uses its existing Stripe account for member dues. No Stripe Connect setup is needed here.'
                : 'Do this when you&apos;re ready to collect dues online. Stripe processing fees apply, plus a 2% ClubLounge platform fee on dues payments.'}
            </p>
          </div>

          {billingStatus.requiresActivation ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {duesBillingMode === 'direct'
                ? 'Add billing details first. After that, member dues can use the lounge\'s existing Stripe setup.'
                : 'Add billing details first. After that, you can connect your club’s Stripe account for dues.'}
            </div>
          ) : stripeStatus === 'direct_ready' ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              Member dues are using this lounge&apos;s existing Stripe account. Stripe Connect is not required.
            </div>
          ) : stripeStatus === 'fully_ready' ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              Stripe is connected and ready to accept member payments.
            </div>
          ) : stripeStatus === 'payments_active_payouts_pending' ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Member payments are on, but Stripe still needs a few payout details before funds can reach your bank.
            </div>
          ) : stripeStatus === 'pending' ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Stripe setup is in progress. Resume it to finish accepting dues.
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {duesBillingMode === 'direct'
                ? 'This lounge is set to use a direct Stripe setup for dues, but payments are not marked as ready yet.'
                : 'Stripe isn&apos;t connected yet.'}
            </div>
          )}

          {!billingStatus.requiresActivation && duesBillingMode === 'connect' && stripeStatus !== 'fully_ready' && (
            <ConnectStripeButton
              orgId={orgId}
              isPending={stripeStatus === 'pending' || stripeStatus === 'payments_active_payouts_pending'}
              returnTo={`${onboardingPath}?stripe=return`}
            />
          )}

          <Link
            href={`/platform/dashboard/${orgId}/settings/integrations`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            Open integrations and domain settings
          </Link>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Step 5</div>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">Invite members</h2>
            <p className="mt-1 text-sm text-gray-500">
              Share your join link once billing is active and your setup is ready.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Join link</div>
            <div className="mt-1 break-all font-mono text-sm text-gray-700">{joinLink}</div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <CopyJoinLinkButton joinLink={joinLink} />
            <a
              href={joinLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Preview join page
            </a>
          </div>
        </section>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link
            href={`/platform/dashboard/${orgId}/settings/general`}
            className="text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            Open full platform settings
          </Link>
          <Link
            href="/platform/dashboard"
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Back to all lounges
          </Link>
        </div>
      </div>
    </div>
  )
}
