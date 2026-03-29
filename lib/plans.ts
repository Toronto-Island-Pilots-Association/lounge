/**
 * Plan definitions for ClubLounge.
 * This is the single source of truth for what each plan allows.
 * Edit this file to change what a plan includes — no DB migration needed.
 */

export const PLAN_KEYS = ['hobby', 'starter', 'community', 'club_pro'] as const
export type PlanKey = (typeof PLAN_KEYS)[number]

/**
 * All feature gates. Keys map 1:1 to OrgFeatureFlags where built;
 * future features are tracked here for roadmap alignment with marketing.
 */
export type PlanFeatures = {
  // Currently built — map to OrgFeatureFlags
  memberDirectory: boolean
  events: boolean
  resources: boolean
  discussions: boolean
  requireMemberApproval: boolean
  allowMemberInvitations: boolean
  // Built — Stripe dues collection
  stripeDues: boolean
  /**
   * Public pages (About, Benefits, etc.) — shown before the paywall/login gate.
   * Admins can create and publish pages that are always publicly accessible,
   * regardless of the org's public_access setting.
   * Enabled on all plans.
   */
  pages: boolean
  // Future — not yet implemented, tracked for roadmap
  digestEmails: boolean
  analytics: boolean
  customDomain: boolean
  membershipTiers: boolean
  /** Time-limited trials on membership levels (Stripe + portal). */
  memberTrials: boolean
  // Branding: when false, "Powered by ClubLounge" badge is shown
  hideBranding: boolean
}

export type PlanDefinition = {
  label: string
  priceMonthly: number
  maxMembers: number | null  // null = unlimited
  recommendedMembers: string
  recommendedAdmins: string
  includedMembers: number | null
  additionalMemberPriceCents: number | null
  features: PlanFeatures
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  hobby: {
    label: 'Hobby',
    priceMonthly: 5,
    maxMembers: 20,
    recommendedMembers: 'Up to 20 members',
    recommendedAdmins: '1 admin',
    includedMembers: 20,
    additionalMemberPriceCents: null,
    features: {
      memberDirectory: true,
      events: true,
      resources: true,
      discussions: true,
      requireMemberApproval: true,
      allowMemberInvitations: false,
      stripeDues: true,
      pages: true,
      digestEmails: false,
      analytics: false,
      customDomain: false,
      membershipTiers: false,
      memberTrials: false,
      hideBranding: false,
    },
  },
  starter: {
    label: 'Core',
    priceMonthly: 49,
    maxMembers: null,
    recommendedMembers: 'Up to 200 members',
    recommendedAdmins: 'Up to 2 admins',
    includedMembers: 200,
    additionalMemberPriceCents: 15,
    features: {
      memberDirectory: true,
      events: true,
      resources: true,
      discussions: true,
      requireMemberApproval: true,
      allowMemberInvitations: true,
      stripeDues: true,
      pages: true,
      digestEmails: false,
      analytics: false,
      customDomain: false,
      membershipTiers: false,
      memberTrials: false,
      hideBranding: false,
    },
  },
  community: {
    label: 'Growth',
    priceMonthly: 99,
    maxMembers: null,
    recommendedMembers: 'Up to 500 members',
    recommendedAdmins: 'Up to 5 admins',
    includedMembers: 500,
    additionalMemberPriceCents: 5,
    features: {
      memberDirectory: true,
      events: true,
      resources: true,
      discussions: true,
      requireMemberApproval: true,
      allowMemberInvitations: true,
      stripeDues: true,
      pages: true,
      digestEmails: true,
      analytics: true,
      customDomain: true,
      membershipTiers: true,
      memberTrials: true,
      hideBranding: true,
    },
  },
  club_pro: {
    label: 'Pro',
    priceMonthly: 199,
    maxMembers: null,
    recommendedMembers: 'Custom member volume',
    recommendedAdmins: 'Custom admins',
    includedMembers: null,
    additionalMemberPriceCents: null,
    features: {
      memberDirectory: true,
      events: true,
      resources: true,
      discussions: true,
      requireMemberApproval: true,
      allowMemberInvitations: true,
      stripeDues: true,
      pages: true,
      digestEmails: true,
      analytics: true,
      customDomain: true,
      membershipTiers: true,
      memberTrials: true,
      hideBranding: true,
    },
  },
}

export const DEFAULT_PLAN: PlanKey = 'hobby'

export function getPlanDef(plan: string): PlanDefinition {
  return PLANS[plan as PlanKey] ?? PLANS[DEFAULT_PLAN]
}

/** Which plan first unlocks a given feature (for upgrade prompts). */
export function getRequiredPlan(feature: keyof PlanFeatures): PlanKey | null {
  for (const key of PLAN_KEYS) {
    if (PLANS[key].features[feature]) return key
  }
  return null
}
