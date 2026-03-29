import { requireAuthIncludingPending } from '@/lib/auth'
import { isStripeEnabled } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveMemberStripeContext, syncSubscriptionStatus } from '@/lib/subscription-sync'

export async function GET() {
  try {
    if (!isStripeEnabled()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const user = await requireAuthIncludingPending()

    // Rejected members cannot have active subscriptions
    if (user.profile.status === 'rejected') {
      return NextResponse.json({
        hasSubscription: false,
      })
    }

    let subscriptionId = user.profile.stripe_subscription_id

    if (!subscriptionId) {
      const supabase = createServiceRoleClient()
      const { data: latestPayment } = await supabase
        .from('payments')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .eq('org_id', user.profile.org_id)
        .not('stripe_subscription_id', 'is', null)
        .order('payment_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      subscriptionId = latestPayment?.stripe_subscription_id ?? null
    }

    if (!subscriptionId) {
      return NextResponse.json({
        hasSubscription: false,
      })
    }

    const { stripe, requestOptions } = await resolveMemberStripeContext(user.profile.org_id)
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId,
      {
        expand: ['items.data.price'],
        ...(requestOptions ?? {}),
      } as any
    )

    if (user.profile.stripe_subscription_id !== subscriptionId) {
      await syncSubscriptionStatus(user.id, subscriptionId, user.profile.org_id)
    }

    // Get the amount from the subscription
    let amount: number | null = null
    if (subscription.items.data.length > 0) {
      const price = subscription.items.data[0].price
      if (price && price.unit_amount) {
        amount = price.unit_amount / 100 // Convert from cents to dollars
      }
    }

    return NextResponse.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        amount: amount,
        currency: subscription.items.data[0]?.price?.currency || 'cad',
      },
    })
  } catch (error: any) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription' },
      { status: 500 }
    )
  }
}
