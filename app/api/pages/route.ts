import { requireAdmin } from '@/lib/auth'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { pagePublishedFromInput, pageStatusFromPublished, slugifyPageSlug, validatePageSlug } from '@/lib/pages'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

// GET — list pages. Admins see drafts; everyone else sees published only.
export async function GET() {
  try {
    const h = await headers()
    const orgId = h.get('x-org-id')
    if (!orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const supabase = createServiceRoleClient()

    let isAdmin = false
    try {
      await requireAdmin()
      isAdmin = true
    } catch {
      // public / non-admin caller
    }

    let query = supabase
      .from('pages')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (!isAdmin) {
      query = query.eq('published', true)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({
      pages: (data || []).map((page) => ({
        ...page,
        status: pageStatusFromPublished(page.published),
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}

// POST — create a page. Admin only.
export async function POST(request: Request) {
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

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const slug = typeof body.slug === 'string' && body.slug.trim()
      ? body.slug.trim()
      : slugifyPageSlug(title)
    const content = typeof body.content === 'string' ? body.content : null
    const published = pagePublishedFromInput(body.status ?? body.published)

    if (!title) {
      return NextResponse.json({ error: 'Nav name is required.' }, { status: 400 })
    }

    const slugValidation = validatePageSlug(slug)
    if (!slugValidation.valid) {
      return NextResponse.json({ error: slugValidation.error }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', slug)
      .maybeSingle()

    if (existingPage) {
      return NextResponse.json({ error: 'That slug is already in use.' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('pages')
      .insert({
        org_id: orgId,
        title,
        slug,
        content,
        image_url: null,
        published,
      })
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
