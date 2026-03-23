import { requireAdmin } from '@/lib/auth'
import { getEnabledLevels, setEnabledLevels, type MembershipLevelKey } from '@/lib/settings'
import { NextResponse } from 'next/server'

const LEVELS: MembershipLevelKey[] = ['Full', 'Student', 'Associate', 'Corporate', 'Honorary']

export async function GET() {
  try {
    await requireAdmin()
    const levels = await getEnabledLevels()
    return NextResponse.json({ levels })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load membership levels'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const current = await getEnabledLevels()
    for (const level of LEVELS) {
      if (typeof body[level] === 'boolean') current[level] = body[level]
    }
    await setEnabledLevels(current)
    const levels = await getEnabledLevels()
    return NextResponse.json({ levels })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update membership levels'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
