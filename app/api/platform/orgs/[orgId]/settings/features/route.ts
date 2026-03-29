import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getFeatureFlags, setFeatureFlags, getOrgPlan, type OrgFeatureFlags } from '@/lib/settings'
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
  const [features, plan] = await Promise.all([getFeatureFlags(orgId), getOrgPlan(orgId)])
  const planDef = getPlanDef(plan)
  return NextResponse.json({ features, plan, planLabel: planDef.label, planFeatures: planDef.features })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json() as Partial<OrgFeatureFlags>
  await setFeatureFlags(body, orgId)
  const features = await getFeatureFlags(orgId)
  return NextResponse.json({ features })
}
