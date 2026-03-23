import { requireAdmin } from '@/lib/auth'
import { getMembershipLevels, setMembershipLevels } from '@/lib/settings'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAdmin()
    const levels = await getMembershipLevels()
    const fees: Record<string, number> = Object.fromEntries(levels.map(l => [l.key, l.fee]))
    return NextResponse.json({ fees })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load membership fees'
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
    const updated = current.map(l =>
      typeof updates[l.key] === 'number' && (updates[l.key] as number) >= 0
        ? { ...l, fee: updates[l.key] as number }
        : l
    )
    await setMembershipLevels(updated)
    const levels = await getMembershipLevels()
    const fees: Record<string, number> = Object.fromEntries(levels.map(l => [l.key, l.fee]))
    return NextResponse.json({ fees })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update membership fees'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
