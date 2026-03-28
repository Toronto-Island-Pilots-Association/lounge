import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 1) {
      return NextResponse.json({ members: [] })
    }

    const supabase = await createClient()

    const { data: members, error } = await supabase
      .from('member_profiles')
      .select('user_id, full_name, email, profile_picture_url')
      .eq('org_id', user.profile.org_id)
      .eq('status', 'approved')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(8)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Deduplicate by user_id so multiple users with the same display name all appear
    const byId = new Map<string, typeof members[0]>()
    for (const m of members || []) {
      if (!byId.has(m.user_id)) byId.set(m.user_id, m)
    }

    return NextResponse.json({
      members: Array.from(byId.values()).map(m => ({
        id: m.user_id,
        name: m.full_name || m.email.split('@')[0],
        profile_picture_url: m.profile_picture_url,
      }))
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
