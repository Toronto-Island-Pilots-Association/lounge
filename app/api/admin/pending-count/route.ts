import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const orgId = request.headers.get('x-org-id')
    if (!orgId) {
      return NextResponse.json({ error: 'Missing org context' }, { status: 400 })
    }
    const supabase = await createClient()

    const { count } = await supabase
      .from('org_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('org_id', orgId)

    return NextResponse.json({ count: count || 0 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required' ? 401 : 500 }
    )
  }
}
