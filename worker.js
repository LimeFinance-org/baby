export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url)
    const TARGET = 'https://t.me/s/babyChannels'
    if (u.pathname === '/viewer' || (u.searchParams.get('mode') === 'viewer')) {
      const html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Forward Viewer</title><style>html,body{height:100%;margin:0;background:#111} .wrap{position:fixed;inset:0} iframe{width:100%;height:100%;border:0;background:#fff}</style></head><body><div class="wrap"><iframe src="/proxy" loading="eager"></iframe></div></body></html>'
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }
    if (u.pathname === '/logs' || (u.searchParams.get('mode') === 'logs')) {
      if (!env.LOGS) return new Response('KV not bound', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } })
      const cursor = u.searchParams.get('cursor') || undefined
      const list = await env.LOGS.list({ prefix: 'log:', limit: 100, cursor })
      const entries = []
      for (const k of list.keys) {
        const v = await env.LOGS.get(k.name)
        if (v) entries.push(JSON.parse(v))
      }
      return new Response(JSON.stringify({ entries, cursor: list.cursor || null }), { headers: { 'content-type': 'application/json; charset=utf-8' } })
    }
    if (u.pathname === '/' || u.pathname === '/proxy' || u.pathname.startsWith('/s/')) {
      const originPath = u.pathname === '/' || u.pathname === '/proxy' ? '/s/babyChannels' : u.pathname
      const targetUrl = 'https://t.me' + originPath + (u.search || '')
      const h = new Headers()
      const ua = req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      h.set('user-agent', ua)
      h.set('accept', req.headers.get('accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
      h.set('accept-language', req.headers.get('accept-language') || 'zh-CN,zh;q=0.9,en;q=0.8')
      h.set('connection', 'close')
      h.set('referer', TARGET)
      const xrwIn = req.headers.get('x-requested-with')
      if (xrwIn) h.set('x-requested-with', xrwIn)
      if (u.searchParams.has('before') || u.searchParams.has('after')) h.set('x-requested-with', 'XMLHttpRequest')
      const cookie = req.headers.get('cookie')
      if (cookie) h.set('cookie', cookie)
      let resp
      try {
        resp = await fetch(targetUrl, { method: 'GET', headers: h, redirect: 'follow' })
      } catch (e) {
        const entry = {
          ts: new Date().toISOString(),
          method: req.method,
          path: u.pathname,
          query: u.search.slice(1),
          ip: req.headers.get('cf-connecting-ip') || '',
          ua: req.headers.get('user-agent') || '',
          ref: req.headers.get('referer') || '',
          code: 502,
          content_type: 'text/plain; charset=utf-8',
          target: targetUrl
        }
        if (env.LOGS) await env.LOGS.put('log:' + Date.now() + ':' + crypto.randomUUID(), JSON.stringify(entry))
        return new Response(String(e), { status: 502, headers: { 'content-type': 'text/plain; charset=utf-8' } })
      }
      const entry = {
        ts: new Date().toISOString(),
        method: req.method,
        path: u.pathname,
        query: u.search.slice(1),
        ip: req.headers.get('cf-connecting-ip') || '',
        ua: req.headers.get('user-agent') || '',
        ref: req.headers.get('referer') || '',
        code: resp.status,
        content_type: resp.headers.get('content-type') || '',
        target: targetUrl
      }
      if (env.LOGS) await env.LOGS.put('log:' + Date.now() + ':' + crypto.randomUUID(), JSON.stringify(entry))
      const ctype = resp.headers.get('content-type') || 'text/html; charset=utf-8'
      return new Response(resp.body, { status: resp.status, headers: { 'content-type': ctype } })
    }
    return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }
}
