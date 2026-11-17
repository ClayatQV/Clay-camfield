/**
 * Streaks with a weekly streak freeze.
 *
 * Rules
 * - A day counts as practiced if at least one session was logged for that local date.
 * - The current streak is alive if today or yesterday was practiced (today isn't over yet).
 * - One freeze per week (Mon–Sun, the week of the missed day). It is applied automatically
 *   to a single missed day sitting between two practiced days. Two missed days in a row
 *   always break the streak.
 * - While yesterday is missed and today isn't practiced yet, yesterday is "pending": the
 *   freeze covers it provisionally, and it holds only if you practice today.
 * - Frozen days keep the chain alive but don't add to its length.
 */
import { addDays, diffDays, weekStart, type DayKey } from './dates'

export type StreakInfo = {
  current: number
  longest: number
  practicedToday: boolean
  frozen: Set<DayKey>
  /** yesterday is missed and covered by a freeze that still needs today's practice */
  pendingFreeze: DayKey | null
  /** freeze status for the current Mon–Sun week */
  freezeThisWeek: { used: boolean; day: DayKey | null }
}

export function computeStreaks(practiced: Iterable<DayKey>, today: DayKey): StreakInfo {
  const P = new Set<DayKey>()
  for (const d of practiced) if (diffDays(d, today) >= 0) P.add(d) // ignore future dates
  const frozen = new Set<DayKey>()
  const usedWeeks = new Set<DayKey>()
  let pendingFreeze: DayKey | null = null

  const sorted = [...P].sort()
  if (sorted.length) {
    // Walk every missed day from the first practice to yesterday, in order.
    for (let d = addDays(sorted[0], 1); diffDays(d, today) > 0; d = addDays(d, 1)) {
      if (P.has(d)) continue
      const prev = addDays(d, -1)
      const next = addDays(d, 1)
      const nextOk = P.has(next) || next === today
      const wk = weekStart(d)
      if (P.has(prev) && nextOk && !usedWeeks.has(wk)) {
        frozen.add(d)
        usedWeeks.add(wk)
        if (next === today && !P.has(today)) pendingFreeze = d
      }
    }
  }

  const alive = (d: DayKey) => P.has(d) || frozen.has(d)

  // Current streak: from today (if practiced) or yesterday, walk back.
  let current = 0
  let d = P.has(today) ? today : addDays(today, -1)
  while (alive(d)) {
    if (P.has(d)) current++
    d = addDays(d, -1)
  }

  // Longest streak: scan every chain.
  let longest = 0
  let run = 0
  if (sorted.length) {
    for (let x = sorted[0]; diffDays(x, today) >= 0; x = addDays(x, 1)) {
      if (P.has(x)) {
        run++
        longest = Math.max(longest, run)
      } else if (!frozen.has(x)) {
        run = 0
      }
    }
  }

  const thisWeek = weekStart(today)
  let freezeDay: DayKey | null = null
  for (const f of frozen) if (weekStart(f) === thisWeek) freezeDay = f

  return {
    current,
    longest: Math.max(longest, current),
    practicedToday: P.has(today),
    frozen,
    pendingFreeze,
    freezeThisWeek: { used: !!freezeDay, day: freezeDay },
  }
}
