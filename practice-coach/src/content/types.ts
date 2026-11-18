/** Content types. Everything under /src/content is static, typed data. */

export type PartId = 'triads' | 'arps' | 'concept' | 'application'
export const PART_IDS: PartId[] = ['triads', 'arps', 'concept', 'application']

export type LessonStatus = 'approved' | 'candidate' | 'rejected'

export type Moment = { label: string; a: number; b: number }

export type BarRow = { t: number; bars: string; chords: string; what: string; tags: string[] }

/** A link into Fretboard Lab, built with lib/lab.ts (labPath). */
export type LabLink = { label: string; labUrl: string }

export type VideoOption = { youtubeId: string; channel: string; title: string; note?: string }

export type Lesson = {
  id: string
  /** 'song' = a transcription of real music; 'concept' = a teaching video. */
  kind: 'song' | 'concept'
  title: string
  artist: string
  song: string
  album?: string
  year?: number
  youtubeId: string
  channel: string
  videoTitle?: string
  /** Other candidate videos for the same lesson (reviewed in "To review"). */
  altVideos?: VideoOption[]
  /** Videos already rejected, kept so they don't get re-added. */
  rejectedVideos?: VideoOption[]
  status: LessonStatus
  concepts: string[]
  tempo?: number
  bars?: number
  summary?: string
  verification?: string
  barMap?: BarRow[]
  moments?: Moment[]
  theory?: string[]
  drills?: LabLink[]
}

export type SessionPart = {
  id: PartId
  title: string
  /** Short label used in the "Share with Dad" text, e.g. "Triads (D–G–B)". */
  shareLabel: string
  focus: string
  instruction: string
  minutes: { 30: number; 60: number }
  labLinks?: LabLink[]
  lessonId?: string
  externalLinks?: { label: string; url: string }[]
  /** Several things to choose from (Application: songs from your genres, a discovery pick…). */
  options?: PartOption[]
  /** One line: why this part matters for the player's vision. */
  why?: string
}

export type PartOption = { label: string; sub?: string; url: string; kind: 'song' | 'listen' | 'lesson' | 'discover' | 'goal' }

export type BlockWeek = {
  week: number
  triads: string
  arps: string
  concept: string
  application: string
}

export type Block = {
  n: number
  title: string
  weeks: [number, number]
  summary: string
  /** Week-by-week table; only blocks with detail have it. */
  detail?: {
    daily: { part: PartId; m30: number; m60: number; what: string }[]
    table: BlockWeek[]
    doneWhen: string[]
    tune?: { title: string; artist: string }
    notes?: string[]
  }
}

export type RepertoireTune = { title: string; artist: string; lane: string; blocks: number[] }

export type Profile = {
  name: string
  identity: string
  northStar: string
  test: string
  chasing: string
  strengths: string
  gaps: string
  theory: string
  coreProblem: string
  listening: { genres: string[]; artists: string[] }
  guitarHeroesNow: string[]
  foundation: string[]
  learningStyle: string
}
