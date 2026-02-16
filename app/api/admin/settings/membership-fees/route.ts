import { requireAdmin } from '@/lib/auth'
import { getAllMembershipFees, setMembershipFeeForLevel, type MembershipLevelKey } from '@/lib/settings'
import { NextResponse } from 'next/server'

const LEVELS: MembershipLevelKey[] = ['Full', 'Student', 'Associate', 'Corporate', 'Honorary']

export async function GET() {
  try {
    await requireAdmin()
    const fees = await getAllMembershipFees()
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
    for (const level of LEVELS) {
      if (typeof body[level] === 'number' && body[level] >= 0) {
        await setMembershipFeeForLevel(level, body[level])
      }
    }
    const fees = await getAllMembershipFees()
    return NextResponse.json({ fees })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update membership fees'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
