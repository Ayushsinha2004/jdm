import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Supabase — strip browser detection headers, inject auth server-side
        '/rest': {
          target:       env.VITE_SUPABASE_URL,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
              proxyReq.removeHeader('sec-fetch-site')
              proxyReq.removeHeader('sec-fetch-mode')
              proxyReq.removeHeader('sec-fetch-dest')
              proxyReq.removeHeader('sec-ch-ua')
              proxyReq.removeHeader('sec-ch-ua-mobile')
              proxyReq.removeHeader('sec-ch-ua-platform')
              proxyReq.removeHeader('user-agent')
              proxyReq.setHeader('apikey',        env.VITE_SUPABASE_ANON_KEY)
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_SUPABASE_ANON_KEY}`)
            })
          },
        },
        // Baserow — live operational data; inject token server-side
        '/baserow': {
          target:       env.VITE_BASEROW_URL,
          changeOrigin: true,
          rewrite:      (path) => path.replace(/^\/baserow/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
              proxyReq.removeHeader('sec-fetch-site')
              proxyReq.removeHeader('sec-fetch-mode')
              proxyReq.removeHeader('sec-fetch-dest')
              proxyReq.removeHeader('sec-ch-ua')
              proxyReq.removeHeader('sec-ch-ua-mobile')
              proxyReq.removeHeader('sec-ch-ua-platform')
              proxyReq.removeHeader('user-agent')
              proxyReq.setHeader('Authorization', `Token ${env.VITE_BASEROW_TOKEN}`)
            })
          },
        },
      },
    },
  }
})
