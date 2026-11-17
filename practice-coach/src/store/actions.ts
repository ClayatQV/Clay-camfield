/** Today's session: timers, checks, finishing. All state lives in the store's draft. */
import type { PartId } from '../content/types'
import { PART_IDS } from '../content/types'
import { todayKey, type DayKey } from '../lib/dates'
import { emptyParts, getData, update, zeroElapsed, type Draft, type LengthMode, type Session } from './store'

export function newDraft(date: DayKey, lengthMode: LengthMode): Draft {
  return { date, lengthMode, elapsed: zeroElapsed(), running: null, startedAt: null, done: emptyParts(), note: '' }
}

export function draftHasContent(d: Draft | null): boolean {
  if (!d) return false
  return d.running !== null || PART_IDS.some((p) => d.elapsed[p] >= 1 || d.done[p]) || !!d.note.trim()
}

/** Seconds on a part's clock, including the running stretch. */
export function elapsedOf(d: Draft | null, p: PartId, now = Date.now()): number {
  if (!d) return 0
  const run = d.running === p && d.startedAt ? Math.max(0, (now - d.startedAt) / 1000) : 0
  return d.elapsed[p] + run
}

export function totalElapsed(d: Draft | null, now = Date.now()): number {
  return PART_IDS.reduce((s, p) => s + elapsedOf(d, p, now), 0)
}

/** Stop the running clock, folding its time into elapsed. */
function settle(d: Draft, now = Date.now()): Draft {
  if (!d.running || !d.startedAt) return { ...d, running: null, startedAt: null }
  const add = Math.max(0, (now - d.startedAt) / 1000)
  return { ...d, elapsed: { ...d.elapsed, [d.running]: d.elapsed[d.running] + add }, running: null, startedAt: null }
}

/** Get today's draft, creating it (and replacing an empty stale one) if needed. */
function withDraft(today: DayKey, fn: (d: Draft) => Draft) {
  update((data) => {
    let d = data.draft
    if (!d || (d.date !== today && !draftHasContent(d))) d = newDraft(today, data.settings.sessionLength)
    return { ...data, draft: fn(d) }
  })
}

export function startPart(today: DayKey, p: PartId) {
  withDraft(today, (d) => ({ ...settle(d), running: p, startedAt: Date.now() }))
}

export function pauseAll(today: DayKey) {
  withDraft(today, (d) => settle(d))
}

export function toggleDone(today: DayKey, p: PartId) {
  withDraft(today, (d) => {
    const s = d.running === p ? settle(d) : d
    return { ...s, done: { ...s.done, [p]: !s.done[p] } }
  })
}

export function resetPartClock(today: DayKey, p: PartId) {
  withDraft(today, (d) => {
    const s = d.running === p ? settle(d) : d
    return { ...s, elapsed: { ...s.elapsed, [p]: 0 } }
  })
}

export function setLengthMode(today: DayKey, m: LengthMode) {
  withDraft(today, (d) => ({ ...d, lengthMode: m }))
}

export function setNote(today: DayKey, note: string) {
  withDraft(today, (d) => ({ ...d, note }))
}

export function discardDraft() {
  update((data) => ({ ...data, draft: null }))
}

export function finishSession(input: {
  minutes: number
  note: string
  parts: Record<PartId, boolean>
  partLabels: string[]
  block: number
  week: number
}): Session {
  const data = getData()
  const d = data.draft ? settle(data.draft) : newDraft(todayKey(), data.settings.sessionLength)
  const session: Session = {
    id: `${d.date}-${Date.now().toString(36)}`,
    date: d.date,
    minutes: Math.max(1, Math.round(input.minutes)),
    parts: input.parts,
    note: input.note.trim() || undefined,
    lengthMode: d.lengthMode,
    block: input.block,
    week: input.week,
    partLabels: input.partLabels,
    finishedAt: new Date().toISOString(),
  }
  update((x) => ({ ...x, sessions: [...x.sessions, session], draft: null }))
  return session
}

export function deleteSession(id: string) {
  update((x) => ({ ...x, sessions: x.sessions.filter((s) => s.id !== id) }))
}
