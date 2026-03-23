import { createClient, createServiceRoleClient } from './supabase/server'
import { headers } from 'next/headers'
import { TIPA_ORG_ID } from '@/types/database'
import { getPlanDef, DEFAULT_PLAN } from './plans'

async function getOrgId(): Promise<string> {
  try {
    const h = await headers()
    return h.get('x-org-id') ?? TIPA_ORG_ID
  } catch {
    return TIPA_ORG_ID
  }
}

// Legacy hardcoded levels — used as fallback for TIPA and type compat
const MEMBERSHIP_LEVELS = ['Full', 'Student', 'Associate', 'Corporate', 'Honorary'] as const
export type MembershipLevelKey = string  // now open — orgs can define any level key

const DEFAULT_FEES: Record<string, number> = {
  Full: 45, Student: 25, Associate: 25, Corporate: 125, Honorary: 0,
}

// ─── Configurable Membership Levels ──────────────────────────────────────────

export type OrgMembershipLevel = {
  key: string           // url-safe lowercase, e.g. "full", "gold", "junior"
  label: string         // display name shown to members
  fee: number           // annual fee (org's currency)
  trialType: TrialType
  trialMonths?: number  // only when trialType === 'months'
  enabled: boolean
}

const DEFAULT_MEMBERSHIP_LEVELS: OrgMembershipLevel[] = [
  { key: 'full',      label: 'Full Member', fee: 45,  trialType: 'sept1',  enabled: true },
  { key: 'student',   label: 'Student',     fee: 25,  trialType: 'months', trialMonths: 12, enabled: true },
  { key: 'associate', label: 'Associate',   fee: 25,  trialType: 'sept1',  enabled: true },
  { key: 'corporate', label: 'Corporate',   fee: 125, trialType: 'none',   enabled: true },
  { key: 'honorary',  label: 'Honorary',    fee: 0,   trialType: 'none',   enabled: true },
]

export async function getMembershipLevels(): Promise<OrgMembershipLevel[]> {
  const raw = await getSetting('membership_levels_config')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as OrgMembershipLevel[]
    } catch { /* fall through */ }
  }
  return DEFAULT_MEMBERSHIP_LEVELS
}

export async function setMembershipLevels(levels: OrgMembershipLevel[]): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId()
  const { error } = await supabase.from('settings').upsert(
    { key: 'membership_levels_config', value: JSON.stringify(levels), org_id: orgId, updated_at: new Date().toISOString() },
    { onConflict: 'key,org_id' }
  )
  if (error) throw new Error(`Failed to save membership levels: ${error.message}`)
}

export async function getSetting(key: string): Promise<string | null> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error || !data) return null
  return data.value
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

/** Trial type per level: none, sept1 (until next Sept 1), or months from sign-up */
export type TrialType = 'none' | 'sept1' | 'months'

export type TrialConfigItem = { type: TrialType; months?: number }

/** Load trial config keyed by level key. Reads from levels config (single source of truth). */
export async function getTrialConfig(): Promise<Record<string, TrialConfigItem>> {
  const levels = await getMembershipLevels()
  return Object.fromEntries(
    levels.map(l => [l.key, l.trialType === 'months'
      ? { type: 'months' as const, months: l.trialMonths ?? 12 }
      : { type: l.trialType }
    ])
  )
}

/** Compute trial end date from config. Returns null if no trial or missing created_at when type is months. */
function computeTrialEndFromConfig(
  config: TrialConfigItem,
  profileCreatedAt: string | null
): Date | null {
  if (config.type === 'none') return null
  const now = new Date()
  if (config.type === 'sept1') {
    const year = now.getFullYear()
    const sep1 = new Date(year, 8, 1)
    return now < sep1 ? sep1 : new Date(year + 1, 8, 1)
  }
  if (config.type === 'months' && profileCreatedAt) {
    const created = new Date(profileCreatedAt)
    const end = new Date(created)
    end.setMonth(end.getMonth() + (config.months ?? 12))
    return end
  }
  return null
}

/** Trial end date for a membership level (reads admin config from DB). Use this on the server. */
export async function getTrialEndDateAsync(
  level: MembershipLevelKey,
  profileCreatedAt: string | null
): Promise<Date | null> {
  const config = await getTrialConfig()
  return computeTrialEndFromConfig(config[level], profileCreatedAt)
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

/**
 * Trial end date for a membership level (sync, default config only).
 * Use getTrialEndDateAsync on the server when admin-editable config is required.
 */
export function getTrialEndDate(
  level: string,
  profileCreatedAt: string | null
): Date | null {
  const found = DEFAULT_MEMBERSHIP_LEVELS.find(l => l.key.toLowerCase() === level.toLowerCase())
  const config: TrialConfigItem = found
    ? { type: found.trialType, months: found.trialMonths }
    : { type: 'none' }
  return computeTrialEndFromConfig(config, profileCreatedAt)
}

// ─── Org Plan ────────────────────────────────────────────────────────────────

/** Returns the plan key for the current org. Falls back to DEFAULT_PLAN on error. */
export async function getOrgPlan(): Promise<string> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()
    const { data } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', orgId)
      .maybeSingle()
    return (data?.plan as string) || DEFAULT_PLAN
  } catch {
    return DEFAULT_PLAN
  }
}

// ─── Org Feature Flags ───────────────────────────────────────────────────────

export type OrgFeatureFlags = {
  discussions: boolean
  events: boolean
  resources: boolean
  memberDirectory: boolean
  requireMemberApproval: boolean
  allowMemberInvitations: boolean
}

const DEFAULT_FEATURE_FLAGS: OrgFeatureFlags = {
  discussions: true,
  events: true,
  resources: true,
  memberDirectory: true,
  requireMemberApproval: true,
  allowMemberInvitations: true,
}

export async function getFeatureFlags(): Promise<OrgFeatureFlags> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  const keys = [
    'feature_discussions', 'feature_events', 'feature_resources',
    'feature_member_directory', 'require_member_approval', 'allow_member_invitations',
  ]
  const [{ data: rows }, plan] = await Promise.all([
    supabase.from('settings').select('key, value').in('key', keys).eq('org_id', orgId),
    getOrgPlan(),
  ])
  const planFeatures = getPlanDef(plan).features
  const map = new Map((rows ?? []).map(r => [r.key, r.value]))
  // Plan ceiling: if the plan doesn't allow a feature, it's always false regardless of org setting
  const b = (key: string, def: boolean, planAllows: boolean) =>
    planAllows && (map.has(key) ? map.get(key) === 'true' : def)
  return {
    discussions:            b('feature_discussions',      DEFAULT_FEATURE_FLAGS.discussions,            planFeatures.discussions),
    events:                 b('feature_events',           DEFAULT_FEATURE_FLAGS.events,                 planFeatures.events),
    resources:              b('feature_resources',        DEFAULT_FEATURE_FLAGS.resources,              planFeatures.resources),
    memberDirectory:        b('feature_member_directory', DEFAULT_FEATURE_FLAGS.memberDirectory,        planFeatures.memberDirectory),
    requireMemberApproval:  b('require_member_approval',  DEFAULT_FEATURE_FLAGS.requireMemberApproval,  planFeatures.requireMemberApproval),
    allowMemberInvitations: b('allow_member_invitations', DEFAULT_FEATURE_FLAGS.allowMemberInvitations, planFeatures.allowMemberInvitations),
  }
}

export async function setFeatureFlags(flags: Partial<OrgFeatureFlags>): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId()
  const keyMap: Record<keyof OrgFeatureFlags, string> = {
    discussions:            'feature_discussions',
    events:                 'feature_events',
    resources:              'feature_resources',
    memberDirectory:        'feature_member_directory',
    requireMemberApproval:  'require_member_approval',
    allowMemberInvitations: 'allow_member_invitations',
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
}

const DEFAULT_IDENTITY: OrgIdentity = {
  description: '',
  contactEmail: '',
  websiteUrl: '',
  accentColor: '#0d1e26',
  displayName: '',
  timezone: 'America/Toronto',
}

export async function getOrgIdentity(): Promise<OrgIdentity> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  const keys = ['club_description', 'contact_email', 'website_url', 'accent_color', 'club_display_name', 'timezone']
  const { data: rows } = await supabase.from('settings').select('key, value').in('key', keys).eq('org_id', orgId)
  const map = new Map((rows ?? []).map(r => [r.key, r.value]))
  const s = (key: string, def: string) => map.get(key) ?? def
  return {
    description:  s('club_description',  DEFAULT_IDENTITY.description),
    contactEmail: s('contact_email',     DEFAULT_IDENTITY.contactEmail),
    websiteUrl:   s('website_url',       DEFAULT_IDENTITY.websiteUrl),
    accentColor:  s('accent_color',      DEFAULT_IDENTITY.accentColor),
    displayName:  s('club_display_name', DEFAULT_IDENTITY.displayName),
    timezone:     s('timezone',          DEFAULT_IDENTITY.timezone),
  }
}

export async function setOrgIdentity(identity: Partial<OrgIdentity>): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId()
  const keyMap: Record<keyof OrgIdentity, string> = {
    description:  'club_description',
    contactEmail: 'contact_email',
    websiteUrl:   'website_url',
    accentColor:  'accent_color',
    displayName:  'club_display_name',
    timezone:     'timezone',
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

export type SignupField = {
  key: string
  label: string
  group: string
  enabled: boolean
  required: boolean
}

const DEFAULT_SIGNUP_FIELDS: SignupField[] = [
  { key: 'phone',                label: 'Phone',                    group: 'contact',     enabled: true,  required: false },
  { key: 'address',              label: 'Mailing Address',          group: 'address',     enabled: true,  required: false },
  { key: 'membership_class',     label: 'Membership Class',         group: 'membership',  enabled: true,  required: true  },
  { key: 'aviation_info',        label: 'Aviation Information',     group: 'aviation',    enabled: true,  required: false },
  { key: 'fly_frequency',        label: 'How Often Fly From YTZ',   group: 'aviation',    enabled: false, required: false },
  { key: 'student_pilot',        label: 'Student Pilot Info',       group: 'student',     enabled: true,  required: false },
  { key: 'copa_membership',      label: 'COPA Membership',          group: 'copa',        enabled: false, required: false },
  { key: 'statement_of_interest',label: 'Statement of Interest',    group: 'application', enabled: true,  required: false },
  { key: 'interests',            label: 'Interests',                group: 'application', enabled: true,  required: false },
  { key: 'how_did_you_hear',     label: 'How Did You Hear',         group: 'application', enabled: true,  required: false },
]

export async function getSignupFieldsConfig(): Promise<SignupField[]> {
  const raw = await getSetting('signup_fields_config')
  if (!raw) return DEFAULT_SIGNUP_FIELDS
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as SignupField[]
  } catch { /* fall through */ }
  return DEFAULT_SIGNUP_FIELDS
}

export async function setSignupFieldsConfig(fields: SignupField[]): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId()
  const { error } = await supabase.from('settings').upsert(
    { key: 'signup_fields_config', value: JSON.stringify(fields), org_id: orgId, updated_at: new Date().toISOString() },
    { onConflict: 'key,org_id' }
  )
  if (error) throw new Error(`Failed to save signup fields: ${error.message}`)
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export type EmailTemplates = { subject: string; body: string }

export async function getEmailTemplates(): Promise<EmailTemplates> {
  const supabase = await createClient()
  const orgId = await getOrgId()
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

export async function setEmailTemplates(templates: Partial<EmailTemplates>): Promise<void> {
  const supabase = createServiceRoleClient()
  const orgId = await getOrgId()
  const rows = []
  if (templates.subject !== undefined)
    rows.push({ key: 'welcome_email_subject', value: templates.subject, org_id: orgId, updated_at: new Date().toISOString() })
  if (templates.body !== undefined)
    rows.push({ key: 'welcome_email_body', value: templates.body, org_id: orgId, updated_at: new Date().toISOString() })
  if (rows.length === 0) return
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key,org_id' })
  if (error) throw new Error(`Failed to save email templates: ${error.message}`)
}

/**
 * Membership expiry when syncing from Stripe.
 * If the subscription started before Sept 1st (trial period), extend to Sept 1st next year
 * so the member gets trial remainder + full year. Otherwise use Stripe's current_period_end.
 */
export function getMembershipExpiresAtFromSubscription(
  stripeCurrentPeriodEnd: Date,
  stripeCurrentPeriodStart: Date
): string {
  const year = stripeCurrentPeriodStart.getFullYear()
  const sep1ThisYear = new Date(year, 8, 1) // Sept 1
  if (stripeCurrentPeriodStart < sep1ThisYear) {
    return new Date(year + 1, 8, 1).toISOString() // Sept 1 next year
  }
  return stripeCurrentPeriodEnd.toISOString()
}

