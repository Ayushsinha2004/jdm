import { useState, useEffect, useCallback } from 'react'
import { supabase, solutionId } from '../lib/supabase'

export function useDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    try {
      // All queries hit base tables that exist after engine onboard.
      // No migration 0003 needed — views were a convenience, not a requirement.
      const [solRes, kpiDefsRes, kpiSnapsRes, leverDefsRes, roiRes, reportsRes] = await Promise.all([
        supabase
          .from('solutions')
          .select('id,name,status,cadence,launch_date,next_run_at,report_spec,clients(name)')
          .eq('id', solutionId)
          .single(),
        supabase
          .from('kpis')
          .select('key,label,unit,target,baseline')
          .eq('solution_id', solutionId),
        supabase
          .from('kpi_snapshots')
          .select('kpi_key,period_start,period_end,value,confidence')
          .eq('solution_id', solutionId)
          .order('period_end', { ascending: true }),
        supabase
          .from('value_levers')
          .select('lever,assumption')
          .eq('solution_id', solutionId),
        supabase
          .from('roi_results')
          .select('lever,period_start,period_end,current_value,delta_value,cumulative')
          .eq('solution_id', solutionId)
          .order('period_end', { ascending: true }),
        supabase
          .from('report_runs')
          .select('id,period_start,period_end,version,approved_by,sent_at,created_at')
          .eq('solution_id', solutionId)
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })
          .limit(20),
      ])

      if (solRes.error) throw new Error(solRes.error.message || String(solRes.error))

      const sol = solRes.data

      // Branding lives in report_spec.branding (written by engine onboard).
      // Map old field names (accent, client_logo) to the new dashboard fields
      // so the dashboard looks right even before set-branding is re-run.
      const raw = sol?.report_spec?.branding || {}
      const branding = {
        ...raw,
        display_name:    raw.display_name    || sol?.clients?.name || '',
        logo_url:        raw.logo_url        || raw.client_logo    || null,
        primary_color:   raw.primary_color   || raw.accent         || '#0f172a',
        secondary_color: raw.secondary_color || raw.accent         || '#1e3a8a',
        text_color:      raw.text_color      || '#ffffff',
      }

      // KPI lookup map: key → { label, unit, target, baseline }
      const kpiDefMap = Object.fromEntries(
        (kpiDefsRes.data || []).map(d => [d.key, d])
      )

      // Lever lookup map: lever → { unit, assumption_note }
      const leverDefMap = Object.fromEntries(
        (leverDefsRes.data || []).map(l => [l.lever, {
          unit:            l.assumption?.unit || '',
          assumption_note: l.assumption?.note || '',
        }])
      )

      // Enrich KPI snapshots with labels + units from kpi definitions
      const allKpiSnaps = (kpiSnapsRes.data || []).map(ks => ({
        ...ks,
        label:    kpiDefMap[ks.kpi_key]?.label    || ks.kpi_key,
        unit:     kpiDefMap[ks.kpi_key]?.unit     || '',
        target:   kpiDefMap[ks.kpi_key]?.target   ?? null,
        baseline: kpiDefMap[ks.kpi_key]?.baseline ?? null,
      }))

      // Enrich ROI results with unit + note from lever definitions
      const allRoi = (roiRes.data || []).map(r => ({
        ...r,
        unit:            leverDefMap[r.lever]?.unit            || '',
        assumption_note: leverDefMap[r.lever]?.assumption_note || '',
      }))

      // Derive period lists for latest / previous period comparisons
      const kpiPeriods    = [...new Set(allKpiSnaps.map(k => k.period_end))].sort()
      const latestPeriod  = kpiPeriods.at(-1)
      const prevPeriod    = kpiPeriods.at(-2)

      setData({
        solution:        sol,
        branding,
        allKpiSnaps,
        latestKpis:      allKpiSnaps.filter(k => k.period_end === latestPeriod),
        prevKpis:        allKpiSnaps.filter(k => k.period_end === prevPeriod),
        kpiPeriods,
        allRoi,
        latestRoi:       allRoi.filter(r => r.period_end === latestPeriod),
        prevRoi:         allRoi.filter(r => r.period_end === prevPeriod),
        reports:         reportsRes.data || [],
        latestPeriodEnd: latestPeriod,
      })
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Refresh every 60 s — picks up new data after each engine collect run
    const timer = setInterval(load, 60_000)
    return () => clearInterval(timer)
  }, [load])

  return { data, loading, error, reload: load }
}
