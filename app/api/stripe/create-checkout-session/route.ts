import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getStripeInstance, getStripePriceId, isStripeEnabled } from '@/lib/stripe'
import { getMembershipFee } from '@/lib/settings'
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
    const priceId = getStripePriceId()
    const membershipFee = await getMembershipFee()
    const supabase = await createClient()

    // Get or create Stripe customer
    let customerId = user.profile.stripe_customer_id

    if (!customerId) {
      // Create customer in Stripe
      const customer = await stripe.customers.create({
        email: user.profile.email,
        name: user.profile.full_name || undefined,
        metadata: {
          userId: user.id,
        },
      })

      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Get the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      success_url: `${baseUrl}/membership?subscription=success`,
      cancel_url: `${baseUrl}/membership?subscription=cancelled`,
      metadata: {
        userId: user.id,
      },
    }

    // Use price ID if configured, otherwise create a price on the fly
    if (priceId) {
      sessionParams.line_items = [
        {
          price: priceId,
          quantity: 1,
        },
      ]
    } else {
      // Create a price for the membership fee
      const price = await stripe.prices.create({
        currency: 'cad',
        unit_amount: Math.round(membershipFee * 100), // Convert to cents
        recurring: {
          interval: 'year',
        },
        product_data: {
          name: 'TIPA Annual Membership',
        },
      })

      sessionParams.line_items = [
        {
          price: price.id,
          quantity: 1,
        },
      ]
    }

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
