import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getOrgIdentity, setOrgIdentity, type OrgIdentity } from '@/lib/settings'
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
  const identity = await getOrgIdentity(orgId)
  return NextResponse.json({ identity })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const validKeys: (keyof OrgIdentity)[] = [
    'description', 'contactEmail', 'websiteUrl', 'accentColor', 'displayName', 'timezone',
  ]
  const update: Partial<OrgIdentity> = {}
  for (const key of validKeys) {
    if (typeof body[key] === 'string') update[key] = body[key]
  }
  await setOrgIdentity(update, orgId)
  const identity = await getOrgIdentity(orgId)
  return NextResponse.json({ identity })
}
