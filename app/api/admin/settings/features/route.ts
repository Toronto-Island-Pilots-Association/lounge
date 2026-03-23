import { requireAdmin } from '@/lib/auth'
import { getFeatureFlags, setFeatureFlags, getOrgPlan, type OrgFeatureFlags } from '@/lib/settings'
import { getPlanDef, getRequiredPlan, type PlanFeatures } from '@/lib/plans'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAdmin()
    const [features, plan] = await Promise.all([getFeatureFlags(), getOrgPlan()])
    const planDef = getPlanDef(plan)
    return NextResponse.json({ features, plan, planLabel: planDef.label, planFeatures: planDef.features })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load features'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const validKeys: (keyof OrgFeatureFlags)[] = [
      'discussions', 'events', 'resources', 'memberDirectory',
      'requireMemberApproval', 'allowMemberInvitations',
    ]
    const update: Partial<OrgFeatureFlags> = {}
    for (const key of validKeys) {
      if (typeof body[key] === 'boolean') update[key] = body[key]
    }

    // Enforce plan ceiling — can't enable a feature the plan doesn't include
    const plan = await getOrgPlan()
    const planFeatures = getPlanDef(plan).features
    for (const key of validKeys) {
      if (update[key] === true && !planFeatures[key as keyof PlanFeatures]) {
        const requiredPlan = getRequiredPlan(key as keyof PlanFeatures)
        const planLabel = requiredPlan ? getPlanDef(requiredPlan).label : 'a higher'
        return NextResponse.json(
          { error: `"${key}" is not available on your current plan. Upgrade to ${planLabel} to enable it.` },
          { status: 403 }
        )
      }
    }

    await setFeatureFlags(update)
    const features = await getFeatureFlags()
    const planDef = getPlanDef(plan)
    return NextResponse.json({ features, plan, planLabel: planDef.label, planFeatures: planDef.features })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update features'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
