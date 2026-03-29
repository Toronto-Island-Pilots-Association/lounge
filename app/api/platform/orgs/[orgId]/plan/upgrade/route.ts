/**
 * POST /api/platform/orgs/[orgId]/plan/upgrade
 * Platform-owned org tier upgrade (hobby → starter → community → club_pro).
 *
 * AuthZ: caller must be an `admin` in `org_memberships` for the given org.
 * Stripe: uses platform Stripe account (STRIPE_PLATFORM_SECRET_KEY).
 */
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'
import { PLAN_KEYS, PLANS, type PlanKey } from '@/lib/plans'
import { getPlanPriceMonthly } from '@/lib/settings'
import { buildOrgPlanCheckoutLineItems, syncOrgPlanSubscriptionBilling } from '@/lib/org-plan-subscription'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function resolvePlatformPath(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed.startsWith('/platform/')) return fallback
  return trimmed
}

function withRawCheckoutSessionId(url: URL) {
  return url
    .toString()
    .replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}')
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    if (!process.env.STRIPE_PLATFORM_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe platform is not configured' }, { status: 500 })
    }

    const { orgId } = await params

    const body = await request.json().catch(() => ({}))
    const requestedPlan = body?.plan
    const returnTo = resolvePlatformPath(
      body?.returnTo,
      `/platform/dashboard/${encodeURIComponent(orgId)}/billing`,
    )

    if (typeof requestedPlan !== 'string' || !PLAN_KEYS.includes(requestedPlan as PlanKey)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${PLAN_KEYS.join(', ')}` },
        { status: 400 }
      )
    }

    // Platform auth: resolve current user from Supabase session
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify org admin permission
    const db = createServiceRoleClient()
    const { data: membership, error: membershipError } = await db
      .from('org_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .maybeSingle()

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message ?? 'Failed to verify org admin' }, { status: 500 })
    }
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const planKey = requestedPlan as PlanKey
    const planDef = PLANS[planKey]

    const stripe = getPlatformStripeInstance()

    // Load org (includes stored platform Stripe IDs)
    const { data: org, error: orgError } = await db
      .from('organizations')
      .select('id, name, stripe_customer_id, stripe_subscription_id, plan')
      .eq('id', orgId)
      .maybeSingle()

    if (orgError) {
      return NextResponse.json({ error: orgError.message ?? 'Failed to load organization' }, { status: 500 })
    }
    if (!org) return NextResponse.json({ error: `Organization not found (orgId=${orgId})` }, { status: 404 })

    const orgName = (org.name ?? 'Club').trim()
    const priceMonthly = await getPlanPriceMonthly(planKey, orgId)

    if (priceMonthly <= 0) {
      if (org.stripe_subscription_id) {
        return NextResponse.json(
          { error: `${planDef.label} has custom billing for this organization. Contact ClubLounge to change plans.` },
          { status: 400 }
        )
      }

      await db.from('organizations').update({ plan: planKey }).eq('id', orgId)
      return NextResponse.json({ ok: true })
    }

    // Ensure we have a Stripe Customer for the org on the platform account.
    let customerId: string | null = org.stripe_customer_id

    if (!customerId) {
      // Try to read org contact email from settings (optional)
      const { data: settingsRows } = await db
        .from('settings')
        .select('key,value')
        .in('key', ['contact_email'])
        .eq('org_id', orgId)

      const contactEmail =
        (settingsRows || []).find(r => r.key === 'contact_email')?.value?.trim() || undefined

      const customer = await stripe.customers.create({
        name: orgName,
        email: contactEmail,
        metadata: { orgId },
      })

      customerId = customer.id
      await db.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId)
    }

    // When org has no subscription yet: create Checkout session.
    if (!org.stripe_subscription_id) {
      const host = request.headers.get('host') ?? 'clublounge.local:3000'
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
      const baseUrl = `${protocol}://${host}`
      const successUrl = new URL(returnTo, baseUrl)
      successUrl.searchParams.set('checkout', 'success')
      successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}')
      successUrl.searchParams.set('plan', planKey)
      const cancelUrl = new URL(returnTo, baseUrl)
      cancelUrl.searchParams.set('checkout', 'cancelled')
      cancelUrl.searchParams.set('plan', planKey)

      const { lineItems } = await buildOrgPlanCheckoutLineItems(orgId, orgName, planKey)

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: lineItems,
        success_url: withRawCheckoutSessionId(successUrl),
        cancel_url: cancelUrl.toString(),
        metadata: { orgId, planKey },
        subscription_data: {
          metadata: { orgId, planKey },
        },
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // Otherwise update the existing platform subscription.
    await syncOrgPlanSubscriptionBilling(orgId, { planKey })

    // Optimistic DB update so the UI updates promptly; webhook stays source of truth.
    await db.from('organizations').update({ plan: planKey }).eq('id', orgId)

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upgrade org plan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
