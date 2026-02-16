import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    if (!isStripeEnabled()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const user = await requireAuth()
    const { cancelImmediately } = await request.json()

    if (!user.profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    const stripe = getStripeInstance()

    if (cancelImmediately) {
      // Cancel immediately
      await stripe.subscriptions.cancel(user.profile.stripe_subscription_id)
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(user.profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    }

    const supabase = await createClient()
    await supabase
      .from('user_profiles')
      .update({
        membership_expires_at: cancelImmediately ? new Date().toISOString() : null,
        subscription_cancel_at_period_end: !cancelImmediately,
      })
      .eq('id', user.id)

    return NextResponse.json({
      message: cancelImmediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of the billing period',
    })
  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
