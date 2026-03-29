import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { orgStripeDuesUiStatus } from '@/lib/org-stripe-dues-status'
import { syncOrgStripeOnboardingFromStripe } from '@/lib/platform-stripe-onboarding'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { PLANS, PLAN_KEYS, type PlanKey } from '@/lib/plans'
import { getPlanPriceMonthly } from '@/lib/settings'
import ConnectStripeButton from '../../ConnectStripeButton'
import ManageOrgBillingButton from './ManageOrgBillingButton'
import PlanSelector from './PlanSelector'
import DeleteOrgButton from './DeleteOrgButton'

const FEATURE_ROWS: { label: string; key: keyof (typeof PLANS)[PlanKey]['features'] }[] = [
  { label: 'Member directory', key: 'memberDirectory' },
  { label: 'Events', key: 'events' },
  { label: 'Resources', key: 'resources' },
  { label: 'Discussions', key: 'discussions' },
  { label: 'Member approvals', key: 'requireMemberApproval' },
  { label: 'Member invitations', key: 'allowMemberInvitations' },
  { label: 'Stripe dues collection', key: 'stripeDues' },
  { label: 'Digest emails', key: 'digestEmails' },
  { label: 'Analytics', key: 'analytics' },
  { label: 'Custom domain', key: 'customDomain' },
  { label: 'Membership tiers', key: 'membershipTiers' },
  { label: 'Member trial periods', key: 'memberTrials' },
  { label: 'Remove ClubLounge branding', key: 'hideBranding' },
]

export default async function BillingPage({
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

  // Verify admin
  const { data: membership } = await db
    .from('org_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .eq('role', 'admin')
    .maybeSingle()

  if (!membership) redirect('/platform/dashboard')

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
      'id, name, plan, stripe_account_id, stripe_customer_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled, stripe_subscription_id',
    )
    .eq('id', orgId)
    .maybeSingle()

  if (!org) redirect('/platform/dashboard')

  const currentPlan: PlanKey = (org.plan as PlanKey) ?? 'hobby'
  const currentPlanDef = PLANS[currentPlan]
  const billingStatus = await getOrgBillingActivationStatus(orgId)
  const planPrices = Object.fromEntries(
    await Promise.all(
      PLAN_KEYS.map(async (planKey) => [planKey, await getPlanPriceMonthly(planKey, orgId)] as const),
    ),
  ) as Record<PlanKey, number>

  const stripeStatus = orgStripeDuesUiStatus(org)

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <Link href="/platform" className="font-bold tracking-tight">ClubLounge</Link>
        <Link
          href="/platform/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to dashboard
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-12 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Billing & plan</p>
        </div>

        {/* Current plan summary */}
        <div className="bg-white rounded-xl border p-6 flex items-center justify-between gap-6">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Current plan</div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">{currentPlanDef.label}</span>
              <span className="text-sm text-gray-400">${planPrices[currentPlan]}/mo CAD</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">{currentPlanDef.recommendedMembers}</div>
            <div className="text-sm text-gray-500">{currentPlanDef.recommendedAdmins}</div>
          </div>
          {billingStatus.requiresActivation ? (
            <div className="flex items-center gap-1.5 text-sm text-amber-900 bg-amber-50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Billing setup needed
            </div>
          ) : org.stripe_subscription_id ? (
            <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Subscription active
            </div>
          ) : null}
        </div>

        {/* Plan selector */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Change plan</h2>
          <PlanSelector
            orgId={orgId}
            currentPlan={currentPlan}
            planPrices={planPrices}
            billingActivated={billingStatus.activated}
          />
          {org.stripe_customer_id && planPrices[currentPlan] > 0 && (
            <ManageOrgBillingButton orgId={orgId} />
          )}
        </div>

        {/* Feature comparison */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Plan comparison</h2>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium w-1/3">Feature</th>
                  {PLAN_KEYS.map((planKey) => (
                    <th
                      key={planKey}
                      className={`text-center px-3 py-3 font-semibold ${
                        planKey === currentPlan ? 'text-[var(--color-primary)]' : 'text-gray-500'
                      }`}
                    >
                      {PLANS[planKey].label}
                      {planKey === currentPlan && (
                        <span className="ml-1.5 text-xs font-normal text-blue-600">✓</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-600">Price / month</td>
                  {PLAN_KEYS.map((planKey) => (
                    <td key={planKey} className={`text-center px-3 py-2.5 font-medium ${planKey === currentPlan ? 'text-[var(--color-primary)]' : 'text-gray-700'}`}>
                      ${planPrices[planKey]}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2.5 text-gray-600">Recommended club size</td>
                  {PLAN_KEYS.map((planKey) => (
                    <td key={planKey} className={`text-center px-3 py-2.5 ${planKey === currentPlan ? 'text-[var(--color-primary)] font-medium' : 'text-gray-500'}`}>
                      {PLANS[planKey].recommendedMembers}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2.5 text-gray-600">Recommended admin team</td>
                  {PLAN_KEYS.map((planKey) => (
                    <td key={planKey} className={`text-center px-3 py-2.5 ${planKey === currentPlan ? 'text-[var(--color-primary)] font-medium' : 'text-gray-500'}`}>
                      {PLANS[planKey].recommendedAdmins}
                    </td>
                  ))}
                </tr>
                {FEATURE_ROWS.map(({ label, key }, i) => (
                  <tr key={key} className={i < FEATURE_ROWS.length - 1 ? 'border-b' : ''}>
                    <td className="px-4 py-2.5 text-gray-600">{label}</td>
                    {PLAN_KEYS.map((planKey) => {
                      const included = PLANS[planKey].features[key]
                      return (
                        <td key={planKey} className="text-center px-3 py-2.5">
                          {included ? (
                            <span className={`text-base ${planKey === currentPlan ? 'text-[var(--color-primary)]' : 'text-green-600'}`}>✓</span>
                          ) : (
                            <span className="text-gray-200">–</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stripe Connect */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Member dues (Stripe Connect)</h2>
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      stripeStatus === 'not_connected'
                        ? 'bg-gray-300'
                        : stripeStatus === 'pending'
                          ? 'bg-yellow-400'
                          : stripeStatus === 'payments_active_payouts_pending'
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                    }`}
                  />
                  <span className="font-medium text-sm">
                    {stripeStatus === 'fully_ready' && 'Stripe connected — accepting payments'}
                    {stripeStatus === 'payments_active_payouts_pending' &&
                      'Member payments on — finish Stripe setup for payouts'}
                    {stripeStatus === 'pending' && 'Stripe onboarding incomplete'}
                    {stripeStatus === 'not_connected' && 'Stripe not connected'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 pl-4">
                  {stripeStatus === 'fully_ready'
                    ? 'You can collect member dues directly through your lounge, and payouts are enabled on your Stripe account.'
                    : stripeStatus === 'payments_active_payouts_pending'
                      ? 'Members can pay membership dues. Complete any required steps in your Stripe Dashboard so funds can be paid out to your bank.'
                      : stripeStatus === 'pending'
                        ? 'Complete Stripe onboarding so members can pay membership dues online.'
                        : 'Connect Stripe to collect membership dues from your members.'}
                </p>
              </div>
              {billingStatus.requiresActivation ? (
                <div className="mt-4 pt-4 border-t text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
                  Add billing details before connecting Stripe and collecting dues.
                </div>
              ) : (stripeStatus === 'not_connected' || stripeStatus === 'pending') && (
                <ConnectStripeButton orgId={orgId} isPending={stripeStatus === 'pending'} />
              )}
            </div>
            {(stripeStatus === 'not_connected' || stripeStatus === 'pending') &&
              !currentPlanDef.features.stripeDues && (
              <div className="mt-4 pt-4 border-t text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
                Stripe dues collection requires the <strong>Core</strong> plan or higher.
              </div>
            )}
          </div>
        </div>
        {/* Danger zone */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide">Danger zone</h2>
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Delete this organization</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Permanently remove this lounge and all its data. This cannot be undone.
                </p>
              </div>
              <DeleteOrgButton orgId={orgId} orgName={org.name} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
