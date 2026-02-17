import { createServiceRoleClient } from '@/lib/supabase/server'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { sendSubscriptionConfirmationEmail } from '@/lib/resend'
import { syncSubscriptionBySubscriptionId, syncSubscriptionStatus } from '@/lib/subscription-sync'
import { getMembershipFeeForLevel, getMembershipExpiresAtFromSubscription, type MembershipLevelKey } from '@/lib/settings'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Disable body parsing for webhook route
export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isStripeEnabled()) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    )
  }

  const stripe = getStripeInstance()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string
        const userId = session.metadata?.userId

        if (!userId || !subscriptionId) {
          console.error('Missing userId or subscriptionId in checkout session')
          break
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000)
        const currentPeriodStart = new Date((subscription as any).current_period_start * 1000)
        const membershipExpiresAt = getMembershipExpiresAtFromSubscription(currentPeriodEnd, currentPeriodStart)

        // Get payment intent ID and amount from invoice if available
        const invoiceId = subscription.latest_invoice as string
        let paymentIntentId: string | null = null
        let amountFromInvoice: number | null = null
        if (invoiceId) {
          try {
            const invoice = await stripe.invoices.retrieve(invoiceId)
            paymentIntentId = (invoice as any).payment_intent as string | null
            if (invoice.amount_paid != null) amountFromInvoice = invoice.amount_paid / 100
          } catch (err) {
            console.error('Error retrieving invoice:', err)
          }
        }

        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('membership_level')
          .eq('id', userId)
          .single()
        const level = (existingProfile?.membership_level || 'Full') as MembershipLevelKey
        const membershipFee = amountFromInvoice ?? (await getMembershipFeeForLevel(level))

        // Update user profile with subscription info (keep their membership level)
        await supabase
          .from('user_profiles')
          .update({
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            membership_expires_at: membershipExpiresAt,
          })
          .eq('id', userId)

        // Record payment in payments table
        await supabase
          .from('payments')
          .insert({
            user_id: userId,
            payment_method: 'stripe',
            amount: membershipFee,
            currency: 'CAD',
            payment_date: new Date().toISOString(),
            membership_expires_at: membershipExpiresAt,
            stripe_subscription_id: subscriptionId,
            stripe_payment_intent_id: paymentIntentId,
            status: 'completed',
          })

        // Sync subscription status (will update status field based on Stripe subscription state)
        await syncSubscriptionStatus(userId, subscriptionId)

        // Send upgrade email
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (profile) {
          try {
            await sendSubscriptionConfirmationEmail(
              profile.email,
              profile.full_name || 'Member',
              {
                amount: membershipFee,
                currency: 'CAD',
                nextChargeDate: currentPeriodEnd,
                validUntil: new Date(membershipExpiresAt),
                paymentMethod: 'stripe',
              }
            )
          } catch (emailError) {
            console.error('Failed to send subscription confirmation email:', emailError)
          }
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id

        // Sync subscription status (will update both status and membership_expires_at)
        await syncSubscriptionBySubscriptionId(subscriptionId)

        break
      }

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const subscription = event.data.object as Stripe.Subscription | Stripe.Invoice
        const subscriptionId = 'subscription' in subscription ? subscription.id : (subscription as any).subscription as string

        if (!subscriptionId) {
          break
        }

        // Find user by subscription ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, membership_expires_at')
          .eq('stripe_subscription_id', subscriptionId)
          .single()

        if (profile) {
          // Check if membership has expired
          const isExpired = profile.membership_expires_at
            ? new Date(profile.membership_expires_at) < new Date()
            : true

          // Update subscription fields and sync status
          await supabase
            .from('user_profiles')
            .update({
              stripe_subscription_id: null,
              status: isExpired ? 'expired' : 'approved',
              // Keep membership_expires_at if it's in the future (user paid for the period)
            })
            .eq('id', profile.id)
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
