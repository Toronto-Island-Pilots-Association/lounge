import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateOrgSlug, ROOT_DOMAIN } from '@/lib/org'
import { addDomainToProject } from '@/lib/vercel'

export async function POST(request: Request) {
  if (request.headers.get('x-domain-type') !== 'platform') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { email, password, firstName, lastName, orgName, slug, customDomain } = await request.json()

    if (!email || !password || !firstName || !orgName || !slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const slugValidation = validateOrgSlug(slug)
    if (!slugValidation.valid) {
      return NextResponse.json({ error: slugValidation.error }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Check slug availability
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'This subdomain is already taken' }, { status: 409 })
    }

    // Try to create the auth user; if they already exist, reuse their account
    let userId: string
    let isNewUser = true

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName ?? '' },
    })

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        // Existing account — look up the user and create the org for them
        isNewUser = false
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
        const existing = users.find(u => u.email === email)
        if (!existing) {
          return NextResponse.json({ error: 'Account lookup failed. Please try again.' }, { status: 500 })
        }
        userId = existing.id
      } else {
        return NextResponse.json({ error: authError.message ?? 'Failed to create account' }, { status: 500 })
      }
    } else {
      userId = authData.user!.id
    }

    // Create org
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName.trim(),
        slug,
        subdomain: slug,
        custom_domain: customDomain?.trim() || null,
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

    // Create admin user_profile
    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: userId,
      user_id: userId,
      org_id: org.id,
      email,
      first_name: firstName,
      last_name: lastName ?? null,
      full_name: [firstName, lastName].filter(Boolean).join(' '),
      role: 'admin',
      status: 'approved',
      membership_level: 'Full',
    })

    if (profileError) {
      console.error('Failed to create admin profile:', profileError)
    }

    // Register Vercel domains
    const subdomain = `${slug}.${ROOT_DOMAIN}`
    await addDomainToProject(subdomain)
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
