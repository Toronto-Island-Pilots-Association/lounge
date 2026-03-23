import { requireAdmin } from '@/lib/auth'
import { getOrgIdentity, setOrgIdentity, type OrgIdentity } from '@/lib/settings'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAdmin()
    const identity = await getOrgIdentity()
    return NextResponse.json({ identity })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load club settings'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const validKeys: (keyof OrgIdentity)[] = [
      'description', 'contactEmail', 'websiteUrl', 'accentColor', 'displayName', 'timezone',
    ]
    const update: Partial<OrgIdentity> = {}
    for (const key of validKeys) {
      if (typeof body[key] === 'string') update[key] = body[key]
    }
    await setOrgIdentity(update)
    const identity = await getOrgIdentity()
    return NextResponse.json({ identity })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update club settings'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
