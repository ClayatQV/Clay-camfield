/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

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

export default defineConfig({
  base: './',
  plugins: [react(), swPrecache()],
  test: {
    environment: 'node',
  },
})
