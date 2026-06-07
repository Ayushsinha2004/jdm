import './Header.css'

const FILTER_OPTIONS = [
  { value: 'all',  label: 'All time' },
  { value: '90d',  label: 'Last 90 days' },
  { value: '30d',  label: 'Last 30 days' },
  { value: 'period', label: 'Latest period' },
]

export function Header({ solution, branding, dateRange, timeFilter, onTimeFilterChange }) {
  const displayName = branding?.display_name || solution?.client_name || ''

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-brand">
          {branding?.logo_url
            ? <img className="header-logo" src={branding.logo_url} alt={`${displayName} logo`} />
            : <div className="header-logo-placeholder">{displayName.slice(0, 2).toUpperCase()}</div>
          }
          <div>
            <h1 className="header-name">{displayName}</h1>
            <p className="header-sub">Performance Dashboard</p>
          </div>
        </div>

        <div className="header-right">
          <div className="time-filter">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`filter-btn ${timeFilter === opt.value ? 'filter-btn-active' : ''}`}
                onClick={() => onTimeFilterChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="header-meta">
            {dateRange && (
              <div className="header-meta-row">
                <span className="header-meta-label">Period</span>
                <span className="header-meta-value">{dateRange}</span>
              </div>
            )}
            {solution?.next_run_at && (
              <div className="header-meta-row">
                <span className="header-meta-label">Next update</span>
                <span className="header-meta-value">
                  {new Date(solution.next_run_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
