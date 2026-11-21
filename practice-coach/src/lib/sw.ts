/**
 * Service-worker update flow. A new version installs in the background and
 * waits; the app shows a banner; `applyUpdate()` activates it and reloads.
 * Nothing changes under the player's feet mid-assessment.
 */
let registration: ServiceWorkerRegistration | null = null
let applying = false

function announce() {
  window.dispatchEvent(new Event('pc:update-ready'))
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        registration = reg
        // An update that finished installing on an earlier visit is still waiting.
        if (reg.waiting && navigator.serviceWorker.controller) announce()
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing
          if (!sw) return
          sw.addEventListener('statechange', () => {
            // 'installed' with an existing controller = a new version is waiting.
            if (sw.state === 'installed' && navigator.serviceWorker.controller) announce()
          })
        })
      })
      .catch(() => {})
    // When the waiting worker takes over (after applyUpdate), load the new version.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (applying) location.reload()
    })
  })
}

/** Activate the waiting version and reload. Safe to call when nothing is waiting. */
export function applyUpdate() {
  applying = true
  const waiting = registration?.waiting
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' })
    // If controllerchange never fires (odd browsers), reload anyway.
    setTimeout(() => location.reload(), 2500)
  } else {
    location.reload()
  }
}
