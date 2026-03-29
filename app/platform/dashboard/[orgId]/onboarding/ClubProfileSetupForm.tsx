'use client'

import { useState } from 'react'
import { CLUB_SIZE_OPTIONS, CLUB_TYPE_OPTIONS } from '@/lib/club-options'
import type { OrgIdentity } from '@/lib/settings'

function inputCls() {
  return 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-0'
}

export default function ClubProfileSetupForm({
  orgId,
  initial,
}: {
  orgId: string
  initial: Pick<OrgIdentity, 'clubType' | 'clubSize' | 'websiteUrl' | 'contactEmail'>
}) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const set = (key: keyof typeof draft, value: string) =>
    setDraft(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/general`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">Saved.</div>}

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Club type</label>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {CLUB_TYPE_OPTIONS.map((option) => {
            const selected = draft.clubType === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => set('clubType', option.value)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                      selected ? 'bg-white/15 text-white' : 'bg-gray-100'
                    }`}
                  >
                    <span aria-hidden>{option.emoji}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className={`mt-0.5 text-xs leading-5 ${selected ? 'text-gray-200' : 'text-gray-500'}`}>
                      {option.description}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Club size</label>
          <select
            value={draft.clubSize}
            onChange={(e) => set('clubSize', e.target.value)}
            className={inputCls()}
          >
            {CLUB_SIZE_OPTIONS.map((option) => (
              <option key={option.value || 'empty'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Contact email</label>
          <input
            type="email"
            value={draft.contactEmail}
            onChange={(e) => set('contactEmail', e.target.value)}
            placeholder="info@yourclub.com"
            className={inputCls()}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1.5">Website</label>
        <input
          type="url"
          value={draft.websiteUrl}
          onChange={(e) => set('websiteUrl', e.target.value)}
          placeholder="https://yourclub.com"
          className={inputCls()}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save club info'}
      </button>
    </form>
  )
}
