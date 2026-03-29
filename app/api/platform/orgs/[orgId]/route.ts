/**
 * DELETE /api/platform/orgs/[orgId]
 * Permanently deletes an org and all its data. Admin only.
 */
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'
import { NextResponse } from 'next/server'

const BRANDING_BUCKET = 'org-branding'
const EXTERNAL_TIMEOUT_MS = 8000

function storagePathFromPublicUrl(url: string | null): string | null {
  if (!url) return null
  const marker = `/object/public/${BRANDING_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  try {
    return decodeURIComponent(url.slice(i + marker.length))
  } catch {
    return null
  }
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), EXTERNAL_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params

    // Auth: verify caller is logged in
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceRoleClient()

    // Auth: verify caller is admin of this org
    const { data: membership } = await db
      .from('org_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch org for billing + branding cleanup
    const { data: org } = await db
      .from('organizations')
      .select('id, stripe_subscription_id, logo_url, favicon_url')
      .eq('id', orgId)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { data: memberships, error: membershipsError } = await db
      .from('org_memberships')
      .select('stripe_subscription_id')
      .eq('org_id', orgId)
      .not('stripe_subscription_id', 'is', null)

    if (membershipsError) {
      return NextResponse.json({ error: membershipsError.message }, { status: 500 })
    }

    const subscriptionIds = Array.from(
      new Set(
        [org.stripe_subscription_id, ...(memberships ?? []).map((m) => m.stripe_subscription_id)]
          .filter((value): value is string => Boolean(value))
      )
    )

    if (subscriptionIds.length > 0) {
      const stripe = getPlatformStripeInstance()
      await Promise.allSettled(
        subscriptionIds.map(async (subscriptionId) => {
          try {
            await withTimeout(
              stripe.subscriptions.cancel(subscriptionId),
              `Stripe subscription cancellation (${subscriptionId})`
            )
          } catch (error) {
            console.error(`Failed to cancel Stripe subscription ${subscriptionId} during org deletion`, error)
          }
        })
      )
    }

    const brandingPaths = [storagePathFromPublicUrl(org.logo_url), storagePathFromPublicUrl(org.favicon_url)]
      .filter((value): value is string => Boolean(value))

    if (brandingPaths.length > 0) {
      const { error: storageError } = await db.storage.from(BRANDING_BUCKET).remove(brandingPaths)
      if (storageError) {
        console.error(`Failed to remove org branding for ${orgId}:`, storageError.message)
      }
    }

    // Delete the organization row itself. Tenant tables already cascade via FK.
    const { error: orgError } = await db
      .from('organizations')
      .delete()
      .eq('id', orgId)

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
