// jdm-feed — read-only proxy for the deployed JDM dashboard.
//
// WHY THIS EXISTS
//   In dev, vite.config.js proxies two upstreams and injects their secrets:
//     /rest/v1/*  → engine Supabase  (apikey + Bearer service key)
//     /baserow/*  → Baserow          (Authorization: Token …)
//   Neither proxy exists in a static production build (Amplify), so both 404.
//   This function is the production stand-in for BOTH. It also lets the browser
//   reach Baserow, which is plain HTTP on a raw IP — a static HTTPS site would
//   otherwise block it as mixed content. The browser only ever talks HTTPS to
//   this function; the function speaks HTTP to Baserow server-side.
//
// CONTRACT  (everything is GET — read, never own)
//   GET <fn>/rest/v1/<table>?<query>   → <JDM_SUPABASE_URL>/rest/v1/<table>?<query>
//   GET <fn>/baserow/<path>?<query>    → <JDM_BASEROW_URL>/<path>?<query>
//
// DEPLOY
//   supabase functions deploy jdm-feed --no-verify-jwt --project-ref <REF>
//   supabase secrets set \
//     JDM_SUPABASE_URL=https://zxsemlajsocwddelgrcl.supabase.co \
//     JDM_SUPABASE_KEY=<service_role / secret key> \
//     JDM_BASEROW_URL=http://74.234.201.179:8080 \
//     JDM_BASEROW_TOKEN=<baserow token> \
//     JDM_ALLOW_ORIGIN=https://<your-amplify-domain> \
//     --project-ref <REF>

const SUPABASE_URL = Deno.env.get('JDM_SUPABASE_URL')
const SUPABASE_KEY = Deno.env.get('JDM_SUPABASE_KEY')
const BASEROW_URL = (Deno.env.get('JDM_BASEROW_URL') || '').replace(/\/$/, '')
const BASEROW_TOKEN = Deno.env.get('JDM_BASEROW_TOKEN')
const ALLOW_ORIGIN = Deno.env.get('JDM_ALLOW_ORIGIN') || '*'

const cors = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, range, range-unit, prefer, accept, x-client-info',
  'Access-Control-Expose-Headers': 'content-range, content-location, content-type',
  'Vary': 'Origin',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Everything after the function-name segment, plus the query string. Uses a raw
// substring (not split/join) so trailing slashes are preserved — Baserow rejects
// paths without them (URL_TRAILING_SLASH_MISSING).
function rest(reqUrl: string): string {
  const u = new URL(reqUrl)
  const marker = '/jdm-feed/'
  const i = u.pathname.indexOf(marker)
  const p = i >= 0 ? u.pathname.slice(i + marker.length) : u.pathname.replace(/^\/+/, '')
  return p + u.search
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'GET') return json(405, { message: 'Method Not Allowed (read-only proxy)' })

  const path = rest(req.url)
  let target: string
  const headers = new Headers({ Accept: req.headers.get('accept') || 'application/json' })

  if (path.startsWith('rest/v1/')) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return json(500, { message: 'Supabase route not configured' })
    target = `${SUPABASE_URL}/${path}`
    headers.set('apikey', SUPABASE_KEY)
    headers.set('Authorization', `Bearer ${SUPABASE_KEY}`)
    for (const h of ['range', 'range-unit', 'prefer']) {
      const v = req.headers.get(h)
      if (v) headers.set(h, v)
    }
  } else if (path.startsWith('baserow/')) {
    if (!BASEROW_URL || !BASEROW_TOKEN) return json(500, { message: 'Baserow route not configured' })
    target = `${BASEROW_URL}/${path.slice('baserow/'.length)}`
    headers.set('Authorization', `Token ${BASEROW_TOKEN}`)
  } else {
    return json(404, { message: `Unknown route: ${path.split('?')[0]}` })
  }

  let upstream: Response
  try {
    upstream = await fetch(target, { method: 'GET', headers })
  } catch (_e) {
    return json(502, { message: 'Upstream unreachable' })
  }

  const out = new Headers(cors)
  for (const h of ['content-type', 'content-range', 'content-location']) {
    const v = upstream.headers.get(h)
    if (v) out.set(h, v)
  }
  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: out })
})
