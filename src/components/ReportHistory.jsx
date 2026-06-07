import './ReportHistory.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatPeriod(start, end) {
  const s = new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const e = new Date(end).toLocaleDateString('en-GB',   { day: 'numeric', month: 'short' })
  return `${s} – ${e}`
}

export function ReportHistory({ reports }) {
  if (!reports.length) {
    return (
      <p className="empty">No reports sent yet.</p>
    )
  }

  return (
    <div className="report-history">
      <table className="report-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Ver</th>
            <th>Sent</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(r => (
            <tr key={r.id}>
              <td className="period-cell">
                {formatPeriod(r.period_start, r.period_end)}
              </td>
              <td className="ver-cell">v{r.version}</td>
              <td className="sent-cell">{formatDate(r.sent_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
