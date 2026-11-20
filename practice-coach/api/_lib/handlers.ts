/**
 * The three AI routes as plain functions (input → output), so Vercel
 * functions and the local Vite dev server run the same code.
 */
import { ask } from './claude.js'
import { cleanLabQuery } from './lab-vocab.js'
import { BLOCK_BUDGET, interviewSystem, interviewUser, moduleSystem, moduleUser, resultsSystem, resultsUser } from './prompts.js'
import {
  InterviewResponseSchema,
  ModuleSchema,
  ResultSchema,
  type AiModule,
  type AiResult,
  type InterviewRequest,
  type InterviewResponse,
  type ModuleRequest,
  type ResultsRequest,
} from './schemas.js'

export async function interview(req: InterviewRequest): Promise<InterviewResponse> {
  const out = await ask({
    system: interviewSystem(),
    user: interviewUser(req),
    schema: InterviewResponseSchema,
    effort: 'medium',
    maxTokens: 4000,
  })
  // Hard stops the model must not exceed.
  const budget = BLOCK_BUDGET[req.block].screens
  const room = Math.max(0, budget - req.blockAsked)
  if (out.screens.length > room) out.screens = out.screens.slice(0, room)
  if (room === 0 && !out.blockDone) {
    out.blockDone = true
    out.summary = out.summary ?? 'That’s this block. Tap continue when you’re ready.'
  }
  // Never hand the app an unanswerable screen.
  out.screens = out.screens.filter((s) => {
    if (['one', 'multi', 'quiz', 'rank', 'grid'].includes(s.kind) && !(s.options && s.options.length >= 2)) return false
    if (s.kind === 'quiz' && !s.options!.some((o) => o.id === s.correct)) return false
    return true
  })
  const used = new Set(req.turns.map((t) => t.screen.id))
  out.screens = out.screens.map((s, i) => (used.has(s.id) ? { ...s, id: `${s.id}-${req.turns.length + i}` } : s))
  if (!out.screens.length && !out.blockDone) {
    out.blockDone = true
    out.summary = out.summary ?? 'That’s this block.'
  }
  return out
}

function cleanModule(m: AiModule): AiModule {
  return {
    ...m,
    warmups: m.warmups.map((w) => ({ ...w, lab: cleanLabQuery(w.lab) })),
    concept: { ...m.concept, lab: cleanLabQuery(m.concept.lab) },
  }
}

export async function results(req: ResultsRequest): Promise<AiResult> {
  const out = await ask({ system: resultsSystem(), user: resultsUser(req), schema: ResultSchema, effort: 'high', maxTokens: 16000 })
  return { ...out, modules: out.modules.map(cleanModule) }
}

export async function module(req: ModuleRequest): Promise<AiModule> {
  const out = await ask({ system: moduleSystem(), user: moduleUser(req), schema: ModuleSchema, effort: 'medium', maxTokens: 4000 })
  return cleanModule(out)
}
