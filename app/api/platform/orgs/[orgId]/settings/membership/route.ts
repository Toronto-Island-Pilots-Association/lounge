import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getMembershipLevels, setMembershipLevels, type OrgMembershipLevel } from '@/lib/settings'
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
  const levels = await getMembershipLevels(orgId)
  return NextResponse.json({ levels })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json() as OrgMembershipLevel[]
  if (!Array.isArray(body) || body.length === 0)
    return NextResponse.json({ error: 'Invalid levels' }, { status: 400 })
  await setMembershipLevels(body, orgId)
  const levels = await getMembershipLevels(orgId)
  return NextResponse.json({ levels })
}
