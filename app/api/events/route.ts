import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { sendEventNotificationEmail } from '@/lib/resend'
import { NextResponse } from 'next/server'

// GET - Get all events (authenticated users)
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

    return NextResponse.json({ events: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
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

    const { title, description, location, start_time, end_time } = await request.json()

    if (!title || !start_time) {
      return NextResponse.json(
        { error: 'Title and start time are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('events')
      .insert({
        title,
        description: description || null,
        location: location || null,
        start_time,
        end_time: end_time || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Send event notification emails to all members
    try {
      const { data: members } = await supabase
        .from('user_profiles')
        .select('email, full_name, first_name, last_name')
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

    return NextResponse.json({ event: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

