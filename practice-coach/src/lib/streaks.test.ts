import { describe, expect, it } from 'vitest'
import { computeStreaks } from './streaks'
import { addDays } from './dates'

// 2026-11-16 is a Monday.
const MON = '2026-11-16'
const days = (start: string, offsets: number[]) => offsets.map((o) => addDays(start, o))

describe('computeStreaks', () => {
  it('is zero with no sessions', () => {
    const s = computeStreaks([], MON)
    expect(s.current).toBe(0)
    expect(s.longest).toBe(0)
    expect(s.freezeThisWeek.used).toBe(false)
  })

  it('counts consecutive days including today', () => {
    const today = addDays(MON, 4) // Fri
    const s = computeStreaks(days(MON, [0, 1, 2, 3, 4]), today)
    expect(s.current).toBe(5)
    expect(s.practicedToday).toBe(true)
  })

  it('keeps the streak alive when today is not practiced yet', () => {
    const today = addDays(MON, 4)
    const s = computeStreaks(days(MON, [0, 1, 2, 3]), today)
    expect(s.current).toBe(4)
    expect(s.practicedToday).toBe(false)
  })

  it('freezes a single missed day between practiced days', () => {
    const today = addDays(MON, 4)
    const s = computeStreaks(days(MON, [0, 1, 3, 4]), today) // missed Wed
    expect(s.frozen.has(addDays(MON, 2))).toBe(true)
    expect(s.current).toBe(4)
    expect(s.freezeThisWeek).toEqual({ used: true, day: addDays(MON, 2) })
  })

  it('allows only one freeze per Mon–Sun week', () => {
    const today = addDays(MON, 6) // Sun
    const s = computeStreaks(days(MON, [0, 2, 4, 5, 6]), today) // missed Tue and Thu
    expect(s.frozen.has(addDays(MON, 1))).toBe(true)
    expect(s.frozen.has(addDays(MON, 3))).toBe(false)
    expect(s.current).toBe(3) // Fri, Sat, Sun
    expect(s.longest).toBe(3)
  })

  it('gives a fresh freeze the next week', () => {
    const today = addDays(MON, 10) // next Thu
    // missed Tue (week 1) and next Tue (week 2)
    const s = computeStreaks(days(MON, [0, 2, 3, 4, 5, 6, 7, 9, 10]), today)
    expect(s.frozen.size).toBe(2)
    expect(s.current).toBe(9)
  })

  it('breaks on two missed days in a row', () => {
    const today = addDays(MON, 5)
    const s = computeStreaks(days(MON, [0, 1, 4, 5]), today) // missed Wed+Thu
    expect(s.frozen.size).toBe(0)
    expect(s.current).toBe(2)
    expect(s.longest).toBe(2)
  })

  it('marks yesterday as a pending freeze until today is practiced', () => {
    const today = addDays(MON, 3) // Thu, nothing yet; Wed missed
    const s = computeStreaks(days(MON, [0, 1]), today)
    expect(s.pendingFreeze).toBe(addDays(MON, 2))
    expect(s.current).toBe(2)
    // Next day, still nothing → streak is gone.
    const s2 = computeStreaks(days(MON, [0, 1]), addDays(MON, 4))
    expect(s2.current).toBe(0)
    expect(s2.frozen.size).toBe(0)
  })

  it('resolves a pending freeze once today is practiced', () => {
    const today = addDays(MON, 3)
    const s = computeStreaks(days(MON, [0, 1, 3]), today)
    expect(s.pendingFreeze).toBe(null)
    expect(s.frozen.has(addDays(MON, 2))).toBe(true)
    expect(s.current).toBe(3)
  })

  it('tracks the longest streak across breaks', () => {
    const today = addDays(MON, 20)
    const s = computeStreaks([...days(MON, [0, 1, 2, 3, 4, 5]), ...days(MON, [19, 20])], today)
    expect(s.longest).toBe(6)
    expect(s.current).toBe(2)
  })

  it('handles a DST change (US, early November) without skipping days', () => {
    const start = '2026-10-30'
    const s = computeStreaks(days(start, [0, 1, 2, 3, 4]), addDays(start, 4))
    expect(s.current).toBe(5)
  })

  it('ignores sessions dated in the future', () => {
    const s = computeStreaks(days(MON, [0, 1, 9]), addDays(MON, 1))
    expect(s.current).toBe(2)
  })
})
