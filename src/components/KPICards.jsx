import './KPICards.css'

function formatValue(value, unit) {
  if (value == null) return '—'
  const n = Number(value)
  if (isNaN(n)) return '—'
  switch (unit) {
    case 'count':    return Math.round(n).toLocaleString()
    case 'hours':    return `${n.toFixed(1)}h`
    case 'currency': return `$${Math.round(n).toLocaleString()}`
    case 'percent':  return `${n.toFixed(1)}%`
    case 'seconds':  return `${Math.round(n)}s`
    default:         return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2)
  }
}

function confidenceBadge(confidence) {
  switch (confidence) {
    case 'high':    return { cls: 'badge badge-green',  label: 'High confidence' }
    case 'low':     return { cls: 'badge badge-amber',  label: 'Low confidence' }
    case 'missing': return { cls: 'badge badge-red',    label: 'Data missing' }
    default:        return { cls: 'badge badge-gray',   label: confidence }
  }
}

function Trend({ current, previous, unit }) {
  if (previous == null || current == null) return null
  const delta = Number(current) - Number(previous)
  if (delta === 0) return <span className="delta delta-flat">→ flat</span>
  const sign = delta > 0 ? '+' : ''
  return (
    <span className={`delta ${delta > 0 ? 'delta-up' : 'delta-down'}`}>
      {delta > 0 ? '↑' : '↓'} {sign}{formatValue(Math.abs(delta), unit)} vs prev
    </span>
  )
}

export function KPICards({ latestKpis, prevKpis }) {
  return (
    <div className="kpi-grid">
      {latestKpis.map((kpi, i) => {
        const prev = prevKpis.find(p => p.kpi_key === kpi.kpi_key)
        const badge = confidenceBadge(kpi.confidence)
        return (
          <div key={`${kpi.kpi_key}_${i}`} className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">{kpi.label || kpi.kpi_key}</span>
              <span className={badge.cls}>{badge.label}</span>
            </div>
            <p className="kpi-value">{formatValue(kpi.value, kpi.unit)}</p>
            <div className="kpi-footer">
              <Trend current={kpi.value} previous={prev?.value} unit={kpi.unit} />
              {kpi.target != null && (
                <span className="kpi-target">
                  Target: {formatValue(kpi.target, kpi.unit)}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
