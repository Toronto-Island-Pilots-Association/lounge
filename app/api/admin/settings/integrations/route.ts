import { requirePlatformAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'
import { addDomainToProject } from '@/lib/vercel'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

async function getOrgId(): Promise<string | null> {
  try {
    const h = await headers()
    return h.get('x-org-id')
  } catch {
    return null
  }
}

export async function GET() {
  try {
    await requirePlatformAdmin()
    const orgId = await getOrgId()
    if (!orgId) return NextResponse.json({ error: 'Missing org context' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const { data: org, error } = await supabase
      .from('organizations')
      .select(
        'custom_domain, subdomain, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled',
      )
      .eq('id', orgId)
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ org })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load integrations'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST() {
  try {
    await requirePlatformAdmin()
    const orgId = await getOrgId()
    if (!orgId) return NextResponse.json({ error: 'Missing org context' }, { status: 400 })

    const h = await headers()
    const host = h.get('host') ?? 'clublounge.local:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'

    const supabase = createServiceRoleClient()
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_account_id, subdomain, custom_domain')
      .eq('id', orgId)
      .single()

    if (orgError) throw new Error(orgError.message)

    const stripe = getPlatformStripeInstance()

    let accountId = org?.stripe_account_id as string | null | undefined
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express' })
      accountId = account.id
      await supabase
        .from('organizations')
        .update({ stripe_account_id: accountId })
        .eq('id', orgId)
    }

    const return_url = `${protocol}://${host}/admin/settings?tab=Integrations&stripe=return`
    const refresh_url = `${protocol}://${host}/admin/settings?tab=Integrations&stripe=refresh`

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url,
      refresh_url,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start Stripe connect'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin()
    const orgId = await getOrgId()
    if (!orgId) return NextResponse.json({ error: 'Missing org context' }, { status: 400 })

    const body = await request.json()
    const { customDomain } = body as { customDomain?: string }
    if (typeof customDomain !== 'string') {
      return NextResponse.json({ error: 'customDomain is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ custom_domain: customDomain || null })
      .eq('id', orgId)

    if (updateError) throw new Error(updateError.message)

    if (customDomain) {
      await addDomainToProject(customDomain)
    }

    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select(
        'custom_domain, subdomain, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled',
      )
      .eq('id', orgId)
      .single()

    if (fetchError) throw new Error(fetchError.message)
    return NextResponse.json({ org })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update custom domain'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
