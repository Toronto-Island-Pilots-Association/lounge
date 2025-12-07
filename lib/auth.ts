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
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile doesn't exist (error code PGRST116 means no rows found)
  if (profileError) {
    // Check if it's a "not found" error
    if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
      // Profile doesn't exist yet - this shouldn't happen with the trigger,
      // but we'll return null to let the user know they need to complete signup
      console.warn('User profile not found for user:', user.id)
      return null
    }
    // Other database errors
    console.error('Error fetching user profile:', profileError)
    return null
  }

  if (!profile) return null

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

