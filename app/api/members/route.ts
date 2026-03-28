import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags } from '@/lib/settings'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const user = await requireAuth()
    const flags = await getFeatureFlags()
    if (!flags.memberDirectory) {
      return NextResponse.json({ error: 'Member directory is not enabled for this organization' }, { status: 403 })
    }
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('org_id', user.profile.org_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ members: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

