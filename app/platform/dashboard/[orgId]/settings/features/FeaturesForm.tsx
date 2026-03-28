'use client'

import { useState } from 'react'
import type { OrgFeatureFlags } from '@/lib/settings'

type FeatureMeta = {
  key: keyof OrgFeatureFlags
  label: string
  description: string
  labelKey?: keyof OrgFeatureFlags
  labelPlaceholder?: string
}

const FEATURE_META: FeatureMeta[] = [
  { key: 'discussions',            label: 'Discussions',            description: 'Forum-style discussion board for members.',      labelKey: 'discussionsLabel', labelPlaceholder: 'Discussions' },
  { key: 'events',                 label: 'Events',                 description: 'Event calendar with RSVP.',                      labelKey: 'eventsLabel',      labelPlaceholder: 'Events' },
  { key: 'resources',              label: 'Announcements',          description: 'Document library and announcements.',             labelKey: 'resourcesLabel',   labelPlaceholder: 'Announcements' },
  { key: 'memberDirectory',        label: 'Member directory',       description: 'Approved members can browse the member list.' },
  { key: 'requireMemberApproval',  label: 'Require admin approval', description: 'New signups must be approved before accessing the portal.' },
  { key: 'allowMemberInvitations', label: 'Member invitations',     description: 'Approved members can invite new members.' },
]

const PLAN_ORDER = ['hobby', 'starter', 'community', 'club_pro']
const PLAN_LABELS: Record<string, string> = {
  hobby: 'Hobby', starter: 'Starter', community: 'Community', club_pro: 'Club Pro',
}

export default function FeaturesForm({
  initial,
  initialPlan,
  initialPlanLabel,
  initialPlanFeatures,
  orgId,
}: {
  initial: OrgFeatureFlags
  initialPlan: string
  initialPlanLabel: string
  initialPlanFeatures: Partial<Record<keyof OrgFeatureFlags, boolean>>
  orgId: string
}) {
  const [draft, setDraft] = useState<OrgFeatureFlags>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const requiredPlanLabel = (key: keyof OrgFeatureFlags): string | null => {
    if (initialPlanFeatures[key]) return null
    const idx = PLAN_ORDER.indexOf(initialPlan)
    for (let i = idx + 1; i < PLAN_ORDER.length; i++) {
      return PLAN_LABELS[PLAN_ORDER[i]] ?? 'a higher plan'
    }
    return 'a higher plan'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/settings/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save')
      setDraft((await res.json()).features)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-gray-500">Enable or disable sections of the member portal.</p>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
          {initialPlanLabel} plan
        </span>
      </div>

      {error   && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">Saved.</div>}

      <div className="divide-y divide-gray-100">
        {FEATURE_META.map(({ key, label, description, labelKey, labelPlaceholder }) => {
          const blocked = !initialPlanFeatures[key as keyof typeof initialPlanFeatures]
          const upgradeTo = requiredPlanLabel(key)
          return (
            <div key={key} className={`py-4 ${blocked ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed"
                  checked={blocked ? false : (draft[key] as boolean)}
                  disabled={blocked}
                  onChange={e => !blocked && setDraft(p => ({ ...p, [key]: e.target.checked }))}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                    {blocked && upgradeTo && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
                        Requires {upgradeTo}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                  {labelKey && !blocked && (draft[key] as boolean) && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Nav label:</span>
                      <input
                        type="text"
                        value={draft[labelKey] as string}
                        onChange={e => setDraft(p => ({ ...p, [labelKey]: e.target.value }))}
                        placeholder={labelPlaceholder}
                        maxLength={40}
                        className="w-40 rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
