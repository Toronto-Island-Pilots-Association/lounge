import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    if (!process.env.STRIPE_PLATFORM_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe platform is not configured' }, { status: 500 })
    }

    const { orgId } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceRoleClient()
    const { data: membership, error: membershipError } = await db
      .from('org_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .maybeSingle()

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message ?? 'Failed to verify org admin' }, { status: 500 })
    }
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: org, error: orgError } = await db
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .maybeSingle()

    if (orgError) {
      return NextResponse.json({ error: orgError.message ?? 'Failed to load organization' }, { status: 500 })
    }
    if (!org?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found for this organization' }, { status: 400 })
    }

    const host = request.headers.get('host') ?? 'clublounge.local:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    const stripe = getPlatformStripeInstance()
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${baseUrl}/platform/dashboard/${orgId}/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open billing portal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
