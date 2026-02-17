import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { NextResponse } from 'next/server'

/**
 * Undo a scheduled cancellation so the subscription renews at period end.
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

    if (!user.profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    const stripe = getStripeInstance()
    await stripe.subscriptions.update(user.profile.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    const supabase = await createClient()
    await supabase
      .from('user_profiles')
      .update({ subscription_cancel_at_period_end: false })
      .eq('id', user.id)

    return NextResponse.json({
      message: 'Cancellation undone. Your subscription will renew at the end of the current period.',
    })
  } catch (error: unknown) {
    console.error('Undo cancel subscription error:', error)
    const message = error instanceof Error ? error.message : 'Failed to undo cancellation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
