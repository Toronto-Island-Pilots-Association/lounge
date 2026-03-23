'use client'

import { useEffect, useState, useCallback } from 'react'
import type { MembershipLevelKey, OrgFeatureFlags, OrgIdentity, SignupField } from '@/lib/settings'

// ─── Types ────────────────────────────────────────────────────────────────────

type TrialType = 'none' | 'sept1' | 'months'
type TrialConfigItem = { type: TrialType; months?: number }

const LEVELS: MembershipLevelKey[] = ['Full', 'Student', 'Associate', 'Corporate', 'Honorary']
const LEVEL_LABELS: Record<MembershipLevelKey, string> = {
  Full: 'Full Membership',
  Student: 'Student Membership',
  Associate: 'Associate Membership',
  Corporate: 'Corporate Membership',
  Honorary: 'Honorary',
}

const TABS = ['Club', 'Features', 'Membership', 'Signup', 'Emails'] as const
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

const FEATURE_META: { key: keyof OrgFeatureFlags; label: string; description: string }[] = [
  { key: 'discussions',            label: 'Discussions (Hangar Talk)', description: 'Forum-style discussion board for members.' },
  { key: 'events',                 label: 'Events',                    description: 'Event calendar with RSVP.' },
  { key: 'resources',              label: 'Announcements / Resources',  description: 'Document library and announcements.' },
  { key: 'memberDirectory',        label: 'Member directory',           description: 'Approved members can browse the member list.' },
  { key: 'requireMemberApproval',  label: 'Require admin approval',     description: 'New signups must be approved before accessing the portal.' },
  { key: 'allowMemberInvitations', label: 'Member invitations',         description: 'Approved members can invite new members.' },
]

function FeaturesTab() {
  const [draft, setDraft] = useState<OrgFeatureFlags>({
    discussions: true, events: true, resources: true, memberDirectory: true,
    requireMemberApproval: true, allowMemberInvitations: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings/features')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setDraft(d.features))
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
      setDraft((await res.json()).features)
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <SectionHeader title="Feature toggles" description="Enable or disable sections of the member portal." />
      <Feedback error={error} success={success} />

      <div className="space-y-3">
        {FEATURE_META.map(({ key, label, description }) => (
          <label key={key} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0d1e26] focus:ring-[#0d1e26]"
              checked={draft[key]}
              onChange={e => setDraft(p => ({ ...p, [key]: e.target.checked }))}
            />
            <div>
              <div className="text-sm font-medium text-gray-900">{label}</div>
              <div className="text-sm text-gray-500">{description}</div>
            </div>
          </label>
        ))}
      </div>

      <SaveButton saving={saving} />
    </form>
  )
}

// ─── Membership Tab ───────────────────────────────────────────────────────────

function MembershipTab() {
  const [fees, setFees] = useState<Record<MembershipLevelKey, number>>({ Full: 45, Student: 25, Associate: 25, Corporate: 125, Honorary: 0 })
  const [trial, setTrial] = useState<Record<MembershipLevelKey, TrialConfigItem>>({} as Record<MembershipLevelKey, TrialConfigItem>)
  const [levels, setLevels] = useState<Record<MembershipLevelKey, boolean>>({ Full: true, Student: true, Associate: true, Corporate: true, Honorary: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'fees' | 'trial' | 'levels' | null>(null)
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [successes, setSuccesses] = useState<Record<string, boolean>>({})

  const flash = (k: string) => { setSuccesses(p => ({ ...p, [k]: true })); setTimeout(() => setSuccesses(p => ({ ...p, [k]: false })), 3000) }

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings/membership-fees').then(r => r.json()),
      fetch('/api/admin/settings/trial-config').then(r => r.json()),
      fetch('/api/admin/settings/membership-levels').then(r => r.json()),
    ]).then(([f, t, l]) => {
      if (f.fees) setFees(f.fees)
      if (t.trial) setTrial(t.trial)
      if (l.levels) setLevels(l.levels)
    }).finally(() => setLoading(false))
  }, [])

  const saveFees = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving('fees'); setErrors(p => ({ ...p, fees: null }))
    try {
      const res = await fetch('/api/admin/settings/membership-fees', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fees) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      setFees((await res.json()).fees); flash('fees')
    } catch (e) { setErrors(p => ({ ...p, fees: e instanceof Error ? e.message : 'Failed' })) }
    finally { setSaving(null) }
  }

  const saveTrial = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving('trial'); setErrors(p => ({ ...p, trial: null }))
    try {
      const payload = LEVELS.reduce((acc, l) => ({ ...acc, [l]: trial[l] ?? { type: 'none' } }), {} as Record<MembershipLevelKey, TrialConfigItem>)
      const res = await fetch('/api/admin/settings/trial-config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      setTrial((await res.json()).trial); flash('trial')
    } catch (e) { setErrors(p => ({ ...p, trial: e instanceof Error ? e.message : 'Failed' })) }
    finally { setSaving(null) }
  }

  const saveLevels = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving('levels'); setErrors(p => ({ ...p, levels: null }))
    try {
      const res = await fetch('/api/admin/settings/membership-levels', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(levels) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      setLevels((await res.json()).levels); flash('levels')
    } catch (e) { setErrors(p => ({ ...p, levels: e instanceof Error ? e.message : 'Failed' })) }
    finally { setSaving(null) }
  }

  if (loading) return <div className="flex py-12 justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d1e26]" /></div>

  return (
    <div className="space-y-10 max-w-xl">

      {/* Enabled levels */}
      <form onSubmit={saveLevels} className="space-y-4">
        <SectionHeader title="Membership levels" description="Disable levels to hide them from the signup form." />
        <Feedback error={errors.levels ?? null} success={!!successes.levels} />
        <div className="space-y-2">
          {LEVELS.map(l => (
            <label key={l} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-[#0d1e26] focus:ring-[#0d1e26]"
                checked={levels[l] ?? true}
                onChange={e => setLevels(p => ({ ...p, [l]: e.target.checked }))}
              />
              <span className="text-sm font-medium text-gray-900">{LEVEL_LABELS[l]}</span>
            </label>
          ))}
        </div>
        <SaveButton saving={saving === 'levels'} label="Save levels" />
      </form>

      {/* Fees */}
      <form onSubmit={saveFees} className="space-y-4 pt-6 border-t border-gray-200">
        <SectionHeader title="Annual fees (CAD)" description="Used for Stripe checkout and display. All levels bill every 12 months." />
        <Feedback error={errors.fees ?? null} success={!!successes.fees} />
        {LEVELS.map(l => (
          <div key={l} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
            <label htmlFor={`fee-${l}`} className="text-sm font-medium text-gray-900">{LEVEL_LABELS[l]}</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">$</span>
              <input
                id={`fee-${l}`}
                type="number" min={0} step={1}
                value={fees[l] ?? 0}
                onChange={e => { const n = parseFloat(e.target.value); setFees(p => ({ ...p, [l]: isNaN(n) ? 0 : n })) }}
                className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]"
              />
              <span className="text-sm text-gray-500">/ yr</span>
            </div>
          </div>
        ))}
        <SaveButton saving={saving === 'fees'} label="Save fees" />
      </form>

      {/* Trial config */}
      <form onSubmit={saveTrial} className="space-y-4 pt-6 border-t border-gray-200">
        <SectionHeader title="Trial periods" description='"Until Sept 1" = trial until next Sept 1. "Months" = from signup date.' />
        <Feedback error={errors.trial ?? null} success={!!successes.trial} />
        {LEVELS.map(l => {
          const item = trial[l] ?? { type: 'none' }
          return (
            <div key={l} className="flex flex-wrap items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm font-medium text-gray-900 w-40 shrink-0">{LEVEL_LABELS[l]}</span>
              <select
                value={item.type}
                onChange={e => {
                  const t = e.target.value as TrialType
                  setTrial(p => ({ ...p, [l]: t === 'months' ? { type: 'months', months: p[l]?.months ?? 12 } : { type: t } }))
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]"
              >
                <option value="none">No trial</option>
                <option value="sept1">Until Sept 1</option>
                <option value="months">Months from sign-up</option>
              </select>
              {item.type === 'months' && (
                <>
                  <input
                    type="number" min={1} max={60}
                    value={item.months ?? 12}
                    onChange={e => { const n = parseInt(e.target.value, 10); setTrial(p => ({ ...p, [l]: { type: 'months', months: isNaN(n) || n < 1 ? 12 : n } })) }}
                    className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]"
                  />
                  <span className="text-sm text-gray-500">months</span>
                </>
              )}
            </div>
          )
        })}
        <SaveButton saving={saving === 'trial'} label="Save trial settings" />
      </form>
    </div>
  )
}

// ─── Signup Fields Tab ────────────────────────────────────────────────────────

function SignupTab() {
  const [fields, setFields] = useState<SignupField[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings/signup-fields')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setFields(d.fields))
      .catch(() => {})
  }, [])

  const toggle = (key: string, prop: 'enabled' | 'required') =>
    setFields(p => p.map(f => f.key === key ? { ...f, [prop]: !f[prop] } : f))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch('/api/admin/settings/signup-fields', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      setFields((await res.json()).fields); setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <SectionHeader title="Signup form fields" description="Control which sections appear on the membership application form." />
      <Feedback error={error} success={success} />

      <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span>Section</span>
          <span className="text-center">Show</span>
          <span className="text-center">Required</span>
        </div>
        {fields.map(f => (
          <div key={f.key} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-4 py-3">
            <span className="text-sm text-gray-900">{f.label}</span>
            <div className="flex justify-center">
              <input
                type="checkbox" checked={f.enabled}
                onChange={() => toggle(f.key, 'enabled')}
                className="h-4 w-4 rounded border-gray-300 text-[#0d1e26] focus:ring-[#0d1e26]"
              />
            </div>
            <div className="flex justify-center">
              <input
                type="checkbox" checked={f.required} disabled={!f.enabled}
                onChange={() => toggle(f.key, 'required')}
                className="h-4 w-4 rounded border-gray-300 text-[#0d1e26] focus:ring-[#0d1e26] disabled:opacity-40"
              />
            </div>
          </div>
        ))}
      </div>

      <SaveButton saving={saving} />
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

// ─── Root component ───────────────────────────────────────────────────────────

export default function SettingsPageClient() {
  const [tab, setTab] = useState<Tab>('Club')

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
      {tab === 'Club'       && <ClubTab />}
      {tab === 'Features'   && <FeaturesTab />}
      {tab === 'Membership' && <MembershipTab />}
      {tab === 'Signup'     && <SignupTab />}
      {tab === 'Emails'     && <EmailsTab />}
    </div>
  )
}
