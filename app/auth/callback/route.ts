import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { TIPA_ORG_ID } from '@/types/database'
import { ROOT_DOMAIN, getDomainType } from '@/lib/org'

/** Returns true if the URL is safe to redirect to after auth. */
function isTrustedNextUrl(next: string, requestOrigin: string): boolean {
  try {
    const url = new URL(next)
    // Same origin is always fine (relative → absolute already resolved)
    if (url.origin === requestOrigin) return true
    // Any subdomain of ROOT_DOMAIN is ours
    const host = url.hostname
    if (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`)) return true
    return false
  } catch {
    return false
  }
}

function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = request.headers.get('host')

  const proto = forwardedProto || (process.env.NODE_ENV === 'development' ? 'http' : 'https')
  const resolvedHost = (forwardedHost ?? host)?.split(',')[0]?.trim()

  if (resolvedHost) return `${proto}://${resolvedHost}`

  // Fallback: should rarely happen, but ensures we always return a valid origin.
  const u = new URL(request.url)
  return u.origin
}

/** Org subdomains use /discussions; marketing (www / apex / localhost) has no tenant — use platform home. */
function defaultPostAuthPath(request: Request): string {
  const host = new URL(getRequestOrigin(request)).hostname
  return getDomainType(host) === 'marketing' ? '/platform/dashboard' : '/discussions'
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const requestOrigin = getRequestOrigin(request)
  const code = requestUrl.searchParams.get('code')
  const fallbackPath = defaultPostAuthPath(request)
  const rawNext = requestUrl.searchParams.get('next') || fallbackPath

  // `next` can be an absolute URL (e.g. cross-domain redirect from org login via platform callback)
  // or a relative path. Resolve to absolute for validation, then use appropriately.
  let resolvedNext: URL
  try {
    resolvedNext = new URL(rawNext, requestOrigin)
  } catch {
    resolvedNext = new URL(fallbackPath, requestOrigin)
  }
  const next = isTrustedNextUrl(resolvedNext.href, requestOrigin)
    ? resolvedNext.href
    : new URL(fallbackPath, requestOrigin).href
  // Determine org context. The proxy sets x-org-id when running on an org subdomain,
  // but when the callback is centralised on the platform domain the header won't be set.
  // In that case, derive the org from the `next` URL's subdomain.
  const nextUrl = new URL(next)
  const nextHost = nextUrl.hostname.split(':')[0]
  let orgId = request.headers.get('x-org-id') ?? null
  if (!orgId && nextHost.endsWith(`.${ROOT_DOMAIN}`)) {
    // next is an org subdomain URL — look up the org by subdomain
    const subdomain = nextHost.slice(0, -(ROOT_DOMAIN.length + 1))
    if (subdomain && subdomain !== 'platform' && subdomain !== 'www') {
      try {
        const { getOrgByHostname } = await import('@/lib/org')
        const org = await getOrgByHostname(nextHost)
        if (org) orgId = org.id
      } catch {
        // non-critical — fall through to default
      }
    }
  }
  orgId = orgId ?? TIPA_ORG_ID
  const isTipa = orgId === TIPA_ORG_ID

  // The origin to use for onboarding redirects (e.g. /become-a-member, /complete-profile).
  // For cross-domain callbacks, use the org's origin; otherwise use the current request origin.
  const orgOrigin = nextUrl.origin !== requestOrigin ? nextUrl.origin : requestOrigin

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestOrigin),
      )
    }

    // If user signed in with Google and granted calendar scope, store refresh token for RSVP → Calendar sync
    const session = data.session
    const isGoogle = data.user?.app_metadata?.provider === 'google' ||
      data.user?.identities?.some((id: { provider?: string }) => id.provider === 'google')
    if (session?.provider_refresh_token && data.user?.id && isGoogle) {
      try {
        const { encryptCalendarToken } = await import('@/lib/calendar-crypto')
        const key = process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY
        if (key) {
          const encrypted = encryptCalendarToken(session.provider_refresh_token, key)
          await supabase
            .from('user_google_calendar_tokens')
            .upsert(
              {
                user_id: data.user.id,
                refresh_token_encrypted: encrypted,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            )
        }
      } catch (calendarTokenErr) {
        console.error('Failed to store Google Calendar token:', calendarTokenErr)
      }
    }

    // For platform routes, skip TIPA-specific profile checks and redirect directly
    const nextPath = nextUrl.pathname
    if (nextPath.startsWith('/platform')) {
      return NextResponse.redirect(next)
    }

    if (data.user) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      let adminClient = null
      
      // Create admin client if service role key is available
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseUrl) {
        try {
          const { createClient: createAdminClient } = await import('@supabase/supabase-js')
          adminClient = createAdminClient(
            supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            }
          )
        } catch (error) {
          console.error('Error creating admin client:', error)
        }
      }

      // Check if user profile exists
      // Wait for the database trigger to create the profile (retry logic)
      let profile = null
      let profileError = null
      
      if (adminClient) {
        // Try to fetch profile with retries (trigger might take a moment)
        for (let attempt = 0; attempt < 5; attempt++) {
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          
          try {
            const { data: fetchedProfile, error: fetchedError } = await adminClient
              .from('member_profiles')
              .select('*')
              .eq('user_id', data.user.id)
              .eq('org_id', orgId)
              .maybeSingle()
            
            if (!fetchedError && fetchedProfile) {
              profile = fetchedProfile
              profileError = null
              break
            } else {
              profileError = fetchedError
            }
          } catch (error) {
            console.error(`Error fetching user profile (attempt ${attempt + 1}):`, error)
            profileError = error
          }
        }
      } else {
        // Fallback: try with regular client
        const { data: fetchedProfile, error: fetchedError } = await supabase
          .from('member_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .eq('org_id', orgId)
          .maybeSingle()
        
        if (!fetchedError && fetchedProfile) {
          profile = fetchedProfile
        } else {
          profileError = fetchedError
        }
      }

      // Check if profile exists - if not, this is a new user signing up via Google
      // Redirect them to complete their profile
      const isProfileNotFound = profileError && (
        (typeof profileError === 'object' && 'code' in profileError && profileError.code === 'PGRST116') ||
        (typeof profileError === 'object' && 'message' in profileError && String(profileError.message).includes('No rows'))
      )
      
      if (!profile && isProfileNotFound) {
        // New Google user with no profile in this org
        if (isTipa) {
          // TIPA: redirect to complete profile (org-specific onboarding)
          return NextResponse.redirect(new URL('/complete-profile', orgOrigin))
        }
        // Other orgs: redirect to membership application so they can join
        return NextResponse.redirect(new URL('/become-a-member', orgOrigin))
      }

      // TIPA-specific: check if profile is missing aviation fields
      if (profile && isTipa) {
        const isIncomplete = !profile.phone && !profile.pilot_license_type && !profile.aircraft_type
        if (isIncomplete) {
          return NextResponse.redirect(new URL('/complete-profile', orgOrigin))
        }
      }

      // Track if this is a new user (profile was just created by trigger)
      let isNewUser = false
      
      if (profile) {
        // Profile exists - check if user was created recently (within last 5 seconds)
        // This handles the case where the trigger created the profile
        const userCreatedAt = data.user.created_at ? new Date(data.user.created_at).getTime() : 0
        const now = Date.now()
        const fiveSecondsAgo = now - 5000
        
        // If user was created very recently, it's likely a new user
        if (userCreatedAt > fiveSecondsAgo) {
          isNewUser = true
        }
      }

      // Send welcome email and admin notifications (TIPA only for now)
      if (profile && isNewUser && isTipa) {
        try {
          const { sendWelcomeEmail } = await import('@/lib/resend')
          const displayName = profile.full_name || profile.first_name || profile.email || 'Member'
          const result = await sendWelcomeEmail(profile.email, displayName)
          if (!result.success) {
            console.error('Welcome email failed to send:', result.error)
          }
        } catch (emailError) {
          console.error('Error sending welcome email to OAuth user:', emailError)
        }

        // Notify admins about new member (non-blocking)
        // Try to get admin emails - use adminClient if available, otherwise use regular client
        const clientForAdmins = adminClient || supabase
        try {
          const { data: admins } = await clientForAdmins
            .from('member_profiles')
            .select('email')
            .eq('org_id', orgId)
            .eq('role', 'admin')
            .eq('status', 'approved')

          if (admins && admins.length > 0) {
            const { sendNewMemberNotificationToAdmins } = await import('@/lib/resend')
            const adminEmails = admins.map(a => a.email).filter(Boolean)
            
            // Send notification to each admin
            Promise.all(
              adminEmails.map(adminEmail =>
                sendNewMemberNotificationToAdmins(
                  profile.email,
                  profile.full_name || profile.first_name || null,
                  {
                    call_sign: profile.call_sign,
                    aircraft_type: profile.aircraft_type,
                    pilot_license_type: profile.pilot_license_type,
                    phone: profile.phone,
                    membership_level: profile.membership_level,
                    membership_class: profile.membership_class,
                    street: profile.street,
                    city: profile.city,
                    province_state: profile.province_state,
                    postal_zip_code: profile.postal_zip_code,
                    country: profile.country,
                    how_often_fly_from_ytz: profile.how_often_fly_from_ytz,
                    is_copa_member: profile.is_copa_member,
                    join_copa_flight_32: profile.join_copa_flight_32,
                    copa_membership_number: profile.copa_membership_number,
                    statement_of_interest: profile.statement_of_interest,
                    how_did_you_hear: profile.how_did_you_hear,
                    is_student_pilot: profile.is_student_pilot,
                    flight_school: profile.flight_school,
                    instructor_name: profile.instructor_name,
                  },
                  adminEmail
                ).catch(err => {
                  console.error(`Failed to notify admin ${adminEmail}:`, err)
                })
              )
            ).catch(err => {
              console.error('Error sending admin notifications:', err)
            })
          } else {
            console.warn('No admin emails found to notify about new member')
          }
        } catch (err) {
          console.error('Error fetching admin emails for notification:', err)
        }
      } else if (!profile) {
        console.warn('User profile not found/created for OAuth user:', {
          userId: data.user.id,
          email: data.user.email,
          profileError: profileError
        })
      }
    }

    // Redirect to the dashboard or the next URL (already absolute)
    return NextResponse.redirect(next)
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL('/login', requestOrigin))
}

