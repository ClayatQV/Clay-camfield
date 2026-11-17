/**
 * Minimal hash router (#/path?query). Hash routing works on any static host
 * with no rewrite rules and plays well with the offline service worker.
 */
import { useSyncExternalStore } from 'react'

export type Route = { path: string; segments: string[]; query: URLSearchParams }

function parse(): Route {
  const h = typeof location === 'undefined' ? '' : location.hash.replace(/^#/, '')
  const [p, q = ''] = h.split('?')
  const path = '/' + (p || '').replace(/^\/+|\/+$/g, '')
  return { path, segments: path.split('/').filter(Boolean), query: new URLSearchParams(q) }
}

let current = parse()
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    current = parse()
    listeners.forEach((l) => l())
  })
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => current,
  )
}

/** "/lessons/kid-charlemagne" → "#/lessons/kid-charlemagne" */
export function href(to: string): string {
  return '#' + (to.startsWith('/') ? to : '/' + to)
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const h = href(to)
  if (opts.replace) {
    history.replaceState(null, '', h)
    current = parse()
    listeners.forEach((l) => l())
  } else {
    location.hash = h
  }
}
