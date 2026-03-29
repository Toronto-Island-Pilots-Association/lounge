import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags } from '@/lib/settings'
import { isOrgManagerRole } from '@/lib/org-roles'
import { NextResponse } from 'next/server'

// POST - RSVP to an event (authenticated, approved members only)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const flags = await getFeatureFlags()
    if (!flags.events) {
      return NextResponse.json({ error: 'Events are not enabled for this organization' }, { status: 403 })
    }
    const orgId = user.profile.org_id
    const { id: eventId } = await params

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Only approved members (or admins) can RSVP
    if (user.profile.status !== 'approved' && !isOrgManagerRole(user.profile.role)) {
      return NextResponse.json(
        { error: 'Only approved members can RSVP to events' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('org_id', orgId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('event_rsvps')
      .insert({ event_id: eventId, user_id: user.id, org_id: orgId })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You have already RSVPed to this event' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Auto-add event to user's Google Calendar if they authorized calendar sync (Gmail sign-in)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://clublounge.local:3000'
    const eventPageUrl = `${appUrl}/events`
    ;(async () => {
      try {
        const { data: tokenRow } = await supabase
          .from('user_google_calendar_tokens')
          .select('refresh_token_encrypted')
          .eq('user_id', user.id)
          .single()
        if (!tokenRow?.refresh_token_encrypted) return

        const { data: eventData } = await supabase
          .from('events')
          .select('id, title, description, location, start_time, end_time')
          .eq('id', eventId)
          .eq('org_id', orgId)
          .single()
        if (!eventData) return

        const { addEventToUserCalendar } = await import('@/lib/google-calendar')
        await addEventToUserCalendar(tokenRow.refresh_token_encrypted, {
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          event_page_url: eventPageUrl,
        })
      } catch (err) {
        console.error('Calendar sync after RSVP:', err)
      }
    })()

    return NextResponse.json({ message: 'RSVP successful' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: message },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// DELETE - Remove RSVP (un-RSVP)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const orgId = user.profile.org_id
    const { id: eventId } = await params

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('org_id', orgId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'RSVP removed' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: message },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
