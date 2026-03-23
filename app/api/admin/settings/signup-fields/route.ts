import { requireAdmin } from '@/lib/auth'
import { getSignupFieldsConfig, setSignupFieldsConfig, type SignupField } from '@/lib/settings'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAdmin()
    const fields = await getSignupFieldsConfig()
    return NextResponse.json({ fields })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load signup fields'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    if (!Array.isArray(body.fields)) {
      return NextResponse.json({ error: 'fields must be an array' }, { status: 400 })
    }
    const fields: SignupField[] = body.fields.map((f: SignupField) => ({
      key:      String(f.key),
      label:    String(f.label),
      group:    String(f.group),
      enabled:  Boolean(f.enabled),
      required: Boolean(f.required),
    }))
    await setSignupFieldsConfig(fields)
    return NextResponse.json({ fields })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update signup fields'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
