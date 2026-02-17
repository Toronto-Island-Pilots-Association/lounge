import { requireAuth } from '@/lib/auth'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import { NextResponse } from 'next/server'

/**
 * Create a Stripe Customer Billing Portal session and return the URL.
 * Customers must use this URL to manage payment method and subscription; direct links to billing.stripe.com/p/login/cus_xxx are not valid.
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
    const customerId = user.profile.stripe_customer_id

    if (!customerId) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const returnUrl = `${baseUrl}/membership`

    const stripe = getStripeInstance()
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('Customer portal session error:', error)
    const message = error instanceof Error ? error.message : 'Failed to open billing portal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
