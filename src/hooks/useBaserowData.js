import { useState, useEffect, useCallback, useRef } from 'react'

const TABLE_QUERIES = 746   // User Queries
const TABLE_ORDERS  = 747   // Orders
const CACHE_TTL_MS  = 5 * 60 * 1000

// Baserow single-select fields return {id, value, color} objects
function val(field) {
  if (!field) return ''
  if (typeof field === 'object' && 'value' in field) return field.value || ''
  return String(field)
}

async function fetchAllRows(tableId) {
  const rows = []
  let path = `/baserow/api/database/rows/table/${tableId}/?size=200&user_field_names=true`
  while (path) {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`Baserow table ${tableId}: ${res.status} ${res.statusText}`)
    const json = await res.json()
    rows.push(...(json.results || []))
    if (json.next) {
      const u = new URL(json.next)
      path = `/baserow${u.pathname}${u.search}`
    } else {
      path = null
    }
  }
  return rows
}

function parseDate(str) {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d) ? null : d
}

function cutoffForFilter(filter) {
  if (!filter || filter === 'all') return null
  const d = new Date()
  if (filter === '90d')    d.setDate(d.getDate() - 90)
  if (filter === '30d')    d.setDate(d.getDate() - 30)
  if (filter === 'period') d.setDate(d.getDate() - 7)
  return d
}

function computeKpis(queries, orders, cutoff) {
  const q = cutoff
    ? queries.filter(r => { const d = parseDate(r['Query Time']); return d && d >= cutoff })
    : queries

  const o = cutoff
    ? orders.filter(r => { const d = parseDate(r['Created on']); return d && d >= cutoff })
    : orders

  const totalQ      = q.length
  const repliesSent = q.filter(r => val(r['Email status']) === 'Email sent').length

  // Auto-classified = NOT "Manual Intervention required" (and has a category)
  const manualCount = q.filter(r => val(r['Query Category']) === 'Manual Intervention required').length
  const autoRate    = totalQ > 0 ? ((totalQ - manualCount) / totalQ) * 100 : 0

  const totalOrders = o.length
  const timeSavedH  = (totalQ * 10) / 60  // 10 min per query

  // Category breakdown
  const categoryBreakdown = {}
  q.forEach(r => {
    const cat = val(r['Query Category']) || 'Uncategorised'
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
  })

  // Provider breakdown
  const providerBreakdown = {}
  o.forEach(r => {
    const prov = val(r['Provider']) || 'Unknown'
    if (prov === 'None' || !prov) return
    providerBreakdown[prov] = (providerBreakdown[prov] || 0) + 1
  })

  return {
    queries_processed:        totalQ,
    replies_sent:             repliesSent,
    auto_classification_rate: autoRate,
    manual_interventions:     manualCount,
    orders_identified:        totalOrders,
    time_saved_h:             timeSavedH,
    categoryBreakdown,
    providerBreakdown,
  }
}

function dataDateRange(queries, orders) {
  const dates = [
    ...queries.map(r => parseDate(r['Query Time'])),
    ...orders.map(r => parseDate(r['Created on'])),
  ].filter(Boolean)
  if (!dates.length) return null
  dates.sort((a, b) => a - b)
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(dates[0])} – ${fmt(dates.at(-1))}`
}

export function useBaserowData(timeFilter) {
  const [kpis,      setKpis]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [dateRange, setDateRange] = useState(null)

  const rawRef = useRef({ queries: null, orders: null, fetchedAt: 0 })

  const load = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const cache = rawRef.current
      const stale = Date.now() - cache.fetchedAt > CACHE_TTL_MS

      if (force || stale || !cache.queries) {
        const [queries, orders] = await Promise.all([
          fetchAllRows(TABLE_QUERIES),
          fetchAllRows(TABLE_ORDERS),
        ])
        cache.queries   = queries
        cache.orders    = orders
        cache.fetchedAt = Date.now()
      }

      const cutoff = cutoffForFilter(timeFilter)
      setKpis(computeKpis(cache.queries, cache.orders, cutoff))
      setDateRange(dataDateRange(cache.queries, cache.orders))
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load live data from Baserow')
    } finally {
      setLoading(false)
    }
  }, [timeFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setInterval(() => load(true), CACHE_TTL_MS)
    return () => clearInterval(t)
  }, [load])

  return { kpis, loading, error, dateRange }
}
