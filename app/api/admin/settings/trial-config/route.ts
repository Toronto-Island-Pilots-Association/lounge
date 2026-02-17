import { requireAdmin } from '@/lib/auth'
import {
  getTrialConfig,
  setTrialConfigForLevel,
  type MembershipLevelKey,
  type TrialConfigItem,
  type TrialType,
} from '@/lib/settings'
import { NextResponse } from 'next/server'

const LEVELS: MembershipLevelKey[] = ['Full', 'Student', 'Associate', 'Corporate', 'Honorary']

const TRIAL_TYPES: TrialType[] = ['none', 'sept1', 'months']

function parseBody(body: unknown): Record<MembershipLevelKey, TrialConfigItem> | null {
  if (typeof body !== 'object' || body === null) return null
  const obj = body as Record<string, unknown>
  const result = {} as Record<MembershipLevelKey, TrialConfigItem>
  for (const level of LEVELS) {
    const item = obj[level]
    if (typeof item !== 'object' || item === null) continue
    const type = (item as { type?: string }).type
    if (!TRIAL_TYPES.includes(type as TrialType)) continue
    const config: TrialConfigItem = { type: type as TrialType }
    if (config.type === 'months') {
      const months = (item as { months?: number }).months
      config.months = typeof months === 'number' && months >= 1 ? months : 12
    }
    result[level] = config
  }
  return Object.keys(result).length === LEVELS.length ? result : null
}

export async function GET() {
  try {
    await requireAdmin()
    const config = await getTrialConfig()
    return NextResponse.json({ trial: config })
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
    const config = parseBody(body)
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid body: expected trial config for all levels' },
        { status: 400 }
      )
    }
    for (const level of LEVELS) {
      await setTrialConfigForLevel(level, config[level])
    }
    const updated = await getTrialConfig()
    return NextResponse.json({ trial: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update trial config'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
