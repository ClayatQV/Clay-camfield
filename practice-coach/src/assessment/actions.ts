import { getData, update, type AssessmentDraft } from '../store/store'
import { flowState } from './engine'
import { scoreAssessment, type AssessmentResult } from './scoring'
import { replacePlanFrom } from '../plan/actions'
import type { AnswerValue } from './types'

const emptyDraft = (): AssessmentDraft => ({ answers: {}, order: [], startedAt: new Date().toISOString() })

function withDraft(fn: (d: AssessmentDraft) => AssessmentDraft) {
  update((x) => ({ ...x, assessment: { ...x.assessment, draft: fn(x.assessment.draft ?? emptyDraft()) } }))
}

export function startAssessment(fresh = false) {
  update((x) => ({ ...x, assessment: { ...x.assessment, draft: fresh || !x.assessment.draft ? emptyDraft() : x.assessment.draft } }))
}

/** Record an answer (null = skipped). */
export function answer(id: string, value: AnswerValue | null) {
  withDraft((d) => ({ ...d, answers: { ...d.answers, [id]: value }, order: [...d.order.filter((o) => o !== id), id] }))
}

/** Undo the most recent answer. */
export function back() {
  withDraft((d) => {
    const order = d.order.slice(0, -1)
    const last = d.order[d.order.length - 1]
    const answers = { ...d.answers }
    if (last) delete answers[last]
    // Drop answers no longer reachable from the remaining ones (branching changed).
    return { ...d, order, answers }
  })
}

export function discardAssessment() {
  update((x) => ({ ...x, assessment: { ...x.assessment, draft: null } }))
}

export function dismissAssessmentPrompt() {
  update((x) => ({ ...x, assessment: { ...x.assessment, dismissedPrompt: true } }))
}

/** Score the finished draft, save it to history and clear the draft. */
export function finishAssessment(): AssessmentResult | null {
  const d = getData().assessment.draft
  if (!d || flowState(d.answers).current) return null
  const result = scoreAssessment(d.answers)
  update((x) => ({ ...x, assessment: { ...x.assessment, draft: null, results: [...x.assessment.results, result] } }))
  // Clay's choice: finishing the assessment replaces the plan (the old one stays restorable).
  replacePlanFrom(result)
  return result
}

export const latestResult = (): AssessmentResult | null => {
  const r = getData().assessment.results
  return r.length ? r[r.length - 1] : null
}
