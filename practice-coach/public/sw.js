/* Practice Coach service worker.
 * The build step (vite.config.ts → swPrecache) replaces the version and the
 * precache list below with every file in dist/. In dev this file is not used. */
const VERSION = '__CACHE_VERSION__'
const CACHE = 'practice-coach-' + VERSION
const PRECACHE = ['__PRECACHE__']

self.addEventListener('install', (event) => {
  // Precache, then WAIT. Taking over while the app is open would delete the
  // running version's cache mid-session (the page went blank during results).
  // The page sends SKIP_WAITING when the player presses Reload on the banner.
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.filter((p) => p !== '__PRECACHE__'))))
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('practice-coach-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // YouTube, fonts and anything else off-origin go straight to the network.
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    // App shell (index.html) or the Fretboard Lab page, ignoring ?presets.
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req, { ignoreSearch: true })
        if (hit) return hit
        try {
          return await fetch(req)
        } catch {
          return (await cache.match('./')) || (await cache.match('index.html')) || Response.error()
        }
      }),
    )
    return
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true })
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok && res.type === 'basic') cache.put(req, res.clone())
      return res
    }),
  )
})
