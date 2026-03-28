/**
 * DELETE /api/platform/orgs/[orgId]
 * Permanently deletes an org and all its data. Admin only.
 */
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getPlatformStripeInstance } from '@/lib/stripe'
import { NextResponse } from 'next/server'

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

    // Fetch org to check for platform Stripe subscription
    const { data: org } = await db
      .from('organizations')
      .select('id, stripe_subscription_id')
      .eq('id', orgId)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Cancel platform Stripe subscription if active
    if (org.stripe_subscription_id) {
      try {
        const stripe = getPlatformStripeInstance()
        await stripe.subscriptions.cancel(org.stripe_subscription_id)
      } catch {
        // Log but don't block deletion — subscription may already be cancelled
        console.error(`Failed to cancel Stripe subscription ${org.stripe_subscription_id} during org deletion`)
      }
    }

    // Delete all org data in dependency order
    const tables = [
      'reactions',
      'comments',
      'threads',
      'event_rsvps',
      'events',
      'resources',
      'notifications',
      'payments',
      'settings',
      'org_memberships',
    ] as const

    for (const table of tables) {
      const { error } = await db.from(table).delete().eq('org_id', orgId)
      if (error) {
        console.error(`Error deleting from ${table}:`, error.message)
        return NextResponse.json(
          { error: `Failed to delete org data (${table}): ${error.message}` },
          { status: 500 }
        )
      }
    }

    // Finally delete the org itself
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
