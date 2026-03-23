import { requireAdmin } from '@/lib/auth'
import { getEmailTemplates, setEmailTemplates } from '@/lib/settings'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAdmin()
    const templates = await getEmailTemplates()
    return NextResponse.json({ templates })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load email templates'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const update: { subject?: string; body?: string } = {}
    if (typeof body.subject === 'string') update.subject = body.subject
    if (typeof body.body    === 'string') update.body    = body.body
    await setEmailTemplates(update)
    const templates = await getEmailTemplates()
    return NextResponse.json({ templates })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update email templates'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
