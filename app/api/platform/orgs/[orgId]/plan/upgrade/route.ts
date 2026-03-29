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
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

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

    const productName = `${orgName} ${planDef.label}`

    // When org has no subscription yet: create Checkout session.
    if (!org.stripe_subscription_id) {
      const price = await stripe.prices.create({
        currency: 'cad',
        unit_amount: Math.round(priceMonthly * 100),
        recurring: { interval: 'month' },
        product_data: { name: productName },
      })

      const host = request.headers.get('host') ?? 'clublounge.local:3000'
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
      const baseUrl = `${protocol}://${host}`

      const successUrl = `${baseUrl}/platform/dashboard/${encodeURIComponent(orgId)}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(planKey)}`
      const cancelUrl = `${baseUrl}/platform/dashboard/${encodeURIComponent(orgId)}/billing?checkout=cancelled&plan=${encodeURIComponent(planKey)}`

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { orgId, planKey },
        subscription_data: {
          metadata: { orgId, planKey },
        },
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // Otherwise update the existing platform subscription.
    const existingSubscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id, {
      expand: ['items.data.price'],
    })

    const firstItem = existingSubscription.items.data[0]
    if (!firstItem) {
      return NextResponse.json({ error: 'Existing subscription has no items' }, { status: 400 })
    }

    const price = await stripe.prices.create({
      currency: 'cad',
      unit_amount: Math.round(priceMonthly * 100),
      recurring: { interval: 'month' },
      product_data: { name: productName },
    })

    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{ id: firstItem.id, price: price.id }],
      proration_behavior: 'create_prorations',
      metadata: { orgId, planKey },
    } as Stripe.SubscriptionUpdateParams)

    // Optimistic DB update so the UI updates promptly; webhook stays source of truth.
    await db.from('organizations').update({ plan: planKey }).eq('id', orgId)

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upgrade org plan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
