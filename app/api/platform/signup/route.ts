import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { validateOrgSlug, ROOT_DOMAIN } from '@/lib/org'
import { addDomainToProject } from '@/lib/vercel'

export async function POST(request: Request) {
  if (request.headers.get('x-domain-type') !== 'platform') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const {
      email,
      password,
      firstName,
      lastName,
      orgName,
      slug,
      customDomain,
    } = await request.json()

    if (!orgName || !slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const slugValidation = validateOrgSlug(slug)
    if (!slugValidation.valid) {
      return NextResponse.json({ error: slugValidation.error }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const isCreatingAuthUser = typeof email === 'string' && typeof password === 'string' && email && password

    // Check slug availability
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'This subdomain is already taken' }, { status: 409 })
    }

    // Determine which user the org should belong to:
    // - if email/password is provided: create/reuse auth user by those credentials
    // - if email/password is omitted: require an existing logged-in platform session
    let userId: string
    let isNewUser = false
    let resolvedEmail = email as string | undefined
    let resolvedFirstName = firstName as string | undefined
    let resolvedLastName = (lastName as string | undefined) ?? ''

    if (isCreatingAuthUser) {
      if (!password || password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email as string,
        password,
        email_confirm: true,
        user_metadata: { first_name: resolvedFirstName ?? '', last_name: resolvedLastName },
      })

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          // Existing account — look up the user and create the org for them
          isNewUser = false
          const { data: { users }, error: lookupError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
          const existingUser = users?.find(u => u.email === resolvedEmail)
          if (lookupError || !existingUser) {
            return NextResponse.json({ error: 'Account lookup failed. Please try again.' }, { status: 500 })
          }
          userId = existingUser.id
        } else {
          return NextResponse.json({ error: authError.message ?? 'Failed to create account' }, { status: 500 })
        }
      } else {
        userId = authData.user!.id
      }
    } else {
      const supabaseUser = await createClient()
      const { data: authUser, error } = await supabaseUser.auth.getUser()
      if (error || !authUser?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      userId = authUser.user.id
      resolvedEmail = authUser.user.email ?? resolvedEmail

      const md = (authUser.user.user_metadata ?? {}) as any
      resolvedFirstName = resolvedFirstName ?? (md.first_name ?? md.firstName ?? '')
      resolvedLastName = resolvedLastName || (md.last_name ?? md.lastName ?? '')
      isNewUser = false
    }

    if (!userId) {
      return NextResponse.json({ error: 'Failed to determine user' }, { status: 500 })
    }
    if (!resolvedEmail) {
      return NextResponse.json({ error: 'Missing email for admin profile' }, { status: 400 })
    }

    if (!resolvedFirstName) {
      // Keep onboarding moving even if metadata is missing.
      resolvedFirstName = 'Admin'
    }

    // Create org — 14-day free trial at Starter tier
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName.trim(),
        slug,
        subdomain: slug,
        custom_domain: customDomain?.trim() || null,
        plan: 'hobby',
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single()

    if (orgError || !org) {
      if (isNewUser) await supabase.auth.admin.deleteUser(userId)
      console.error('Failed to create org:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // Seed default settings
    await supabase.rpc('create_default_org_settings', { p_org_id: org.id })

    // Upsert identity fields into user_profiles
    const { error: profileError } = await supabase.from('user_profiles').upsert({
      user_id: userId,
      email: resolvedEmail,
      first_name: resolvedFirstName,
      last_name: resolvedLastName ? resolvedLastName : null,
      full_name: [resolvedFirstName, resolvedLastName].filter(Boolean).join(' '),
    }, { onConflict: 'user_id' })

    if (profileError) {
      console.error('Failed to create admin user_profile:', profileError)
    }

    // Create membership row in org_memberships
    const { error: membershipError } = await supabase.from('org_memberships').insert({
      user_id: userId,
      org_id: org.id,
      role: 'admin',
      status: 'approved',
      membership_level: 'Full',
    })

    if (membershipError) {
      console.error('Failed to create admin org_membership:', membershipError)
    }

    // Wildcard *.clublounge.app covers all org subdomains automatically.
    // Only register custom domains explicitly.
    const subdomain = `${slug}.${ROOT_DOMAIN}`
    if (customDomain?.trim()) await addDomainToProject(customDomain.trim())

    const orgUrl = customDomain?.trim()
      ? `https://${customDomain.trim()}`
      : `https://${subdomain}`

    return NextResponse.json({
      orgUrl,
      cname: customDomain?.trim()
        ? { host: customDomain.trim(), value: 'cname.vercel-dns.com' }
        : null,
    })
  } catch (error: any) {
    console.error('Platform signup error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
