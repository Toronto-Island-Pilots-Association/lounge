import { getCurrentUserIncludingPending } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const user = await getCurrentUserIncludingPending()
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    return NextResponse.json({ 
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
