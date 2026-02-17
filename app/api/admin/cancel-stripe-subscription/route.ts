import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { NextResponse } from 'next/server'

/**
 * Admin endpoint to cancel a member's Stripe subscription.
 * POST body: { userId: string, cancelImmediately?: boolean }
 * - cancelImmediately: true = cancel now (access ends, subscription removed); false = cancel at period end (default).
 */
export async function POST(request: Request) {
  try {
    await requireAdmin()

    if (!isStripeEnabled()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { userId, cancelImmediately = false } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: member, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, stripe_subscription_id')
      .eq('id', userId)
      .single()

    if (fetchError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    if (!member.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Member has no Stripe subscription' },
        { status: 400 }
      )
    }

    const stripe = getStripeInstance()

    if (cancelImmediately) {
      await stripe.subscriptions.cancel(member.stripe_subscription_id)
    } else {
      await stripe.subscriptions.update(member.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    }

    const updates: Record<string, unknown> = cancelImmediately
      ? {
          stripe_subscription_id: null,
          stripe_customer_id: null,
          membership_expires_at: new Date().toISOString(),
          subscription_cancel_at_period_end: false,
          status: 'expired',
        }
      : {
          subscription_cancel_at_period_end: true,
        }

    const { data: updated, error: updateError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select('stripe_subscription_id, subscription_cancel_at_period_end, status, membership_expires_at')
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: cancelImmediately
        ? 'Subscription cancelled immediately. Member access has been ended.'
        : 'Subscription will be cancelled at the end of the billing period.',
      member: updated,
    })
  } catch (error: any) {
    console.error('Admin cancel Stripe subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
