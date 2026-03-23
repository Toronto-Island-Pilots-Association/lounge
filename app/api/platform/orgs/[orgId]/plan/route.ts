/**
 * PATCH /api/platform/orgs/[orgId]/plan
 * Updates the billing plan for an organization.
 * Requires the CLUBLOUNGE_ADMIN_KEY header to match the env var.
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PLAN_KEYS } from '@/lib/plans'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const adminKey = request.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.CLUBLOUNGE_ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId } = await params
  const { plan } = await request.json()

  if (!PLAN_KEYS.includes(plan)) {
    return NextResponse.json(
      { error: `Invalid plan. Must be one of: ${PLAN_KEYS.join(', ')}` },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('organizations')
    .update({ plan })
    .eq('id', orgId)
    .select('id, name, slug, plan')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Org not found' }, { status: 404 })
  }

  return NextResponse.json({ org: data })
}
