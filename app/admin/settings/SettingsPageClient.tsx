'use client'

import { useEffect, useState } from 'react'

type MembershipLevelKey = 'Full' | 'Student' | 'Associate' | 'Corporate' | 'Honorary'
type TrialType = 'none' | 'sept1' | 'months'

type TrialConfigItem = { type: TrialType; months?: number }

const LEVEL_LABELS: Record<MembershipLevelKey, string> = {
  Full: 'Full Membership',
  Student: 'Student membership',
  Associate: 'Associate membership',
  Corporate: 'Corporate Membership',
  Honorary: 'Honorary',
}

const LEVELS: MembershipLevelKey[] = ['Full', 'Student', 'Associate', 'Corporate', 'Honorary']

const DEFAULT_TRIAL: TrialConfigItem = { type: 'none' }

export default function SettingsPageClient() {
  const [fees, setFees] = useState<Record<MembershipLevelKey, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingTrial, setSavingTrial] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [draft, setDraft] = useState<Record<MembershipLevelKey, number>>({} as Record<MembershipLevelKey, number>)
  const [trialConfig, setTrialConfig] = useState<Record<MembershipLevelKey, TrialConfigItem> | null>(null)
  const [trialDraft, setTrialDraft] = useState<Record<MembershipLevelKey, TrialConfigItem>>({} as Record<MembershipLevelKey, TrialConfigItem>)
  const [trialError, setTrialError] = useState<string | null>(null)
  const [trialSuccess, setTrialSuccess] = useState(false)

  useEffect(() => {
    loadFees()
    loadTrialConfig()
  }, [])

  const loadFees = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings/membership-fees')
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to load fees')
      }
      const data = await res.json()
      setFees(data.fees)
      setDraft(data.fees || {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const loadTrialConfig = async () => {
    setTrialError(null)
    try {
      const res = await fetch('/api/admin/settings/trial-config')
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to load trial config')
      }
      const data = await res.json()
      setTrialConfig(data.trial)
      setTrialDraft(data.trial || {})
    } catch (e) {
      setTrialError(e instanceof Error ? e.message : 'Failed to load trial config')
      setTrialDraft({} as Record<MembershipLevelKey, TrialConfigItem>)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/admin/settings/membership-fees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to save')
      }
      const data = await res.json()
      setFees(data.fees)
      setDraft(data.fees)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const updateDraft = (level: MembershipLevelKey, value: string) => {
    const n = value === '' ? 0 : parseFloat(value)
    setDraft((prev) => ({ ...prev, [level]: isNaN(n) ? 0 : n }))
  }

  const updateTrialType = (level: MembershipLevelKey, type: TrialType) => {
    setTrialDraft((prev) => ({
      ...prev,
      [level]: type === 'months' ? { type: 'months', months: prev[level]?.months ?? 12 } : { type },
    }))
  }

  const updateTrialMonths = (level: MembershipLevelKey, value: string) => {
    const n = value === '' ? 12 : parseInt(value, 10)
    setTrialDraft((prev) => ({
      ...prev,
      [level]: { type: 'months', months: Number.isNaN(n) || n < 1 ? 12 : n },
    }))
  }

  const handleSaveTrial = async () => {
    setSavingTrial(true)
    setTrialError(null)
    setTrialSuccess(false)
    try {
      const payload = LEVELS.reduce(
        (acc, level) => ({
          ...acc,
          [level]: trialDraft[level] ?? trialConfig?.[level] ?? DEFAULT_TRIAL,
        }),
        {} as Record<MembershipLevelKey, TrialConfigItem>
      )
      const res = await fetch('/api/admin/settings/trial-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to save trial config')
      }
      const data = await res.json()
      setTrialConfig(data.trial)
      setTrialDraft(data.trial)
      setTrialSuccess(true)
      setTimeout(() => setTrialSuccess(false), 3000)
    } catch (e) {
      setTrialError(e instanceof Error ? e.message : 'Failed to save trial config')
    } finally {
      setSavingTrial(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d1e26]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Membership fees (CAD)</h2>
        <p className="text-sm text-gray-500 mt-1">
          Annual fee per membership level. Used for Stripe checkout and display. All levels bill every 12 months.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          Settings saved.
        </div>
      )}

      <div className="space-y-4 max-w-xl">
        {LEVELS.map((level) => (
          <div key={level} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
            <label htmlFor={`fee-${level}`} className="text-sm font-medium text-gray-900 min-w-0">
              {LEVEL_LABELS[level]}
            </label>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-gray-500">$</span>
              <input
                id={`fee-${level}`}
                type="number"
                min={0}
                step={1}
                value={draft[level] ?? 0}
                onChange={(e) => updateDraft(level, e.target.value)}
                className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]"
              />
              <span className="text-sm text-gray-500">CAD / year</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#0d1e26] text-white text-sm font-medium rounded-md hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save fees'}
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Trial periods</h3>
        <p className="text-sm text-gray-500 mt-1">
          Trial configuration per membership level. &quot;Until Sept 1&quot; = trial until next September 1st. &quot;Months from sign-up&quot; = trial length from profile creation.
        </p>
        {trialError && (
          <div className="mt-3 rounded-md bg-red-50 p-4 text-sm text-red-800">{trialError}</div>
        )}
        {trialSuccess && (
          <div className="mt-3 rounded-md bg-green-50 p-4 text-sm text-green-800">Trial settings saved.</div>
        )}
        <div className="mt-4 space-y-4 max-w-xl">
          {LEVELS.map((level) => {
            const item = trialDraft[level] ?? trialConfig?.[level] ?? DEFAULT_TRIAL
            return (
              <div
                key={level}
                className="flex flex-wrap items-center gap-3 py-2 border-b border-gray-100 last:border-0"
              >
                <label className="text-sm font-medium text-gray-900 w-40 shrink-0">
                  {LEVEL_LABELS[level]}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={item.type}
                    onChange={(e) => updateTrialType(level, e.target.value as TrialType)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]"
                  >
                    <option value="none">No trial</option>
                    <option value="sept1">Until Sept 1</option>
                    <option value="months">Months from sign-up</option>
                  </select>
                  {item.type === 'months' && (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={item.months ?? 12}
                        onChange={(e) => updateTrialMonths(level, e.target.value)}
                        className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-[#0d1e26] focus:ring-1 focus:ring-[#0d1e26]"
                      />
                      <span className="text-sm text-gray-500">months</span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4">
          <button
            onClick={handleSaveTrial}
            disabled={savingTrial}
            className="px-4 py-2 bg-[#0d1e26] text-white text-sm font-medium rounded-md hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingTrial ? 'Saving...' : 'Save trial settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
