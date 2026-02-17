import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import {
  getMembershipFeeForLevel,
  getTrialEndDateAsync,
  type MembershipLevelKey,
} from '@/lib/settings'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  try {
    if (!isStripeEnabled()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const user = await requireAuth()
    const stripe = getStripeInstance()
    const level = (user.profile.membership_level || 'Full') as MembershipLevelKey
    const membershipFee = await getMembershipFeeForLevel(level)
    const trialEnd = await getTrialEndDateAsync(level, user.profile.created_at ?? null)
    const now = new Date()
    const hasTrial = trialEnd && trialEnd > now
    const supabase = await createClient()

    // Get or create Stripe customer
    let customerId = user.profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.profile.email,
        name: user.profile.full_name || undefined,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      success_url: `${baseUrl}/membership?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/membership?subscription=cancelled`,
      metadata: {
        userId: user.id,
      },
    }

    if (hasTrial) {
      sessionParams.subscription_data = {
        trial_end: Math.floor(trialEnd.getTime() / 1000),
      }
    }

    // Always use current level's fee so level changes (e.g. Corporate → Full) charge the correct amount
    const price = await stripe.prices.create({
      currency: 'cad',
      unit_amount: Math.round(membershipFee * 100),
      recurring: {
        interval: 'year',
      },
      product_data: {
        name: `TIPA Annual Membership (${level})`,
      },
    })
    sessionParams.line_items = [
      {
        price: price.id,
        quantity: 1,
      },
    ]

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Stripe checkout session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
