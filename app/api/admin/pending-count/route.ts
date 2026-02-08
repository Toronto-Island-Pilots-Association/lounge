import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return NextResponse.json({ count: count || 0 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required' ? 401 : 500 }
    )
  }
}
