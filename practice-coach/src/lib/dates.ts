/** Local-date helpers. A "day" is a local calendar date string YYYY-MM-DD (never UTC). */

export type DayKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse a DayKey as local midnight. */
export function fromKey(k: DayKey): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function todayKey(now: Date = new Date()): DayKey {
  return toKey(now)
}

export function addDays(k: DayKey, n: number): DayKey {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/** Whole calendar days from a to b (b − a). DST-safe because it rounds. */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000)
}

/** Monday of the week containing k. */
export function weekStart(k: DayKey): DayKey {
  const d = fromKey(k)
  const dow = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
  return addDays(k, -dow)
}

export function isValidKey(k: unknown): k is DayKey {
  return typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && !Number.isNaN(fromKey(k).getTime())
}

export function formatLong(k: DayKey): string {
  return fromKey(k).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function formatShort(k: DayKey): string {
  return fromKey(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function weekdayShort(k: DayKey): string {
  return fromKey(k).toLocaleDateString(undefined, { weekday: 'short' })
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${pad(s % 60)}`
}
