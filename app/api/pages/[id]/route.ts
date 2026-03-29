import { requireAdmin } from '@/lib/auth'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { pagePublishedFromInput, pageStatusFromPublished, validatePageSlug } from '@/lib/pages'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
      page: {
        ...data,
        status: pageStatusFromPublished(data.published),
      },
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
    const supabase = createServiceRoleClient()
    const updates: Record<string, unknown> = {}

    if ('title' in body) {
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (!title) {
        return NextResponse.json({ error: 'Nav name is required.' }, { status: 400 })
      }
      updates.title = title
    }

    if ('slug' in body) {
      const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
      const slugValidation = validatePageSlug(slug)
      if (!slugValidation.valid) {
        return NextResponse.json({ error: slugValidation.error }, { status: 400 })
      }

      const { data: existingPage } = await supabase
        .from('pages')
        .select('id')
        .eq('org_id', orgId)
        .eq('slug', slug)
        .neq('id', id)
        .maybeSingle()

      if (existingPage) {
        return NextResponse.json({ error: 'That slug is already in use.' }, { status: 409 })
      }

      updates.slug = slug
    }

    if ('content' in body) {
      updates.content = typeof body.content === 'string' ? body.content : null
    }

    if ('status' in body || 'published' in body) {
      updates.published = pagePublishedFromInput(body.status ?? body.published)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid page fields provided.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('pages')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({
      page: {
        ...data,
        status: pageStatusFromPublished(data.published),
      },
    })
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
