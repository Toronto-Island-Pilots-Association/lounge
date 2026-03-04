'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AnalyticsPayload } from '@/app/api/admin/analytics/route'
import type { ChartsPayload } from '@/app/api/admin/analytics/charts/route'
import Loading from '@/components/Loading'
import TimeChart from '@/components/analytics/TimeChart'

const CHART_PERIODS: { value: 7 | 30 | 90 | 365 | 'last_year' | 'all'; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: 'This year' },
  { value: 'last_year', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

function StatCard({
  title,
  value,
  subtext,
}: {
  title: string
  value: string | number
  subtext?: string
}) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900 sm:text-2xl">{value}</p>
      {subtext != null && <p className="mt-0.5 break-words text-xs text-gray-500">{subtext}</p>}
    </div>
  )
}

export default function AnalyticsPageClient() {
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [chartsData, setChartsData] = useState<ChartsPayload | null>(null)
  const [chartPeriod, setChartPeriod] = useState<7 | 30 | 90 | 365 | 'last_year' | 'all'>(30)
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const payload = await res.json()
      setData(payload)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCharts = useCallback(async (period: 7 | 30 | 90 | 365 | 'last_year' | 'all') => {
    setChartsLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics/charts?period=${period}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const payload = await res.json()
      setChartsData(payload)
    } catch {
      setChartsData(null)
    } finally {
      setChartsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  useEffect(() => {
    fetchCharts(chartPeriod)
  }, [chartPeriod, fetchCharts])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading message="Loading analytics..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-medium">Error loading analytics</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const { members, payments, events, discussions } = data

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Overview</h2>
          <p className="mt-1 text-sm text-gray-500">
            Key metrics for members, payments, events, and discussions.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-md border border-gray-200 bg-gray-50 p-0.5">
          {CHART_PERIODS.map(({ value, label }) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setChartPeriod(value)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors sm:text-sm ${
                chartPeriod === value
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Members */}
      <section className="min-w-0">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 sm:text-sm">
          Members
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatCard title="Total members" value={members.total} />
          <StatCard
            title="Pending approval"
            value={members.byStatus.pending}
            subtext={`Approved: ${members.byStatus.approved} · Rejected: ${members.byStatus.rejected} · Expired: ${members.byStatus.expired}`}
          />
          <StatCard title="New this month" value={members.newThisMonth} />
        </div>
        {chartsData && (
          <div className="mt-4 min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Members over time</p>
            {chartsLoading ? (
              <div className="flex h-[220px] items-center justify-center text-gray-500 sm:h-[280px]">
                <Loading message="Loading chart..." size="sm" />
              </div>
            ) : (
              <div className="h-[220px] w-full sm:h-[280px]">
                <TimeChart
                  data={chartsData.members}
                  dataKeys={[
                    { key: 'approved', label: 'Approved' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'rejected', label: 'Rejected' },
                    { key: 'expired', label: 'Expired' },
                  ]}
                  period={typeof chartsData.period === 'number' ? chartsData.period : 365}
                  type="area"
                  valueFormatter={(v) => v.toLocaleString()}
                  isAllTime={chartsData.period === 'all'}
                  height="100%"
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Payments / Revenue */}
      <section className="min-w-0">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 sm:text-sm">
          Payments
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatCard
            title="Total revenue"
            value={`$${payments.totalRevenue.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`}
            subtext="All time (completed)"
          />
          <StatCard
            title="Revenue this year"
            value={`$${payments.revenueThisYear.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`}
          />
          <StatCard title="Total payments" value={payments.count} />
          <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-sm font-medium text-gray-500">By method</p>
            <p className="mt-2 break-words text-xs text-gray-600">
              Stripe: {payments.byMethod.stripe} · PayPal: {payments.byMethod.paypal} · Cash:{' '}
              {payments.byMethod.cash} · Wire: {payments.byMethod.wire}
            </p>
          </div>
        </div>
        {chartsData && (
          <div className="mt-4 min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Revenue over time</p>
            {chartsLoading ? (
              <div className="flex h-[220px] items-center justify-center text-gray-500 sm:h-[280px]">
                <Loading message="Loading chart..." size="sm" />
              </div>
            ) : (
              <div className="h-[220px] w-full sm:h-[280px]">
                <TimeChart
                  data={chartsData.revenue}
                  dataKeys={[{ key: 'amount', label: 'Revenue' }]}
                  period={typeof chartsData.period === 'number' ? chartsData.period : 365}
                  type="bar"
                  valueFormatter={(v) => `$${Number(v).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`}
                  integerTicks={false}
                  isAllTime={chartsData.period === 'all'}
                  height="100%"
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Events */}
      <section className="min-w-0">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 sm:text-sm">
          Events
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <StatCard title="Total events" value={events.total} />
          <StatCard title="Total RSVPs" value={events.totalRsvps} />
          <StatCard title="Upcoming events" value={events.upcomingCount} />
        </div>
        {chartsData && (
          <div className="mt-4 min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Events & RSVPs over time</p>
            {chartsLoading ? (
              <div className="flex h-[220px] items-center justify-center text-gray-500 sm:h-[280px]">
                <Loading message="Loading chart..." size="sm" />
              </div>
            ) : (
              <div className="h-[220px] w-full sm:h-[280px]">
                <TimeChart
                  data={chartsData.events}
                  dataKeys={[
                    { key: 'events', label: 'Events created' },
                    { key: 'rsvps', label: 'RSVPs' },
                  ]}
                  period={typeof chartsData.period === 'number' ? chartsData.period : 365}
                  type="bar"
                  valueFormatter={(v) => v.toLocaleString()}
                  isAllTime={chartsData.period === 'all'}
                  height="100%"
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Discussions */}
      <section className="min-w-0">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 sm:text-sm">
          Discussions
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <StatCard title="Threads" value={discussions.threads} />
          <StatCard title="Comments" value={discussions.comments} />
          <StatCard title="Reactions" value={discussions.reactions} />
        </div>
        {chartsData && (
          <div className="mt-4 min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Discussion activity over time</p>
            {chartsLoading ? (
              <div className="flex h-[220px] items-center justify-center text-gray-500 sm:h-[280px]">
                <Loading message="Loading chart..." size="sm" />
              </div>
            ) : (
              <div className="h-[220px] w-full sm:h-[280px]">
                <TimeChart
                  data={chartsData.discussions}
                dataKeys={[
                  { key: 'threads', label: 'Threads' },
                  { key: 'comments', label: 'Comments' },
                  { key: 'reactions', label: 'Reactions' },
                ]}
                  period={typeof chartsData.period === 'number' ? chartsData.period : 365}
                  type="area"
                  valueFormatter={(v) => v.toLocaleString()}
                  isAllTime={chartsData.period === 'all'}
                  height="100%"
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
