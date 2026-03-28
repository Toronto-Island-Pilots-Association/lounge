import { requireAdmin } from '@/lib/auth'
import {
  getMembershipLevels,
  getTrialConfig,
  setMembershipLevels,
  type TrialType,
} from '@/lib/settings'
import { NextResponse } from 'next/server'

const TRIAL_TYPES: TrialType[] = ['none', 'months']

export async function GET() {
  try {
    await requireAdmin()
    const trial = await getTrialConfig()
    return NextResponse.json({ trial })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load trial config'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const updates = body as Record<string, unknown>
    const current = await getMembershipLevels()
    const updated = current.map(l => {
      const item = updates[l.key]
      if (typeof item !== 'object' || item === null) return l
      const type = (item as { type?: string }).type
      if (!TRIAL_TYPES.includes(type as TrialType)) return l
      if (type === 'months') {
        const months = (item as { months?: number }).months
        return { ...l, trialType: 'months' as const, trialMonths: typeof months === 'number' && months >= 1 ? months : 12 }
      }
      return { ...l, trialType: type as TrialType, trialMonths: undefined }
    })
    await setMembershipLevels(updated)
    const trial = await getTrialConfig()
    return NextResponse.json({ trial })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update trial config'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
