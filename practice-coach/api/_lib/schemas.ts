/**
 * Shapes shared by the server functions and the app. The AI returns these as
 * structured output (validated by zod), so the app can render screens and
 * results without parsing prose.
 *
 * Every optional field is `nullable` rather than `optional`: structured
 * outputs want every property present.
 */
import { z } from 'zod'

export const OptSchema = z.object({
  id: z.string().describe('short stable id, lowercase, no spaces'),
  label: z.string(),
  sub: z.string().nullable().describe('small secondary text, e.g. the artist or instrument'),
})

export const ScreenSchema = z.object({
  id: z.string().describe('unique within the whole assessment, e.g. "s12"'),
  kind: z
    .enum(['yn', 'one', 'multi', 'grid', 'quiz', 'text', 'longtext', 'rank'])
    .describe(
      'yn: Yes/No/Not sure · one: pick one · multi: tap all that apply · grid: tap once = know, twice = can play · quiz: one right answer · text: up to `max` short lines · longtext: a written answer · rank: tap up to `max` in order',
    ),
  eyebrow: z.string().nullable().describe('tiny label above the question: the area, e.g. "Chords" or "Blues"'),
  prompt: z.string().describe('the question, short and specific'),
  help: z.string().nullable().describe('one short line under the question, only when needed'),
  options: z.array(OptSchema).nullable().describe('for one, multi, quiz, rank, grid (grid uses them as items)'),
  max: z.number().int().nullable().describe('multi/rank: max picks · text: number of lines'),
  noneLabel: z.string().nullable().describe('multi: label for the "none of these" button'),
  playLabel: z.string().nullable().describe('grid: what a double tap means, e.g. "can play it"'),
  correct: z.string().nullable().describe('quiz: the id of the correct option'),
  placeholder: z.string().nullable(),
  examples: z.array(z.string()).nullable().describe('longtext: tappable starter phrases'),
  tag: z.string().nullable().describe('what this measures, e.g. "chords:triads" or "taste:genre" (not shown)'),
  level: z.number().int().min(0).max(5).nullable().describe('yn: the mastery level being asked about (0–5)'),
})
export type AiScreen = z.infer<typeof ScreenSchema>

export const InterviewResponseSchema = z.object({
  screens: z.array(ScreenSchema).describe('at most 3: ' + 'the next 1–3 screens; several only when the later ones do not depend on the earlier answers; empty when blockDone'),
  blockDone: z.boolean().describe('true when this block has enough or its budget is spent'),
  summary: z
    .string()
    .nullable()
    .describe('only when blockDone: 2–4 sentences, second person, specific and honest: "Here\'s what I heard…". The player can correct it.'),
  notes: z
    .string()
    .describe('your private running model of this player in ≤80 words: level estimates per area, trust, hypotheses, what to probe next. Fed back to you on the next call.'),
})
export type InterviewResponse = z.infer<typeof InterviewResponseSchema>

export const LevelSchema = z.number().int().min(0).max(5)

export const ModuleSchema = z.object({
  id: z.string().describe('short slug'),
  title: z.string().describe('named for the music or outcome, not the exercise, e.g. "The bar 7 run at tempo"'),
  weeks: z.number().int().min(1).max(3).describe('default 1; 2–3 only when the material needs it'),
  why: z.string().describe('one line, in terms of THIS player\'s vision or gap'),
  towards: z.string().nullable().describe('the signature song/solo this module works toward, if any'),
  trains: z.array(z.string()).describe('skill tags this module trains'),
  warmups: z
    .array(
      z.object({
        label: z.string(),
        instruction: z.string(),
        lab: z.string().nullable().describe('Fretboard Lab preset query, e.g. "mode=chords&root=C&type=maj&voicing=close3&set=GBE&move=c4" — only from the allowed vocabulary'),
      }),
    )
    .describe('exactly two short daily warm-ups on the fundamentals this player needs (chords/voicings first, then arpeggios/scales/technique)'),
  concept: z.object({
    label: z.string(),
    instruction: z.string().describe('2–3 sentences: exactly what to do today'),
    lab: z.string().nullable(),
  }),
  application: z.object({
    instruction: z.string(),
    songs: z
      .array(z.object({ title: z.string(), artist: z.string(), note: z.string().nullable() }))
      .describe('3 to 5 real songs/solos to choose from: their named pieces first when relevant, songs from their genres, one discovery pick'),
  }),
  doneWhen: z.array(z.string()).describe('2 or 3 concrete, checkable checks'),
})
export type AiModule = z.infer<typeof ModuleSchema>

export const ResultSchema = z.object({
  profile: z.object({
    type: z.string().describe('a player type in 2–5 words, e.g. "Feel-First Soul Player"'),
    read: z.array(z.string()).describe('3 to 7 short honest sentences: strengths, the biggest know-but-don\'t-use gap, the one unlock, next steps. No flattery.'),
    trust: z.number().describe('0 to 1: how much the self-reports were confirmed by the quick checks (1 = fully)'),
  }),
  vision: z.object({
    statement: z.string(),
    where: z.array(z.string()),
    pieces: z.array(
      z.object({
        title: z.string(),
        artist: z.string().nullable(),
        needs: z.array(z.string()).describe('the skills inside this piece'),
        have: z.array(z.string()),
        missing: z.array(z.string()),
      }),
    ),
    wants: z.array(z.string()),
  }),
  skills: z
    .array(
      z.object({
        area: z.string().describe('chords · scales · arpeggios · fretboard · theory · ear · improvising · rhythm & timing · technique · repertoire · genre-specific'),
        skill: z.string(),
        level: LevelSchema,
        evidence: z.string().describe('what they said or got right/wrong that supports this'),
      }),
    )
    .describe('8 to 24 skills that matter for this player, with honest 0–5 levels'),
  gaps: z
    .array(z.object({ skill: z.string(), from: LevelSchema, to: LevelSchema, why: z.string() }))
    .describe('2 to 8, ordered: the gaps that unlock their vision first'),
  taste: z.object({
    genres: z.array(z.object({ id: z.string(), name: z.string(), rank: z.number().int(), depth: z.string().describe('"deep" / "solid" / "listening first"') })),
    dimensions: z.array(z.object({ name: z.string(), lean: z.string() })).describe('e.g. harmonically sophisticated ↔ raw, groove ↔ lead, clean ↔ gritty, vintage ↔ modern, composed ↔ improvised'),
    inspires: z.array(z.string()).describe('what lights this player up, in their words where possible'),
    listening: z.array(z.object({ artist: z.string(), album: z.string(), genre: z.string(), why: z.string() })).describe('up to 10 albums'),
  }),
  practice: z.object({
    minutesPerDay: z.number().int().describe('from their answer; 30 or 60 if unsure'),
    daysPerWeek: z.number().int().describe('from their answer; 3–7'),
  }),
  modules: z.array(ModuleSchema).describe('4 to 10 modules, the recommended curriculum in order; 1–3 weeks each; the player will keep, swap, drop, reorder'),
})
export type AiResult = z.infer<typeof ResultSchema>

/** Structured outputs choke on the full result schema ("compiled grammar too large"), so results come in two calls. */
export const ResultCoreSchema = ResultSchema.omit({ modules: true })
export type AiResultCore = z.infer<typeof ResultCoreSchema>
export const ModulesSchema = z.object({ modules: z.array(ModuleSchema).describe('4 to 10 modules in order') })

/* ---------------- request bodies ---------------- */

export const TurnSchema = z.object({
  screen: ScreenSchema,
  answer: z.unknown().describe('the player\'s answer in the app\'s format'),
})
export type Turn = z.infer<typeof TurnSchema>

export const BlockIdSchema = z.enum(['skills', 'taste', 'vision'])
export type BlockId = z.infer<typeof BlockIdSchema>

export const InterviewRequestSchema = z.object({
  block: BlockIdSchema,
  turns: z.array(TurnSchema),
  /** screens answered in the current block */
  blockAsked: z.number().int().min(0),
  notes: z.string().nullable(),
  /** the player's correction to a block summary, if any */
  correction: z.string().nullable(),
  summaries: z.record(z.string(), z.string()).nullable(),
})
export type InterviewRequest = z.infer<typeof InterviewRequestSchema>

export const ResultsRequestSchema = z.object({
  turns: z.array(TurnSchema),
  notes: z.string().nullable(),
  summaries: z.record(z.string(), z.string()).nullable(),
  corrections: z.record(z.string(), z.string()).nullable(),
})
export type ResultsRequest = z.infer<typeof ResultsRequestSchema>

export const ModulesRequestSchema = z.object({
  turns: z.array(TurnSchema),
  core: ResultCoreSchema,
})
export type ModulesRequest = z.infer<typeof ModulesRequestSchema>

export const ModuleRequestSchema = z.object({
  request: z.string().min(2).max(300).describe('what the player wants to work on, in their words'),
  result: z.record(z.string(), z.unknown()).describe('the player\'s results (profile, vision, skills, gaps, taste)'),
  existing: z.array(z.string()).describe('titles of modules already in their plan'),
})
export type ModuleRequest = z.infer<typeof ModuleRequestSchema>
