import { createClient } from './supabase/server'
import { headers } from 'next/headers'
import { TIPA_ORG_ID } from '@/types/database'

async function getOrgId(): Promise<string> {
  try {
    const h = await headers()
    return h.get('x-org-id') ?? TIPA_ORG_ID
  } catch {
    return TIPA_ORG_ID
  }
}

const MEMBERSHIP_LEVELS = ['Full', 'Student', 'Associate', 'Corporate', 'Honorary'] as const
export type MembershipLevelKey = (typeof MEMBERSHIP_LEVELS)[number]

const DEFAULT_FEES: Record<MembershipLevelKey, number> = {
  Full: 45,
  Student: 25,
  Associate: 25,
  Corporate: 125,
  Honorary: 0,
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

/** Fee for a specific membership level (CAD). Admin-configurable via settings. */
export async function getMembershipFeeForLevel(level: MembershipLevelKey): Promise<number> {
  const key = `membership_fee_${level.toLowerCase()}`
  const value = await getSetting(key)
  if (value !== null && !Number.isNaN(parseFloat(value))) {
    return parseFloat(value)
  }
  return DEFAULT_FEES[level]
}

/** All membership fees keyed by level. For admin UI and display. */
export async function getAllMembershipFees(): Promise<Record<MembershipLevelKey, number>> {
  const result = { ...DEFAULT_FEES }
  for (const level of MEMBERSHIP_LEVELS) {
    const key = `membership_fee_${level.toLowerCase()}`
    const value = await getSetting(key)
    if (value !== null && !Number.isNaN(parseFloat(value))) {
      result[level] = parseFloat(value)
    }
  }
  return result
}

/** Set fee for one level. Key format: membership_fee_full, etc. */
export async function setMembershipFeeForLevel(
  level: MembershipLevelKey,
  fee: number
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  const key = `membership_fee_${level.toLowerCase()}`
  const { error } = await supabase.from('settings').upsert(
    { key, value: String(fee), org_id: orgId, updated_at: new Date().toISOString() },
    { onConflict: 'key,org_id' }
  )
  if (error) throw new Error(`Failed to save fee for ${level}: ${error.message}`)
}

/** Single global fee (legacy). Returns Full level fee. */
export async function getMembershipFee(): Promise<number> {
  return getMembershipFeeForLevel('Full')
}

/** Trial type per level: none, sept1 (until next Sept 1), or months from sign-up */
export type TrialType = 'none' | 'sept1' | 'months'

export type TrialConfigItem = { type: TrialType; months?: number }

const DEFAULT_TRIAL_CONFIG: Record<MembershipLevelKey, TrialConfigItem> = {
  Full: { type: 'sept1' },
  Associate: { type: 'sept1' },
  Student: { type: 'months', months: 12 },
  Corporate: { type: 'none' },
  Honorary: { type: 'none' },
}

/** Load trial config from settings (admin-editable). Falls back to DEFAULT_TRIAL_CONFIG when keys missing. */
export async function getTrialConfig(): Promise<Record<MembershipLevelKey, TrialConfigItem>> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  const keys = [
    ...MEMBERSHIP_LEVELS.map((l) => `trial_type_${l.toLowerCase()}`),
    ...MEMBERSHIP_LEVELS.map((l) => `trial_months_${l.toLowerCase()}`),
  ]
  const { data: rows } = await supabase.from('settings').select('key, value').in('key', keys).eq('org_id', orgId)
  const map = new Map<string, string>()
  for (const r of rows ?? []) {
    map.set(r.key, r.value)
  }
  const result = { ...DEFAULT_TRIAL_CONFIG } as Record<MembershipLevelKey, TrialConfigItem>
  for (const level of MEMBERSHIP_LEVELS) {
    const typeKey = `trial_type_${level.toLowerCase()}`
    const typeVal = map.get(typeKey)
    if (typeVal === 'none' || typeVal === 'sept1' || typeVal === 'months') {
      result[level] = { type: typeVal }
      if (typeVal === 'months') {
        const monthsKey = `trial_months_${level.toLowerCase()}`
        const m = map.get(monthsKey)
        const n = m != null ? parseInt(m, 10) : NaN
        result[level] = { type: 'months', months: Number.isNaN(n) || n < 1 ? 12 : n }
      }
    }
  }
  return result
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

/** Save trial config for one level. Used by admin settings. */
export async function setTrialConfigForLevel(
  level: MembershipLevelKey,
  item: TrialConfigItem
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  const typeKey = `trial_type_${level.toLowerCase()}`
  await supabase.from('settings').upsert(
    { key: typeKey, value: item.type, org_id: orgId, updated_at: new Date().toISOString() },
    { onConflict: 'key,org_id' }
  )
  if (item.type === 'months') {
    const monthsKey = `trial_months_${level.toLowerCase()}`
    await supabase.from('settings').upsert(
      { key: monthsKey, value: String(item.months ?? 12), org_id: orgId, updated_at: new Date().toISOString() },
      { onConflict: 'key,org_id' }
    )
  }
}

/**
 * Trial end date for a membership level (sync, default config only).
 * Use getTrialEndDateAsync on the server when admin-editable config is required.
 */
export function getTrialEndDate(
  level: MembershipLevelKey,
  profileCreatedAt: string | null
): Date | null {
  return computeTrialEndFromConfig(DEFAULT_TRIAL_CONFIG[level], profileCreatedAt)
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
  const { data: rows } = await supabase.from('settings').select('key, value').in('key', keys).eq('org_id', orgId)
  const map = new Map((rows ?? []).map(r => [r.key, r.value]))
  const b = (key: string, def: boolean) => map.has(key) ? map.get(key) === 'true' : def
  return {
    discussions:           b('feature_discussions',      DEFAULT_FEATURE_FLAGS.discussions),
    events:                b('feature_events',           DEFAULT_FEATURE_FLAGS.events),
    resources:             b('feature_resources',        DEFAULT_FEATURE_FLAGS.resources),
    memberDirectory:       b('feature_member_directory', DEFAULT_FEATURE_FLAGS.memberDirectory),
    requireMemberApproval: b('require_member_approval',  DEFAULT_FEATURE_FLAGS.requireMemberApproval),
    allowMemberInvitations:b('allow_member_invitations', DEFAULT_FEATURE_FLAGS.allowMemberInvitations),
  }
}

export async function setFeatureFlags(flags: Partial<OrgFeatureFlags>): Promise<void> {
  const supabase = await createClient()
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
  const supabase = await createClient()
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

export async function getEnabledLevels(): Promise<Record<MembershipLevelKey, boolean>> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  const keys = MEMBERSHIP_LEVELS.map(l => `level_${l.toLowerCase()}_enabled`)
  const { data: rows } = await supabase.from('settings').select('key, value').in('key', keys).eq('org_id', orgId)
  const map = new Map((rows ?? []).map(r => [r.key, r.value]))
  return Object.fromEntries(
    MEMBERSHIP_LEVELS.map(l => [l, map.get(`level_${l.toLowerCase()}_enabled`) !== 'false'])
  ) as Record<MembershipLevelKey, boolean>
}

export async function setEnabledLevels(levels: Record<MembershipLevelKey, boolean>): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  const rows = MEMBERSHIP_LEVELS.map(l => ({
    key: `level_${l.toLowerCase()}_enabled`,
    value: String(levels[l] ?? true),
    org_id: orgId,
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key,org_id' })
  if (error) throw new Error(`Failed to save enabled levels: ${error.message}`)
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
  const supabase = await createClient()
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
  const supabase = await createClient()
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

