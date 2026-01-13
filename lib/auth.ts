import { createClient } from './supabase/server'
import { UserProfile } from '@/types/database'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) return null

  // Try to get profile
  let { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile doesn't exist (error code PGRST116 means no rows found)
  if (profileError && (profileError.code === 'PGRST116' || profileError.message?.includes('No rows'))) {
    // Profile doesn't exist - try to create it automatically
    console.warn('User profile not found for user:', user.id, '- attempting to create')
    
    // Try to create the profile using admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && serviceRoleKey) {
      try {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const adminClient = createAdminClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
        
        // Get user metadata from auth
        const { data: authUser } = await adminClient.auth.admin.getUserById(user.id)
        const metadata = authUser?.user?.user_metadata || {}
        
        // Helper to convert empty strings to null
        const toNullIfEmpty = (value: any): string | null => {
          if (!value || (typeof value === 'string' && !value.trim())) return null
          return typeof value === 'string' ? value.trim() : String(value)
        }
        
        // Ensure membership_level and role match the database constraints exactly
        // Force to exact string literals to avoid any type issues
        const membershipLevel: 'Active' | 'Regular' | 'Resident' | 'Retired' | 'Student' | 'Lifetime' = 'Regular'
        const userRole: 'member' | 'admin' = 'member'
        
        // Build the insert object with explicit string values
        const profileData = {
          id: user.id,
          email: (user.email || '').toLowerCase().trim(),
          full_name: toNullIfEmpty(metadata.full_name || metadata.fullName),
          first_name: toNullIfEmpty(metadata.first_name || metadata.firstName),
          last_name: toNullIfEmpty(metadata.last_name || metadata.lastName),
          phone: toNullIfEmpty(metadata.phone),
          pilot_license_type: toNullIfEmpty(metadata.pilot_license_type || metadata.pilotLicenseType),
          aircraft_type: toNullIfEmpty(metadata.aircraft_type || metadata.aircraftType),
          call_sign: toNullIfEmpty(metadata.call_sign || metadata.callSign),
          how_often_fly_from_ytz: toNullIfEmpty(metadata.how_often_fly_from_ytz || metadata.howOftenFlyFromYTZ),
          how_did_you_hear: toNullIfEmpty(metadata.how_did_you_hear || metadata.howDidYouHear),
          role: userRole as string,
          membership_level: membershipLevel as string,
          status: 'pending' as string,
        }
        
        console.log('Attempting to create profile with data:', {
          ...profileData,
          role: profileData.role,
          membership_level: profileData.membership_level,
          roleType: typeof profileData.role,
          membershipLevelType: typeof profileData.membership_level,
        })
        
        const { data: createdProfile, error: createError } = await adminClient
          .from('user_profiles')
          .insert(profileData)
          .select()
          .single()
        
        if (!createError && createdProfile) {
          profile = createdProfile
          console.log('Successfully created missing user profile for:', user.id)
        } else {
          console.error('Failed to create user profile:', createError)
          return null
        }
      } catch (error) {
        console.error('Error creating user profile:', error)
        return null
      }
    } else {
      console.error('Missing Supabase admin credentials - cannot create profile')
      return null
    }
  } else if (profileError) {
    // Other database errors
    console.error('Error fetching user profile:', profileError)
    return null
  }

  if (!profile) return null

  // Check if user is approved (admins are always approved)
  if (profile.role !== 'admin' && profile.status !== 'approved') {
    // User is not approved - return null to block access
    return null
  }

  return {
    ...user,
    profile: profile as UserProfile,
  }
}

export async function getCurrentUserIncludingPending() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) return null

  // Try to get profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError && (profileError.code === 'PGRST116' || profileError.message?.includes('No rows'))) {
    return null
  } else if (profileError) {
    console.error('Error fetching user profile:', profileError)
    return null
  }

  if (!profile) return null

  // Return user even if pending (for pending approval page)
  return {
    ...user,
    profile: profile as UserProfile,
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.profile.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }
  return user
}

