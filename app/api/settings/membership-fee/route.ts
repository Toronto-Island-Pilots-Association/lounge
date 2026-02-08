import { getMembershipFee } from '@/lib/settings'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const fee = await getMembershipFee()
    return NextResponse.json({ fee })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get membership fee' },
      { status: 500 }
    )
  }
}
