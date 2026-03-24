import { createClient } from './supabase/server'
import { headers } from 'next/headers'
import { MemberProfile, UserProfile } from '@/types/database'

/** Read the org id injected by middleware from request headers. */
async function getOrgId(): Promise<string | null> {
  try {
    const h = await headers()
    return h.get('x-org-id')
  } catch {
    return null
  }
}

/** Fetch the flattened member profile (identity + membership) for the current user. */
async function fetchMemberProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string | null,
): Promise<MemberProfile | null> {
  let query = supabase
    .from('member_profiles')
    .select('*')
    .eq('user_id', userId)

  if (orgId) query = query.eq('org_id', orgId)

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('Error fetching member profile:', error)
    return null
  }
  return data as MemberProfile | null
}

/** Create missing identity + membership records for a user. */
async function createMissingProfile(
  userId: string,
  orgId: string,
  email: string,
): Promise<MemberProfile | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Cannot create profile: missing admin credentials')
    return null
  }

  try {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: authUser } = await adminClient.auth.admin.getUserById(userId)
    const metadata = authUser?.user?.user_metadata || {}

    const toNull = (v: any): string | null => {
      if (!v || (typeof v === 'string' && !v.trim())) return null
      return typeof v === 'string' ? v.trim() : String(v)
    }

    const membershipLevel = (['Full', 'Student', 'Associate', 'Corporate', 'Honorary'] as const)
      .includes(metadata.membership_level) ? metadata.membership_level : 'Associate'

    // Upsert identity
    await adminClient.from('user_profiles').upsert({
      user_id: userId,
      email: email.toLowerCase().trim(),
      full_name: toNull(metadata.full_name),
      first_name: toNull(metadata.first_name),
      last_name: toNull(metadata.last_name),
      phone: toNull(metadata.phone),
    }, { onConflict: 'user_id' })

    // Upsert membership — if a row already exists (e.g. from an invite),
    // leave it untouched (ignoreDuplicates). Only insert when truly missing.
    const { error: membershipError } = await adminClient.from('org_memberships').upsert({
      user_id: userId,
      org_id: orgId,
      pilot_license_type: toNull(metadata.pilot_license_type),
      aircraft_type: toNull(metadata.aircraft_type),
      call_sign: toNull(metadata.call_sign),
      how_often_fly_from_ytz: toNull(metadata.how_often_fly_from_ytz),
      how_did_you_hear: toNull(metadata.how_did_you_hear),
      role: 'member',
      membership_level: membershipLevel,
      status: 'pending',
    }, { onConflict: 'user_id,org_id', ignoreDuplicates: true })

    if (membershipError) {
      console.error('Failed to create org membership:', membershipError)
      return null
    }

    // Re-fetch via the view
    const { data } = await adminClient
      .from('member_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .maybeSingle()

    console.log('Created missing member profile for:', userId)
    return data as MemberProfile | null
  } catch (error) {
    console.error('Error creating member profile:', error)
    return null
  }
}

export async function getCurrentUser() {
  const supabase = await createClient()
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) return null

    const orgId = await getOrgId()

    let profile = await fetchMemberProfile(supabase, user.id, orgId)

    if (!profile) {
      console.warn('Member profile not found for user:', user.id, '— attempting to create')
      if (orgId) {
        profile = await createMissingProfile(user.id, orgId, user.email ?? '')
      }
      if (!profile) return null
    }

    // Block non-approved members (admins always pass)
    if (profile.role !== 'admin' && profile.status !== 'approved') {
      return null
    }

    return { ...user, profile }
  } catch (err) {
    // Supabase can throw when the session cookie is corrupted (e.g. invalid UTF-8).
    console.error('Failed to load supabase auth session:', err)
    return null
  }
}

export async function getCurrentUserIncludingPending() {
  const supabase = await createClient()
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) return null

    const orgId = await getOrgId()
    const profile = await fetchMemberProfile(supabase, user.id, orgId)
    if (!profile) return null

    return { ...user, profile }
  } catch (err) {
    console.error('Failed to load supabase auth session:', err)
    return null
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

export function shouldRequireProfileCompletion(profile: MemberProfile): boolean {
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

export function shouldRequirePayment(profile: MemberProfile): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return false
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
