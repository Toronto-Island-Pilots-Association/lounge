'use client'

import { useEffect, useState } from 'react'
import type { OrgMembershipLevel } from '@/lib/settings'

type TrialType = 'none' | 'months'

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function inputCls() {
  return 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
}

export default function MembershipLevelsForm({
  orgId,
  hideIntro = false,
}: {
  orgId: string
  hideIntro?: boolean
}) {
  const [levels, setLevels] = useState<OrgMembershipLevel[]>([])
  const [memberTrialsEnabled, setMemberTrialsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const url = `/api/platform/orgs/${encodeURIComponent(orgId)}/settings/membership`
    fetch(url)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        if (d.levels) setLevels(d.levels)
        setMemberTrialsEnabled(!!d.memberTrialsEnabled)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  const updateLevel = (idx: number, patch: Partial<OrgMembershipLevel>) =>
    setLevels(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))

  const addLevel = () =>
    setLevels(prev => [...prev, { key: '', label: '', fee: 0, trialType: 'none', enabled: true }])

  const deleteLevel = (idx: number) => setLevels(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
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
      const url = `/api/platform/orgs/${encodeURIComponent(orgId)}/settings/membership`
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed')
      setLevels((await res.json()).levels)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex py-12 justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {!hideIntro && (
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900">Membership levels</h2>
          <p className="text-sm text-gray-500 mt-1">
            {memberTrialsEnabled
              ? 'Define all membership tiers, fees, and trial periods.'
              : 'Define all membership tiers and annual fees.'}
          </p>
        </div>
      )}

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">Saved.</div>}

      <div className="space-y-3">
        {levels.map((level, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                <input
                  className={inputCls()}
                  placeholder="e.g. Full Member"
                  value={level.label}
                  onChange={e => {
                    const label = e.target.value
                    updateLevel(idx, { label, key: level.key || slugify(label) })
                  }}
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">Fee ($ / yr)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  value={level.fee}
                  onChange={e => {
                    const n = parseFloat(e.target.value)
                    updateLevel(idx, { fee: Number.isNaN(n) ? 0 : n })
                  }}
                />
              </div>
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
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
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
                          type="number"
                          min={1}
                          max={60}
                          value={level.trialMonths ?? 12}
                          onChange={e => {
                            const n = parseInt(e.target.value, 10)
                            updateLevel(idx, { trialMonths: Number.isNaN(n) || n < 1 ? 12 : n })
                          }}
                          className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                        />
                        <span className="text-sm text-gray-500">months</span>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
              <div className={`ml-auto flex items-center gap-2 ${memberTrialsEnabled ? 'pt-4' : ''}`}>
                <label
                  className="text-sm font-medium text-gray-700 cursor-pointer select-none"
                  htmlFor={`enabled-${idx}`}
                >
                  Enabled
                </label>
                <input
                  id={`enabled-${idx}`}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
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
        className="text-sm text-gray-900 font-medium hover:underline"
      >
        + Add level
      </button>

      <div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save levels'}
        </button>
      </div>
    </form>
  )
}
