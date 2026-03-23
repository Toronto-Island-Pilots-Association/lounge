/**
 * Platform-owned Stripe webhook for org plan tiers.
 *
 * Keeps:
 * - `organizations.plan`
 * - `organizations.stripe_subscription_id`
 *
 * in sync with Stripe subscription lifecycle. Subscription identifiers are
 * stored at checkout time (for initial set) and updated on subscription events.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'
import * as Sentry from '@sentry/nextjs'
import { PLAN_KEYS, type PlanKey } from '@/lib/plans'
import Stripe from 'stripe'
import { NextResponse } from 'next/server'

// Disable body parsing for webhook route
export const runtime = 'nodejs'

function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && PLAN_KEYS.includes(value as PlanKey)
}

function isSubscriptionPaidLike(status: string | null | undefined, cancelAtPeriodEnd: boolean | null | undefined) {
  // Treat active/trialing/past_due as "paid access".
  const activeStates = ['active', 'trialing', 'past_due']
  if (activeStates.includes(status ?? '')) return true

  // If Stripe is still in a paid period but will cancel at period end,
  // keep entitlements until it fully ends.
  if (cancelAtPeriodEnd) return true

  return false
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_PLATFORM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const stripe = getPlatformStripeInstance()
  const webhookSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Platform webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : (session.subscription as Stripe.Subscription | null)?.id
        const orgId = session.metadata?.orgId
        const planKeyRaw = session.metadata?.planKey

        if (!subscriptionId || !orgId || !isPlanKey(planKeyRaw)) {
          console.error('Missing orgId/planKey/subscriptionId in checkout.session.completed metadata', {
            subscriptionId,
            orgId,
            planKeyRaw,
          })
          break
        }

        await supabase
          .from('organizations')
          .update({
            stripe_subscription_id: subscriptionId,
            plan: planKeyRaw,
          })
          .eq('id', orgId)

        Sentry.metrics.count('org.plan.subscription_purchased', 1, { attributes: { plan: planKeyRaw } })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.orgId
        const planKeyRaw = subscription.metadata?.planKey

        if (!orgId || !isPlanKey(planKeyRaw)) {
          console.error('Missing orgId/planKey in subscription.metadata', { orgId, planKeyRaw })
          break
        }

        const shouldKeep = isSubscriptionPaidLike(subscription.status, subscription.cancel_at_period_end)
        const nextPlan: PlanKey = shouldKeep ? planKeyRaw : 'hobby'

        await supabase
          .from('organizations')
          .update({
            plan: nextPlan,
            stripe_subscription_id: shouldKeep ? subscription.id : subscription.id, // keep id for audit
          })
          .eq('id', orgId)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.orgId
        const planKeyRaw = subscription.metadata?.planKey

        if (!orgId) {
          console.error('Missing orgId in subscription.metadata for deleted event', { planKeyRaw })
          break
        }

        await supabase
          .from('organizations')
          .update({
            plan: 'hobby',
            stripe_subscription_id: null,
          })
          .eq('id', orgId)

        break
      }

      default:
        console.log(`Unhandled platform webhook event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Platform webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

