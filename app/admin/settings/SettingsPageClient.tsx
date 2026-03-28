'use client'

import { useEffect, useState, useCallback } from 'react'
import type { OrgFeatureFlags, OrgIdentity, OrgMembershipLevel } from '@/lib/settings'
import type { SignupField, SignupFieldType } from '@/lib/settings-shared'
import { signupFieldIsTipaOnlyBuiltIn } from '@/lib/settings-shared'
import { CnameRecord } from '@/components/platform/CnameRecord'
import { orgStripeDuesUiStatus } from '@/lib/org-stripe-dues-status'

// ─── Types ────────────────────────────────────────────────────────────────────

type TrialType = 'none' | 'months'

const TABS = ['Club', 'Features', 'Membership', 'Signup', 'Emails', 'Integrations'] as const
type Tab = typeof TABS[number]

// ─── Shared helpers ───────────────────────────────────────────────────────────

function inputCls() {
  return 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]'
}

function SaveButton({ saving, label = 'Save changes' }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="px-4 py-2 bg-[#0d1e26] text-white text-sm font-medium rounded-md hover:bg-[#0a171c] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {saving ? 'Saving…' : label}
    </button>
  )
}

function Feedback({ error, success, successMsg = 'Saved.' }: { error: string | null; success: boolean; successMsg?: string }) {
  return (
    <>
      {error   && <div className="rounded-md bg-red-50   p-3 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{successMsg}</div>}
    </>
  )
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
  )
}

// ─── Club Identity Tab ────────────────────────────────────────────────────────

function ClubTab() {
  const [draft, setDraft] = useState<OrgIdentity>({
    description: '', contactEmail: '', websiteUrl: '', accentColor: '#0d1e26', displayName: '', timezone: 'America/Toronto',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings/club')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setDraft(d.identity))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch('/api/admin/settings/club', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      setDraft((await res.json()).identity)
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  const set = (k: keyof OrgIdentity) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft(p => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <SectionHeader title="Club identity" description="Displayed throughout the member portal." />
      <Feedback error={error} success={success} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Display name <span className="text-gray-400 font-normal">(short name shown in UI)</span></label>
        <input className={inputCls()} placeholder="e.g. TIPA" value={draft.displayName} onChange={set('displayName')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Club description</label>
        <textarea className={inputCls()} rows={3} placeholder="One-line description for the welcome page" value={draft.description} onChange={set('description')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
        <input type="email" className={inputCls()} placeholder="info@yourclub.com" value={draft.contactEmail} onChange={set('contactEmail')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
        <input type="url" className={inputCls()} placeholder="https://yourclub.com" value={draft.websiteUrl} onChange={set('websiteUrl')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Accent colour</label>
        <div className="flex items-center gap-3">
          <input type="color" className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5" value={draft.accentColor} onChange={set('accentColor')} />
          <input className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]" value={draft.accentColor} onChange={set('accentColor')} placeholder="#0d1e26" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
        <input className={inputCls()} placeholder="America/Toronto" value={draft.timezone} onChange={set('timezone')} />
        <p className="text-xs text-gray-400 mt-1">Used for event display. IANA format, e.g. America/Vancouver</p>
      </div>

      <SaveButton saving={saving} />
    </form>
  )
}

// ─── Features Tab ─────────────────────────────────────────────────────────────

type PlanFeaturesSubset = Partial<Record<keyof OrgFeatureFlags, boolean>>

type FeatureMeta = { key: keyof OrgFeatureFlags; label: string; description: string; labelKey?: keyof OrgFeatureFlags; labelPlaceholder?: string }

const FEATURE_META: FeatureMeta[] = [
  { key: 'discussions',            label: 'Discussions',       description: 'Forum-style discussion board for members.',       labelKey: 'discussionsLabel', labelPlaceholder: 'Discussions' },
  { key: 'events',                 label: 'Events',            description: 'Event calendar with RSVP.',                       labelKey: 'eventsLabel',      labelPlaceholder: 'Events' },
  { key: 'resources',              label: 'Announcements',     description: 'Document library and announcements.',              labelKey: 'resourcesLabel',   labelPlaceholder: 'Announcements' },
  { key: 'memberDirectory',        label: 'Member directory',  description: 'Approved members can browse the member list.' },
  { key: 'requireMemberApproval',  label: 'Require admin approval', description: 'New signups must be approved before accessing the portal.' },
  { key: 'allowMemberInvitations', label: 'Member invitations',     description: 'Approved members can invite new members.' },
]

const PLAN_ORDER = ['hobby', 'starter', 'community', 'club_pro']
const PLAN_LABELS: Record<string, string> = {
  hobby: 'Hobby', starter: 'Starter', community: 'Community', club_pro: 'Club Pro',
}

function FeaturesTab() {
  const [draft, setDraft] = useState<OrgFeatureFlags>({
    discussions: true, events: true, resources: true, memberDirectory: true,
    requireMemberApproval: true, allowMemberInvitations: true,
    discussionsLabel: 'Discussions', eventsLabel: 'Events', resourcesLabel: 'Announcements',
  })
  const [planKey, setPlanKey] = useState<string>('hobby')
  const [planLabel, setPlanLabel] = useState<string>('Hobby')
  const [planFeatures, setPlanFeatures] = useState<PlanFeaturesSubset | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings/features')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setDraft(d.features)
        if (d.plan) setPlanKey(d.plan)
        if (d.planLabel) setPlanLabel(d.planLabel)
        if (d.planFeatures) setPlanFeatures(d.planFeatures)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch('/api/admin/settings/features', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      const data = await res.json()
      setDraft(data.features)
      setSuccess(true)
      setTimeout(() => window.location.reload(), 500)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  // Find the lowest plan that unlocks a given feature
  const requiredPlanLabel = (key: keyof OrgFeatureFlags): string | null => {
    if (!planFeatures) return null
    if (planFeatures[key]) return null  // already unlocked
    const idx = PLAN_ORDER.indexOf(planKey)
    for (let i = idx + 1; i < PLAN_ORDER.length; i++) {
      return PLAN_LABELS[PLAN_ORDER[i]] ?? 'a higher plan'
    }
    return 'a higher plan'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <SectionHeader title="Feature toggles" description="Enable or disable sections of the member portal." />
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 shrink-0 ml-4">
          {planLabel} plan
        </span>
      </div>
      <Feedback error={error} success={success} />

      <div className="space-y-3">
        {FEATURE_META.map(({ key, label, description, labelKey, labelPlaceholder }) => {
          const blocked = planFeatures ? !planFeatures[key as keyof typeof planFeatures] : false
          const upgradeTo = requiredPlanLabel(key as keyof OrgFeatureFlags)
          return (
            <div
              key={key}
              className={`py-3 border-b border-gray-100 last:border-0 ${blocked ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0d1e26] focus:ring-[#0d1e26] disabled:cursor-not-allowed"
                  checked={blocked ? false : (draft[key] as boolean)}
                  disabled={blocked}
                  onChange={e => !blocked && setDraft(p => ({ ...p, [key]: e.target.checked }))}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                    {blocked && upgradeTo && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
                        {upgradeTo}+
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{description}</div>
                </div>
              </div>
              {labelKey && !blocked && (draft[key] as boolean) && (
                <div className="mt-2 ml-7">
                  <input
                    type="text"
                    value={draft[labelKey] as string}
                    onChange={e => setDraft(p => ({ ...p, [labelKey]: e.target.value }))}
                    placeholder={labelPlaceholder}
                    maxLength={40}
                    className="w-48 rounded-md border border-gray-300 px-2.5 py-1 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]"
                  />
                  <p className="mt-0.5 text-xs text-gray-400">Nav label shown to members</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <SaveButton saving={saving} />
    </form>
  )
}

// ─── Membership Tab ───────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function MembershipTab() {
  const [levels, setLevels] = useState<OrgMembershipLevel[]>([])
  const [memberTrialsEnabled, setMemberTrialsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings/membership-levels')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (d.levels) setLevels(d.levels)
        setMemberTrialsEnabled(!!d.memberTrialsEnabled)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const updateLevel = (idx: number, patch: Partial<OrgMembershipLevel>) =>
    setLevels(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))

  const addLevel = () =>
    setLevels(prev => [...prev, { key: '', label: '', fee: 0, trialType: 'none', enabled: true }])

  const deleteLevel = (idx: number) =>
    setLevels(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null); setSuccess(false)
    try {
      // Auto-generate key from label if blank
      const payload = levels.map(l => {
        const base = {
          ...l,
          key: l.key || slugify(l.label) || `level-${Math.random().toString(36).slice(2, 6)}`,
        }
        if (!memberTrialsEnabled) {
          return { ...base, trialType: 'none' as const, trialMonths: undefined }
        }
        return base
      })
      const res = await fetch('/api/admin/settings/membership-levels', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      setLevels((await res.json()).levels)
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex py-12 justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d1e26]" /></div>

  return (
    <form onSubmit={handleSave} className="space-y-5 max-w-2xl">
      <SectionHeader
        title="Membership levels"
        description={
          memberTrialsEnabled
            ? 'Define all membership tiers, fees, and trial periods.'
            : 'Define all membership tiers and annual fees.'
        }
      />
      <Feedback error={error} success={success} />

      {!memberTrialsEnabled && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-950">
          <strong>Club Pro:</strong> Member trial periods (months from sign-up, Stripe checkout trial) require the{' '}
          <strong>Club Pro</strong> plan. Upgrade in the ClubLounge platform under{' '}
          <strong>Billing &amp; plan</strong> for this organization.
        </div>
      )}

      <div className="space-y-3">
        {levels.map((level, idx) => (
          <div key={idx} className="rounded-md border border-gray-200 p-4 space-y-3">
            <div className="flex items-start gap-3">
              {/* Label */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                <input
                  className={inputCls()}
                  placeholder="e.g. Full Member"
                  value={level.label}
                  onChange={e => {
                    const label = e.target.value
                    updateLevel(idx, {
                      label,
                      key: level.key || slugify(label),
                    })
                  }}
                />
              </div>
              {/* Fee */}
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">Fee ($ / yr)</label>
                <input
                  type="number" min={0} step={1}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]"
                  value={level.fee}
                  onChange={e => { const n = parseFloat(e.target.value); updateLevel(idx, { fee: isNaN(n) ? 0 : n }) }}
                />
              </div>
              {/* Delete */}
              <div className="pt-5">
                <button
                  type="button"
                  disabled={levels.length <= 1}
                  onClick={() => deleteLevel(idx)}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none px-1"
                  title="Delete level"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {memberTrialsEnabled ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Trial</label>
                    <select
                      value={level.trialType}
                      onChange={e => {
                        const t = e.target.value as TrialType
                        updateLevel(idx, {
                          trialType: t,
                          trialMonths: t === 'months' ? (level.trialMonths ?? 12) : undefined,
                        })
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]"
                    >
                      <option value="none">No trial</option>
                      <option value="months">Months from sign-up</option>
                    </select>
                  </div>
                  {level.trialType === 'months' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Months</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={1} max={60}
                          value={level.trialMonths ?? 12}
                          onChange={e => { const n = parseInt(e.target.value, 10); updateLevel(idx, { trialMonths: isNaN(n) || n < 1 ? 12 : n }) }}
                          className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]"
                        />
                        <span className="text-sm text-gray-500">months</span>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
              {/* Enabled */}
              <div className={`ml-auto flex items-center gap-2 ${memberTrialsEnabled ? 'pt-4' : ''}`}>
                <label className="text-sm font-medium text-gray-700 cursor-pointer select-none" htmlFor={`enabled-${idx}`}>
                  Enabled
                </label>
                <input
                  id={`enabled-${idx}`}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#0d1e26] focus:ring-[#0d1e26]"
                  checked={level.enabled}
                  onChange={e => updateLevel(idx, { enabled: e.target.checked })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addLevel}
        className="text-sm text-[#0d1e26] font-medium hover:underline"
      >
        + Add level
      </button>

      <div>
        <SaveButton saving={saving} label="Save levels" />
      </div>
    </form>
  )
}

// ─── Signup Fields Tab ────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<SignupFieldType, string> = {
  text: 'Text', textarea: 'Long text', select: 'Dropdown',
  checkbox_group: 'Checkboxes', boolean: 'Yes / No',
  number: 'Number', date: 'Date', email: 'Email', phone: 'Phone', url: 'URL',
}
const HAS_OPTIONS: SignupFieldType[] = ['select', 'checkbox_group']
const HAS_PLACEHOLDER: SignupFieldType[] = ['text', 'textarea', 'number', 'email', 'phone', 'url']

type CustomFieldDraft = {
  key: string; label: string; type: SignupFieldType
  placeholder: string; helpText: string; optionsRaw: string; required: boolean
}

const blankDraft = (): CustomFieldDraft => ({
  key: '', label: '', type: 'text', placeholder: '', helpText: '', optionsRaw: '', required: false,
})

function slugKey(label: string) {
  return 'custom_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function draftToField(d: CustomFieldDraft): SignupField {
  return {
    key: d.key || slugKey(d.label) || `custom_${Date.now()}`,
    label: d.label,
    isCustom: true,
    type: d.type,
    placeholder: d.placeholder || undefined,
    helpText: d.helpText || undefined,
    options: HAS_OPTIONS.includes(d.type)
      ? d.optionsRaw.split('\n').map(s => s.trim()).filter(Boolean)
      : undefined,
    enabled: true,
    required: d.required,
  }
}

function fieldToDraft(f: SignupField): CustomFieldDraft {
  return {
    key: f.key,
    label: f.label,
    type: f.type ?? 'text',
    placeholder: f.placeholder ?? '',
    helpText: f.helpText ?? '',
    optionsRaw: f.options?.join('\n') ?? '',
    required: f.required,
  }
}

function CustomFieldEditor({
  draft, onChange, onSave, onCancel,
}: {
  draft: CustomFieldDraft
  onChange: (patch: Partial<CustomFieldDraft>) => void
  onSave: () => void
  onCancel: () => void
}) {
  const ic = 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]'
  return (
    <div className="rounded-md border border-[#0d1e26]/20 bg-gray-50 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Label <span className="text-red-500">*</span></label>
          <input className={ic} placeholder="e.g. Emergency Contact" value={draft.label}
            onChange={e => onChange({ label: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Field type</label>
          <select className={ic} value={draft.type}
            onChange={e => onChange({ type: e.target.value as SignupFieldType })}>
            {(Object.keys(FIELD_TYPE_LABELS) as SignupFieldType[]).map(t => (
              <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>
      {HAS_PLACEHOLDER.includes(draft.type) && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder text</label>
          <input className={ic} placeholder="Shown inside the field" value={draft.placeholder}
            onChange={e => onChange({ placeholder: e.target.value })} />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Help text</label>
        <input className={ic} placeholder="Optional hint below the field" value={draft.helpText}
          onChange={e => onChange({ helpText: e.target.value })} />
      </div>
      {HAS_OPTIONS.includes(draft.type) && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Options <span className="text-gray-400 font-normal">(one per line)</span></label>
          <textarea className={ic} rows={4} placeholder={"Option A\nOption B\nOption C"} value={draft.optionsRaw}
            onChange={e => onChange({ optionsRaw: e.target.value })} />
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#0d1e26] focus:ring-[#0d1e26]"
          checked={draft.required} onChange={e => onChange({ required: e.target.checked })} />
        <span className="text-sm text-gray-700">Required</span>
      </label>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onSave}
          className="px-3 py-1.5 bg-[#0d1e26] text-white text-sm rounded-md hover:bg-[#0a171c]">
          Save field
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 border border-gray-300 text-sm rounded-md hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  )
}

function SignupTab() {
  const [fields, setFields] = useState<SignupField[]>([])
  const [isTipaOrg, setIsTipaOrg] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<CustomFieldDraft>(blankDraft())
  const [addingNew, setAddingNew] = useState(false)
  const [newDraft, setNewDraft] = useState<CustomFieldDraft>(blankDraft())

  useEffect(() => {
    fetch('/api/admin/settings/signup-fields')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setFields(d.fields)
        setIsTipaOrg(typeof d.isTipaOrg === 'boolean' ? d.isTipaOrg : null)
      })
      .catch(() => {})
  }, [])

  const systemFields = fields.filter(f => !f.isCustom)
  const builtInRows = systemFields.filter(
    f => isTipaOrg === true || !signupFieldIsTipaOnlyBuiltIn(f.key)
  )
  const customFields = fields.filter(f => f.isCustom)

  const toggle = (key: string, prop: 'enabled' | 'required') =>
    setFields(p => p.map(f => f.key === key ? { ...f, [prop]: !f[prop] } : f))

  const saveCustom = async () => {
    setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch('/api/admin/settings/signup-fields', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed')
      setFields((data as { fields: SignupField[] }).fields)
      const tipa = (data as { isTipaOrg?: boolean }).isTipaOrg
      if (typeof tipa === 'boolean') setIsTipaOrg(tipa)
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); await saveCustom() }

  // Custom field actions
  const startEdit = (f: SignupField) => { setEditingKey(f.key); setEditDraft(fieldToDraft(f)) }
  const commitEdit = () => {
    if (!editDraft.label.trim()) return
    setFields(p => p.map(f => f.key === editingKey ? { ...draftToField(editDraft), key: editingKey! } : f))
    setEditingKey(null)
  }
  const addField = () => {
    if (!newDraft.label.trim()) return
    const newF = draftToField(newDraft)
    // Ensure key uniqueness
    const exists = fields.some(f => f.key === newF.key)
    const finalF = exists ? { ...newF, key: `${newF.key}_${Date.now()}` } : newF
    setFields(p => [...p, finalF])
    setAddingNew(false); setNewDraft(blankDraft())
  }
  const deleteCustom = (key: string) => setFields(p => p.filter(f => f.key !== key))
  const moveCustom = (key: string, dir: -1 | 1) => {
    const customs = fields.filter(f => f.isCustom)
    const idx = customs.findIndex(f => f.key === key)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= customs.length) return
    ;[customs[idx], customs[newIdx]] = [customs[newIdx], customs[idx]]
    setFields([...systemFields, ...customs])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-xl">
      <Feedback error={error} success={success} />

      {/* System fields */}
      <div className="space-y-3">
        <SectionHeader
          title="Built-in sections"
          description={
            isTipaOrg === true
              ? 'Show or hide the preset sections on the signup form.'
              : 'Standard sections for every club. Aviation and TIPA-specific options are hidden — use custom fields for your org.'
          }
        />
        <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
          <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Section</span>
            <span className="text-center">Show</span>
            <span className="text-center">Required</span>
          </div>
          {builtInRows.map(f => (
            <div key={f.key} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-4 py-3">
              <span className="text-sm text-gray-900">{f.label}</span>
              <div className="flex justify-center">
                <input type="checkbox" checked={f.enabled}
                  onChange={() => toggle(f.key, 'enabled')}
                  className="h-4 w-4 rounded border-gray-300 text-[#0d1e26] focus:ring-[#0d1e26]" />
              </div>
              <div className="flex justify-center">
                <input type="checkbox" checked={f.required} disabled={!f.enabled}
                  onChange={() => toggle(f.key, 'required')}
                  className="h-4 w-4 rounded border-gray-300 text-[#0d1e26] focus:ring-[#0d1e26] disabled:opacity-40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom fields */}
      <div className="space-y-3">
        <SectionHeader title="Custom fields" description="Add your own fields to collect any additional info from applicants." />

        {customFields.length > 0 && (
          <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
            {customFields.map((f, i) => (
              <div key={f.key}>
                {editingKey === f.key ? (
                  <div className="p-3">
                    <CustomFieldEditor
                      draft={editDraft}
                      onChange={p => setEditDraft(d => ({ ...d, ...p }))}
                      onSave={commitEdit}
                      onCancel={() => setEditingKey(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button type="button" onClick={() => moveCustom(f.key, -1)} disabled={i === 0}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
                      <button type="button" onClick={() => moveCustom(f.key, 1)} disabled={i === customFields.length - 1}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{f.label}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                          {FIELD_TYPE_LABELS[f.type ?? 'text']}
                        </span>
                        {f.required && <span className="text-xs text-red-500 shrink-0">required</span>}
                      </div>
                      {f.helpText && <div className="text-xs text-gray-400 truncate mt-0.5">{f.helpText}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300 text-[#0d1e26]"
                          checked={f.enabled} onChange={() => toggle(f.key, 'enabled')} />
                        Show
                      </label>
                      <button type="button" onClick={() => startEdit(f)}
                        className="ml-2 text-xs text-[#0d1e26] hover:underline">Edit</button>
                      <button type="button" onClick={() => deleteCustom(f.key)}
                        className="text-xs text-red-400 hover:text-red-600 ml-1">×</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {addingNew ? (
          <CustomFieldEditor
            draft={newDraft}
            onChange={p => setNewDraft(d => ({ ...d, ...p }))}
            onSave={addField}
            onCancel={() => { setAddingNew(false); setNewDraft(blankDraft()) }}
          />
        ) : (
          <button type="button" onClick={() => setAddingNew(true)}
            className="text-sm text-[#0d1e26] font-medium hover:underline">
            + Add custom field
          </button>
        )}
      </div>

      <SaveButton saving={saving} label="Save form config" />
    </form>
  )
}

// ─── Emails Tab ───────────────────────────────────────────────────────────────

function EmailsTab() {
  const [draft, setDraft] = useState({ subject: 'Welcome!', body: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings/emails')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setDraft(d.templates))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch('/api/admin/settings/emails', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      setDraft((await res.json()).templates); setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <SectionHeader title="Welcome email" description="Sent to new members when they register. Use {club_name} as a placeholder." />
      <Feedback error={error} success={success} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
        <input
          className={inputCls()} value={draft.subject}
          onChange={e => setDraft(p => ({ ...p, subject: e.target.value }))}
          placeholder="Welcome to {club_name}!"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Body <span className="text-gray-400 font-normal">(plain text or basic HTML)</span></label>
        <textarea
          className={inputCls()} rows={10} value={draft.body}
          onChange={e => setDraft(p => ({ ...p, body: e.target.value }))}
          placeholder="Hi {first_name},&#10;&#10;Welcome to {club_name}! Your membership application is under review…"
        />
        <p className="text-xs text-gray-400 mt-1">Available placeholders: {'{club_name}'}, {'{first_name}'}, {'{full_name}'}</p>
      </div>

      <SaveButton saving={saving} />
    </form>
  )
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

type OrgIntegrations = {
  custom_domain: string | null
  subdomain: string
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean | null
  stripe_charges_enabled: boolean | null
  stripe_payouts_enabled: boolean | null
}

function IntegrationsTab() {
  const [org, setOrg] = useState<OrgIntegrations | null>(null)
  const [customDomain, setCustomDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [domainSaving, setDomainSaving] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [domainError, setDomainError] = useState<string | null>(null)
  const [domainSuccess, setDomainSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings/integrations')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setOrg(d.org)
        setCustomDomain(d.org?.custom_domain ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const connectStripe = async () => {
    setStripeConnecting(true); setStripeError(null)
    try {
      const res = await fetch('/api/admin/settings/integrations', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      const { url } = await res.json()
      window.location.href = url
    } catch (e) {
      setStripeError(e instanceof Error ? e.message : 'Failed to connect Stripe')
      setStripeConnecting(false)
    }
  }

  const saveDomain = async (e: React.FormEvent) => {
    e.preventDefault(); setDomainSaving(true); setDomainError(null); setDomainSuccess(false)
    try {
      const res = await fetch('/api/admin/settings/integrations', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customDomain }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      const d = await res.json()
      setOrg(d.org)
      setCustomDomain(d.org?.custom_domain ?? '')
      setDomainSuccess(true); setTimeout(() => setDomainSuccess(false), 3000)
    } catch (e) { setDomainError(e instanceof Error ? e.message : 'Failed') }
    finally { setDomainSaving(false) }
  }

  const stripeUi = org ? orgStripeDuesUiStatus(org) : 'not_connected'
  const stripePending = stripeUi === 'pending'
  const stripePayoutsPending = stripeUi === 'payments_active_payouts_pending'
  const stripeFullyReady = stripeUi === 'fully_ready'

  if (loading) return <div className="flex py-12 justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d1e26]" /></div>

  return (
    <div className="space-y-10 max-w-xl">

      {/* Stripe section */}
      <div className="space-y-4">
        <SectionHeader title="Stripe Connect" description="Accept membership payments via your own Stripe account." />

        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              stripeFullyReady
                ? 'bg-green-500'
                : stripePayoutsPending
                  ? 'bg-amber-500'
                  : stripePending
                    ? 'bg-yellow-400'
                    : 'bg-gray-300'
            }`}
          />
          <span className="text-sm text-gray-700">
            {stripeFullyReady
              ? 'Connected'
              : stripePayoutsPending
                ? 'Payments on — finish payout setup in Stripe'
                : stripePending
                  ? 'Setup in progress'
                  : 'Not connected'}
          </span>
        </div>

        {stripeFullyReady ? (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            Accepting payments via Stripe; payouts are enabled.
          </div>
        ) : stripePayoutsPending ? (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Members can pay online. Complete required steps in your Stripe Dashboard so payouts can reach your bank.
          </div>
        ) : (
          <>
            {stripeError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{stripeError}</div>}
            <button
              type="button"
              onClick={connectStripe}
              disabled={stripeConnecting}
              className="px-4 py-2 bg-[#0d1e26] text-white text-sm font-medium rounded-md hover:bg-[#0a171c] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stripeConnecting ? 'Redirecting…' : stripePending ? 'Resume setup' : 'Connect Stripe'}
            </button>
          </>
        )}
      </div>

      {/* Custom domain section */}
      <form onSubmit={saveDomain} className="space-y-4 pt-6 border-t border-gray-200">
        <SectionHeader title="Custom domain" description="Serve your member portal on your own domain." />
        <Feedback error={domainError} success={domainSuccess} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
          <input
            className={inputCls()}
            placeholder="lounge.yourclub.com"
            value={customDomain}
            onChange={e => setCustomDomain(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Leave blank to use the default subdomain.</p>
        </div>

        <SaveButton saving={domainSaving} label="Save domain" />

        {org?.custom_domain && (
          <div className="mt-4">
            <CnameRecord host={org.custom_domain} />
          </div>
        )}
      </form>
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function SettingsPageClient() {
  const [tab, setTab] = useState<Tab>('Club')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search).get('tab')
    if (q && (TABS as readonly string[]).includes(q)) setTab(q as Tab)
  }, [])

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t
                  ? 'border-[#0d1e26] text-[#0d1e26]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'Club'         && <ClubTab />}
      {tab === 'Features'     && <FeaturesTab />}
      {tab === 'Membership'   && <MembershipTab />}
      {tab === 'Signup'       && <SignupTab />}
      {tab === 'Emails'       && <EmailsTab />}
      {tab === 'Integrations' && <IntegrationsTab />}
    </div>
  )
}
