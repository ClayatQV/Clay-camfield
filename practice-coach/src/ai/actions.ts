/**
 * Store actions for the AI assessment. The network calls live in the screens
 * (they need loading/error UI); these keep the saved state consistent.
 */
import type { AiModule, AiResult, AiScreen, BlockId, InterviewRequest, ResultsRequest } from '../../api/_lib/schemas'
import { todayKey } from '../lib/dates'
import { planFromModules } from '../plan/fromModules'
import { getSongs } from './client'
import { getData, update, type AiInterview, type AiState, type AppData } from '../store/store'

export const BLOCK_ORDER: BlockId[] = ['skills', 'taste', 'vision']
/** Mirrors BLOCK_BUDGET on the server (api/_lib/prompts.ts). */
export const BLOCK_SCREENS: Record<BlockId, number> = { skills: 22, taste: 12, vision: 9 }
export const BLOCK_NAMES: Record<BlockId, string> = { skills: 'Skills', taste: 'Taste profile', vision: 'Vision' }
export const BLOCK_INTRO: Record<BlockId, string> = {
  skills: 'Where you are now. About 4 minutes.',
  taste: 'Your genres, your influences, what you’d love to learn next. About 2½ minutes.',
  vision: 'Where you want to be, in your own words. About 2 minutes.',
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
      build: { modules: result.modules, minutes: Math.max(15, Math.round(minutes)), days: Math.min(7, Math.max(1, days)), rejected: {} },
    },
  }))
}

/** The curriculum arrives later (Build page); store it on the result and as the starting build. */
export function setModules(modules: AiModule[]) {
  update((x) => (x.ai.result ? { ...x, ai: { ...x.ai, result: { ...x.ai.result, modules }, build: { ...(x.ai.build ?? { minutes: 30, days: 5, rejected: {} }), modules } } } : x))
}

/* ---------------- building the plan ---------------- */

export function setBuildModules(modules: AiModule[]) {
  update((x) => (x.ai.build ? { ...x, ai: { ...x.ai, build: { ...x.ai.build, modules } } } : x))
}

export function setBuildTime(minutes: number, days: number) {
  update((x) => (x.ai.build ? { ...x, ai: { ...x.ai, build: { ...x.ai.build, minutes, days } } } : x))
}

/* ---------------- genre emphasis and song reroll (songs only; the concept, warm-ups and checks stay) ---------------- */

function moduleContext(m: AiModule) {
  return { title: m.title, why: m.why, concept: { label: m.concept.label, instruction: m.concept.instruction }, trains: m.trains, towards: m.towards }
}
function playerContext(r: AiResult | null) {
  return r ? { profile: r.profile, vision: r.vision, taste: { genres: r.taste.genres, dimensions: r.taste.dimensions } } : null
}

/** Replace one module in the build, and, if the active plan was built from these modules, rebuild the plan's songs in place (same id, same start). */
function replaceModule(next: AiModule) {
  update((x) => {
    if (!x.ai.build || !x.ai.result) return x
    const modules = x.ai.build.modules.map((m) => (m.id === next.id ? next : m))
    const build = { ...x.ai.build, modules }
    const plan = x.plan && x.plan.resultId === 'ai-result' && x.plan.blocks.some((b) => b.focusId === `ai:${next.id}`) ? rebuiltPlan(x.plan, x.ai.result, build) : x.plan
    return { ...x, ai: { ...x.ai, build }, plan }
  })
}

function rebuiltPlan(current: NonNullable<AppData['plan']>, result: AiResult, build: NonNullable<AiState['build']>) {
  const fresh = planFromModules(result, build.modules, new Date(current.createdAt), build.minutes)
  return { ...fresh, id: current.id, createdAt: current.createdAt, rejected: current.rejected }
}

/** Switch the genre the module's songs live in. Asks the coach for the same idea in that genre. */
export async function setModuleGenre(moduleId: string, genre: string): Promise<void> {
  const { ai } = getData()
  const m = ai.build?.modules.find((x) => x.id === moduleId)
  if (!m || !ai.build) return
  const rejected = ai.build.rejected[moduleId] ?? []
  const res = await getSongs({ module: moduleContext(m), genre, count: Math.min(5, Math.max(3, m.application.songs.length)), exclude: rejected, result: playerContext(ai.result) })
  replaceModule({ ...m, emphasis: genre, application: { instruction: res.instruction || m.application.instruction, songs: res.songs } })
}

/** The player isn't inspired by this song: get a different one for the same idea in the module's genre, never this one again. */
export async function rerollSong(moduleId: string, title: string): Promise<void> {
  const { ai } = getData()
  const m = ai.build?.modules.find((x) => x.id === moduleId)
  if (!m || !ai.build) return
  const rejected = [...new Set([...(ai.build.rejected[moduleId] ?? []), title])]
  const keep = m.application.songs.filter((s) => s.title !== title)
  const res = await getSongs({
    module: moduleContext(m),
    genre: m.emphasis ?? ai.result?.taste.genres[0]?.name ?? 'any genre the player listed',
    count: 1,
    exclude: [...rejected, ...keep.map((s) => s.title)],
    result: playerContext(ai.result),
  })
  const fresh = res.songs[0]
  if (!fresh) throw new Error('The coach came back empty. Try again.')
  const idx = m.application.songs.findIndex((s) => s.title === title)
  const songs = [...keep]
  songs.splice(Math.max(0, idx), 0, fresh)
  update((x) => (x.ai.build ? { ...x, ai: { ...x.ai, build: { ...x.ai.build, rejected: { ...x.ai.build.rejected, [moduleId]: rejected } } } } : x))
  replaceModule({ ...m, application: { ...m.application, songs } })
}

/** Set the module's listening genres (up to two). Listening picks refresh with the next song change or stay as they are. */
export function setModuleListening(moduleId: string, listening: string[]) {
  const m = getData().ai.build?.modules.find((x) => x.id === moduleId)
  if (m) replaceModule({ ...m, listening: listening.slice(0, 2) })
}

/** Make the built curriculum the active plan (the previous plan stays restorable). */
export function applyBuild(): boolean {
  const { ai } = getData()
  if (!ai.result || !ai.build || !ai.build.modules.length) return false
  const plan = planFromModules(ai.result, ai.build.modules, new Date(), ai.build.minutes)
  update((x) => ({
    ...x,
    previousPlan: { plan: x.plan, planStart: x.settings.planStart, override: x.settings.override },
    plan,
    // The plan's full length is what they chose on the Build page; "30" is the short-day mode.
    settings: { ...x.settings, planStart: todayKey(), override: null, sessionLength: 60 },
  }))
  return true
}
