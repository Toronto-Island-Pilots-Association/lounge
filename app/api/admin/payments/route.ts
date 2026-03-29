import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Admin endpoint to view payment history
 * 
 * GET /api/admin/payments
 * Query params:
 *   - userId?: string - Filter by user ID
 *   - paymentMethod?: 'stripe' | 'cash' | 'wire' - Filter by payment method (paypal retained for historical data)
 *   - limit?: number - Limit results (default: 100)
 *   - offset?: number - Offset for pagination
 */
export async function GET(request: Request) {
  try {
    await requireAdmin()
    const orgId = request.headers.get('x-org-id')
    if (!orgId) {
      return NextResponse.json({ error: 'Missing org context' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const paymentMethod = searchParams.get('paymentMethod')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const supabase = await createClient()

    // First, get payments
    let query = supabase
      .from('payments')
      .select('*')
      .eq('org_id', orgId)
      .order('payment_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (paymentMethod && ['stripe', 'paypal', 'cash', 'wire'].includes(paymentMethod)) {
      query = query.eq('payment_method', paymentMethod)
    }

    const { data: payments, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Enrich payments with user profile data
    const enrichedPayments = await Promise.all(
      (payments || []).map(async (payment) => {
        // Get user profile for payment.user_id
        const { data: userProfile } = await supabase
          .from('member_profiles')
          .select('id, email, full_name, member_number')
          .eq('user_id', payment.user_id)
          .eq('org_id', orgId)
          .maybeSingle()

        // Get user profile for payment.recorded_by (if exists)
        let recordedByUser = null
        if (payment.recorded_by) {
          const { data: recordedByProfile } = await supabase
            .from('user_profiles')
            .select('user_id, email, full_name')
            .eq('user_id', payment.recorded_by)
            .maybeSingle()
          recordedByUser = recordedByProfile
        }

        return {
          ...payment,
          user: userProfile || null,
          recorded_by_user: recordedByUser || null,
        }
      })
    )

    // Get total count for pagination
    let countQuery = supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)

    if (userId) {
      countQuery = countQuery.eq('user_id', userId)
    }

    if (paymentMethod && ['stripe', 'paypal', 'cash', 'wire'].includes(paymentMethod)) {
      countQuery = countQuery.eq('payment_method', paymentMethod)
    }

    const { count } = await countQuery

    return NextResponse.json({
      payments: enrichedPayments || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Get payments error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
