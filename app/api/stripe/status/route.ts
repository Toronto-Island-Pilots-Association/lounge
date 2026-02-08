import { isStripeEnabled } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    enabled: isStripeEnabled(),
  })
}
