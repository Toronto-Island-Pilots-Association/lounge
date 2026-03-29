import { requireAdmin } from '@/lib/auth'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function resolveImageUrl(supabase: ReturnType<typeof createServiceRoleClient>, imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) return null
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl
  try {
    const { data, error } = await supabase.storage.from('resources').createSignedUrl(imageUrl, 3600)
    if (error || !data) return null
    return data.signedUrl
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()
    const orgId = user.profile.org_id
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Page not found' }, { status: 404 })

    return NextResponse.json({
      page: { ...data, image_url: await resolveImageUrl(supabase, data.image_url) },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()
    const orgId = user.profile.org_id
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const billingStatus = await getOrgBillingActivationStatus(orgId)
    if (billingStatus.requiresActivation) {
      return NextResponse.json(
        { error: 'Add billing details in Billing before publishing pages.' },
        { status: 402 },
      )
    }

    const { id } = await params
    const body = await request.json()

    // Prevent cross-tenant writes
    if ('org_id' in body) delete (body as any).org_id
    // Slug is immutable after creation
    if ('slug' in body) delete (body as any).slug

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('pages')
      .update(body)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ page: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()
    const orgId = user.profile.org_id
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const billingStatus = await getOrgBillingActivationStatus(orgId)
    if (billingStatus.requiresActivation) {
      return NextResponse.json(
        { error: 'Add billing details in Billing before managing pages.' },
        { status: 402 },
      )
    }

    const { id } = await params
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ message: 'Page deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Forbidden: Admin access required' ? 403 : 500 },
    )
  }
}
