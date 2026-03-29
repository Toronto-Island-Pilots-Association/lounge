import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateOrgSlug, ROOT_DOMAIN } from '@/lib/org'
import { addDomainToProject } from '@/lib/vercel'
import { NextResponse } from 'next/server'

/**
 * POST /api/orgs
 * Creates a new organization.
 * Body: { name, slug, adminEmail, adminPassword?, customDomain? }
 *
 * Called from clublounge.app/platform/create.
 */
export async function POST(request: Request) {
  if (request.headers.get('x-domain-type') !== 'marketing') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { name, slug, adminEmail, customDomain } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    }

    const slugValidation = validateOrgSlug(slug)
    if (!slugValidation.valid) {
      return NextResponse.json({ error: slugValidation.error }, { status: 400 })
    }

    if (!adminEmail?.trim()) {
      return NextResponse.json({ error: 'Admin email is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Check slug availability
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'This organization slug is already taken' }, { status: 409 })
    }

    // Check custom domain availability
    if (customDomain) {
      const { data: domainExists } = await supabase
        .from('organizations')
        .select('id')
        .eq('custom_domain', customDomain)
        .maybeSingle()

      if (domainExists) {
        return NextResponse.json({ error: 'This custom domain is already registered' }, { status: 409 })
      }
    }

    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        slug,
        subdomain: slug,
        custom_domain: customDomain?.trim() || null,
        plan: 'hobby',
      })
      .select()
      .single()

    if (orgError || !org) {
      console.error('Failed to create organization:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // Seed default settings for this org
    await supabase.rpc('create_default_org_settings', { p_org_id: org.id })

    // Register subdomain on Vercel (e.g. slug.clublounge.app)
    const subdomain = `${slug}.${ROOT_DOMAIN}`
    const subdomainResult = await addDomainToProject(subdomain)
    if (!subdomainResult.success) {
      console.warn(`Failed to register subdomain ${subdomain}:`, subdomainResult.error)
    }

    // Register custom domain on Vercel if provided
    if (customDomain) {
      const customDomainResult = await addDomainToProject(customDomain)
      if (!customDomainResult.success) {
        console.warn(`Failed to register custom domain ${customDomain}:`, customDomainResult.error)
      }
    }

    return NextResponse.json({
      org,
      url: customDomain ? `https://${customDomain}` : `https://${subdomain}`,
      cname: customDomain
        ? { record: 'CNAME', host: customDomain, value: 'cname.vercel-dns.com' }
        : null,
    })
  } catch (error: any) {
    console.error('Create org error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

/**
 * GET /api/orgs?slug=xxx
 * Check if a slug is available.
 */
export async function GET(request: Request) {
  if (request.headers.get('x-domain-type') !== 'marketing') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })

  const validation = validateOrgSlug(slug)
  if (!validation.valid) {
    return NextResponse.json({ available: false, error: validation.error })
  }

  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  return NextResponse.json({ available: !data })
}
