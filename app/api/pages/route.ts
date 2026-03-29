import { requireAdmin } from '@/lib/auth'
import { getOrgBillingActivationStatus } from '@/lib/org-billing-activation'
import { createServiceRoleClient, createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'page'
}

async function uniqueSlug(supabase: ReturnType<typeof createServiceRoleClient>, orgId: string, baseSlug: string): Promise<string> {
  let slug = baseSlug
  let counter = 2
  while (true) {
    const { data } = await supabase
      .from('pages')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return slug
    slug = `${baseSlug}-${counter++}`
    if (counter > 99) return `${baseSlug}-${Date.now()}`
  }
}

// GET — list pages. Always uses service role (pages are public content).
// Admins see all (draft + published); unauthenticated callers see published only.
export async function GET() {
  try {
    const h = await headers()
    const orgId = h.get('x-org-id')
    if (!orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const supabase = createServiceRoleClient()

    // Determine if caller is an admin to decide whether to show drafts
    let isAdmin = false
    try {
      await requireAdmin()
      isAdmin = true
    } catch { /* public / non-admin */ }

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

    const pages = await Promise.all(
      (data || []).map(async (page) => ({
        ...page,
        image_url: await resolveImageUrl(supabase, page.image_url),
      }))
    )

    return NextResponse.json({ pages })
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
    const { title, content, image_url, published } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const baseSlug = slugify(title.trim())
    const slug = await uniqueSlug(supabase, orgId, baseSlug)

    const { data, error } = await supabase
      .from('pages')
      .insert({
        org_id: orgId,
        title: title.trim(),
        slug,
        content: content ?? null,
        image_url: image_url ?? null,
        published: published === true,
      })
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
