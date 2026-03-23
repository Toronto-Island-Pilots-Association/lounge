import { requireAuthIncludingPending } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import * as Sentry from '@sentry/nextjs'
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

    const user = await requireAuthIncludingPending()
    const stripe = getStripeInstance()
    const level = (user.profile.membership_level || 'Full') as MembershipLevelKey
    const membershipFee = await getMembershipFeeForLevel(level)
    const trialEnd = await getTrialEndDateAsync(level, user.profile.created_at ?? null)
    const now = new Date()
    const hasTrial = trialEnd && trialEnd > now
    const supabase = await createClient()

    // Cardholder name and address for Checkout prefill
    const cardholderName =
      user.profile.full_name?.trim() ||
      [user.profile.first_name, user.profile.last_name].filter(Boolean).join(' ').trim() ||
      undefined
    const hasAddress =
      (user.profile.postal_zip_code?.trim() || user.profile.country?.trim()) ?? false
    const address: Stripe.CustomerCreateParams['address'] = hasAddress
      ? {
          line1: user.profile.street?.trim() || undefined,
          city: user.profile.city?.trim() || undefined,
          state: user.profile.province_state?.trim() || undefined,
          postal_code: user.profile.postal_zip_code?.trim() || undefined,
          country: user.profile.country?.trim() || undefined,
        }
      : undefined

    // Get or create Stripe customer; set name and address so Checkout can prefill
    let customerId = user.profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.profile.email,
        name: cardholderName,
        address: address || undefined,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    } else {
      const updateParams: Stripe.CustomerUpdateParams = {}
      if (cardholderName) updateParams.name = cardholderName
      if (address) updateParams.address = address
      if (Object.keys(updateParams).length > 0) {
        await stripe.customers.update(customerId, updateParams)
      }
    }

    const host = request.headers.get('host') ?? 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    // Look up the org's Stripe Connect account (if configured)
    const orgId = request.headers.get('x-org-id')
    let connectedAccountId: string | null = null
    if (orgId) {
      const { createServiceRoleClient } = await import('@/lib/supabase/server')
      const db = createServiceRoleClient()
      const { data: org } = await db
        .from('organizations')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', orgId)
        .maybeSingle()
      if (org?.stripe_onboarding_complete && org?.stripe_account_id) {
        connectedAccountId = org.stripe_account_id
      }
    }

    // For connected accounts, customer objects are account-scoped — use email instead
    const sessionCustomer = connectedAccountId ? undefined : customerId

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ...(sessionCustomer ? { customer: sessionCustomer } : { customer_email: user.profile.email }),
      mode: 'subscription',
      success_url: `${baseUrl}/membership?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/membership?subscription=cancelled`,
      metadata: {
        userId: user.id,
        ...(orgId ? { orgId } : {}),
      },
      // Platform fee: 2% of the transaction
      ...(connectedAccountId ? {
        payment_intent_data: {
          application_fee_amount: Math.round(membershipFee * 100 * 0.02),
        },
      } : {}),
    }

    if (hasTrial) {
      // Use noon UTC for Sept 1 trial end so Stripe shows "starting September 1" not "August 31" in NA timezones
      let trialEndUnix = trialEnd
      if (trialEnd.getUTCDate() === 1 && trialEnd.getUTCMonth() === 8) {
        trialEndUnix = new Date(Date.UTC(trialEnd.getUTCFullYear(), 8, 1, 12, 0, 0, 0))
      }
      sessionParams.subscription_data = {
        trial_end: Math.floor(trialEndUnix.getTime() / 1000),
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

    const stripeOptions = connectedAccountId ? { stripeAccount: connectedAccountId } : undefined
    const session = await stripe.checkout.sessions.create(sessionParams, stripeOptions)

    Sentry.metrics.count('payment.checkout_initiated', 1, { attributes: { membership_level: level } })

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
