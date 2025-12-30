import { getCurrentUserIncludingPending } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { appendMemberToSheet } from '@/lib/google-sheets'
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
      pilot_license_type,
      aircraft_type,
      call_sign,
      how_often_fly_from_ytz,
      how_did_you_hear,
    } = body

    // Build update object with only provided fields
    const updates: Record<string, any> = {}
    if (full_name !== undefined) updates.full_name = full_name || null
    if (first_name !== undefined) updates.first_name = first_name || null
    if (last_name !== undefined) updates.last_name = last_name || null
    if (phone !== undefined) updates.phone = phone || null
    if (pilot_license_type !== undefined) updates.pilot_license_type = pilot_license_type || null
    if (aircraft_type !== undefined) updates.aircraft_type = aircraft_type || null
    if (call_sign !== undefined) updates.call_sign = call_sign || null
    if (how_often_fly_from_ytz !== undefined) updates.how_often_fly_from_ytz = how_often_fly_from_ytz || null
    if (how_did_you_hear !== undefined) updates.how_did_you_hear = how_did_you_hear || null

    // Get current profile to check if this is the first time completing it
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Check if this is the first time the profile is being updated after creation
    // This ensures Google Sheets append happens after profile completion phase
    const profileAge = currentProfile && currentProfile.created_at 
      ? Date.now() - new Date(currentProfile.created_at).getTime()
      : null
    
    // Check if profile was created recently (within last 30 minutes to be more lenient)
    // This catches both OAuth users completing their profile and password users updating after signup
    const isRecentProfile = profileAge !== null && profileAge < 1800000 // 30 minutes
    
    // Check if key profile fields are now present (indicating profile completion)
    // At minimum, we need a name (first_name, last_name, or full_name) to add to sheets
    const hasKeyFields = data && (
      data.first_name || data.full_name || data.last_name
    )
    
    // Check if profile already had key fields before this update (for password signups)
    const alreadyHadKeyFields = currentProfile && (
      currentProfile.first_name || currentProfile.full_name || currentProfile.last_name
    )

    // Append to Google Sheets after profile completion (non-blocking)
    // Trigger if:
    // 1. Profile is recent AND has key fields (new completion)
    // 2. OR profile is recent AND already had key fields (password signup with complete profile)
    // This ensures it happens after the "complete profile phase" for both signup types
    if (data && isRecentProfile && (hasKeyFields || alreadyHadKeyFields)) {
      appendMemberToSheet(data).catch(err => {
        console.error('Failed to append member to Google Sheet:', err)
      })
    }

    return NextResponse.json({ profile: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

