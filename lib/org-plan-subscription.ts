import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'
import { type PlanKey } from '@/lib/plans'
import { getOrgPlanPricingBreakdown } from '@/lib/org-plan-pricing'
import Stripe from 'stripe'

type BillingItemType = 'base' | 'overage'

function getPriceMetadata(
  item: Stripe.SubscriptionItem,
  key: string,
): string | undefined {
  const price = item.price
  if (!price || typeof price === 'string') return undefined
  return price.metadata?.[key]
}

function isBillingItemType(item: Stripe.SubscriptionItem, type: BillingItemType) {
  return getPriceMetadata(item, 'orgBillingItemType') === type
}

async function ensureRecurringPrice({
  stripe,
  orgId,
  planKey,
  amountCents,
  orgName,
  itemType,
}: {
  stripe: Stripe
  orgId: string
  planKey: PlanKey
  amountCents: number
  orgName: string
  itemType: BillingItemType
}) {
  return stripe.prices.create({
    currency: 'cad',
    unit_amount: amountCents,
    recurring: { interval: 'month' },
    product_data: {
      name:
        itemType === 'base'
          ? `${orgName} ${planKey} base`
          : `${orgName} ${planKey} member overage`,
      metadata: {
        orgId,
        planKey,
        orgBillingItemType: itemType,
      },
    },
    metadata: {
      orgId,
      planKey,
      orgBillingItemType: itemType,
    },
  })
}

export async function buildOrgPlanCheckoutLineItems(orgId: string, orgName: string, planKey: PlanKey) {
  const stripe = getPlatformStripeInstance()
  const pricing = await getOrgPlanPricingBreakdown(orgId, planKey)
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

  const basePrice = await ensureRecurringPrice({
    stripe,
    orgId,
    planKey,
    amountCents: pricing.baseMonthlyCents,
    orgName,
    itemType: 'base',
  })
  lineItems.push({ price: basePrice.id, quantity: 1 })

  if (pricing.overageMembers > 0 && pricing.additionalMemberPriceCents != null) {
    const overagePrice = await ensureRecurringPrice({
      stripe,
      orgId,
      planKey,
      amountCents: pricing.additionalMemberPriceCents,
      orgName,
      itemType: 'overage',
    })
    lineItems.push({ price: overagePrice.id, quantity: pricing.overageMembers })
  }

  return { lineItems, pricing }
}

export async function syncOrgPlanSubscriptionBilling(
  orgId: string,
  options?: {
    planKey?: PlanKey
    prorationBehavior?: Stripe.SubscriptionUpdateParams.ProrationBehavior
  },
) {
  const db = createServiceRoleClient()
  const { data: org, error } = await db
    .from('organizations')
    .select('id, name, plan, stripe_subscription_id')
    .eq('id', orgId)
    .maybeSingle()

  if (error || !org) throw new Error(error?.message ?? `Organization not found (${orgId})`)
  if (!org.stripe_subscription_id) return null

  const planKey = options?.planKey ?? (org.plan as PlanKey)
  const stripe = getPlatformStripeInstance()
  const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id, {
    expand: ['items.data.price'],
  })
  const pricing = await getOrgPlanPricingBreakdown(orgId, planKey)

  if (pricing.baseMonthlyCents <= 0) return { subscriptionId: subscription.id, pricing }

  const items = subscription.items.data
  const overageItem = items.find(item => isBillingItemType(item, 'overage'))
  const baseItem =
    items.find(item => isBillingItemType(item, 'base')) ??
    items.find(item => item.id !== overageItem?.id) ??
    items[0]

  const updateItems: Stripe.SubscriptionUpdateParams.Item[] = []

  if (baseItem && baseItem.price.unit_amount === pricing.baseMonthlyCents) {
    updateItems.push({ id: baseItem.id, quantity: 1 })
  } else {
    const basePrice = await ensureRecurringPrice({
      stripe,
      orgId,
      planKey,
      amountCents: pricing.baseMonthlyCents,
      orgName: org.name ?? 'Club',
      itemType: 'base',
    })
    if (baseItem) {
      updateItems.push({ id: baseItem.id, price: basePrice.id, quantity: 1 })
    } else {
      updateItems.push({ price: basePrice.id, quantity: 1 })
    }
  }

  if (pricing.overageMembers > 0 && pricing.additionalMemberPriceCents != null) {
    if (overageItem && overageItem.price.unit_amount === pricing.additionalMemberPriceCents) {
      updateItems.push({ id: overageItem.id, quantity: pricing.overageMembers })
    } else {
      const overagePrice = await ensureRecurringPrice({
        stripe,
        orgId,
        planKey,
        amountCents: pricing.additionalMemberPriceCents,
        orgName: org.name ?? 'Club',
        itemType: 'overage',
      })
      if (overageItem) {
        updateItems.push({ id: overageItem.id, price: overagePrice.id, quantity: pricing.overageMembers })
      } else {
        updateItems.push({ price: overagePrice.id, quantity: pricing.overageMembers })
      }
    }
  } else if (overageItem) {
    updateItems.push({ id: overageItem.id, deleted: true })
  }

  await stripe.subscriptions.update(subscription.id, {
    items: updateItems,
    proration_behavior: options?.prorationBehavior ?? 'create_prorations',
    metadata: { orgId, planKey },
  })

  return { subscriptionId: subscription.id, pricing }
}
