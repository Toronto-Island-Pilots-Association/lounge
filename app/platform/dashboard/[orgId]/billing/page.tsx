import { redirect } from 'next/navigation'
import Link from 'next/link'
import { confirmOrgPlanCheckoutSession } from '@/lib/platform-org-billing'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { syncOrgStripeOnboardingFromStripe } from '@/lib/platform-stripe-onboarding'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { getManagedOrgConfig } from '@/lib/managed-orgs'
import { PLANS, PLAN_KEYS, type PlanKey } from '@/lib/plans'
import { getPlanPriceMonthly } from '@/lib/settings'
import { getBillableOrgMemberCount, getOrgPlanPricingBreakdown } from '@/lib/org-plan-pricing'
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
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams: Promise<{ checkout?: string; session_id?: string }>
}) {
  const { orgId } = await params
  const sp = await searchParams

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

  let checkoutNotice: string | null = null
  if (sp.checkout === 'success' && typeof sp.session_id === 'string' && sp.session_id.trim()) {
    const sessionId = sp.session_id.trim()
    try {
      if (sessionId.includes('{CHECKOUT_SESSION_ID}')) {
        throw new Error('Missing checkout session id')
      }
      await confirmOrgPlanCheckoutSession(orgId, sessionId)
      checkoutNotice = 'Billing details saved.'
    } catch {
      checkoutNotice = 'Billing return could not be confirmed automatically. Try adding billing details again if this plan still shows as inactive.'
    }
  } else if (sp.checkout === 'cancelled') {
    checkoutNotice = 'Billing setup was cancelled.'
  }

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
  const managedOrg = getManagedOrgConfig(orgId)
  const currentPlanDef = PLANS[currentPlan]
  const billingStatus = await getOrgBillingActivationStatus(orgId)
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
  const currentPricing = pricingByPlan[currentPlan]

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
        {checkoutNotice && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            sp.checkout === 'success'
              ? checkoutNotice === 'Billing details saved.'
                ? 'border-green-200 bg-green-50 text-green-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}>
            {checkoutNotice}
          </div>
        )}

        {/* Current plan summary */}
        <div className="bg-white rounded-xl border p-6 flex items-center justify-between gap-6">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Current plan</div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">{currentPlanDef.label}</span>
              <span className="text-sm text-gray-400">${currentPricing.totalMonthly.toFixed(2)}/mo CAD</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">{currentPlanDef.recommendedMembers}</div>
            <div className="text-sm text-gray-500">{currentPlanDef.recommendedAdmins}</div>
            {currentPricing.includedMembers != null && currentPricing.additionalMemberPriceCents != null && (
              <div className="text-sm text-gray-500 mt-1">
                {memberCount} active members. Includes {currentPricing.includedMembers}, then ${(currentPricing.additionalMemberPriceCents / 100).toFixed(2)}/member/mo.
              </div>
            )}
          </div>
          {billingStatus.requiresActivation ? (
            <div className="flex items-center gap-1.5 text-sm text-amber-900 bg-amber-50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Billing setup needed
            </div>
          ) : currentPricing.baseMonthly <= 0 ? (
            <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Managed by ClubLounge
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
            pricingByPlan={pricingByPlan}
            billingActivated={billingStatus.activated}
            allowSelfServePlanChanges={managedOrg?.allowSelfServePlanChanges !== false}
          />
          {managedOrg?.billingManagedByPlatform && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              Billing and plan changes for this organization are managed by ClubLounge.
            </div>
          )}
          {!managedOrg?.billingManagedByPlatform && org.stripe_customer_id && planPrices[currentPlan] > 0 && (
            <ManageOrgBillingButton orgId={orgId} />
          )}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Manage member dues and Stripe from
            {' '}
            <Link href={`/platform/dashboard/${orgId}/settings/membership`} className="font-medium underline underline-offset-2">
              Membership
            </Link>
            .
          </div>
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
                      {pricingByPlan[planKey].overageMembers > 0 ? ` + ${pricingByPlan[planKey].overageMembers} overage` : ''}
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
