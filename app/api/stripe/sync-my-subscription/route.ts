import { requireAuth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { syncSubscriptionStatus } from '@/lib/subscription-sync'
import { getMembershipFeeForLevel, getMembershipExpiresAtFromSubscription, type MembershipLevelKey } from '@/lib/settings'
import { NextResponse } from 'next/server'

/**
 * For users who paid in Stripe but the webhook/confirm didn't run (e.g. profile not updated).
 * Looks up the customer in Stripe by email, finds an active subscription, and syncs it to the profile.
 */
export async function POST() {
  try {
    if (!isStripeEnabled()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const user = await requireAuth()
    const stripe = getStripeInstance()
    const supabase = createServiceRoleClient()

    // If we already have a subscription on the profile, sync it and return
    if (user.profile.stripe_subscription_id) {
      await syncSubscriptionStatus(user.id, user.profile.stripe_subscription_id)
      return NextResponse.json({
        ok: true,
        message: 'Subscription already linked; status synced.',
      })
    }

    const email = user.profile.email?.toLowerCase()
    if (!email) {
      return NextResponse.json(
        { error: 'No email on profile' },
        { status: 400 }
      )
    }

    const customers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (!customers.data.length) {
      return NextResponse.json(
        { error: 'No Stripe customer found for your email' },
        { status: 404 }
      )
    }

    const customerId = customers.data[0].id
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (!subscriptions.data.length) {
      return NextResponse.json(
        { error: 'No active subscription found for your account' },
        { status: 404 }
      )
    }

    const subscription = subscriptions.data[0]
    const subscriptionId = subscription.id
    const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)
    const currentPeriodStart = new Date((subscription as any).current_period_start * 1000)
    const membershipExpiresAt = getMembershipExpiresAtFromSubscription(currentPeriodEnd, currentPeriodStart)

    let amountFromInvoice: number | null = null
    const invoiceId = subscription.latest_invoice as string
    if (invoiceId) {
      try {
        const invoice = await stripe.invoices.retrieve(invoiceId)
        if (invoice.amount_paid != null) amountFromInvoice = invoice.amount_paid / 100
      } catch {
        // ignore
      }
    }

    const level = (user.profile.membership_level || 'Full') as MembershipLevelKey
    const amount = amountFromInvoice ?? (await getMembershipFeeForLevel(level))

    await supabase
      .from('user_profiles')
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        membership_expires_at: membershipExpiresAt,
      })
      .eq('id', user.id)

    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('stripe_subscription_id', subscriptionId)
      .limit(1)
      .single()

    if (!existing) {
      await supabase.from('payments').insert({
        user_id: user.id,
        payment_method: 'stripe',
        amount,
        currency: 'CAD',
        payment_date: new Date().toISOString(),
        membership_expires_at: membershipExpiresAt,
        stripe_subscription_id: subscriptionId,
        status: 'completed',
      })
    }

    await syncSubscriptionStatus(user.id, subscriptionId)

    return NextResponse.json({
      ok: true,
      message: 'Subscription synced to your account.',
    })
  } catch (error: unknown) {
    console.error('Sync my subscription error:', error)
    const message = error instanceof Error ? error.message : 'Failed to sync subscription'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
