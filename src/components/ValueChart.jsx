import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import './ValueChart.css'

const LEVER_LABELS = {
  capacity:     'Capacity',
  time_saved:   'Time Saved',
  revenue:      'Revenue',
  speed:        'Speed Gain',
  cost_avoided: 'Cost Avoided',
  quality:      'Quality',
}

const LEVER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4',
]

function formatPeriod(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatAxis(value) {
  if (value == null) return ''
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`
  return Number.isInteger(value) ? value.toString() : value.toFixed(1)
}

export function ValueChart({ allRoi, branding }) {
  const levers  = useMemo(() => [...new Set(allRoi.map(r => r.lever))], [allRoi])
  const periods = useMemo(() => [...new Set(allRoi.map(r => r.period_end))].sort(), [allRoi])

  const [activeLever, setActiveLever] = useState(null)
  const displayLevers = activeLever ? [activeLever] : levers

  const chartData = useMemo(() => {
    return periods.map(period => {
      const row = { period }
      allRoi
        .filter(r => r.period_end === period)
        .forEach(r => { row[r.lever] = Number(r.cumulative) || 0 })
      return row
    })
  }, [periods, allRoi])

  // Pick the unit label from the first available lever
  const unitLabel = useMemo(() => {
    if (!allRoi.length) return ''
    const first = allRoi.find(r => !activeLever || r.lever === activeLever)
    return first?.unit || ''
  }, [allRoi, activeLever])

  if (!chartData.length) {
    return <p className="empty">No value data yet. Run a collect cycle to populate the chart.</p>
  }

  return (
    <div className="value-chart">
      {levers.length > 1 && (
        <div className="chart-lever-tabs">
          <button
            className={`chart-tab ${!activeLever ? 'active' : ''}`}
            onClick={() => setActiveLever(null)}
          >
            All
          </button>
          {levers.map((l, i) => (
            <button
              key={l}
              className={`chart-tab ${activeLever === l ? 'active' : ''}`}
              style={activeLever === l ? { borderColor: LEVER_COLORS[i % LEVER_COLORS.length] } : {}}
              onClick={() => setActiveLever(l === activeLever ? null : l)}
            >
              {LEVER_LABELS[l] || l}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {displayLevers.map((l, i) => (
              <linearGradient key={l} id={`grad-${l}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={LEVER_COLORS[levers.indexOf(l) % LEVER_COLORS.length]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={LEVER_COLORS[levers.indexOf(l) % LEVER_COLORS.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={formatPeriod}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatAxis}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={48}
            label={unitLabel ? { value: unitLabel, angle: -90, position: 'insideLeft', style: { fill: 'var(--text-muted)', fontSize: 10 } } : undefined}
          />
          <Tooltip
            contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            labelFormatter={formatPeriod}
            formatter={(value, name) => [formatAxis(value) + (unitLabel ? ` ${unitLabel}` : ''), LEVER_LABELS[name] || name]}
          />
          {displayLevers.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {displayLevers.map((l, i) => {
            const color = LEVER_COLORS[levers.indexOf(l) % LEVER_COLORS.length]
            return (
              <Area
                key={l}
                type="monotone"
                dataKey={l}
                name={LEVER_LABELS[l] || l}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${l})`}
                dot={false}
                activeDot={{ r: 4, stroke: color }}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>

      <p className="chart-caption">Cumulative value delivered since launch</p>
    </div>
  )
}
