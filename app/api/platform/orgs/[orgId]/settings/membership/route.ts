import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { parseMembershipLevelsBody } from '@/lib/membership-levels-body'
import { getMembershipLevels, getOrgPlan, setMembershipLevels } from '@/lib/settings'
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
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [levels, plan] = await Promise.all([getMembershipLevels(orgId), getOrgPlan(orgId)])
  const memberTrialsEnabled = getPlanDef(plan).features.memberTrials
  return NextResponse.json({ levels, memberTrialsEnabled })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const levels = parseMembershipLevelsBody(body)
  if (!levels) {
    return NextResponse.json({ error: 'Invalid body: expected array of membership levels' }, { status: 400 })
  }
  await setMembershipLevels(levels, orgId)
  const updated = await getMembershipLevels(orgId)
  return NextResponse.json({ levels: updated })
}
