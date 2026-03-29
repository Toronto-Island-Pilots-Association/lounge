import { NextResponse } from 'next/server'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'

/**
 * POST /api/platform/stripe/connect
 * Creates a Stripe Express account for the org (if not already created)
 * and returns an account link URL for onboarding.
 */
export async function POST(request: Request) {
  if (request.headers.get('x-domain-type') !== 'marketing') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orgId } = await request.json()
    if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 })

    const db = createServiceRoleClient()

    // Verify the user is an admin of this org.
    // In the multi-tenancy schema, org role is stored on `org_memberships`.
    const { data: membership, error: membershipError } = await db
      .from('org_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .maybeSingle()

    if (membershipError) {
      console.error('Stripe connect membership lookup error:', membershipError)
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
    }

    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const billingStatus = await getOrgBillingActivationStatus(orgId)
    if (billingStatus.requiresActivation) {
      return NextResponse.json(
        { error: 'Add billing details in Billing before connecting Stripe.' },
        { status: 402 },
      )
    }

    // Get the org
    const { data: org } = await db
      .from('organizations')
      .select('id, name, stripe_account_id')
      .eq('id', orgId)
      .single()

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const stripe = getPlatformStripeInstance()
    let stripeAccountId = org.stripe_account_id

    // Create a new Express account if one doesn't exist yet
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: { org_id: orgId, org_name: org.name },
      })
      stripeAccountId = account.id

      await db
        .from('organizations')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', orgId)
    }

    // Build return and refresh URLs
    const host = request.headers.get('host') ?? (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const base = `${protocol}://${host}`

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: 'account_onboarding',
      return_url: `${base}/platform/stripe/return?org_id=${orgId}`,
      refresh_url: `${base}/platform/stripe/refresh?org_id=${orgId}`,
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error: any) {
    console.error('Stripe Connect error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to create Stripe connection' }, { status: 500 })
  }
}
