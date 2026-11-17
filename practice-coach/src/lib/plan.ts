import { originalPlan, blockLen, type ActivePlan } from '../plan/model'
import { diffDays, addDays, type DayKey } from './dates'

export type PlanPosition = {
  block: number
  week: number // week within the block (1-based)
  globalWeek: number // 1…totalWeeks
  status: 'before' | 'active' | 'after'
  source: 'auto' | 'override'
  daysUntilStart: number
  /** first day of this plan week (auto mode only) */
  weekStartsOn?: DayKey
}

export function blockForGlobalWeek(gw: number, plan: ActivePlan = originalPlan()): { block: number; week: number } {
  const w = Math.min(plan.totalWeeks, Math.max(1, Math.round(gw)))
  for (const b of plan.blocks) if (w >= b.weeks[0] && w <= b.weeks[1]) return { block: b.n, week: w - b.weeks[0] + 1 }
  return { block: 1, week: 1 }
}

export function globalWeekOf(block: number, week: number, plan: ActivePlan = originalPlan()): number {
  const b = plan.blocks[block - 1] ?? plan.blocks[0]
  return b.weeks[0] + Math.min(blockLen(b), Math.max(1, week)) - 1
}

export function planPosition(
  settings: { planStart: DayKey; override: { block: number; week: number } | null },
  today: DayKey,
  plan: ActivePlan = originalPlan(),
): PlanPosition {
  const days = diffDays(settings.planStart, today)
  if (settings.override) {
    const block = Math.min(plan.blocks.length, Math.max(1, settings.override.block))
    const week = Math.min(blockLen(plan.blocks[block - 1]), Math.max(1, settings.override.week))
    return { block, week, globalWeek: globalWeekOf(block, week, plan), status: 'active', source: 'override', daysUntilStart: Math.max(0, -days) }
  }
  if (days < 0) {
    return { block: 1, week: 1, globalWeek: 1, status: 'before', source: 'auto', daysUntilStart: -days, weekStartsOn: settings.planStart }
  }
  const raw = Math.floor(days / 7) + 1
  const gw = Math.min(plan.totalWeeks, raw)
  const { block, week } = blockForGlobalWeek(gw, plan)
  return {
    block,
    week,
    globalWeek: gw,
    status: raw > plan.totalWeeks ? 'after' : 'active',
    source: 'auto',
    daysUntilStart: 0,
    weekStartsOn: addDays(settings.planStart, (gw - 1) * 7),
  }
}

/** The plan start date that makes `today` fall on the first day of block/week. */
export function startDateFor(block: number, week: number, today: DayKey, plan: ActivePlan = originalPlan()): DayKey {
  return addDays(today, -(globalWeekOf(block, week, plan) - 1) * 7)
}
