import { requireAuthIncludingPending } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance, getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { sendSubscriptionConfirmationEmail } from '@/lib/resend'
import { syncSubscriptionStatus } from '@/lib/subscription-sync'
import { getMembershipFeeForLevel, getMembershipExpiresAtFromSubscription, type MembershipLevelKey } from '@/lib/settings'
import { NextResponse } from 'next/server'
import { getOrgByHostname } from '@/lib/org'
import Stripe from 'stripe'

/**
 * Called when the user returns from Stripe Checkout with success.
 * Syncs the subscription to the profile so the UI stops redirecting to /add-payment.
 *
 * Notes:
 * - For connected accounts (Stripe Connect), we must retrieve Stripe objects using `stripeAccount`.
 * - This endpoint is best-effort for syncing; UI updates primarily rely on setting `org_memberships.stripe_subscription_id`.
 */
export async function POST(request: Request) {
  try {
    if (!isStripeEnabled()) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const user = await requireAuthIncludingPending()
    const body = await request.json().catch(() => ({}))
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : null

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const host = request.headers.get('host') ?? ''

    // Resolve org from host so we can fetch the correct connected Stripe account.
    const hostOrg = await getOrgByHostname(host).catch(() => null)
    const hostOrgId = hostOrg?.id ?? null

    const { data: orgRow } = hostOrgId
      ? await supabase
          .from('organizations')
          .select('id, stripe_account_id')
          .eq('id', hostOrgId)
          .maybeSingle()
      : { data: null }

    const connectedAccountId = orgRow?.stripe_account_id ?? null
    const stripe = connectedAccountId ? getPlatformStripeInstance() : getStripeInstance()

    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {
        expand: ['subscription'],
        ...(connectedAccountId ? { stripeAccount: connectedAccountId } : {}),
      } as any
    )

    const subscriptionObj = session.subscription as Stripe.Subscription | null

    const subscriptionStatus = subscriptionObj?.status
    const isTrialing = subscriptionStatus === 'trialing'
    const isPaid = session.payment_status === 'paid'

    if (!isPaid && !isTrialing) {
      return NextResponse.json({ error: 'Session has no paid or trialing subscription' }, { status: 400 })
    }

    const userId = session.metadata?.userId
    if (userId !== user.id) {
      return NextResponse.json({ error: 'This checkout session does not belong to you' }, { status: 403 })
    }

    const orgIdFromMetadata = typeof session.metadata?.orgId === 'string' ? session.metadata.orgId : null
    const orgId = orgIdFromMetadata ?? hostOrgId

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId for checkout session' }, { status: 400 })
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription)?.id

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No subscription on session' }, { status: 400 })
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    if (!customerId) {
      return NextResponse.json({ error: 'No customer on session' }, { status: 400 })
    }

    // Idempotent: if profile already has this subscription, just return success.
    if (user.profile.stripe_subscription_id === subscriptionId) {
      return NextResponse.json({ ok: true, alreadyApplied: true })
    }

    // Compute membership expiry from expanded subscription when available.
    const currentPeriodEndUnix = (subscriptionObj as any)?.current_period_end as number | undefined
    const currentPeriodStartUnix = (subscriptionObj as any)?.current_period_start as number | undefined
    const hasPeriodTimestamps =
      typeof currentPeriodEndUnix === 'number' && typeof currentPeriodStartUnix === 'number'

    const membershipExpiresAt = hasPeriodTimestamps
      ? getMembershipExpiresAtFromSubscription(
          new Date(currentPeriodEndUnix * 1000),
          new Date(currentPeriodStartUnix * 1000),
        )
      : null

    const invoiceId = (subscriptionObj as any)?.latest_invoice as string | null | undefined
    let paymentIntentId: string | null = null
    let amountFromInvoice: number | null = null

    if (invoiceId) {
      try {
        const invoice = await stripe.invoices.retrieve(invoiceId, {
          ...(connectedAccountId ? { stripeAccount: connectedAccountId } : {}),
        } as any)
        paymentIntentId = (invoice as any).payment_intent as string | null
        if ((invoice as any).amount_paid != null) amountFromInvoice = (invoice as any).amount_paid / 100
      } catch {
        // Non-fatal.
      }
    }

    const level = (user.profile.membership_level || 'Full') as MembershipLevelKey
    const fullMembershipFee = await getMembershipFeeForLevel(level)
    const amountPaid = amountFromInvoice ?? fullMembershipFee

    // Multi-tenancy: Stripe fields live on org_memberships.
    await supabase
      .from('org_memberships')
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        membership_expires_at: membershipExpiresAt,
      })
      .eq('user_id', user.id)
      .eq('org_id', orgId)

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .eq('stripe_subscription_id', subscriptionId)
      .limit(1)
      .single()

    if (!existingPayment) {
      await supabase.from('payments').insert({
        user_id: user.id,
        org_id: orgId,
        payment_method: 'stripe',
        amount: amountPaid,
        currency: 'CAD',
        payment_date: new Date().toISOString(),
        membership_expires_at: membershipExpiresAt ?? new Date().toISOString(),
        stripe_subscription_id: subscriptionId,
        stripe_payment_intent_id: paymentIntentId,
        status: 'completed',
      })
    }

    // Best-effort: syncing may require correct Stripe scoping; don't block UX.
    try {
      await syncSubscriptionStatus(user.id, subscriptionId, orgId)
    } catch (err) {
      console.error('syncSubscriptionStatus failed in confirm-checkout-session:', err)
    }

    try {
      await sendSubscriptionConfirmationEmail(
        user.profile.email,
        user.profile.full_name || 'Member',
        {
          amountPaid,
          nextAmount: fullMembershipFee,
          currency: 'CAD',
          nextChargeDate: hasPeriodTimestamps ? new Date(currentPeriodEndUnix * 1000) : null,
          validUntil: membershipExpiresAt ? new Date(membershipExpiresAt) : new Date(),
          paymentMethod: 'stripe',
        },
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

