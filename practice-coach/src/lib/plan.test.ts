import { describe, expect, it } from 'vitest'
import { planPosition, startDateFor, blockForGlobalWeek } from './plan'
import { addDays } from './dates'

const START = '2026-11-17'

describe('planPosition', () => {
  it('is Block 1 Week 1 on the start date', () => {
    expect(planPosition({ planStart: START, override: null }, START)).toMatchObject({ block: 1, week: 1, globalWeek: 1, status: 'active' })
  })
  it('advances every 7 days', () => {
    expect(planPosition({ planStart: START, override: null }, addDays(START, 7))).toMatchObject({ block: 1, week: 2 })
    expect(planPosition({ planStart: START, override: null }, addDays(START, 21))).toMatchObject({ block: 2, week: 1, globalWeek: 4 })
    expect(planPosition({ planStart: START, override: null }, addDays(START, 7 * 24))).toMatchObject({ block: 9, week: 1 })
  })
  it('reports before/after the plan', () => {
    expect(planPosition({ planStart: START, override: null }, addDays(START, -3))).toMatchObject({ status: 'before', daysUntilStart: 3 })
    expect(planPosition({ planStart: START, override: null }, addDays(START, 7 * 26))).toMatchObject({ status: 'after', block: 9, week: 2 })
  })
  it('honours a pinned override', () => {
    expect(planPosition({ planStart: START, override: { block: 4, week: 2 } }, START)).toMatchObject({ block: 4, week: 2, globalWeek: 11, source: 'override' })
  })
  it('startDateFor puts today on the first day of the chosen week', () => {
    const today = '2027-01-05'
    const s = startDateFor(2, 3, today)
    expect(planPosition({ planStart: s, override: null }, today)).toMatchObject({ block: 2, week: 3 })
  })
  it('maps global weeks to blocks', () => {
    expect(blockForGlobalWeek(25)).toEqual({ block: 9, week: 1 })
    expect(blockForGlobalWeek(12)).toEqual({ block: 4, week: 3 })
  })
})
