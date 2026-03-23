import { requireAdmin } from '@/lib/auth'
import { getFeatureFlags, setFeatureFlags, type OrgFeatureFlags } from '@/lib/settings'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAdmin()
    const features = await getFeatureFlags()
    return NextResponse.json({ features })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load features'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const validKeys: (keyof OrgFeatureFlags)[] = [
      'discussions', 'events', 'resources', 'memberDirectory',
      'requireMemberApproval', 'allowMemberInvitations',
    ]
    const update: Partial<OrgFeatureFlags> = {}
    for (const key of validKeys) {
      if (typeof body[key] === 'boolean') update[key] = body[key]
    }
    await setFeatureFlags(update)
    const features = await getFeatureFlags()
    return NextResponse.json({ features })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update features'
    const status = message === 'Forbidden: Admin access required' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
