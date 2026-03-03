import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface AnalyticsPayload {
  members: {
    total: number
    byStatus: { pending: number; approved: number; rejected: number; expired: number }
    newThisMonth: number
  }
  payments: {
    totalRevenue: number
    count: number
    byMethod: { stripe: number; paypal: number; cash: number; wire: number }
    revenueThisYear: number
  }
  events: {
    total: number
    totalRsvps: number
    upcomingCount: number
  }
  discussions: {
    threads: number
    comments: number
    reactions: number
  }
}

export async function GET() {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const startOfMonthIso = startOfMonth.toISOString()
    const startOfYearIso = startOfYear.toISOString()

    // Run all analytics queries in parallel
    const [
      membersAll,
      membersByStatus,
      membersNewThisMonth,
      paymentsCompleted,
      paymentsThisYear,
      eventsCount,
      rsvpsCount,
      upcomingEvents,
      threadsCount,
      commentsCount,
      reactionsCount,
    ] = await Promise.all([
      // Total members
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      // Members by status (one query per status for simplicity; could use raw SQL for single query)
      Promise.all(
        ['pending', 'approved', 'rejected', 'expired'].map((status) =>
          supabase
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('status', status)
        )
      ).then((results) => ({
        pending: results[0].count ?? 0,
        approved: results[1].count ?? 0,
        rejected: results[2].count ?? 0,
        expired: results[3].count ?? 0,
      })),
      // New members this month
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonthIso),
      // All completed payments (for total revenue and by method)
      supabase
        .from('payments')
        .select('amount, payment_method')
        .eq('status', 'completed'),
      // Payments this year (for revenue this year)
      supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('payment_date', startOfYearIso),
      // Events count
      supabase.from('events').select('id', { count: 'exact', head: true }),
      // Total RSVPs
      supabase.from('event_rsvps').select('id', { count: 'exact', head: true }),
      // Upcoming events (start_time >= now)
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('start_time', now.toISOString()),
      // Discussions
      supabase.from('threads').select('id', { count: 'exact', head: true }),
      supabase.from('comments').select('id', { count: 'exact', head: true }),
      supabase.from('reactions').select('id', { count: 'exact', head: true }),
    ])

    const totalMembers = membersAll.count ?? 0
    const paymentsList = paymentsCompleted.data ?? []
    const paymentsThisYearList = paymentsThisYear.data ?? []
    const totalRevenue = paymentsList.reduce((sum, p) => sum + Number(p.amount), 0)
    const revenueThisYear = paymentsThisYearList.reduce((sum, p) => sum + Number(p.amount), 0)
    const byMethod = paymentsList.reduce(
      (acc, p) => {
        const m = p.payment_method as keyof typeof acc
        if (m in acc) acc[m] += 1
        return acc
      },
      { stripe: 0, paypal: 0, cash: 0, wire: 0 }
    )

    const payload: AnalyticsPayload = {
      members: {
        total: totalMembers,
        byStatus: membersByStatus,
        newThisMonth: membersNewThisMonth.count ?? 0,
      },
      payments: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        count: paymentsList.length,
        byMethod,
        revenueThisYear: Math.round(revenueThisYear * 100) / 100,
      },
      events: {
        total: eventsCount.count ?? 0,
        totalRsvps: rsvpsCount.count ?? 0,
        upcomingCount: upcomingEvents.count ?? 0,
      },
      discussions: {
        threads: threadsCount.count ?? 0,
        comments: commentsCount.count ?? 0,
        reactions: reactionsCount.count ?? 0,
      },
    }

    return NextResponse.json(payload)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load analytics'
    const status =
      message === 'Unauthorized' || message === 'Forbidden: Admin access required' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
