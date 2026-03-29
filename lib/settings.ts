import { createClient, createServiceRoleClient } from './supabase/server'
import { headers } from 'next/headers'
import { getPlanDef, DEFAULT_PLAN, type PlanKey } from './plans'
import { getManagedOrgConfig } from '@/lib/managed-orgs'
import {
  DEFAULT_SIGNUP_FIELDS,
  LEGACY_SIGNUP_FIELD_KEYS,
  type MembershipLevelKey,
  type SignupField,
} from './settings-shared'

export type { MembershipLevelKey, SignupField, SignupFieldType } from './settings-shared'

export type PublicHomeTemplate = 'default' | 'tipa_legacy'
export type StripeBillingMode = 'connect' | 'direct'

export type OrgMemberProfileFieldFlags = {
  showAviationSection: boolean
  showCopaSection: boolean
  showPilotLicenseType: boolean
  showAircraftType: boolean
  showCallSign: boolean
  showFlightFrequency: boolean
  showStudentPilotFields: boolean
}

const DEFAULT_MEMBER_PROFILE_FIELD_FLAGS: OrgMemberProfileFieldFlags = {
  showAviationSection: false,
  showCopaSection: false,
  showPilotLicenseType: false,
  showAircraftType: false,
  showCallSign: false,
  showFlightFrequency: false,
  showStudentPilotFields: false,
}

async function getOrgId(override?: string): Promise<string | null> {
  if (override) return override
  try {
    const h = await headers()
    return h.get('x-org-id')
  } catch {
    return null
  }
}

/** Effective SaaS plan for feature gating. */
async function getEffectiveOrgPlanKey(orgIdOverride?: string): Promise<string> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId(orgIdOverride)
    const managedOrg = getManagedOrgConfig(orgId)
    if (managedOrg?.forcedPlan) return managedOrg.forcedPlan
    const { data } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', orgId)
      .maybeSingle()
    const plan = (data?.plan as string) || DEFAULT_PLAN
    return plan
  } catch {
    return DEFAULT_PLAN
  }
}

// Legacy hardcoded levels — used as fallback for TIPA and type compat
const MEMBERSHIP_LEVELS = ['Full', 'Student', 'Associate', 'Corporate', 'Honorary'] as const

const DEFAULT_FEES: Record<string, number> = {
  Full: 45, Student: 25, Associate: 25, Corporate: 125, Honorary: 0,
}

// ─── Configurable Membership Levels ──────────────────────────────────────────

export type TrialType = 'none' | 'months'

export type OrgMembershipLevel = {
  key: string           // url-safe lowercase, e.g. "full", "gold", "junior"
  label: string         // display name shown to members
  fee: number           // annual fee (org's currency)
  trialType: TrialType
  trialMonths?: number  // only when trialType === 'months'
  enabled: boolean
}

const DEFAULT_MEMBERSHIP_LEVELS: OrgMembershipLevel[] = [
  { key: 'full',      label: 'Regular',     fee: 45,  trialType: 'none', enabled: true },
  { key: 'associate', label: 'Associate',   fee: 25,  trialType: 'none', enabled: true },
  { key: 'honorary',  label: 'Honorary',    fee: 0,   trialType: 'none', enabled: true },
]

/** Legacy `sept1` trials were TIPA-specific — coerce to no trial when reading stored config. */
function normalizeMembershipLevelsFromJson(parsed: unknown): OrgMembershipLevel[] | null {
  if (!Array.isArray(parsed) || parsed.length === 0) return null
  const out: OrgMembershipLevel[] = []
  for (const raw of parsed) {
    if (typeof raw !== 'object' || raw === null) return null
    const r = raw as Record<string, unknown>
    if (typeof r.key !== 'string' || !r.key) return null
    if (typeof r.label !== 'string') return null
    if (typeof r.fee !== 'number' || r.fee < 0) return null
    if (typeof r.enabled !== 'boolean') return null
    const rawTrial = r.trialType === 'months' ? 'months' : r.trialType === 'sept1' ? 'none' : 'none'
    const trialType: TrialType = rawTrial === 'months' ? 'months' : 'none'
    const level: OrgMembershipLevel = {
      key: r.key,
      label: r.label,
      fee: r.fee,
      trialType,
      enabled: r.enabled,
    }
    if (trialType === 'months') {
      const m = r.trialMonths
      level.trialMonths = typeof m === 'number' && m >= 1 ? m : 12
    }
    out.push(level)
  }
  return out
}

export async function getMembershipLevels(orgId?: string): Promise<OrgMembershipLevel[]> {
  const raw = await getSetting('membership_levels_config', orgId)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const normalized = normalizeMembershipLevelsFromJson(parsed)
      if (normalized) return normalized
    } catch { /* fall through */ }
  }
  return DEFAULT_MEMBERSHIP_LEVELS
}

export async function setMembershipLevels(levels: OrgMembershipLevel[], orgIdOverride?: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId(orgIdOverride)
  const plan = await getEffectiveOrgPlanKey(orgIdOverride)
  const allowTrials = getPlanDef(plan).features.memberTrials
  const toSave = allowTrials
    ? levels
    : levels.map(l => ({ ...l, trialType: 'none' as TrialType, trialMonths: undefined }))
  const { error } = await supabase.from('settings').upsert(
    {
      key: 'membership_levels_config',
      value: JSON.stringify(toSave),
      org_id: orgId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key,org_id' },
  )
  if (error) throw new Error(`Failed to save membership levels: ${error.message}`)
}

export async function getSetting(key: string, orgIdOverride?: string): Promise<string | null> {
  const supabase = await createClient()
  const orgId = await getOrgId(orgIdOverride)

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error || !data) return null
  return data.value
}

function parseStringArraySetting(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  } catch {
    return []
  }
}

export async function getPublicHomeTemplate(orgIdOverride?: string): Promise<PublicHomeTemplate> {
  const raw = await getSetting('public_home_template', orgIdOverride)
  return raw === 'tipa_legacy' ? 'tipa_legacy' : 'default'
}

export async function getHiddenPublicPageSlugs(orgIdOverride?: string): Promise<string[]> {
  return parseStringArraySetting(await getSetting('hidden_public_page_slugs', orgIdOverride))
}

export async function getStripeBillingMode(orgIdOverride?: string): Promise<StripeBillingMode> {
  const managedOrg = getManagedOrgConfig(orgIdOverride)
  if (managedOrg?.stripeBillingMode) return managedOrg.stripeBillingMode
  const raw = await getSetting('stripe_billing_mode', orgIdOverride)
  return raw === 'direct' ? 'direct' : 'connect'
}

/** Fee for a specific membership level. Reads from levels config first, falls back to legacy per-key settings. */
export async function getMembershipFeeForLevel(level: string): Promise<number> {
  const levels = await getMembershipLevels()
  const found = levels.find(l => l.key.toLowerCase() === level.toLowerCase())
  if (found) return found.fee
  // Legacy fallback for TIPA per-level settings keys
  const value = await getSetting(`membership_fee_${level.toLowerCase()}`)
  if (value !== null && !Number.isNaN(parseFloat(value))) return parseFloat(value)
  return DEFAULT_FEES[level] ?? 0
}

/** All membership fees keyed by level key. For admin UI and payment flows. */
export async function getAllMembershipFees(): Promise<Record<string, number>> {
  const levels = await getMembershipLevels()
  return Object.fromEntries(levels.map(l => [l.key, l.fee]))
}

/** Update fee for one level by mutating the levels config. */
export async function setMembershipFeeForLevel(level: string, fee: number): Promise<void> {
  const levels = await getMembershipLevels()
  const updated = levels.map(l => l.key.toLowerCase() === level.toLowerCase() ? { ...l, fee } : l)
  await setMembershipLevels(updated)
}

/** Single global fee (legacy). Returns Full level fee. */
export async function getMembershipFee(): Promise<number> {
  return getMembershipFeeForLevel('Full')
}

export type TrialConfigItem = { type: TrialType; months?: number }

/** Load trial config keyed by level key. `months` trials apply when the org plan enables `memberTrials`. */
export async function getTrialConfig(orgIdOverride?: string): Promise<Record<string, TrialConfigItem>> {
  const levels = await getMembershipLevels(orgIdOverride)
  const plan = await getEffectiveOrgPlanKey(orgIdOverride)
  const allow = getPlanDef(plan).features.memberTrials
  return Object.fromEntries(
    levels.map(l => [
      l.key,
      allow && l.trialType === 'months'
        ? { type: 'months' as const, months: l.trialMonths ?? 12 }
        : { type: 'none' as const },
    ]),
  )
}

/** Compute trial end date from config. Returns null if no trial or missing created_at when type is months. */
export function computeTrialEndFromConfig(
  config: TrialConfigItem | undefined,
  profileCreatedAt: string | null
): Date | null {
  if (!config) return null
  if (config.type === 'none') return null
  if (config.type === 'months' && profileCreatedAt) {
    const created = new Date(profileCreatedAt)
    const end = new Date(created)
    end.setMonth(end.getMonth() + (config.months ?? 12))
    return end
  }
  return null
}

/** Normalize a membership level key to match the lowercase keys stored in config. */
export function normalizeMembershipLevelKey(level: string): string {
  return level?.toLowerCase?.() ?? level
}

/** Case-insensitive lookup into getTrialConfig() result (which uses lowercase keys). */
export function getTrialConfigItemForLevel(
  config: Record<string, TrialConfigItem>,
  level: string,
): TrialConfigItem | undefined {
  const levelKey = normalizeMembershipLevelKey(level)
  return config[levelKey] ?? config[level]
}

/** Trial end date for a membership level (reads admin config from DB). Use this on the server. */
export async function getTrialEndDateAsync(
  level: MembershipLevelKey,
  profileCreatedAt: string | null,
  orgIdOverride?: string,
): Promise<Date | null> {
  const config = await getTrialConfig(orgIdOverride)
  // getTrialConfig() keys are stored lowercase (e.g. "full", "student"),
  // but member profiles may store "Full"/"Student" or custom casing.
  const item = getTrialConfigItemForLevel(config, level)
  return computeTrialEndFromConfig(item, profileCreatedAt)
}

/** Update trial config for one level. Mutates the levels config. */
export async function setTrialConfigForLevel(level: string, item: TrialConfigItem): Promise<void> {
  const levels = await getMembershipLevels()
  const updated = levels.map(l => l.key.toLowerCase() === level.toLowerCase()
    ? { ...l, trialType: item.type, trialMonths: item.type === 'months' ? (item.months ?? 12) : undefined }
    : l
  )
  await setMembershipLevels(updated)
}

// ─── Org Plan ────────────────────────────────────────────────────────────────

/** Returns the plan key for the current org. Falls back to DEFAULT_PLAN on error. */
export async function getOrgPlan(orgIdOverride?: string): Promise<string> {
  return getEffectiveOrgPlanKey(orgIdOverride)
}

/**
 * Resolve the monthly SaaS price for a plan for a specific org.
 * Supports per-org overrides via settings keys like `plan_price_monthly_override_club_pro`.
 */
export async function getPlanPriceMonthly(plan: string, orgIdOverride?: string): Promise<number> {
  const managedOrg = getManagedOrgConfig(orgIdOverride)
  const managedPrice = managedOrg?.monthlyPriceOverrides?.[plan as PlanKey]
  if (typeof managedPrice === 'number' && managedPrice >= 0) {
    return managedPrice
  }

  const overrideKey = `plan_price_monthly_override_${plan}`
  const rawOverride = await getSetting(overrideKey, orgIdOverride)
  if (rawOverride !== null) {
    const parsed = Number(rawOverride)
    if (!Number.isNaN(parsed) && parsed >= 0) return parsed
  }

  return getPlanDef(plan).priceMonthly
}

export async function getOrgPlanPriceMonthly(orgIdOverride?: string): Promise<number> {
  const plan = await getOrgPlan(orgIdOverride)
  return getPlanPriceMonthly(plan, orgIdOverride)
}

// ─── Org Feature Flags ───────────────────────────────────────────────────────

export type OrgFeatureFlags = {
  discussions: boolean
  events: boolean
  resources: boolean
  memberDirectory: boolean
  requireMemberApproval: boolean
  allowMemberInvitations: boolean
  /** Public pages (About, Benefits, etc.) — always public, all plans. */
  pages: boolean
  discussionsLabel: string
  eventsLabel: string
  resourcesLabel: string
  pagesLabel: string
}

const DEFAULT_FEATURE_FLAGS: OrgFeatureFlags = {
  discussions: true,
  events: true,
  resources: true,
  memberDirectory: true,
  requireMemberApproval: true,
  allowMemberInvitations: true,
  pages: true,
  discussionsLabel: 'Discussions',
  eventsLabel: 'Events',
  resourcesLabel: 'Announcements',
  pagesLabel: 'Pages',
}

export async function getFeatureFlags(orgIdOverride?: string): Promise<OrgFeatureFlags> {
  const supabase = await createClient()
  const orgId = await getOrgId(orgIdOverride)
  const keys = [
    'feature_discussions', 'feature_events', 'feature_resources',
    'feature_member_directory', 'require_member_approval', 'allow_member_invitations',
    'feature_pages',
    'discussions_label', 'events_label', 'resources_label', 'pages_label',
  ]
  const [{ data: rows }, plan] = await Promise.all([
    supabase.from('settings').select('key, value').in('key', keys).eq('org_id', orgId),
    getOrgPlan(orgIdOverride),
  ])
  const planFeatures = getPlanDef(plan).features
  const map = new Map((rows ?? []).map(r => [r.key, r.value]))
  // Plan ceiling: if the plan doesn't allow a feature, it's always false regardless of org setting
  const b = (key: string, def: boolean, planAllows: boolean) =>
    planAllows && (map.has(key) ? map.get(key) === 'true' : def)
  const s = (key: string, def: string) =>
    (map.get(key) as string | undefined)?.trim() || def
  return {
    discussions:            b('feature_discussions',      DEFAULT_FEATURE_FLAGS.discussions,            planFeatures.discussions),
    events:                 b('feature_events',           DEFAULT_FEATURE_FLAGS.events,                 planFeatures.events),
    resources:              b('feature_resources',        DEFAULT_FEATURE_FLAGS.resources,              planFeatures.resources),
    memberDirectory:        b('feature_member_directory', DEFAULT_FEATURE_FLAGS.memberDirectory,        planFeatures.memberDirectory),
    requireMemberApproval:  b('require_member_approval',  DEFAULT_FEATURE_FLAGS.requireMemberApproval,  planFeatures.requireMemberApproval),
    allowMemberInvitations: b('allow_member_invitations', DEFAULT_FEATURE_FLAGS.allowMemberInvitations, planFeatures.allowMemberInvitations),
    pages:                  b('feature_pages',            DEFAULT_FEATURE_FLAGS.pages,                  planFeatures.pages),
    discussionsLabel:       s('discussions_label', DEFAULT_FEATURE_FLAGS.discussionsLabel),
    eventsLabel:            s('events_label',      DEFAULT_FEATURE_FLAGS.eventsLabel),
    resourcesLabel:         s('resources_label',   DEFAULT_FEATURE_FLAGS.resourcesLabel),
    pagesLabel:             s('pages_label',       DEFAULT_FEATURE_FLAGS.pagesLabel),
  }
}

export async function setFeatureFlags(flags: Partial<OrgFeatureFlags>, orgIdOverride?: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId(orgIdOverride)
  const keyMap: Record<keyof OrgFeatureFlags, string> = {
    discussions:            'feature_discussions',
    events:                 'feature_events',
    resources:              'feature_resources',
    memberDirectory:        'feature_member_directory',
    requireMemberApproval:  'require_member_approval',
    allowMemberInvitations: 'allow_member_invitations',
    pages:                  'feature_pages',
    discussionsLabel:       'discussions_label',
    eventsLabel:            'events_label',
    resourcesLabel:         'resources_label',
    pagesLabel:             'pages_label',
  }
  const rows = (Object.keys(flags) as (keyof OrgFeatureFlags)[])
    .filter(k => flags[k] !== undefined)
    .map(k => ({ key: keyMap[k], value: String(flags[k]), org_id: orgId, updated_at: new Date().toISOString() }))
  if (rows.length === 0) return
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key,org_id' })
  if (error) throw new Error(`Failed to save feature flags: ${error.message}`)
}

// ─── Org Identity ─────────────────────────────────────────────────────────────

export type OrgIdentity = {
  description: string
  contactEmail: string
  websiteUrl: string
  accentColor: string
  displayName: string
  timezone: string
  clubType: string
  clubSize: string
  bylawsUrl: string
  membershipPolicyUrl: string
  feedbackUrl: string
}

const DEFAULT_IDENTITY: OrgIdentity = {
  description: '',
  contactEmail: '',
  websiteUrl: '',
  accentColor: '#0d1e26',
  displayName: '',
  timezone: 'America/Toronto',
  clubType: '',
  clubSize: '',
  bylawsUrl: '',
  membershipPolicyUrl: '',
  feedbackUrl: '',
}

export async function getOrgIdentity(orgIdOverride?: string): Promise<OrgIdentity> {
  const supabase = await createClient()
  const orgId = await getOrgId(orgIdOverride)
  const keys = ['club_description', 'contact_email', 'website_url', 'accent_color', 'club_display_name', 'timezone', 'club_type', 'club_size', 'bylaws_url', 'membership_policy_url', 'feedback_url']
  const { data: rows } = await supabase.from('settings').select('key, value').in('key', keys).eq('org_id', orgId)
  const map = new Map((rows ?? []).map(r => [r.key, r.value]))
  const s = (key: string, def: string) => map.get(key) ?? def
  return {
    description:         s('club_description',       DEFAULT_IDENTITY.description),
    contactEmail:        s('contact_email',          DEFAULT_IDENTITY.contactEmail),
    websiteUrl:          s('website_url',            DEFAULT_IDENTITY.websiteUrl),
    accentColor:         s('accent_color',           DEFAULT_IDENTITY.accentColor),
    displayName:         s('club_display_name',      DEFAULT_IDENTITY.displayName),
    timezone:            s('timezone',               DEFAULT_IDENTITY.timezone),
    clubType:            s('club_type',              DEFAULT_IDENTITY.clubType),
    clubSize:            s('club_size',              DEFAULT_IDENTITY.clubSize),
    bylawsUrl:           s('bylaws_url',             DEFAULT_IDENTITY.bylawsUrl),
    membershipPolicyUrl: s('membership_policy_url',  DEFAULT_IDENTITY.membershipPolicyUrl),
    feedbackUrl:         s('feedback_url',           DEFAULT_IDENTITY.feedbackUrl),
  }
}

export async function setOrgIdentity(identity: Partial<OrgIdentity>, orgIdOverride?: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId(orgIdOverride)
  const keyMap: Record<keyof OrgIdentity, string> = {
    description:         'club_description',
    contactEmail:        'contact_email',
    websiteUrl:          'website_url',
    accentColor:         'accent_color',
    displayName:         'club_display_name',
    timezone:            'timezone',
    clubType:            'club_type',
    clubSize:            'club_size',
    bylawsUrl:           'bylaws_url',
    membershipPolicyUrl: 'membership_policy_url',
    feedbackUrl:         'feedback_url',
  }
  const rows = (Object.keys(identity) as (keyof OrgIdentity)[])
    .filter(k => identity[k] !== undefined)
    .map(k => ({ key: keyMap[k], value: identity[k] as string, org_id: orgId, updated_at: new Date().toISOString() }))
  if (rows.length === 0) return
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key,org_id' })
  if (error) throw new Error(`Failed to save club identity: ${error.message}`)
}

// ─── Enabled Membership Levels ────────────────────────────────────────────────

export async function getEnabledLevels(): Promise<Record<string, boolean>> {
  const levels = await getMembershipLevels()
  return Object.fromEntries(levels.map(l => [l.key, l.enabled]))
}

export async function setEnabledLevels(enabled: Record<string, boolean>): Promise<void> {
  const levels = await getMembershipLevels()
  await setMembershipLevels(levels.map(l => ({ ...l, enabled: enabled[l.key] ?? l.enabled })))
}

// ─── Signup Fields Config ─────────────────────────────────────────────────────
// Built-in catalog is generic for all orgs; see settings-shared.ts (safe for Client Components).

function mergeSignupFieldsWithDefaults(parsed: SignupField[]): SignupField[] {
  const withoutLegacy = parsed.filter(f => !LEGACY_SIGNUP_FIELD_KEYS.has(f.key))
  const defaultKeys = new Set(DEFAULT_SIGNUP_FIELDS.map(d => d.key))
  const byKey = new Map(withoutLegacy.map(f => [f.key, f]))
  const out: SignupField[] = DEFAULT_SIGNUP_FIELDS.map(d => {
    const o = byKey.get(d.key)
    return o ? { ...d, ...o } : { ...d }
  })
  for (const f of withoutLegacy) {
    if (!defaultKeys.has(f.key)) out.push(f)
  }
  return out
}

export async function getSignupFieldsConfig(orgIdOverride?: string): Promise<SignupField[]> {
  const raw = await getSetting('signup_fields_config', orgIdOverride)
  if (!raw) return DEFAULT_SIGNUP_FIELDS.map(f => ({ ...f }))
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return mergeSignupFieldsWithDefaults(parsed as SignupField[])
  } catch {
    // fall through
  }
  return DEFAULT_SIGNUP_FIELDS.map(f => ({ ...f }))
}

export async function setSignupFieldsConfig(fields: SignupField[], orgIdOverride?: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId(orgIdOverride)
  if (!orgId) throw new Error('No org context for signup fields')
  const sanitized = fields.filter(f => !LEGACY_SIGNUP_FIELD_KEYS.has(f.key))
  const { error } = await supabase.from('settings').upsert(
    {
      key: 'signup_fields_config',
      value: JSON.stringify(sanitized),
      org_id: orgId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key,org_id' },
  )
  if (error) throw new Error(`Failed to save signup fields: ${error.message}`)
}

/** For admin/platform APIs: returns signup fields for this org. */
export async function getSignupFieldsApiPayload(orgIdOverride?: string): Promise<{
  fields: SignupField[]
}> {
  const fields = await getSignupFieldsConfig(orgIdOverride)
  return { fields }
}

export function memberProfileFieldFlagsFromSignupFields(fields: SignupField[]): OrgMemberProfileFieldFlags {
  const enabledKeys = new Set(fields.filter((field) => field.enabled).map((field) => field.key))
  const showPilotLicenseType = enabledKeys.has('pilot_license_type')
  const showAircraftType = enabledKeys.has('aircraft_type')
  const showCallSign = enabledKeys.has('call_sign')
  const showFlightFrequency = enabledKeys.has('fly_frequency')
  const showStudentPilotFields = enabledKeys.has('student_pilot') || showPilotLicenseType
  const showCopaSection = enabledKeys.has('copa_membership')
  const showAviationSection =
    showPilotLicenseType ||
    showAircraftType ||
    showCallSign ||
    showFlightFrequency ||
    showStudentPilotFields

  return {
    showAviationSection,
    showCopaSection,
    showPilotLicenseType,
    showAircraftType,
    showCallSign,
    showFlightFrequency,
    showStudentPilotFields,
  }
}

export async function getOrgMemberProfileFieldFlags(orgIdOverride?: string): Promise<OrgMemberProfileFieldFlags> {
  try {
    const signupFields = await getSignupFieldsConfig(orgIdOverride)
    return memberProfileFieldFlagsFromSignupFields(signupFields)
  } catch {
    return DEFAULT_MEMBER_PROFILE_FIELD_FLAGS
  }
}

// ─── Discussion Categories ────────────────────────────────────────────────────

export type OrgDiscussionCategory = {
  slug: string                        // stored in threads.category
  label: string                       // display name
  emoji: string                       // icon shown in UI
  type: 'discussion' | 'classified'   // classified = for-sale / listing style
  enabled: boolean
}

const DEFAULT_DISCUSSION_CATEGORIES: OrgDiscussionCategory[] = [
  { slug: 'introduce_yourself', label: 'Introduce Yourself', emoji: '👋', type: 'discussion',  enabled: true },
  { slug: 'general_aviation',   label: 'General',            emoji: '🌐', type: 'discussion',  enabled: true },
  { slug: 'other',              label: 'Other',              emoji: '📋', type: 'discussion',  enabled: true },
  { slug: 'gear_for_sale',      label: 'For Sale',           emoji: '🛒', type: 'classified',  enabled: true },
  { slug: 'wanted',             label: 'Wanted',             emoji: '🔍', type: 'classified',  enabled: true },
]

function parseDiscussionCategories(raw: string): OrgDiscussionCategory[] | null {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    for (const c of parsed) {
      if (typeof c.slug !== 'string' || !c.slug) return null
      if (typeof c.label !== 'string') return null
      if (c.type !== 'discussion' && c.type !== 'classified') return null
      if (typeof c.enabled !== 'boolean') return null
    }
    return parsed as OrgDiscussionCategory[]
  } catch {
    return null
  }
}

export async function getDiscussionCategories(orgIdOverride?: string): Promise<OrgDiscussionCategory[]> {
  const raw = await getSetting('discussion_categories_config', orgIdOverride)
  if (raw) {
    const parsed = parseDiscussionCategories(raw)
    if (parsed) return parsed
  }
  return DEFAULT_DISCUSSION_CATEGORIES
}

export async function setDiscussionCategories(categories: OrgDiscussionCategory[], orgIdOverride?: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId(orgIdOverride)
  const { error } = await supabase.from('settings').upsert(
    { key: 'discussion_categories_config', value: JSON.stringify(categories), org_id: orgId, updated_at: new Date().toISOString() },
    { onConflict: 'key,org_id' }
  )
  if (error) throw new Error(`Failed to save discussion categories: ${error.message}`)
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export type EmailTemplates = { subject: string; body: string }

export async function getEmailTemplates(orgIdOverride?: string): Promise<EmailTemplates> {
  const supabase = await createClient()
  const orgId = await getOrgId(orgIdOverride)
  const { data: rows } = await supabase
    .from('settings').select('key, value')
    .in('key', ['welcome_email_subject', 'welcome_email_body'])
    .eq('org_id', orgId)
  const map = new Map((rows ?? []).map(r => [r.key, r.value]))
  return {
    subject: map.get('welcome_email_subject') ?? 'Welcome!',
    body:    map.get('welcome_email_body')    ?? '',
  }
}

export async function setEmailTemplates(templates: Partial<EmailTemplates>, orgIdOverride?: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId(orgIdOverride)
  const rows = []
  if (templates.subject !== undefined)
    rows.push({ key: 'welcome_email_subject', value: templates.subject, org_id: orgId, updated_at: new Date().toISOString() })
  if (templates.body !== undefined)
    rows.push({ key: 'welcome_email_body', value: templates.body, org_id: orgId, updated_at: new Date().toISOString() })
  if (rows.length === 0) return
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key,org_id' })
  if (error) throw new Error(`Failed to save email templates: ${error.message}`)
}

/** Membership expiry when syncing from Stripe — use the subscription period end from Stripe. */
export function getMembershipExpiresAtFromSubscription(
  stripeCurrentPeriodEnd: Date,
  _stripeCurrentPeriodStart: Date
): string {
  return stripeCurrentPeriodEnd.toISOString()
}
