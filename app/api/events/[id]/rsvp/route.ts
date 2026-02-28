import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST - RSVP to an event (authenticated, approved members only)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: eventId } = await params

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Only approved members (or admins) can RSVP
    if (user.profile.status !== 'approved' && user.profile.role !== 'admin') {
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
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('event_rsvps')
      .insert({ event_id: eventId, user_id: user.id })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You have already RSVPed to this event' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

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
    const { id: eventId } = await params

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
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
