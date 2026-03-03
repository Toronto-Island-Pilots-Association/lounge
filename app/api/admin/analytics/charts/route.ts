import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PERIOD_DAYS = [7, 30, 90, 365] as const
type PeriodDays = (typeof PERIOD_DAYS)[number]
export type PeriodOption = PeriodDays | 'all' | 'last_year'

function parsePeriod(period: string | null): PeriodOption {
  const p = (period ?? '').toLowerCase().replace(/-/g, '_')
  if (p === 'all') return 'all'
  if (p === 'last_year') return 'last_year'
  const n = p ? parseInt(period ?? '', 10) : 30
  if (PERIOD_DAYS.includes(n as PeriodDays)) return n as PeriodDays
  return 30
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fillDateRange(start: Date, end: Date, byWeek?: boolean): string[] {
  const out: string[] = []
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endDay = new Date(end)
  endDay.setHours(0, 0, 0, 0)
  if (byWeek) {
    let weekStart = getWeekStartDate(cur)
    while (weekStart <= endDay) {
      out.push(toDateKey(weekStart))
      weekStart.setDate(weekStart.getDate() + 7)
    }
  } else {
    while (cur <= endDay) {
      out.push(toDateKey(cur))
      cur.setDate(cur.getDate() + 1)
    }
  }
  return out
}

/** Get week-start (Monday) as Date */
function getWeekStartDate(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = day === 0 ? 6 : day - 1
  copy.setDate(copy.getDate() - diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Get week-start (Monday) for a date - string key */
function getWeekStart(d: Date): string {
  return toDateKey(getWeekStartDate(d))
}

export interface ChartsPayload {
  period: number | 'all' | 'last_year'
  dateRange: { from: string; to: string }
  members: { date: string; newMembers: number; cumulative: number }[]
  revenue: { date: string; amount: number; count: number }[]
  events: { date: string; events: number; rsvps: number }[]
  discussions: { date: string; threads: number; comments: number; reactions: number }[]
}

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const period = parsePeriod(searchParams.get('period'))

    const end = new Date()
    end.setHours(23, 59, 59, 999)
    let start: Date
    let byWeek = false

    if (period === 'all') {
      const [profilesMin, paymentsMin, eventsMin, threadsMin] = await Promise.all([
        supabase.from('user_profiles').select('created_at').order('created_at', { ascending: true }).limit(1).single(),
        supabase.from('payments').select('payment_date').order('payment_date', { ascending: true }).limit(1).single(),
        supabase.from('events').select('created_at').order('created_at', { ascending: true }).limit(1).single(),
        supabase.from('threads').select('created_at').order('created_at', { ascending: true }).limit(1).single(),
      ])
      const dates: Date[] = []
      for (const row of [profilesMin.data?.created_at, paymentsMin.data?.payment_date, eventsMin.data?.created_at, threadsMin.data?.created_at]) {
        if (row) dates.push(new Date(row))
      }
      start = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000)
      start.setHours(0, 0, 0, 0)
      const daysDiff = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
      byWeek = daysDiff > 400
    } else if (period === 365) {
      start = new Date(end.getFullYear(), 0, 1)
      start.setHours(0, 0, 0, 0)
    } else if (period === 'last_year') {
      const lastYear = end.getFullYear() - 1
      start = new Date(lastYear, 0, 1)
      start.setHours(0, 0, 0, 0)
      end.setFullYear(lastYear, 11, 31)
      end.setHours(23, 59, 59, 999)
    } else {
      start = new Date()
      start.setDate(start.getDate() - period)
      start.setHours(0, 0, 0, 0)
    }

    const startIso = start.toISOString()
    const endIso = end.toISOString()
    const dates = fillDateRange(start, end, byWeek)

    const bucketKey = byWeek ? (d: Date) => getWeekStart(d) : (d: Date) => toDateKey(d)

    // Fetch raw data for the range (no upper bound for 'all' to get all history, then filter)
    const [membersRes, paymentsRes, eventsRes, rsvpsRes, threadsRes, commentsRes, reactionsRes] =
      await Promise.all([
        supabase.from('user_profiles').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('payments').select('payment_date, amount').eq('status', 'completed').gte('payment_date', startIso).lte('payment_date', endIso),
        supabase.from('events').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('event_rsvps').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('threads').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('comments').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('reactions').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
      ])

    const membersByBucket: Record<string, number> = {}
    dates.forEach((d) => {
      membersByBucket[d] = 0
    })
    const membersList = membersRes.data ?? []
    membersList.forEach((m) => {
      const key = bucketKey(new Date(m.created_at))
      if (membersByBucket[key] != null) membersByBucket[key] += 1
    })
    let cumulative = 0
    const membersBeforeStart = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .lt('created_at', startIso)
    cumulative = membersBeforeStart.count ?? 0
    const membersSeries = dates.map((date) => {
      cumulative += membersByBucket[date] ?? 0
      return {
        date,
        newMembers: membersByBucket[date] ?? 0,
        cumulative,
      }
    })

    const revenueByBucket: Record<string, { amount: number; count: number }> = {}
    dates.forEach((d) => {
      revenueByBucket[d] = { amount: 0, count: 0 }
    })
    ;(paymentsRes.data ?? []).forEach((p) => {
      const key = bucketKey(new Date(p.payment_date))
      if (revenueByBucket[key]) {
        revenueByBucket[key].amount += Number(p.amount)
        revenueByBucket[key].count += 1
      }
    })
    const revenueSeries = dates.map((date) => ({
      date,
      amount: Math.round((revenueByBucket[date]?.amount ?? 0) * 100) / 100,
      count: revenueByBucket[date]?.count ?? 0,
    }))

    const eventsByBucket: Record<string, number> = {}
    const rsvpsByBucket: Record<string, number> = {}
    dates.forEach((d) => {
      eventsByBucket[d] = 0
      rsvpsByBucket[d] = 0
    })
    ;(eventsRes.data ?? []).forEach((e) => {
      const key = bucketKey(new Date(e.created_at))
      if (eventsByBucket[key] != null) eventsByBucket[key] += 1
    })
    ;(rsvpsRes.data ?? []).forEach((r) => {
      const key = bucketKey(new Date(r.created_at))
      if (rsvpsByBucket[key] != null) rsvpsByBucket[key] += 1
    })
    const eventsSeries = dates.map((date) => ({
      date,
      events: eventsByBucket[date] ?? 0,
      rsvps: rsvpsByBucket[date] ?? 0,
    }))

    const threadsByBucket: Record<string, number> = {}
    const commentsByBucket: Record<string, number> = {}
    const reactionsByBucket: Record<string, number> = {}
    dates.forEach((d) => {
      threadsByBucket[d] = 0
      commentsByBucket[d] = 0
      reactionsByBucket[d] = 0
    })
    ;(threadsRes.data ?? []).forEach((t) => {
      const key = bucketKey(new Date(t.created_at))
      if (threadsByBucket[key] != null) threadsByBucket[key] += 1
    })
    ;(commentsRes.data ?? []).forEach((c) => {
      const key = bucketKey(new Date(c.created_at))
      if (commentsByBucket[key] != null) commentsByBucket[key] += 1
    })
    ;(reactionsRes.data ?? []).forEach((r) => {
      const key = bucketKey(new Date(r.created_at))
      if (reactionsByBucket[key] != null) reactionsByBucket[key] += 1
    })
    const discussionsSeries = dates.map((date) => ({
      date,
      threads: threadsByBucket[date] ?? 0,
      comments: commentsByBucket[date] ?? 0,
      reactions: reactionsByBucket[date] ?? 0,
    }))

    const payload: ChartsPayload = {
      period: period === 'all' ? 'all' : period === 'last_year' ? 'last_year' : period,
      dateRange: { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' },
      members: membersSeries,
      revenue: revenueSeries,
      events: eventsSeries,
      discussions: discussionsSeries,
    }

    return NextResponse.json(payload)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load charts'
    const status =
      message === 'Unauthorized' || message === 'Forbidden: Admin access required' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
