import './LiveKPICards.css'

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, highlight, tag, tagColor }) {
  return (
    <div className={`stat-card ${highlight ? 'stat-card--highlight' : ''}`}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {tag && (
          <span className="stat-card__tag" style={{ '--tag': tagColor || 'var(--primary)' }}>
            {tag}
          </span>
        )}
      </div>
      <p className="stat-card__value">{value}</p>
      {sub && <p className="stat-card__sub">{sub}</p>}
    </div>
  )
}

// ── Horizontal bar list ────────────────────────────────────────────────────
// Split-scale: if the top entry is >10× the second, it gets its own scale at
// 100% and the remaining entries are rescaled among themselves. This keeps the
// dominant bar honest while making minor-category differences visible.
function HBarList({ data, colorMap }) {
  const entries = Object.entries(data)
    .filter(([k]) => k !== 'None' && k)
    .sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (!total) return <p className="no-data">No data</p>

  const topVal     = entries[0]?.[1] || 1
  const secondVal  = entries[1]?.[1] || topVal
  const skewed     = topVal > secondVal * 10  // dominant top entry

  // For skewed data: minor entries share their own scale
  const minorMax   = skewed ? secondVal || 1 : topVal

  return (
    <ul className="hbar-list">
      {entries.map(([key, count], idx) => {
        const isTop    = idx === 0 && skewed
        const scaleMax = isTop ? topVal : minorMax
        const barPct   = Math.min((count / scaleMax) * 100, 100)
        const sharePct = (count / total) * 100

        return (
          <>
            {skewed && idx === 1 && (
              <li key="__divider" className="hbar-divider" aria-hidden>
                <span className="hbar-divider-label">breakdown</span>
              </li>
            )}
            <li key={key} className="hbar-row">
              <span className="hbar-name" title={key}>{key}</span>
              <div className={`hbar-track ${isTop ? '' : 'hbar-track--minor'}`}>
                <div
                  className="hbar-fill"
                  style={{
                    width: `${Math.max(barPct, 3)}%`,
                    background: colorMap[key] || 'var(--primary)',
                    opacity: isTop ? 1 : 0.85,
                  }}
                />
              </div>
              <span className="hbar-count">{count.toLocaleString()}</span>
              <span className="hbar-pct">{sharePct < 1 ? '<1' : sharePct.toFixed(0)}%</span>
            </li>
          </>
        )
      })}
    </ul>
  )
}

// ── Colour maps ────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  'Tracking Request':             '#3b82f6',
  'Return & Refund Updates':      '#f59e0b',
  'Return Request':               '#f97316',
  'Investigation Request':        '#8b5cf6',
  'Message sent':                 '#10b981',
  'Manual Intervention required': '#ef4444',
  'Uncategorised':                '#94a3b8',
}

const PROVIDER_COLORS = {
  'DHL':        '#f59e0b',
  'DPD':        '#ef4444',
  'Royal Mail': '#dc2626',
  'Parcelforce':'#2563eb',
  'Other':      '#94a3b8',
}

// ── Main export ────────────────────────────────────────────────────────────
export function LiveKPICards({ kpis, loading, error }) {
  if (loading && !kpis) {
    return (
      <div className="live-loading">
        <div className="spinner" />
        <span>Fetching live data from Baserow…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="live-error">
        <span className="live-error__icon">⚠</span>
        <span>Live data unavailable: {error}</span>
      </div>
    )
  }

  if (!kpis) return null

  const {
    queries_processed, replies_sent, auto_classification_rate,
    orders_identified, time_saved_h, manual_interventions,
    categoryBreakdown, providerBreakdown,
  } = kpis

  const replyRate = queries_processed > 0
    ? Math.round((replies_sent / queries_processed) * 100)
    : 0

  return (
    <div className="live-section">

      {/* ── KPI stats row ── */}
      <div className="stats-grid">
        <StatCard
          label="Customer Queries"
          value={queries_processed.toLocaleString()}
          sub="Total processed by agent"
          highlight
        />
        <StatCard
          label="Replies Sent"
          value={replies_sent.toLocaleString()}
          sub={`${replyRate}% reply rate`}
          tag={`${replyRate}%`}
          tagColor="#3b82f6"
        />
        <StatCard
          label="Auto-Classification"
          value={`${auto_classification_rate.toFixed(1)}%`}
          sub="Target ≥ 97%"
          highlight={auto_classification_rate >= 97}
          tag={auto_classification_rate >= 97 ? '✓ On target' : '↓ Below target'}
          tagColor={auto_classification_rate >= 97 ? '#10b981' : '#ef4444'}
        />
        <StatCard
          label="Orders Identified"
          value={orders_identified.toLocaleString()}
          sub="Auto-matched shipments"
        />
        <StatCard
          label="Time Saved"
          value={`${time_saved_h.toFixed(1)}h`}
          sub="Est. 10 min / query"
          highlight
          tag={`${Math.round(time_saved_h / 8)}d equiv.`}
          tagColor="var(--primary)"
        />
        <StatCard
          label="Manual Interventions"
          value={manual_interventions.toLocaleString()}
          sub={`${(100 - auto_classification_rate).toFixed(1)}% of queries`}
          tagColor="#10b981"
        />
      </div>

      {/* ── Breakdown charts ── */}
      <div className="breakdown-grid">
        <div className="breakdown-card">
          <div className="breakdown-card__header">
            <span className="breakdown-card__title">Query Categories</span>
            <span className="breakdown-card__total">{queries_processed.toLocaleString()} total</span>
          </div>
          <HBarList data={categoryBreakdown} colorMap={CATEGORY_COLORS} />
        </div>

        <div className="breakdown-card">
          <div className="breakdown-card__header">
            <span className="breakdown-card__title">Orders by Carrier</span>
            <span className="breakdown-card__total">{orders_identified.toLocaleString()} total</span>
          </div>
          <HBarList data={providerBreakdown} colorMap={PROVIDER_COLORS} maxLabel={120} />
        </div>
      </div>

    </div>
  )
}
