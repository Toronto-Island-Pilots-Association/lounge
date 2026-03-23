import { createClient } from './supabase/server'
import { headers } from 'next/headers'
import { UserProfile } from '@/types/database'

/** Read the org id injected by middleware from request headers. */
async function getOrgId(): Promise<string | null> {
  try {
    const h = await headers()
    return h.get('x-org-id')
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) return null

  const orgId = await getOrgId()

  let query = supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)

  if (orgId) query = query.eq('org_id', orgId)

  let { data: profile, error: profileError } = await query.maybeSingle()

  if (profileError) {
    console.error('Error fetching user profile:', profileError)
    return null
  }

  // Profile doesn't exist — attempt to create it
  if (!profile) {
    console.warn('User profile not found for user:', user.id, '- attempting to create')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceRoleKey && orgId) {
      try {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

        const { data: authUser } = await adminClient.auth.admin.getUserById(user.id)
        const metadata = authUser?.user?.user_metadata || {}

        const toNullIfEmpty = (value: any): string | null => {
          if (!value || (typeof value === 'string' && !value.trim())) return null
          return typeof value === 'string' ? value.trim() : String(value)
        }

        const membershipLevelFromMetadata = metadata.membership_level || metadata.membershipLevel
        const membershipLevel: 'Full' | 'Student' | 'Associate' | 'Corporate' | 'Honorary' =
          membershipLevelFromMetadata &&
          ['Full', 'Student', 'Associate', 'Corporate', 'Honorary'].includes(membershipLevelFromMetadata)
            ? membershipLevelFromMetadata
            : 'Associate'

        const { data: createdProfile, error: createError } = await adminClient
          .from('user_profiles')
          .insert({
            user_id: user.id,
            org_id: orgId,
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
            role: 'member',
            membership_level: membershipLevel,
            status: 'pending',
          })
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
      console.error('Cannot create profile: missing admin credentials or org context')
      return null
    }
  }

  // Block non-approved members (admins always pass)
  if (profile.role !== 'admin' && profile.status !== 'approved') {
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

  const orgId = await getOrgId()

  let query = supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)

  if (orgId) query = query.eq('org_id', orgId)

  const { data: profile, error: profileError } = await query.maybeSingle()

  if (profileError) {
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
  if (!user) throw new Error('Unauthorized')
  return user
}

/** Like requireAuth but allows pending users (e.g. for adding payment before approval). */
export async function requireAuthIncludingPending() {
  const user = await getCurrentUserIncludingPending()
  if (!user) throw new Error('Unauthorized')
  return user
}

export function shouldRequireProfileCompletion(profile: UserProfile): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return false
  if (profile.status !== 'pending' && profile.status !== 'approved') return false
  return (
    !profile.first_name?.trim() ||
    !profile.last_name?.trim() ||
    !profile.street?.trim() ||
    !profile.city?.trim() ||
    !profile.country?.trim() ||
    !profile.province_state?.trim() ||
    !profile.postal_zip_code?.trim()
  )
}

export function shouldRequirePayment(profile: UserProfile): boolean {
  if (!profile) return false
  if (profile.membership_level === 'Honorary') return false
  if (profile.status === 'rejected' || profile.status === 'expired') return false
  if (profile.stripe_subscription_id) return false
  return profile.status === 'pending' || profile.status === 'approved'
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.profile.role !== 'admin') throw new Error('Forbidden: Admin access required')
  return user
}
