import { requireAuth } from '@/lib/auth'
import { getAllMembershipFees } from '@/lib/settings'
import { NextResponse } from 'next/server'

/** Returns fees for all membership levels. Use for Pay modal and subscription section. */
export async function GET() {
  try {
    await requireAuth()
    const fees = await getAllMembershipFees()
    return NextResponse.json({ fees })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get membership fees'
    const status = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
