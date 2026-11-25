/**
 * The activity log: one small timestamped line per thing that happens in the
 * app (page visits with their duration, timers, Lab tempo and modes, loops,
 * videos, song picks and rerolls). Kept on the device, capped, clearable from
 * Settings. The weekly coach review reads a daily SUMMARY of it, never the
 * raw lines, and nothing leaves the device otherwise.
 */
import { getData, update, type AppEvent, type AppData } from '../store/store'
import type { DayKey } from './dates'

export const EVENT_CAP = 3000
export const EVENT_DAYS = 60

let page = { path: '', since: 0, visibleSince: 0, hidden: false }
let buffer: AppEvent[] = []
let flushTimer: number | null = null

/** Append an event. Batched: writes hit localStorage at most every 2 s. */
export function logEvent(type: string, payload: Record<string, unknown> = {}) {
  if (getData().settings.activityLog === false) return
  buffer.push({ t: new Date().toISOString(), type, page: page.path || undefined, ...payload })
  if (flushTimer === null) flushTimer = window.setTimeout(flush, 2000)
}

export function flush() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (!buffer.length) return
  const add = buffer
  buffer = []
  update((d) => ({ ...d, events: trimEvents([...d.events, ...add]) }))
}

export function trimEvents(list: AppEvent[]): AppEvent[] {
  const cutoff = Date.now() - EVENT_DAYS * 86400e3
  const kept = list.filter((e) => Date.parse(e.t) >= cutoff)
  return kept.length > EVENT_CAP ? kept.slice(kept.length - EVENT_CAP) : kept
}

/** Page tracking: called by the app shell on every route change and on visibility changes. */
export function trackPage(path: string) {
  closePage()
  page = { path, since: Date.now(), visibleSince: Date.now(), hidden: document.visibilityState === 'hidden' }
}
function closePage() {
  if (!page.path) return
  const visible = page.hidden ? 0 : Math.round((Date.now() - page.visibleSince) / 1000)
  const total = Math.round((Date.now() - page.since) / 1000)
  if (total >= 2) logEvent('page', { path: page.path, seconds: visible, total })
}
export function onVisibility() {
  if (!page.path) return
  if (document.visibilityState === 'hidden') {
    if (!page.hidden) {
      const visible = Math.round((Date.now() - page.visibleSince) / 1000)
      if (visible >= 2) logEvent('page', { path: page.path, seconds: visible, total: visible, partial: true })
      page.hidden = true
    }
    flush()
  } else {
    page.hidden = false
    page.visibleSince = Date.now()
  }
}
export function installPageTracking() {
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', () => {
    closePage()
    page.path = ''
    flush()
  })
}

/* ---------------- daily summary (what the coach reads) ---------------- */

export type DaySummary = {
  date: DayKey
  pageMinutes: Record<string, number>
  labMinutes: Record<string, number>
  tempos: { part?: string; label?: string; bpm: number }[]
  loops: number
  ladderSteps: number
  videosOpened: string[]
  songRerolls: number
  videosRejected: number
  timerStarts: number
}

const dayOf = (iso: string): DayKey => iso.slice(0, 10) as DayKey
const section = (path: string) => '/' + (path.split('/')[1] ?? '')

export function summarizeEvents(events: AppEvent[], fromDate: DayKey): DaySummary[] {
  const days = new Map<string, DaySummary>()
  const get = (d: string) => {
    let s = days.get(d)
    if (!s) {
      s = { date: d as DayKey, pageMinutes: {}, labMinutes: {}, tempos: [], loops: 0, ladderSteps: 0, videosOpened: [], songRerolls: 0, videosRejected: 0, timerStarts: 0 }
      days.set(d, s)
    }
    return s
  }
  for (const e of events) {
    const d = dayOf(e.t)
    if (d < fromDate) continue
    const s = get(d)
    switch (e.type) {
      case 'page': {
        const k = section(String(e.path ?? ''))
        s.pageMinutes[k] = Math.round(((s.pageMinutes[k] ?? 0) + Number(e.seconds ?? 0) / 60) * 10) / 10
        break
      }
      case 'lab': {
        const k = String(e.mode ?? 'lab')
        if (typeof e.seconds === 'number') s.labMinutes[k] = Math.round(((s.labMinutes[k] ?? 0) + e.seconds / 60) * 10) / 10
        break
      }
      case 'tempo':
        if (typeof e.bpm === 'number') s.tempos.push({ part: e.part as string | undefined, label: e.label as string | undefined, bpm: e.bpm })
        break
      case 'loop':
        s.loops += 1
        break
      case 'ladder':
        s.ladderSteps += 1
        break
      case 'video':
        if (typeof e.id === 'string' && !s.videosOpened.includes(e.id)) s.videosOpened.push(e.id)
        break
      case 'song-reroll':
        s.songRerolls += 1
        break
      case 'video-reject':
        s.videosRejected += 1
        break
      case 'timer-start':
        s.timerStarts += 1
        break
    }
  }
  return [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** A compact text block of the last N days for a prompt. */
export function activityText(data: Pick<AppData, 'events'>, fromDate: DayKey): string {
  const days = summarizeEvents(data.events, fromDate)
  if (!days.length) return '(no activity logged)'
  return days
    .map((d) => {
      const pages = Object.entries(d.pageMinutes)
        .filter(([, m]) => m >= 0.5)
        .map(([k, m]) => `${k} ${m}m`)
        .join(', ')
      const lab = Object.entries(d.labMinutes)
        .map(([k, m]) => `${k} ${m}m`)
        .join(', ')
      const tempos = d.tempos.map((t) => `${t.label ?? t.part ?? ''}@${t.bpm}`).join(', ')
      return `${d.date}: pages[${pages}] lab[${lab}] tempos[${tempos}] loops=${d.loops} ladder=${d.ladderSteps} videos=${d.videosOpened.length} rerolls=${d.songRerolls} rejected=${d.videosRejected} timers=${d.timerStarts}`
    })
    .join('\n')
}
