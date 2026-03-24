import { getCurrentUserIncludingPending, isOrgPublic } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Get current user profile (allows pending users)
export async function GET() {
  try {
    const user = await getCurrentUserIncludingPending()
    if (!user) {
      const orgPublic = await isOrgPublic()
      if (orgPublic) return NextResponse.json({ profile: null, isGuest: true })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // profile is already the fully joined MemberProfile from getCurrentUserIncludingPending
    return NextResponse.json({ profile: user.profile })
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
      first_name, last_name, phone,
      street, city, province_state, postal_zip_code, country,
      notify_replies,
      // Org-specific / membership fields
      is_copa_member, join_copa_flight_32, copa_membership_number,
      statement_of_interest,
      pilot_license_type, aircraft_type, call_sign,
      how_often_fly_from_ytz, how_did_you_hear,
      is_student_pilot, flight_school, instructor_name,
      interests,
    } = body

    // Identity fields → user_profiles
    const identityUpdates: Record<string, any> = {}
    if (first_name !== undefined) identityUpdates.first_name = first_name || null
    if (last_name !== undefined) identityUpdates.last_name = last_name || null
    if (phone !== undefined) identityUpdates.phone = phone || null
    if (street !== undefined) identityUpdates.street = street || null
    if (city !== undefined) identityUpdates.city = city || null
    if (province_state !== undefined) identityUpdates.province_state = province_state || null
    if (postal_zip_code !== undefined) identityUpdates.postal_zip_code = postal_zip_code || null
    if (country !== undefined) identityUpdates.country = country || null
    if (notify_replies !== undefined) identityUpdates.notify_replies = Boolean(notify_replies)

    // Org-specific fields → org_memberships
    const membershipUpdates: Record<string, any> = {}
    if (is_copa_member !== undefined) membershipUpdates.is_copa_member = is_copa_member || null
    if (join_copa_flight_32 !== undefined) membershipUpdates.join_copa_flight_32 = join_copa_flight_32 || null
    if (copa_membership_number !== undefined) membershipUpdates.copa_membership_number = copa_membership_number || null
    if (statement_of_interest !== undefined) membershipUpdates.statement_of_interest = statement_of_interest ? String(statement_of_interest).trim() || null : null
    if (pilot_license_type !== undefined) membershipUpdates.pilot_license_type = pilot_license_type || null
    if (aircraft_type !== undefined) membershipUpdates.aircraft_type = aircraft_type || null
    if (call_sign !== undefined) membershipUpdates.call_sign = call_sign || null
    if (how_often_fly_from_ytz !== undefined) membershipUpdates.how_often_fly_from_ytz = how_often_fly_from_ytz || null
    if (how_did_you_hear !== undefined) membershipUpdates.how_did_you_hear = how_did_you_hear || null
    if (is_student_pilot !== undefined) membershipUpdates.is_student_pilot = Boolean(is_student_pilot)
    if (flight_school !== undefined) membershipUpdates.flight_school = flight_school ? String(flight_school).trim() || null : null
    if (instructor_name !== undefined) membershipUpdates.instructor_name = instructor_name ? String(instructor_name).trim() || null : null
    if (interests !== undefined) {
      membershipUpdates.interests = interests && (typeof interests === 'string' || Array.isArray(interests))
        ? (typeof interests === 'string' ? interests : JSON.stringify(interests))
        : null
    }

    const errors: string[] = []

    if (Object.keys(identityUpdates).length > 0) {
      const { error } = await supabase
        .from('user_profiles')
        .update(identityUpdates)
        .eq('user_id', user.id)
      if (error) errors.push(error.message)
    }

    if (Object.keys(membershipUpdates).length > 0) {
      const { error } = await supabase
        .from('org_memberships')
        .update(membershipUpdates)
        .eq('user_id', user.id)
        .eq('org_id', user.profile.org_id)
      if (error) errors.push(error.message)
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
    }

    // Re-fetch the updated joined profile
    const { data } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('org_id', user.profile.org_id)
      .single()

    return NextResponse.json({ profile: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

