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
