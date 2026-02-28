import { getCurrentUserIncludingPending } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Get current user profile (allows pending users)
export async function GET() {
  try {
    const user = await getCurrentUserIncludingPending()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ profile: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// PATCH - Update user profile (allows pending users)
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUserIncludingPending()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = await createClient()

    const body = await request.json()
    const {
      full_name,
      first_name,
      last_name,
      phone,
      // Mailing Address
      street,
      city,
      province_state,
      postal_zip_code,
      country,
      // Membership
      membership_class,
      // COPA Membership
      is_copa_member,
      join_copa_flight_32,
      copa_membership_number,
      // Statement of Interest
      statement_of_interest,
      // Aviation Information
      pilot_license_type,
      aircraft_type,
      call_sign,
      how_often_fly_from_ytz,
      how_did_you_hear,
      is_student_pilot,
      flight_school,
      instructor_name,
      // Interests
      interests,
    } = body

    // Build update object with only provided fields
    const updates: Record<string, any> = {}
    // full_name is read-only, only admins can update it
    // Explicitly exclude full_name from member updates
    if (first_name !== undefined) updates.first_name = first_name || null
    if (last_name !== undefined) updates.last_name = last_name || null
    if (phone !== undefined) updates.phone = phone || null
    // Mailing Address
    if (street !== undefined) updates.street = street || null
    if (city !== undefined) updates.city = city || null
    if (province_state !== undefined) updates.province_state = province_state || null
    if (postal_zip_code !== undefined) updates.postal_zip_code = postal_zip_code || null
    if (country !== undefined) updates.country = country || null
    // Membership - membership_class is read-only, only admins can update it
    // Explicitly exclude membership_class from member updates
    // COPA Membership
    if (is_copa_member !== undefined) updates.is_copa_member = is_copa_member || null
    if (join_copa_flight_32 !== undefined) updates.join_copa_flight_32 = join_copa_flight_32 || null
    if (copa_membership_number !== undefined) updates.copa_membership_number = copa_membership_number || null
    // Statement of Interest (members can set on complete-profile)
    if (statement_of_interest !== undefined) updates.statement_of_interest = statement_of_interest ? String(statement_of_interest).trim() || null : null
    // Aviation Information
    if (pilot_license_type !== undefined) updates.pilot_license_type = pilot_license_type || null
    if (aircraft_type !== undefined) updates.aircraft_type = aircraft_type || null
    if (call_sign !== undefined) updates.call_sign = call_sign || null
    if (how_often_fly_from_ytz !== undefined) updates.how_often_fly_from_ytz = how_often_fly_from_ytz || null
    if (how_did_you_hear !== undefined) updates.how_did_you_hear = how_did_you_hear || null
    if (is_student_pilot !== undefined) updates.is_student_pilot = Boolean(is_student_pilot)
    if (flight_school !== undefined) updates.flight_school = flight_school ? String(flight_school).trim() || null : null
    if (instructor_name !== undefined) updates.instructor_name = instructor_name ? String(instructor_name).trim() || null : null
    // Interests - store as JSON string if provided
    if (interests !== undefined) {
      if (interests && (typeof interests === 'string' || Array.isArray(interests))) {
        // If it's already a JSON string, use it; otherwise stringify the array
        updates.interests = typeof interests === 'string' ? interests : JSON.stringify(interests)
      } else {
        updates.interests = null
      }
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ profile: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

