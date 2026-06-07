import './SummaryBanner.css'

const LEVER_LABELS = {
  capacity:     'Capacity',
  time_saved:   'Time Saved',
  revenue:      'Revenue',
  speed:        'Speed Gain',
  cost_avoided: 'Cost Avoided',
  quality:      'Quality',
}

function formatValue(value, unit) {
  if (value == null) return '—'
  const n = Number(value)
  if (isNaN(n)) return '—'
  const u = (unit || '').toLowerCase()
  if (u.includes('hour') || u === 'h') return `${n.toFixed(1)}h`
  if (u.includes('usd') || u.includes('$') || u.includes('dollar') || u.includes('revenue') || u.includes('cost'))
    return `$${Math.round(n).toLocaleString()}`
  if (u.includes('%') || u.includes('percent')) return `${n.toFixed(1)}%`
  if (u.includes('second') || u === 's') return `${Math.round(n)}s`
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  if (Number.isInteger(n)) return n.toLocaleString()
  return n.toFixed(1)
}

function Delta({ value, unit }) {
  if (value == null) return null
  const n = Number(value)
  if (n === 0) return <span className="delta delta-flat">→ no change</span>
  const sign = n > 0 ? '+' : ''
  return (
    <span className={`delta ${n > 0 ? 'delta-up' : 'delta-down'}`}>
      {n > 0 ? '↑' : '↓'} {sign}{formatValue(Math.abs(n), unit)} vs last period
    </span>
  )
}

export function SummaryBanner({ latestRoi, prevRoi }) {
  return (
    <div className="summary-banner">
      {latestRoi.map((row, i) => {
        const prev = prevRoi.find(p => p.lever === row.lever)
        return (
          <div key={`${row.lever}_${i}`} className="summary-card">
            <p className="summary-lever">{LEVER_LABELS[row.lever] || row.lever}</p>
            <p className="summary-value">{formatValue(row.current_value, row.unit)}</p>
            <p className="summary-sub">
              <Delta value={row.delta_value} unit={row.unit} />
            </p>
            <div className="summary-footer">
              <span className="summary-cumulative-label">Cumulative</span>
              <span className="summary-cumulative-value">
                {formatValue(row.cumulative, row.unit)}
              </span>
            </div>
            {row.assumption_note && (
              <p className="summary-note">{row.assumption_note}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
