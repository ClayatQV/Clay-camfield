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
      'yn: Yes/No/Not sure · one: pick one · multi: choose all that apply · grid: select once = know, twice = can play · quiz: one right answer · text: up to `max` short lines · longtext: a written answer · rank: pick up to `max` in order',
    ),
  eyebrow: z.string().nullable().describe('tiny label above the question: the area, e.g. "Chords" or "Blues"'),
  prompt: z.string().describe('the question, short and specific'),
  help: z.string().nullable().describe('one short line under the question, only when needed'),
  options: z.array(OptSchema).nullable().describe('for one, multi, quiz, rank, grid (grid uses them as items)'),
  max: z.number().int().nullable().describe('multi/rank: max picks · text: number of lines'),
  noneLabel: z.string().nullable().describe('multi: label for the "none of these" button'),
  playLabel: z.string().nullable().describe('grid: what selecting twice means, e.g. "can play it"'),
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
    vamp: z.string().nullable().describe('the chords to loop while doing it, one bar per "|", e.g. "G7 | G7 | Cmaj7 | Cmaj7" or "Dm7 | G7 | Cmaj7 | Cmaj7"; null when the concept is not played over a vamp'),
    vampBpm: z.number().int().nullable().describe('starting tempo for the vamp, 40–200'),
  }),
  emphasis: z.string().nullable().describe('the ONE genre this module\'s songs and transcriptions are in (recommended for this player; the player can change it)'),
  listening: z.array(z.string()).describe('up to two genres to listen in during this module, for diversity; the first is usually the emphasis'),
  listen: z
    .array(z.object({ artist: z.string(), album: z.string(), genre: z.string(), why: z.string() }))
    .describe('2 or 3 albums to listen to during this module, drawn from the listening genres, each with a one-line why in the player\'s terms'),
  application: z.object({
    instruction: z.string(),
    songs: z
      .array(
        z.object({
          title: z.string(),
          artist: z.string(),
          note: z.string().nullable(),
          how: z
            .enum(['transcription', 'ear'])
            .nullable()
            .describe('"transcription" when a full tabs/notation-on-screen video almost certainly exists; "ear" for a one-off live/interview performance or obscure track the player learns from the recording with the looper'),
        }),
      )
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

/* ---------------- songs for a module, in a chosen genre ---------------- */

export const SongSchema = z.object({
  title: z.string(),
  artist: z.string(),
  note: z.string().nullable(),
  how: z.enum(['transcription', 'ear']).nullable(),
})
export type AiSong = z.infer<typeof SongSchema>

export const SongsResponseSchema = z.object({
  instruction: z.string().describe('the application instruction rewritten for these songs (what to lift, how to apply the idea)'),
  songs: z.array(SongSchema).describe('exactly the number of songs asked for'),
})
export type SongsResponse = z.infer<typeof SongsResponseSchema>

export const SongsRequestSchema = z.object({
  module: z.object({
    title: z.string(),
    why: z.string().nullable().optional(),
    concept: z.object({ label: z.string(), instruction: z.string() }),
    trains: z.array(z.string()).optional(),
    towards: z.string().nullable().optional(),
  }),
  genre: z.string().min(1).max(60),
  count: z.number().int().min(1).max(6),
  /** titles already in the module or rejected by the player; never pick these */
  exclude: z.array(z.string()).max(60),
  /** the player's results (profile, vision, taste) for wording and level */
  result: z.record(z.string(), z.unknown()).nullable().optional(),
})
export type SongsRequest = z.infer<typeof SongsRequestSchema>

/* ---------------- end-of-module re-check ---------------- */

export const RecheckScreenSchema = ScreenSchema.extend({
  skill: z.string().describe('the skill this question measures, copied EXACTLY from the skills list given'),
})
export type RecheckScreen = z.infer<typeof RecheckScreenSchema>

export const RecheckResponseSchema = z.object({ screens: z.array(RecheckScreenSchema).describe('exactly two screens: one quiz with a right answer, one yn at the level the module aimed for') })
export type RecheckResponse = z.infer<typeof RecheckResponseSchema>

export const RecheckRequestSchema = z.object({
  module: z.object({ title: z.string(), concept: z.string(), trains: z.array(z.string()), doneWhen: z.array(z.string()) }),
  skills: z.array(z.object({ skill: z.string(), level: z.number().int() })).max(30),
  checks: z.array(z.object({ text: z.string(), done: z.boolean() })).max(10),
})
export type RecheckRequest = z.infer<typeof RecheckRequestSchema>

/* ---------------- the weekly coach review ---------------- */

export const ProposalSchema = z.object({
  id: z.string().describe('short slug, unique in this review'),
  kind: z.enum(['tempo', 'extend', 'advance', 'swap_warmup', 'emphasis', 'session_length', 'note']).describe('what the change does; "note" = an observation with nothing to apply'),
  title: z.string().describe('one line, in the player\'s terms, e.g. "Raise the spider to 85 bpm"'),
  evidence: z.string().describe('the logged facts this rests on, with dates and numbers; never a guess'),
  change: z.object({
    label: z.string().nullable().describe('tempo/swap_warmup: the exercise label exactly as logged'),
    bpm: z.number().int().nullable(),
    moduleId: z.string().nullable(),
    weeks: z.number().int().nullable().describe('extend: the new total weeks for the module'),
    genre: z.string().nullable(),
    minutes: z.number().int().nullable(),
    warmup: z.object({ label: z.string(), instruction: z.string(), lab: z.string().nullable() }).nullable().describe('swap_warmup: the replacement'),
  }),
  risk: z.enum(['low', 'medium']).describe('low = easy to undo and small; medium = changes the plan\'s shape'),
})
export type Proposal = z.infer<typeof ProposalSchema>

export const ReviewSchema = z.object({
  note: z.string().describe('3–6 plain sentences: what the logs show, said to the player; specific, no flattery, no filler'),
  proposals: z.array(ProposalSchema).describe('0 to 4, most useful first; none is a fine answer when the logs are thin'),
  memory: z.string().describe('updated running notes about this player for the next review (≤120 words): patterns, what they accepted or vetoed, what to watch'),
})
export type Review = z.infer<typeof ReviewSchema>

export const ReviewRequestSchema = z.object({
  /** compact text blocks built on the client */
  plan: z.string().max(6000),
  sessions: z.string().max(8000),
  activity: z.string().max(6000),
  checks: z.string().max(2000).nullable().optional(),
  memory: z.string().max(2000).nullable().optional(),
  decisions: z.string().max(2000).nullable().optional().describe('earlier proposals and whether the player accepted or vetoed them'),
  profile: z.string().max(1500).nullable().optional(),
  today: z.string().max(10),
})
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>

/* ---------------- in-app video search ---------------- */

/** One search result (defined here so the client can import the type without pulling in server code). */
export type VideoHit = {
  id: string
  title: string
  channel: string
  length: string | null
  score: number
  hint: string | null
}

export const VideoSearchRequestSchema = z.object({
  q: z.string().min(1).max(200),
  /** video ids the player already rejected */
  exclude: z.array(z.string().max(20)).max(50).optional(),
})
export type VideoSearchRequest = z.infer<typeof VideoSearchRequestSchema>

/* ---------------- learn it by ear ---------------- */

export const EarGuideSchema = z.object({
  piece: z.object({ title: z.string(), artist: z.string() }),
  confidence: z.enum(['high', 'medium', 'low']).describe('how well you know THIS recording/performance from memory'),
  honesty: z.string().describe('one sentence: you cannot hear the recording; what below is from memory and what the player must verify by ear'),
  underlying: z
    .object({
      song: z.string(),
      by: z.string().describe('writer or original artist'),
      key: z.string().nullable(),
      meter: z.string().nullable(),
      form: z.string().nullable().describe('e.g. "AABA, 32 bars" or "verse / bridge / verse, 3/4"'),
      hasTranscriptions: z.boolean().describe('true when the ORIGINAL song is widely transcribed (tabs on screen videos very likely exist)'),
      learnFirst: z.string().describe('what to learn from the original first and why; "" if the piece is itself the original'),
    })
    .describe('the song underneath the performance; the skeleton every arrangement hangs on'),
  skeleton: z
    .array(z.object({ section: z.string(), bars: z.string().nullable(), chords: z.string(), note: z.string().nullable() }))
    .describe("the song's form by section with the original changes; what the player loops against"),
  sections: z
    .array(
      z.object({
        label: z.string().describe('section of the performance, named by the form (e.g. "Verse 1", "Bridge", "Outro cadenza")'),
        listenFor: z.array(z.string()).describe('2–4 concrete things to listen for: bass movement, chord quality changes, where fills sit, rhythmic feel'),
        tryThis: z.string().describe('one instruction for working this section out by ear'),
        lab: z.string().nullable().describe('Fretboard Lab preset for the chord tones or scale that section lives on; vocabulary only'),
      }),
    )
    .describe('3–8 sections, in order'),
  tips: z.array(z.string()).describe('2–5 tips specific to this player/performance (e.g. a left-handed upside-down player: copy the sound, never the hands; which speed to loop at)'),
  doneWhen: z.array(z.string()).describe('2–3 checks you can hear: "play the verse along with the video at 0.75×"'),
})
export type EarGuide = z.infer<typeof EarGuideSchema>

export const EarRequestSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().max(200),
  /** a line from the player about the performance (where it came from, what they love about it) */
  about: z.string().max(400).nullable().optional(),
  /** optional player context: genres, level words, what they want from it */
  context: z.string().max(600).nullable().optional(),
})
export type EarRequest = z.infer<typeof EarRequestSchema>

export const ModuleRequestSchema = z.object({
  request: z.string().min(2).max(300).describe('what the player wants to work on, in their words'),
  result: z.record(z.string(), z.unknown()).describe('the player\'s results (profile, vision, skills, gaps, taste)'),
  existing: z.array(z.string()).describe('titles of modules already in their plan'),
})
export type ModuleRequest = z.infer<typeof ModuleRequestSchema>
