import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { confirmOrgPlanCheckoutSession } from '@/lib/platform-org-billing'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    const body = await request.json().catch(() => ({}))
    const sessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : ''

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceRoleClient()
    const { data: membership } = await db
      .from('org_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const result = await confirmOrgPlanCheckoutSession(orgId, sessionId)
    return NextResponse.json({ ok: true, ...result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to confirm checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
