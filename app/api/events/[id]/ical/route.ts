import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { generateICal } from '@/lib/resend'
import { NextResponse } from 'next/server'

/**
 * GET - Returns a personalized iCal (.ics) for the event.
 * If the current user has RSVPed, they are included as ATTENDEE with PARTSTAT=ACCEPTED
 * so calendar apps can show "You accepted" / accepted status.
 * Description includes attendee count and link to the event page.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: eventId } = await params

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, description, location, start_time, end_time')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { data: rsvpRows } = await supabase
      .from('event_rsvps')
      .select('user_id')
      .eq('event_id', eventId)
    const rsvpCount = rsvpRows?.length ?? 0
    const userRsvped = rsvpRows?.some((r) => r.user_id === user.id) ?? false

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const eventPageUrl = `${appUrl}/events`

    const displayName =
      user.profile.full_name?.trim() ||
      (user.profile.first_name && user.profile.last_name
        ? `${user.profile.first_name} ${user.profile.last_name}`.trim()
        : null) ||
      user.profile.email?.split('@')[0] ||
      'Member'

    const attendees =
      userRsvped && user.profile.email
        ? [
            {
              email: user.profile.email,
              displayName,
              partstat: 'ACCEPTED' as const,
            },
          ]
        : undefined

    const icalContent = generateICal({
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.start_time,
      endTime: event.end_time,
      url: eventPageUrl,
      attendees,
      attendeeCount: rsvpCount,
      eventPageUrl,
    })

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, '_')}.ics"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: message },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
