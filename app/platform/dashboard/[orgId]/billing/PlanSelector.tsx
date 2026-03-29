'use client'

import { useState } from 'react'
import { PLAN_KEYS, PLANS, type PlanKey } from '@/lib/plans'
import type { OrgPlanPricingBreakdown } from '@/lib/org-plan-pricing'

export default function PlanSelector({
  orgId,
  currentPlan,
  pricingByPlan,
  billingActivated,
  allowSelfServePlanChanges = true,
  returnTo,
}: {
  orgId: string
  currentPlan: string
  pricingByPlan: Record<PlanKey, OrgPlanPricingBreakdown>
  billingActivated: boolean
  allowSelfServePlanChanges?: boolean
  returnTo?: string
}) {
  const [processing, setProcessing] = useState<PlanKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (targetPlan: PlanKey) => {
    if (targetPlan === currentPlan && billingActivated) return
    setProcessing(targetPlan)
    setError(null)
    try {
      const res = await fetch(`/api/platform/orgs/${orgId}/plan/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan, returnTo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to change plan')
      if (data.url) {
        window.location.href = data.url
        return
      }
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change plan')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_KEYS.map((planKey) => {
          const plan = PLANS[planKey]
          const pricing = pricingByPlan[planKey]
          const isCurrent = planKey === currentPlan
          const isProcessing = processing === planKey
          const currentIdx = PLAN_KEYS.indexOf(currentPlan as PlanKey)
          const planIdx = PLAN_KEYS.indexOf(planKey)
          const isUpgrade = planIdx > currentIdx
          const isDowngrade = planIdx < currentIdx
          const needsBillingSetup = isCurrent && !billingActivated && pricing.baseMonthly > 0
          const showsOverage = pricing.includedMembers != null && pricing.additionalMemberPriceCents != null

          return (
            <div
              key={planKey}
              className={`rounded-xl border-2 p-5 flex flex-col gap-4 transition-all ${
                isCurrent
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${isCurrent ? 'text-blue-300' : 'text-gray-400'}`}>
                    {plan.label}
                  </span>
                  {isCurrent && (
                    <span className="text-xs bg-white text-[var(--color-primary)] font-semibold px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className={`text-2xl font-bold ${isCurrent ? 'text-white' : 'text-gray-900'}`}>
                  ${pricing.baseMonthly.toFixed(0)}
                  <span className={`text-sm font-normal ml-1 ${isCurrent ? 'text-gray-300' : 'text-gray-400'}`}>/mo</span>
                </div>
                <div className={`text-xs mt-1 ${isCurrent ? 'text-gray-300' : 'text-gray-500'}`}>
                  {plan.recommendedMembers}
                </div>
                <div className={`text-xs ${isCurrent ? 'text-gray-300' : 'text-gray-500'}`}>
                  {plan.recommendedAdmins}
                </div>
                {showsOverage && (
                  <div className={`text-xs mt-2 leading-5 ${isCurrent ? 'text-gray-200' : 'text-gray-500'}`}>
                    Includes {pricing.includedMembers} active members, then ${(pricing.additionalMemberPriceCents! / 100).toFixed(2)}/member/mo.
                  </div>
                )}
                {isCurrent && pricing.overageMembers > 0 && (
                  <div className="text-xs mt-2 text-gray-200">
                    Current overage: {pricing.overageMembers} members, ${pricing.totalMonthly.toFixed(2)}/mo total.
                  </div>
                )}
              </div>

              {!isCurrent && allowSelfServePlanChanges && (
                <button
                  type="button"
                  disabled={!!processing}
                  onClick={() => handleSelect(planKey)}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isUpgrade
                      ? 'bg-[var(--color-primary)] text-white hover:bg-[#0a171c]'
                      : isDowngrade
                      ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      : ''
                  }`}
                >
                  {isProcessing ? 'Processing…' : isUpgrade ? `Upgrade to ${plan.label}` : `Downgrade to ${plan.label}`}
                </button>
              )}
              {needsBillingSetup && allowSelfServePlanChanges && (
                <button
                  type="button"
                  disabled={!!processing}
                  onClick={() => handleSelect(planKey)}
                  className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-primary)] text-white hover:bg-[#0a171c]"
                >
                  {isProcessing ? 'Processing…' : 'Add billing details'}
                </button>
              )}
              {isCurrent && !needsBillingSetup && <div className="h-8" />}
              {!allowSelfServePlanChanges && <div className="h-8" />}
            </div>
          )
        })}
      </div>
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
      )}
    </div>
  )
}
