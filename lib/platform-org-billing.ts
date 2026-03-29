import { createServiceRoleClient } from '@/lib/supabase/server'
import { PLAN_KEYS, type PlanKey } from '@/lib/plans'
import { getPlatformStripeInstance } from '@/lib/stripe'

function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && PLAN_KEYS.includes(value as PlanKey)
}

export async function confirmOrgPlanCheckoutSession(orgId: string, sessionId: string) {
  const stripe = getPlatformStripeInstance()
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  })

  const sessionOrgId = session.metadata?.orgId
  const planKeyRaw = session.metadata?.planKey
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

  if (sessionOrgId !== orgId) {
    throw new Error('Checkout session does not belong to this organization')
  }
  if (!isPlanKey(planKeyRaw)) {
    throw new Error('Checkout session is missing a valid plan')
  }
  if (!subscriptionId) {
    throw new Error('Checkout session has no subscription')
  }

  const db = createServiceRoleClient()
  await db
    .from('organizations')
    .update({
      plan: planKeyRaw,
      stripe_subscription_id: subscriptionId,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    })
    .eq('id', orgId)

  return { planKey: planKeyRaw, subscriptionId }
}
