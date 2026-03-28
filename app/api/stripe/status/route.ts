import { isStripeEnabled } from '@/lib/stripe'
import { isOrgStripeConnected } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  if (!isStripeEnabled()) {
    return NextResponse.json({ enabled: false })
  }
  const orgConnected = await isOrgStripeConnected()
  return NextResponse.json({ enabled: orgConnected })
}
