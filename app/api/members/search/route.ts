import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 1) {
      return NextResponse.json({ members: [] })
    }

    const supabase = await createClient()

    const { data: members, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, profile_picture_url')
      .eq('status', 'approved')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(8)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Deduplicate by name, preferring entries with a profile picture
    const seen = new Map<string, typeof members[0]>()
    for (const m of members || []) {
      const name = m.full_name || m.email.split('@')[0]
      const existing = seen.get(name)
      if (!existing || (!existing.profile_picture_url && m.profile_picture_url)) {
        seen.set(name, m)
      }
    }

    return NextResponse.json({
      members: Array.from(seen.values()).map(m => ({
        id: m.id,
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
