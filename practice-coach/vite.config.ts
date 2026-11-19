/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Tiny hand-rolled replacement for a PWA plugin: after the build, list every
 * emitted file and inject it into dist/sw.js as the precache manifest, with a
 * cache version derived from the file contents. Keeps dependencies at zero.
 */
function swPrecache(): Plugin {
  let outDir = 'dist'
  return {
    name: 'sw-precache',
    apply: 'build',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir)
    },
    closeBundle() {
      const swPath = path.join(outDir, 'sw.js')
      if (!fs.existsSync(swPath)) return
      const files: string[] = []
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name)
          if (e.isDirectory()) walk(p)
          else files.push(path.relative(outDir, p).split(path.sep).join('/'))
        }
      }
      walk(outDir)
      const list = files.filter((f) => f !== 'sw.js' && !f.endsWith('.map')).sort()
      const h = createHash('sha1')
      for (const f of list) h.update(f).update(fs.readFileSync(path.join(outDir, f)))
      const version = h.digest('hex').slice(0, 12)
      const sw = fs
        .readFileSync(swPath, 'utf8')
        .replace('__CACHE_VERSION__', version)
        .replace("['__PRECACHE__']", JSON.stringify(['./', ...list]))
      fs.writeFileSync(swPath, sw)
    },
  }
}

/**
 * Local dev/preview: mount the same API handlers Vercel runs from /api, so the
 * AI coach works on localhost. Needs ANTHROPIC_API_KEY and APP_PASSCODE in the
 * environment (e.g. a .env.local file, which git ignores).
 */
function apiMount(): Plugin {
  let root = process.cwd()
  const mount = (server: { middlewares: { use: (fn: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void) => void) => void } }) => {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? ''
      if (!url.startsWith('/api/')) return next()
      const name = url.slice(5).split('?')[0].replace(/[^a-z-]/g, '')
      void (async () => {
        try {
          const file = pathToFileURL(path.join(root, 'api', `${name}.ts`)).href
          const mod = (await import(file)) as { default: (r: Request) => Promise<Response> }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          const r = await mod.default(new Request(`http://localhost${url}`, { method: req.method, headers, body }))
          res.statusCode = r.status
          r.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await r.arrayBuffer()))
        } catch (e) {
          res.statusCode = 404
          res.end(JSON.stringify({ error: `No such API route: ${name}`, detail: String(e) }))
        }
      })()
    })
  }
  return {
    name: 'api-mount',
    configResolved(c) {
      root = c.root
    },
    configureServer: mount,
    configurePreviewServer: mount,
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), swPrecache(), apiMount()],
  test: {
    environment: 'node',
  },
})
