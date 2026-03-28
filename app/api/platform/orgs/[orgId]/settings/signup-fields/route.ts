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
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  const user = await verifyAdmin(orgId)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!Array.isArray(body.fields))
    return NextResponse.json({ error: 'fields must be an array' }, { status: 400 })

  const fields: SignupField[] = body.fields.map((f: SignupField) => {
    const base: SignupField = {
      key:      String(f.key),
      label:    String(f.label),
      group:    f.group ? String(f.group) : undefined,
      enabled:  Boolean(f.enabled),
      required: Boolean(f.required),
    }
    if (f.isCustom) {
      base.isCustom    = true
      base.type        = f.type
      base.placeholder = f.placeholder ?? undefined
      base.helpText    = f.helpText ?? undefined
      base.options     = Array.isArray(f.options) ? f.options.map(String) : undefined
    }
    return base
  })

  await setSignupFieldsConfig(fields, orgId)
  const payload = await getSignupFieldsApiPayload(orgId)
  return NextResponse.json(payload)
}
