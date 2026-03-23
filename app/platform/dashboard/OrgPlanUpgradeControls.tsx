'use client'

import { useMemo, useState } from 'react'
import { PLAN_KEYS, PLANS, type PlanKey } from '@/lib/plans'

function labelForPlan(plan: PlanKey) {
  return PLANS[plan]?.label ?? plan
}

export default function OrgPlanUpgradeControls({
  orgId,
  currentPlan,
}: {
  orgId: string
  currentPlan: string
}) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = useMemo(() => {
    const currentIdx = PLAN_KEYS.indexOf((currentPlan as PlanKey) ?? 'hobby')
    const idx = currentIdx >= 0 ? currentIdx : 0
    return PLAN_KEYS.slice(idx + 1)
  }, [currentPlan])

  const handleUpgrade = async (targetPlan: PlanKey) => {
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/plan/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to upgrade plan')

      if (data.url) {
        window.location.href = data.url
        return
      }

      // If Stripe returned ok: state should refresh via page reload.
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upgrade plan')
    } finally {
      setProcessing(false)
    }
  }

  if (options.length === 0) return null

  return (
    <div className="pt-4 border-t space-y-3">
      <div className="text-xs font-medium text-gray-500">Upgrade tier</div>
      <div className="flex flex-wrap gap-2">
        {options.map(p => (
          <button
            key={p}
            type="button"
            disabled={processing}
            onClick={() => handleUpgrade(p)}
            className="px-3 py-1.5 text-xs font-medium bg-[#0d1e26] text-white rounded-md hover:bg-[#0a171c] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upgrade to {labelForPlan(p)}
          </button>
        ))}
      </div>
      {error && <div className="rounded-md bg-red-50 p-2 text-xs text-red-800">{error}</div>}
    </div>
  )
}

