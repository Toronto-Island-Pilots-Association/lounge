import { requireAuthIncludingPending } from '@/lib/auth'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { NextResponse } from 'next/server'

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

    if (!user.profile.stripe_subscription_id) {
      return NextResponse.json({
        hasSubscription: false,
      })
    }

    const stripe = getStripeInstance()
    const subscription = await stripe.subscriptions.retrieve(
      user.profile.stripe_subscription_id,
      {
        expand: ['items.data.price'],
      }
    )

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
