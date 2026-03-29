import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { getPlatformStripeInstance } from '@/lib/stripe'
import { addDomainToProject, checkDomainVerification } from '@/lib/vercel'
import { getOrgPlan } from '@/lib/settings'
import { getPlanDef } from '@/lib/plans'
import { NextResponse } from 'next/server'

async function verifyAdmin(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createServiceRoleClient()
  const { data } = await db
    .from('org_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .eq('role', 'admin')
    .maybeSingle()
  return data ? user : null
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)

  if (searchParams.get('check') === 'domain') {
    const plan = await getOrgPlan(orgId)
    if (!getPlanDef(plan).features.customDomain) {
      return NextResponse.json({ error: 'Custom domains require Growth plan or higher' }, { status: 403 })
    }

    const db = createServiceRoleClient()
    const { data: org } = await db
      .from('organizations')
      .select('custom_domain')
      .eq('id', orgId)
      .single()
    if (!org?.custom_domain)
      return NextResponse.json({ error: 'No custom domain set' }, { status: 400 })
    const result = await checkDomainVerification(org.custom_domain)
    if (result.status === 'verified') {
      await db
        .from('organizations')
        .update({ custom_domain_verified: true })
        .eq('id', orgId)
    }
    return NextResponse.json(result)
  }

  const db = createServiceRoleClient()
  const plan = await getOrgPlan(orgId)
  const customDomainEnabled = getPlanDef(plan).features.customDomain
  const billingStatus = await getOrgBillingActivationStatus(orgId)
  const { data: org, error } = await db
    .from('organizations')
    .select(
      'custom_domain, custom_domain_verified, subdomain, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled',
    )
    .eq('id', orgId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    org: {
      ...org,
      billing_activated: billingStatus.activated,
      custom_domain_enabled: customDomainEnabled,
    },
  })
}

// POST — initiate Stripe Connect onboarding
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const billingStatus = await getOrgBillingActivationStatus(orgId)
  if (billingStatus.requiresActivation) {
    return NextResponse.json(
      { error: 'Add billing details in Billing before connecting Stripe.' },
      { status: 402 },
    )
  }

  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'}`

  const db = createServiceRoleClient()
  const { data: org, error: orgError } = await db
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', orgId)
    .single()

  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })

  const stripe = getPlatformStripeInstance()
  let accountId = org?.stripe_account_id as string | null | undefined
  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express' })
    accountId = account.id
    await db.from('organizations').update({ stripe_account_id: accountId }).eq('id', orgId)
  }

  const return_url = `${baseUrl}/platform/dashboard/${orgId}/settings/integrations?stripe=return`
  const refresh_url = `${baseUrl}/platform/dashboard/${orgId}/settings/integrations?stripe=refresh`

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    return_url,
    refresh_url,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}

// PUT — generate Stripe Express dashboard login link
export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceRoleClient()
  const { data: org, error: orgError } = await db
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', orgId)
    .single()

  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })
  if (!org?.stripe_account_id)
    return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 })

  const stripe = getPlatformStripeInstance()
  const loginLink = await stripe.accounts.createLoginLink(org.stripe_account_id)
  return NextResponse.json({ url: loginLink.url })
}

// PATCH — save custom domain
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getOrgPlan(orgId)
  if (!getPlanDef(plan).features.customDomain) {
    return NextResponse.json({ error: 'Custom domains require Growth plan or higher' }, { status: 403 })
  }

  const { customDomain } = await request.json() as { customDomain?: string }
  if (typeof customDomain !== 'string')
    return NextResponse.json({ error: 'customDomain is required' }, { status: 400 })

  const db = createServiceRoleClient()
  const { error: updateError } = await db
    .from('organizations')
    .update({ custom_domain: customDomain || null })
    .eq('id', orgId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  if (customDomain) await addDomainToProject(customDomain)

  const { data: org, error: fetchError } = await db
    .from('organizations')
    .select(
      'custom_domain, custom_domain_verified, subdomain, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled',
    )
    .eq('id', orgId)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  return NextResponse.json({
    org: {
      ...org,
      custom_domain_enabled: true,
    },
  })
}
