// Supabase requests are proxied so the secret key never reaches the browser.
//   • dev  — the Vite proxy at /rest/* (vite.config.js) injects the key.
//   • prod — set VITE_JDM_FEED_URL to the deployed `jdm-feed` edge function; it
//            serves the Supabase route under /rest/v1 and injects the key.
// Default keeps the dev proxy path so `vite dev` works with no extra config.
const FEED = import.meta.env.VITE_JDM_FEED_URL
const SB_BASE = FEED ? `${FEED.replace(/\/$/, '')}/rest/v1` : '/rest/v1'

export const solutionId = import.meta.env.VITE_SOLUTION_ID

if (!solutionId) throw new Error('VITE_SOLUTION_ID must be set in .env')

class QueryBuilder {
  constructor(table) {
    this._table      = table
    this._select     = '*'
    this._filters    = []
    this._order      = []
    this._limitVal   = null
    this._singleMode = false
  }

  select(cols)                          { this._select = cols || '*'; return this }
  eq(col, val)                          { this._filters.push(`${col}=eq.${encodeURIComponent(val)}`); return this }
  order(col, { ascending = true } = {}) { this._order.push(`${col}.${ascending ? 'asc' : 'desc'}`); return this }
  limit(n)                              { this._limitVal = n; return this }
  single()                              { this._singleMode = true; return this }

  _buildUrl() {
    // select must NOT be encoded — PostgREST needs literal commas and parens
    // e.g. clients(name) for resource embedding, col1,col2 for column lists
    const p = [`select=${this._select}`, ...this._filters]
    if (this._order.length)          p.push(`order=${this._order.join(',')}`)
    if (this._singleMode)            p.push('limit=1')
    else if (this._limitVal != null) p.push(`limit=${this._limitVal}`)
    return `${SB_BASE}/${this._table}?${p.join('&')}`
  }

  async _run() {
    const headers = { 'Content-Type': 'application/json' }
    if (this._singleMode) headers['Accept'] = 'application/vnd.pgrst.object+json'
    const res = await fetch(this._buildUrl(), { headers })
    if (!res.ok) {
      let msg = res.statusText
      try { msg = (await res.json()).message || msg } catch (_) { /* ignore */ }
      return { data: null, error: new Error(`${res.status}: ${msg}`) }
    }
    const data = await res.json()
    return { data, error: null }
  }

  then(resolve, reject) { return this._run().then(resolve, reject) }
  catch(fn)             { return this._run().catch(fn) }
  finally(fn)           { return this._run().finally(fn) }
}

export const supabase = {
  from:          (table) => new QueryBuilder(table),
  channel:       ()      => ({ on() { return this }, subscribe() { return this } }),
  removeChannel: ()      => {},
}
