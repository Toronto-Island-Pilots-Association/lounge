import { requireAuth } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { sendMembershipUpgradeEmail } from '@/lib/resend'
import { syncSubscriptionStatus } from '@/lib/subscription-sync'
import { getMembershipFeeForLevel, getMembershipExpiresAtFromSubscription, type MembershipLevelKey } from '@/lib/settings'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

/**
 * Called when the user returns from Stripe Checkout with success.
 * Syncs the subscription to the profile and records the payment so the UI updates
 * even if the webhook hasn't run yet (e.g. local dev, webhook delay).
 * Idempotent: safe to call multiple times for the same session.
 */
export async function POST(request: Request) {
  try {
    if (!isStripeEnabled()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : null

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    const stripe = getStripeInstance()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Session is not paid' },
        { status: 400 }
      )
    }

    const userId = session.metadata?.userId
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'This checkout session does not belong to you' },
        { status: 403 }
      )
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription)?.id
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'No subscription on session' },
        { status: 400 }
      )
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    if (!customerId) {
      return NextResponse.json(
        { error: 'No customer on session' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Idempotent: if profile already has this subscription, just return success
    if (user.profile.stripe_subscription_id === subscriptionId) {
      return NextResponse.json({ ok: true, alreadyApplied: true })
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)
    const currentPeriodStart = new Date((subscription as any).current_period_start * 1000)
    const membershipExpiresAt = getMembershipExpiresAtFromSubscription(currentPeriodEnd, currentPeriodStart)

    const invoiceId = subscription.latest_invoice as string
    let paymentIntentId: string | null = null
    let amountFromInvoice: number | null = null
    if (invoiceId) {
      try {
        const invoice = await stripe.invoices.retrieve(invoiceId)
        paymentIntentId = (invoice as any).payment_intent as string | null
        if (invoice.amount_paid != null) amountFromInvoice = invoice.amount_paid / 100
      } catch {
        // ignore
      }
    }

    const level = (user.profile.membership_level || 'Full') as MembershipLevelKey
    const membershipFee = amountFromInvoice ?? (await getMembershipFeeForLevel(level))

    await supabase
      .from('user_profiles')
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        membership_expires_at: membershipExpiresAt,
      })
      .eq('id', user.id)

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('stripe_subscription_id', subscriptionId)
      .limit(1)
      .single()

    if (!existingPayment) {
      await supabase.from('payments').insert({
        user_id: user.id,
        payment_method: 'stripe',
        amount: membershipFee,
        currency: 'CAD',
        payment_date: new Date().toISOString(),
        membership_expires_at: membershipExpiresAt,
        stripe_subscription_id: subscriptionId,
        stripe_payment_intent_id: paymentIntentId,
        status: 'completed',
      })
    }

    await syncSubscriptionStatus(user.id, subscriptionId)

    try {
      await sendMembershipUpgradeEmail(
        user.profile.email,
        user.profile.full_name || 'Member'
      )
    } catch {
      // non-fatal
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Confirm checkout session error:', error)
    const message = error instanceof Error ? error.message : 'Failed to confirm subscription'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
