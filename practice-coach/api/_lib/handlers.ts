/**
 * The three AI routes as plain functions (input → output), so Vercel
 * functions and the local Vite dev server run the same code.
 */
import { ask } from './claude.js'
import { cleanLabQuery } from './lab-vocab.js'
import { BLOCK_BUDGET, earSystem, earUser, reviewSystem, reviewUser, songsSystem, songsUser, interviewSystem, interviewUser, moduleSystem, moduleUser, modulesSystem, modulesUser, resultsSystem, resultsUser } from './prompts.js'
import {
  EarGuideSchema,
  type EarGuide,
  type EarRequest,
  SongsResponseSchema,
  type SongsRequest,
  type SongsResponse,
  ReviewSchema,
  type Review,
  type ReviewRequest,
  InterviewResponseSchema,
  ModuleSchema,
  ModulesSchema,
  ResultCoreSchema,
  type AiModule,
  type AiResultCore,
  type ModulesRequest,
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
    effort: 'low',
    maxTokens: 4000,
  })
  // Hard stops the model must not exceed.
  const budget = BLOCK_BUDGET[req.block].screens
  const room = Math.max(0, budget - req.blockAsked)
  if (out.screens.length > room) out.screens = out.screens.slice(0, room)
  if (room === 0 && !out.blockDone) {
    out.blockDone = true
    out.summary = out.summary ?? 'That’s this block. Continue when you’re ready.'
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
  const seen = new Set<string>()
  const songs = m.application.songs.filter((s) => {
    const k = `${s.title}|${s.artist}`.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return {
    ...m,
    listening: (m.listening ?? []).slice(0, 2),
    listen: (m.listen ?? []).slice(0, 3),
    application: { ...m.application, songs },
    warmups: m.warmups.map((w) => ({ ...w, lab: cleanLabQuery(w.lab) })),
    concept: { ...m.concept, lab: cleanLabQuery(m.concept.lab) },
  }
}

/** Everything except the curriculum (one call, kept under Vercel's time limit). */
export async function results(req: ResultsRequest): Promise<AiResultCore> {
  return ask({ system: resultsSystem(), user: resultsUser(req), schema: ResultCoreSchema, effort: 'medium', maxTokens: 12000, fast: true })
}

/** The curriculum, written from the core results (second call). */
export async function modules(req: ModulesRequest): Promise<AiModule[]> {
  const out = await ask({ system: modulesSystem(), user: modulesUser({ turns: req.turns, core: req.core }), schema: ModulesSchema, effort: 'medium', maxTokens: 12000, fast: true })
  return out.modules.map(cleanModule)
}

/** New songs for a module's application, in a chosen genre (the rest of the module stays). */
export async function songs(req: SongsRequest): Promise<SongsResponse> {
  const out = await ask({ system: songsSystem(), user: songsUser(req), schema: SongsResponseSchema, effort: 'medium', maxTokens: 2500, fast: true })
  const ex = new Set(req.exclude.map((t) => t.toLowerCase()))
  const seen = new Set<string>()
  const songs = out.songs.filter((s) => {
    const k = s.title.toLowerCase()
    if (ex.has(k) || seen.has(k)) return false
    seen.add(k)
    return true
  })
  return { ...out, songs }
}

/** The weekly review: observations and small proposals, each with evidence. */
export async function review(req: ReviewRequest): Promise<Review> {
  const out = await ask({ system: reviewSystem(), user: reviewUser(req), schema: ReviewSchema, effort: 'medium', maxTokens: 4000, fast: true })
  const seen = new Set<string>()
  const proposals = out.proposals
    .filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
    .slice(0, 4)
    .map((p) => (p.change.warmup ? { ...p, change: { ...p.change, warmup: { ...p.change.warmup, lab: cleanLabQuery(p.change.warmup.lab) } } } : p))
  return { ...out, proposals }
}

/** A learn-it-by-ear guide for a piece with no transcription. */
export async function ear(req: EarRequest): Promise<EarGuide> {
  const out = await ask({ system: earSystem(), user: earUser(req), schema: EarGuideSchema, effort: 'medium', maxTokens: 5000, fast: true })
  return { ...out, sections: out.sections.map((s) => ({ ...s, lab: cleanLabQuery(s.lab) })) }
}

export async function module(req: ModuleRequest): Promise<AiModule> {
  const out = await ask({ system: moduleSystem(), user: moduleUser(req), schema: ModuleSchema, effort: 'medium', maxTokens: 4000, fast: true })
  return cleanModule(out)
}
