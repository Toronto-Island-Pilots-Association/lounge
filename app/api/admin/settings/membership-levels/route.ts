import { requirePlatformAdmin } from '@/lib/auth'
import { parseMembershipLevelsBody } from '@/lib/membership-levels-body'
import { getMembershipLevels, getOrgPlan, setMembershipLevels } from '@/lib/settings'
import { getPlanDef } from '@/lib/plans'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requirePlatformAdmin()
    const [levels, plan] = await Promise.all([getMembershipLevels(), getOrgPlan()])
    const memberTrialsEnabled = getPlanDef(plan).features.memberTrials
    return NextResponse.json({ levels, memberTrialsEnabled })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load membership levels'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    await requirePlatformAdmin()
    const body = await request.json()
    const levels = parseMembershipLevelsBody(body)
    if (!levels) {
      return NextResponse.json({ error: 'Invalid body: expected array of membership levels' }, { status: 400 })
    }
    await setMembershipLevels(levels)
    const updated = await getMembershipLevels()
    return NextResponse.json({ levels: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update membership levels'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin()
    const body = await request.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const toggles = body as Record<string, unknown>
    const current = await getMembershipLevels()
    const updated = current.map(l =>
      typeof toggles[l.key] === 'boolean' ? { ...l, enabled: toggles[l.key] as boolean } : l
    )
    await setMembershipLevels(updated)
    const levels = await getMembershipLevels()
    return NextResponse.json({ levels })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update membership levels'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
