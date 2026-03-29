import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSignupFieldsApiPayload, setSignupFieldsConfig, type SignupField } from '@/lib/settings'
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
  const payload = await getSignupFieldsApiPayload(orgId)
  return NextResponse.json(payload)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { fields } = await request.json() as { fields: SignupField[] }
  if (!Array.isArray(fields)) return NextResponse.json({ error: 'Invalid fields' }, { status: 400 })
  await setSignupFieldsConfig(fields, orgId)
  const payload = await getSignupFieldsApiPayload(orgId)
  return NextResponse.json(payload)
}
