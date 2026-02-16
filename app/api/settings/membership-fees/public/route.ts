import { getAllMembershipFees } from '@/lib/settings'
import { NextResponse } from 'next/server'

/** Returns fees for all membership levels. Public for signup/become-a-member page. */
export async function GET() {
  try {
    const fees = await getAllMembershipFees()
    return NextResponse.json({ fees })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get membership fees'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
