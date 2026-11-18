/**
 * Player assessment: content and screen types.
 *
 * Code owns the frame (tap flow, placement ladders, scoring). Content (genre
 * modules, skill ladders) is plain data so it can later be written by AI from
 * the blues template and reviewed before use.
 */

export type SectionId = 'start' | 'vision' | 'style' | 'genres' | 'players' | 'skills' | 'experience' | 'goals'

export const SECTION_NAMES: Record<SectionId, string> = {
  start: 'Welcome',
  vision: 'Your vision',
  style: 'Your style',
  genres: 'Your genres',
  players: 'Your players',
  skills: 'Your skills',
  experience: 'Your playing',
  goals: 'Your goals',
}

export type Opt = { id: string; label: string; sub?: string }

type Base = { id: string; section: SectionId; prompt: string; help?: string; eyebrow?: string }

export type Screen =
  | (Base & { kind: 'welcome' })
  | (Base & { kind: 'yn' })
  | (Base & { kind: 'one'; options: Opt[] })
  /** Graded single answer (spot check). */
  | (Base & { kind: 'quiz'; options: Opt[]; correct: string })
  /** Tap all that apply. `weights` grades the picks (level = highest weight picked). */
  | (Base & { kind: 'multi'; options: Opt[]; max?: number; noneLabel?: string; weights?: Record<string, number> })
  | (Base & { kind: 'rank'; options: Opt[]; max: number })
  /** Tap once = know it, twice = can play it. */
  | (Base & { kind: 'grid'; items: Opt[]; playLabel: string })
  | (Base & { kind: 'text'; max: number; placeholder?: string })
  /** Written answer in the player's own words (optional). */
  | (Base & { kind: 'longtext'; placeholder?: string; examples?: string[] })

/** yes / no / unsure for Y/N; option id(s) otherwise; grid = id → 1 (know) | 2 (play). */
export type AnswerValue = string | string[] | Record<string, number>

export type Answers = Record<string, AnswerValue | null>

/* ---------------- ladders ---------------- */

export type SpotCheck = { prompt: string; options: string[]; answer: string }

export type Rung = {
  id: string
  /** The Y/N question for this rung. */
  prompt: string
  /** Short noun phrase used in results and follow-ups ("drop 2 voicings"). */
  label: string
  check?: SpotCheck
}

export type Ladder = {
  id: string
  title: string
  /** Index of the first rung asked. */
  start: number
  rungs: Rung[]
}

/* ---------------- genre modules ---------------- */

export type Era = 'roots' | 'classic' | 'modern'

export type GenreArtist = { name: string; era: Era; inst?: string }
export type GenreSong = { title: string; artist: string }

export type GradedMulti = {
  id: string
  kind: 'graded'
  prompt: string
  /** label → weight (0 = basic … 3 = advanced) */
  options: { label: string; weight: number }[]
}
export type QuizItem = { id: string; kind: 'quiz' } & SpotCheck
export type AppliedItem = GradedMulti | QuizItem

export type GenreModule = {
  id: string
  name: string
  artists: GenreArtist[]
  songs: GenreSong[]
  forms: Ladder
  feels: string[]
  language: Ladder
  mustHaves: string[]
  applied: AppliedItem[]
}

/* ---------------- skills ---------------- */

export type Followup = 'play' | 'use' | 'explain'

export type SkillArea = {
  id: string
  name: string
  ladder: Ladder
  followups: Followup[]
}
