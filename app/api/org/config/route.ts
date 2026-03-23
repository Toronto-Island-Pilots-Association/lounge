/**
 * GET /api/org/config
 * Public endpoint — returns org identity, feature flags, enabled levels, and signup fields.
 * Used by Navbar, signup form, and any client component that needs org config.
 * No auth required (this info is safe to expose publicly).
 */
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { TIPA_ORG_ID } from '@/types/database'
import {
  getFeatureFlags,
  getOrgIdentity,
  getEnabledLevels,
  getSignupFieldsConfig,
  getAllMembershipFees,
} from '@/lib/settings'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Resolve org name/logo from organizations table
    const h = await headers()
    const orgId = h.get('x-org-id') ?? TIPA_ORG_ID

    const supabase = await createClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name, slug, logo_url')
      .eq('id', orgId)
      .maybeSingle()

    const [features, identity, levels, signupFields, fees] = await Promise.all([
      getFeatureFlags(),
      getOrgIdentity(),
      getEnabledLevels(),
      getSignupFieldsConfig(),
      getAllMembershipFees(),
    ])

    return NextResponse.json({
      org: {
        name:       org?.name ?? '',
        slug:       org?.slug ?? '',
        logoUrl:    org?.logo_url ?? null,
        accentColor: identity.accentColor,
        displayName: identity.displayName,
        description: identity.description,
        contactEmail: identity.contactEmail,
        websiteUrl:  identity.websiteUrl,
        timezone:    identity.timezone,
      },
      features,
      membership: { enabledLevels: levels, fees },
      signupFields,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load org config'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
