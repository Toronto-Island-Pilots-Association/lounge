import { requireAdmin } from '@/lib/auth'
import { getMembershipLevels, setMembershipLevels, type OrgMembershipLevel } from '@/lib/settings'
import { NextResponse } from 'next/server'

const TRIAL_TYPES = ['none', 'sept1', 'months'] as const

function validateLevels(body: unknown): OrgMembershipLevel[] | null {
  if (!Array.isArray(body) || body.length === 0) return null
  const levels: OrgMembershipLevel[] = []
  for (const item of body) {
    if (typeof item !== 'object' || item === null) return null
    const { key, label, fee, trialType, trialMonths, enabled } = item as Record<string, unknown>
    if (typeof key !== 'string' || !key) return null
    if (typeof label !== 'string') return null
    if (typeof fee !== 'number' || fee < 0) return null
    if (!TRIAL_TYPES.includes(trialType as typeof TRIAL_TYPES[number])) return null
    if (typeof enabled !== 'boolean') return null
    const level: OrgMembershipLevel = { key, label, fee, trialType: trialType as OrgMembershipLevel['trialType'], enabled }
    if (trialType === 'months') {
      level.trialMonths = typeof trialMonths === 'number' && trialMonths >= 1 ? trialMonths : 12
    }
    levels.push(level)
  }
  return levels
}

export async function GET() {
  try {
    await requireAdmin()
    const levels = await getMembershipLevels()
    return NextResponse.json({ levels })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load membership levels'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const levels = validateLevels(body)
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
    await requireAdmin()
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
