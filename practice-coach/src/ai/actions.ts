/**
 * Store actions for the AI assessment. The network calls live in the screens
 * (they need loading/error UI); these keep the saved state consistent.
 */
import type { AiModule, AiResult, AiScreen, BlockId, InterviewRequest, ResultsRequest } from '../../api/_lib/schemas'
import { todayKey } from '../lib/dates'
import { planFromModules } from '../plan/fromModules'
import { getData, update, type AiInterview } from '../store/store'

export const BLOCK_ORDER: BlockId[] = ['skills', 'taste', 'vision']
/** Mirrors BLOCK_BUDGET on the server (api/_lib/prompts.ts). */
export const BLOCK_SCREENS: Record<BlockId, number> = { skills: 16, taste: 10, vision: 7 }
export const BLOCK_NAMES: Record<BlockId, string> = { skills: 'Your skills', taste: 'Taste and genre', vision: 'Your vision' }
export const BLOCK_INTRO: Record<BlockId, string> = {
  skills: 'Where you are now. Specific questions, quick taps — no rating yourself. About 3 minutes.',
  taste: 'Who you are as a player: your genres, the players you know, what you’d love to learn next. About 2 minutes.',
  vision: 'Where you want to be. In your own words, plus the music that would make you feel you’d arrived. About 1½ minutes.',
}

const fresh = (): AiInterview => ({
  startedAt: new Date().toISOString(),
  block: 'skills',
  turns: [],
  queue: [],
  blockAsked: 0,
  notes: null,
  summaries: {},
  corrections: {},
  pendingSummary: null,
  done: false,
})

function setInterview(fn: (iv: AiInterview) => AiInterview) {
  update((x) => ({ ...x, ai: { ...x.ai, interview: fn(x.ai.interview ?? fresh()) } }))
}

export function setPasscode(code: string) {
  update((x) => ({ ...x, ai: { ...x.ai, passcode: code.trim() } }))
}

export function startInterview(restart = false) {
  update((x) => ({ ...x, ai: { ...x.ai, interview: restart || !x.ai.interview || x.ai.interview.done ? fresh() : x.ai.interview } }))
}

export function discardInterview() {
  update((x) => ({ ...x, ai: { ...x.ai, interview: null } }))
}

/** What to send the server for the next screens. */
export function interviewRequest(iv: AiInterview, correction: string | null = null): InterviewRequest {
  return {
    block: iv.block,
    turns: iv.turns,
    blockAsked: iv.blockAsked,
    notes: iv.notes,
    correction,
    summaries: Object.keys(iv.summaries).length ? (iv.summaries as Record<string, string>) : null,
  }
}

export function receiveScreens(screens: AiScreen[], notes: string, blockDone: boolean, summary: string | null) {
  setInterview((iv) => ({
    ...iv,
    queue: [...iv.queue, ...screens],
    notes,
    pendingSummary: blockDone ? (summary ?? 'That’s this block.') : iv.pendingSummary,
  }))
}

export function answerScreen(screen: AiScreen, answer: unknown) {
  setInterview((iv) => ({
    ...iv,
    turns: [...iv.turns, { screen, answer }],
    queue: iv.queue.filter((s) => s.id !== screen.id),
    blockAsked: iv.blockAsked + 1,
  }))
}

/** Undo the last answer. Screens fetched after it may be stale, so they're dropped. */
export function undoAnswer() {
  setInterview((iv) => {
    const last = iv.turns[iv.turns.length - 1]
    if (!last) return iv
    return { ...iv, turns: iv.turns.slice(0, -1), queue: [last.screen], blockAsked: Math.max(0, iv.blockAsked - 1), pendingSummary: null }
  })
}

/** The player accepted (or corrected) the block summary: move on. */
export function acceptSummary(correction: string | null) {
  setInterview((iv) => {
    const i = BLOCK_ORDER.indexOf(iv.block)
    const summaries = { ...iv.summaries, [iv.block]: iv.pendingSummary ?? '' }
    const corrections = correction ? { ...iv.corrections, [iv.block]: correction } : iv.corrections
    const next = BLOCK_ORDER[i + 1]
    return { ...iv, summaries, corrections, pendingSummary: null, queue: [], blockAsked: 0, block: next ?? iv.block, done: !next }
  })
}

export function resultsRequest(iv: AiInterview): ResultsRequest {
  return {
    turns: iv.turns,
    notes: iv.notes,
    summaries: Object.keys(iv.summaries).length ? (iv.summaries as Record<string, string>) : null,
    corrections: Object.keys(iv.corrections).length ? (iv.corrections as Record<string, string>) : null,
  }
}

export function setResult(result: AiResult) {
  const minutes = result.practice?.minutesPerDay || getData().settings.sessionLength
  const days = result.practice?.daysPerWeek || 5
  update((x) => ({
    ...x,
    ai: {
      ...x.ai,
      result,
      resultAt: new Date().toISOString(),
      build: { modules: result.modules, minutes: minutes >= 60 ? 60 : 30, days: Math.min(7, Math.max(3, days)) },
    },
  }))
}

/* ---------------- building the plan ---------------- */

export function setBuildModules(modules: AiModule[]) {
  update((x) => (x.ai.build ? { ...x, ai: { ...x.ai, build: { ...x.ai.build, modules } } } : x))
}

export function setBuildTime(minutes: number, days: number) {
  update((x) => (x.ai.build ? { ...x, ai: { ...x.ai, build: { ...x.ai.build, minutes, days } } } : x))
}

/** Make the built curriculum the active plan (the previous plan stays restorable). */
export function applyBuild(): boolean {
  const { ai } = getData()
  if (!ai.result || !ai.build || !ai.build.modules.length) return false
  const plan = planFromModules(ai.result, ai.build.modules)
  update((x) => ({
    ...x,
    previousPlan: { plan: x.plan, planStart: x.settings.planStart, override: x.settings.override },
    plan,
    settings: { ...x.settings, planStart: todayKey(), override: null, sessionLength: ai.build!.minutes >= 60 ? 60 : 30 },
  }))
  return true
}
