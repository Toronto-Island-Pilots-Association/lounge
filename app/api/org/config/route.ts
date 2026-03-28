/**
 * GET /api/org/config
 * Public endpoint — returns org identity, feature flags, enabled levels, and signup fields.
 * Used by Navbar, signup form, and any client component that needs org config.
 * No auth required (this info is safe to expose publicly).
 */
import { headers } from 'next/headers'
import { fetchPublicOrgBranding } from '@/lib/org-public-branding'
import {
  getFeatureFlags,
  getOrgIdentity,
  getEnabledLevels,
  getSignupFieldsConfig,
  getAllMembershipFees,
} from '@/lib/settings'
import { getPlanDef, DEFAULT_PLAN } from '@/lib/plans'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const h = await headers()
    const orgId = h.get('x-org-id')
    if (!orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const branding = await fetchPublicOrgBranding(orgId)

    const plan = (branding.plan as string) || DEFAULT_PLAN
    const planDef = getPlanDef(plan)

    const [features, identity, levels, signupFields, fees] = await Promise.all([
      getFeatureFlags(),
      getOrgIdentity(),
      getEnabledLevels(),
      getSignupFieldsConfig(),
      getAllMembershipFees(),
    ])

    return NextResponse.json({
      org: {
        name:         branding.name,
        slug:         branding.slug,
        logoUrl:      branding.logoUrl,
        /** Resolved tab icon (custom favicon, else logo) — same as HTML favicon when set */
        siteIconUrl:  branding.siteIconUrl,
        accentColor:  identity.accentColor,
        displayName:  branding.displayName || identity.displayName,
        description:  identity.description,
        contactEmail: identity.contactEmail,
        websiteUrl:   identity.websiteUrl,
        timezone:     identity.timezone,
      },
      plan,
      planDef: {
        label:        planDef.label,
        priceMonthly: planDef.priceMonthly,
        maxMembers:   planDef.maxMembers,
        features:     planDef.features,
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
