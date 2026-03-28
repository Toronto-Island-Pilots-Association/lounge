import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getDiscussionCategories, setDiscussionCategories, type OrgDiscussionCategory } from '@/lib/settings'
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
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await getDiscussionCategories(orgId)
  return NextResponse.json({ categories })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { categories: OrgDiscussionCategory[] }

  if (!Array.isArray(body.categories))
    return NextResponse.json({ error: 'categories must be an array' }, { status: 400 })

  for (const c of body.categories) {
    if (!c.slug || typeof c.slug !== 'string')
      return NextResponse.json({ error: 'Each category must have a slug' }, { status: 400 })
    if (!c.label || typeof c.label !== 'string')
      return NextResponse.json({ error: 'Each category must have a label' }, { status: 400 })
    if (c.type !== 'discussion' && c.type !== 'classified')
      return NextResponse.json({ error: `Invalid type for category "${c.slug}"` }, { status: 400 })
    // Sanitise slug: lowercase alphanumeric + underscores only
    if (!/^[a-z0-9_]+$/.test(c.slug))
      return NextResponse.json({ error: `Invalid slug "${c.slug}" — use lowercase letters, numbers, and underscores only` }, { status: 400 })
  }

  await setDiscussionCategories(body.categories, orgId)
  return NextResponse.json({ categories: body.categories })
}
