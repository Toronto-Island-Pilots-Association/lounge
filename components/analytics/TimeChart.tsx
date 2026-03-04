'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const CHART_COLORS = {
  stroke: 'rgb(99, 102, 241)', // indigo-500
  grid: '#e5e7eb',
  text: '#6b7280',
  tooltipBg: '#fff',
  tooltipBorder: '#e5e7eb',
}

const SERIES_COLORS = ['rgb(99, 102, 241)', 'rgb(16, 185, 129)', 'rgb(245, 158, 11)']

function formatShortDate(dateStr: string, period: number, isAllTime?: boolean): string {
  const d = new Date(dateStr)
  if (isAllTime || period > 90) return d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' })
  if (period <= 7) return d.toLocaleDateString('en-CA', { weekday: 'short' })
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

/** Pick ~8–10 evenly spaced x-axis ticks to avoid crowding */
function getXAxisInterval(dataLength: number, period: number): number {
  if (dataLength <= 8) return 0
  if (period <= 7) return 0
  const targetTicks = period > 90 ? 8 : 10
  return Math.max(1, Math.floor(dataLength / targetTicks))
}

export interface TimeChartProps {
  data: { date: string; [key: string]: string | number }[]
  dataKeys: { key: string; label: string; color?: string }[]
  period: number
  type?: 'area' | 'bar'
  valueFormatter?: (value: number) => string
  height?: number | `${number}%`
  /** When true, Y-axis shows only integer ticks (for counts). Default true. */
  integerTicks?: boolean
  /** When true, range is "all time" (e.g. week/month buckets). Affects x-axis format. */
  isAllTime?: boolean
}

export default function TimeChart({
  data,
  dataKeys,
  period,
  type = 'area',
  valueFormatter = (v) => String(v),
  height = 280,
  integerTicks = true,
  isAllTime = false,
}: TimeChartProps) {
  const xInterval = getXAxisInterval(data.length, period)

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === 'area' ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {dataKeys.map(({ key, color }, i) => (
              <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={color ?? SERIES_COLORS[i % SERIES_COLORS.length]}
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor={color ?? SERIES_COLORS[i % SERIES_COLORS.length]}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatShortDate(v, period, isAllTime)}
            tick={{ fontSize: 11, fill: CHART_COLORS.text }}
            axisLine={false}
            tickLine={false}
            interval={xInterval}
          />
          <YAxis
            tick={{ fontSize: 11, fill: CHART_COLORS.text }}
            axisLine={false}
            tickLine={false}
            tickFormatter={valueFormatter}
            width={36}
            allowDecimals={!integerTicks}
            domain={integerTicks ? [0, 'auto'] : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: CHART_COLORS.tooltipBg,
              border: `1px solid ${CHART_COLORS.tooltipBorder}`,
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelFormatter={(v) => new Date(v).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
            formatter={(value, name) => [valueFormatter(Number(value ?? 0)), name ?? '']}
            labelStyle={{ color: CHART_COLORS.text, fontWeight: 500 }}
          />
          {dataKeys.map(({ key, label, color }, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color ?? SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              fill={`url(#gradient-${key})`}
            />
          ))}
        </AreaChart>
      ) : (
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatShortDate(v, period, isAllTime)}
            tick={{ fontSize: 11, fill: CHART_COLORS.text }}
            axisLine={false}
            tickLine={false}
            interval={xInterval}
          />
          <YAxis
            tick={{ fontSize: 11, fill: CHART_COLORS.text }}
            axisLine={false}
            tickLine={false}
            tickFormatter={valueFormatter}
            width={36}
            allowDecimals={!integerTicks}
            domain={integerTicks ? [0, 'auto'] : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: CHART_COLORS.tooltipBg,
              border: `1px solid ${CHART_COLORS.tooltipBorder}`,
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelFormatter={(v) => new Date(v).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
            formatter={(value, name) => [valueFormatter(Number(value ?? 0)), name ?? '']}
            labelStyle={{ color: CHART_COLORS.text, fontWeight: 500 }}
          />
          {dataKeys.map(({ key, label, color }, i) => (
            <Bar
              key={key}
              dataKey={key}
              name={label}
              fill={color ?? SERIES_COLORS[i % SERIES_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
