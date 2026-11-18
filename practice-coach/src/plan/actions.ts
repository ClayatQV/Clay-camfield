import { todayKey } from '../lib/dates'
import { update } from '../store/store'
import type { AssessmentResult } from '../assessment/scoring'
import { buildPlan } from './generate'

/** Build a plan from assessment results and make it the active plan (the old one stays restorable). */
export function replacePlanFrom(result: AssessmentResult) {
  const plan = buildPlan(result)
  update((x) => ({
    ...x,
    previousPlan: { plan: x.plan, planStart: x.settings.planStart, override: x.settings.override },
    plan,
    settings: { ...x.settings, planStart: todayKey(), override: null, sessionLength: result.goals.minutes >= 60 ? 60 : 30 },
  }))
  return plan
}

export function restorePreviousPlan() {
  update((x) => {
    if (!x.previousPlan) return x
    const p = x.previousPlan
    return { ...x, plan: p.plan, previousPlan: null, settings: { ...x.settings, planStart: p.planStart, override: p.override } }
  })
}

/**
 * "Not feeling this block?" — rebuild the plan without that block's focus.
 * Blocks before it stay the same (the builder is deterministic); the swapped
 * block and the ones after it get re-chosen.
 */
export function swapBlock(blockN: number): boolean {
  let ok = false
  update((x) => {
    const plan = x.plan
    if (!plan) return x
    const result = x.assessment.results.find((r) => r.id === plan.resultId)
    const focusId = plan.blocks[blockN - 1]?.focusId
    if (!result || !focusId || focusId === 'together') return x
    const rejected = [...new Set([...(plan.rejected ?? []), focusId])]
    const next = buildPlan(result, new Date(), rejected)
    ok = true
    return { ...x, plan: { ...next, id: plan.id, createdAt: plan.createdAt } }
  })
  return ok
}
