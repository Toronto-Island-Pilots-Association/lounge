import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - List who RSVPed to an event (with display names)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id: eventId } = await params

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: rsvps, error } = await supabase
      .from('event_rsvps')
      .select('id, user_id, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const list = rsvps || []
    if (list.length === 0) {
      return NextResponse.json({ rsvps: [] })
    }

    const userIds = [...new Set(list.map((r) => r.user_id))]
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, first_name, last_name, email, profile_picture_url')
      .in('id', userIds)

    const profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        {
          display_name:
            p.full_name?.trim() ||
            (p.first_name && p.last_name
              ? `${p.first_name} ${p.last_name}`.trim()
              : null) ||
            p.email?.split('@')[0] ||
            'Member',
          profile_picture_url: p.profile_picture_url ?? null,
        },
      ])
    )

    const attendees = list.map((row) => {
      const profile = profileMap.get(row.user_id)
      return {
        id: row.id,
        user_id: row.user_id,
        display_name: profile?.display_name ?? 'Member',
        profile_picture_url: profile?.profile_picture_url ?? null,
        created_at: row.created_at,
      }
    })

    return NextResponse.json({ rsvps: attendees })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: message },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
