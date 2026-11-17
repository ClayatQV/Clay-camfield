// Renders public/icons/icon.svg to the PNG sizes the manifest needs, using the
// pre-installed Playwright Chromium. Run: node scripts/make-icons.cjs
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const dir = path.join(__dirname, '..', 'public', 'icons')
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8')
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage()
  const out = [
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
    ['apple-touch-icon.png', 180, true],
    ['maskable-512.png', 512, true],
  ]
  for (const [name, size, full] of out) {
    await p.setViewportSize({ width: size, height: size })
    // full-bleed variants: square background, pick scaled into the safe zone
    const inner = full
      ? svg.replace('rx="112"', 'rx="0"').replace('<path', '<g transform="translate(51 51) scale(0.8)"><path').replace('</svg>', '</g></svg>').replace('<g stroke', '<g stroke').replace(/(<circle[^>]*\/>)\n<\/g><\/svg>/, '$1</g></svg>')
      : svg
    await p.setContent(`<html><body style="margin:0;background:transparent">${inner.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
    await p.screenshot({ path: path.join(dir, name), omitBackground: !full, clip: { x: 0, y: 0, width: size, height: size } })
  }
  await b.close()
  console.log('icons written')
})()
