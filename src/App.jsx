import { useEffect, useState } from 'react'
import { useDashboard } from './hooks/useDashboard'
import { useBaserowData } from './hooks/useBaserowData'
import { Header } from './components/Header'
import { LiveKPICards } from './components/LiveKPICards'
import { ValueChart } from './components/ValueChart'
import { ReportHistory } from './components/ReportHistory'

export default function App() {
  const { data: engineData, loading: engineLoading } = useDashboard()
  const [timeFilter, setTimeFilter] = useState('all')
  const { kpis, loading: brLoading, error: brError, dateRange: brDateRange } = useBaserowData(timeFilter)

  useEffect(() => {
    if (!engineData?.branding) return
    const b = engineData.branding
    const r = document.documentElement
    if (b.primary_color)   r.style.setProperty('--primary',         b.primary_color)
    if (b.secondary_color) r.style.setProperty('--secondary',       b.secondary_color)
    if (b.text_color)      r.style.setProperty('--text-on-primary', b.text_color)
    if (b.accent)          r.style.setProperty('--accent',          b.accent)
    if (b.font_family)     r.style.setProperty('--font',            b.font_family)
  }, [engineData?.branding])

  useEffect(() => {
    if (engineData?.solution) {
      const name = engineData.branding?.display_name || engineData.solution.client_name
      document.title = `${name} — Performance Dashboard`
    }
  }, [engineData?.solution, engineData?.branding])

  const branding  = engineData?.branding  || {}
  const solution  = engineData?.solution  || {}
  const allRoi    = engineData?.allRoi    || []
  const reports   = engineData?.reports   || []

  // Date range shown in header: Baserow range when loaded, else engine range
  const dateRange = brDateRange || engineData?.latestPeriodEnd || null

  // Show loading screen only until we have at least the engine data shape
  if (engineLoading && !engineData) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading dashboard…</span>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <Header
        solution={solution}
        branding={branding}
        dateRange={dateRange}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
      />

      <main className="dashboard-body">
        <section>
          <p className="section-label">Live performance</p>
          <LiveKPICards kpis={kpis} loading={brLoading} error={brError} />
        </section>

        <div className="grid-2-1">
          <section>
            <p className="section-label">Value trend</p>
            <div className="card" style={{ padding: '20px' }}>
              <ValueChart allRoi={allRoi} branding={branding} />
            </div>
          </section>

          <section>
            <p className="section-label">Report history</p>
            <div className="card">
              <ReportHistory reports={reports} />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
