import { requireAuthIncludingPending } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance, getStripeInstance, isStripeEnabled } from '@/lib/stripe'
import * as Sentry from '@sentry/nextjs'
import {
  getMembershipFeeForLevel,
  getTrialEndDateAsync,
  type MembershipLevelKey,
} from '@/lib/settings'
import { getOrgByHostname } from '@/lib/org'
import { TIPA_ORG_ID } from '@/types/database'
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

    const host = request.headers.get('host') ?? 'clublounge.local:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    // Look up the org's Stripe Connect account (if configured)
    // Prefer resolving from Host (derived from the org subdomain) so checkout can't
    // accidentally brand/connect to the wrong tenant if `x-org-id` is missing/wrong.
    let resolvedOrgId = request.headers.get('x-org-id')
    let connectedAccountId: string | null = null
    let orgName = 'TIPA'

    try {
      const hostOrg = await getOrgByHostname(host)
      if (hostOrg?.id) {
        resolvedOrgId = hostOrg.id
        orgName = hostOrg.name?.trim() || orgName
      }
    } catch {
      // Non-critical: if host lookup fails, fall back to x-org-id if present.
    }

    if (resolvedOrgId) {
      const { createServiceRoleClient } = await import('@/lib/supabase/server')
      const db = createServiceRoleClient()
      const { data: org } = await db
        .from('organizations')
        .select('stripe_account_id, stripe_onboarding_complete, name')
        .eq('id', resolvedOrgId)
        .maybeSingle()
      if (org?.stripe_onboarding_complete && org?.stripe_account_id) {
        connectedAccountId = org.stripe_account_id
      }
      orgName = org?.name?.trim() || orgName
    }

    // TIPA is the legacy tenant with a direct Stripe account (pre-Connect).
    // All other orgs must have completed Stripe Connect onboarding.
    const isTipa = resolvedOrgId === TIPA_ORG_ID
    if (!connectedAccountId && !isTipa) {
      return NextResponse.json(
        { error: 'Payment is not configured for this organization. Please contact your administrator.' },
        { status: 503 }
      )
    }

    // IMPORTANT:
    // Express/Connect actions against `stripeAccount` must be made with the
    // Connect platform secret key, not the default (non-platform) Stripe key.
    const stripe = connectedAccountId ? getPlatformStripeInstance() : getStripeInstance()
    const stripeOptions = connectedAccountId ? { stripeAccount: connectedAccountId } : undefined

    // For connected accounts, customer objects are account-scoped — use email instead
    let customerId = user.profile.stripe_customer_id
    if (!connectedAccountId) {
      // Only create/update platform-customer when we're NOT charging a connected account.
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
          .from('org_memberships')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.id)
          .eq('org_id', user.profile.org_id)
      } else {
        const updateParams: Stripe.CustomerUpdateParams = {}
        if (cardholderName) updateParams.name = cardholderName
        if (address) updateParams.address = address
        if (Object.keys(updateParams).length > 0) {
          await stripe.customers.update(customerId, updateParams)
        }
      }
    }

    const sessionCustomer = connectedAccountId ? undefined : customerId

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ...(sessionCustomer ? { customer: sessionCustomer } : { customer_email: user.profile.email }),
      mode: 'subscription',
      success_url: `${baseUrl}/membership?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/membership?subscription=cancelled`,
      metadata: {
        userId: user.id,
        ...(resolvedOrgId ? { orgId: resolvedOrgId } : {}),
      },
    }

    // Platform fee: 2% of the subscription invoice total.
    // In `subscription` mode, Connect application fees must be set via
    // `subscription_data.application_fee_percent` (not payment_intent_data).
    if (connectedAccountId) {
      sessionParams.subscription_data = {
        application_fee_percent: 2,
      }
    }

    if (hasTrial) {
      // Use noon UTC for Sept 1 trial end so Stripe shows "starting September 1" not "August 31" in NA timezones
      let trialEndUnix = trialEnd
      if (trialEnd.getUTCDate() === 1 && trialEnd.getUTCMonth() === 8) {
        trialEndUnix = new Date(Date.UTC(trialEnd.getUTCFullYear(), 8, 1, 12, 0, 0, 0))
      }
      sessionParams.subscription_data = {
        ...(sessionParams.subscription_data ?? {}),
        trial_end: Math.floor(trialEndUnix.getTime() / 1000),
      }
    }

    // Always use current level's fee so level changes (e.g. Corporate → Full) charge the correct amount
    // If we're creating checkout on a connected account, the Price must also
    // exist in that connected account. Prices are account-scoped.
    const price = await stripe.prices.create({
      currency: 'cad',
      unit_amount: Math.round(membershipFee * 100),
      recurring: {
        interval: 'year',
      },
      product_data: {
        name: `${orgName} Annual Membership (${level})`,
      },
    }, stripeOptions)
    sessionParams.line_items = [
      {
        price: price.id,
        quantity: 1,
      },
    ]

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
