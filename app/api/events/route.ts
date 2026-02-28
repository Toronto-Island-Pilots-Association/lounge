import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { sendEventNotificationEmail } from '@/lib/resend'
import { NextResponse } from 'next/server'

// Helper function to get signed URL for event image
async function getEventImageUrl(supabase: any, imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) return null
  
  // If it's already a full URL (signed URL), return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // Otherwise, it's a storage path - create signed URL
  try {
    const { data, error } = await supabase.storage
      .from('events')
      .createSignedUrl(imageUrl, 3600) // 1 hour expiration
    
    if (error || !data) {
      console.error('Error creating signed URL for event image:', error)
      return null
    }
    
    return data.signedUrl
  } catch (error) {
    console.error('Error getting event image URL:', error)
    return null
  }
}

// GET - Get all events (authenticated users), with rsvp_count and user_rsvped
export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const events = data || []
    const eventIds = events.map((e) => e.id)

    // Fetch RSVP counts per event and current user's RSVPs
    const [countsResult, userRsvpsResult] = await Promise.all([
      eventIds.length > 0
        ? supabase
            .from('event_rsvps')
            .select('event_id')
            .in('event_id', eventIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from('event_rsvps')
        .select('event_id')
        .eq('user_id', user.id)
        .in('event_id', eventIds.length > 0 ? eventIds : ['00000000-0000-0000-0000-000000000000']),
    ])

    const countByEvent = new Map<string, number>()
    ;(countsResult.data || []).forEach((r: { event_id: string }) => {
      countByEvent.set(r.event_id, (countByEvent.get(r.event_id) ?? 0) + 1)
    })
    const userRsvpedSet = new Set((userRsvpsResult.data || []).map((r: { event_id: string }) => r.event_id))

    // Get signed URLs for all images and attach RSVP info
    const eventsWithSignedUrls = await Promise.all(
      events.map(async (event) => {
        const signedImageUrl = await getEventImageUrl(supabase, event.image_url)
        return {
          ...event,
          image_url: signedImageUrl,
          rsvp_count: countByEvent.get(event.id) ?? 0,
          user_rsvped: userRsvpedSet.has(event.id),
        }
      })
    )

    return NextResponse.json({ events: eventsWithSignedUrls })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    return NextResponse.json(
      { error: message },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// POST - Create event (admin only)
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    
    // Check if user is admin
    if (user.profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const { title, description, location, start_time, end_time, image_url, send_notifications } = await request.json()

    if (!title || !start_time) {
      return NextResponse.json(
        { error: 'Title and start time are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Only save storage paths, not signed URLs (which expire)
    // If image_url is a signed URL (starts with http:// or https://), don't save it
    // This prevents saving expired signed URLs
    const imagePath = image_url && !image_url.startsWith('http://') && !image_url.startsWith('https://')
      ? image_url
      : null

    const { data, error } = await supabase
      .from('events')
      .insert({
        title,
        description: description || null,
        location: location || null,
        start_time,
        end_time: end_time || null,
        image_url: imagePath,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Send event notification emails to all members (only if send_notifications is true)
    if (send_notifications !== false) {
      try {
        const { data: members } = await supabase
          .from('user_profiles')
          .select('email, full_name, first_name, last_name')
          .eq('status', 'approved') // Only send to approved members
          .not('email', 'is', null)

        if (members && members.length > 0) {
          // Send emails in parallel (but limit concurrency)
          const emailPromises = members.map(member => {
            const name = member.full_name || 
                        (member.first_name && member.last_name 
                          ? `${member.first_name} ${member.last_name}` 
                          : member.email?.split('@')[0] || 'Member')
            return sendEventNotificationEmail(
              member.email!,
              name,
              {
                title: data.title,
                description: data.description,
                location: data.location,
                start_time: data.start_time,
                end_time: data.end_time,
              }
            )
          })

          // Send emails (don't wait for all to complete)
          Promise.all(emailPromises).catch(err => {
            console.error('Error sending event notification emails:', err)
          })
        }
      } catch (emailError) {
        console.error('Error sending event notifications:', emailError)
        // Don't fail the request if email sending fails
      }
    }

    return NextResponse.json({ event: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

