/**
 * Local-first store. One JSON object in localStorage, every access wrapped in
 * try/catch. React reads it through useData() (useSyncExternalStore).
 *
 * Later, a backend can replace load/save without touching the screens.
 */
import { useSyncExternalStore } from 'react'
import type { LessonStatus, Moment, PartId } from '../content/types'
import { PART_IDS } from '../content/types'
import { isValidKey, todayKey, type DayKey } from '../lib/dates'
import type { Answers } from '../assessment/types'
import type { AssessmentResult } from '../assessment/scoring'
import type { GeneratedPlan } from '../plan/model'
import type { AiModule, AiResult, AiScreen, BlockId, EarGuide } from '../../api/_lib/schemas'

export const STORAGE_KEY = 'practice-coach'
export const LAB_STORAGE_KEY = 'fretboard-lab'
export const DATA_VERSION = 1

export type LengthMode = 30 | 60
export type Theme = 'system' | 'light' | 'dark'

export type Session = {
  id: string
  date: DayKey
  minutes: number
  parts: Record<PartId, boolean>
  note?: string
  lengthMode: LengthMode
  block?: number
  week?: number
  /** Short part labels at the time ("Triads (G–B–E)"), for history and sharing. */
  partLabels?: string[]
  /** Seconds on each part's clock (for stats). Missing on sessions logged before v0.2. */
  partSeconds?: Record<PartId, number>
  finishedAt: string
}

export type Settings = {
  planStart: DayKey
  /** Pinned block/week. null = computed from planStart. */
  override: { block: number; week: number } | null
  sessionLength: LengthMode
  /** Practice page: one part at a time (true) or all four cards (false). */
  guided: boolean
  dadPhone: string
  theme: Theme
  ladderPasses: number
}

/** Today's in-progress session, so a reload or a locked phone loses nothing. */
export type Draft = {
  date: DayKey
  lengthMode: LengthMode
  /** Accumulated seconds per part, not counting the running stretch. */
  elapsed: Record<PartId, number>
  running: PartId | null
  /** epoch ms when `running` started */
  startedAt: number | null
  done: Record<PartId, boolean>
  note: string
}

export type LabMode = 'chords' | 'arpeggios' | 'scales' | 'technique'
export const LAB_MODES: LabMode[] = ['chords', 'arpeggios', 'scales', 'technique']
/** Active seconds in Fretboard Lab, per day and mode. */
export type LabTime = Record<DayKey, Partial<Record<LabMode, number>>>

export type LessonState = { status: LessonStatus; youtubeId?: string; decidedAt?: string }

export type AssessmentDraft = { answers: Answers; order: string[]; startedAt: string }

export type AssessmentState = {
  draft: AssessmentDraft | null
  /** newest last */
  results: AssessmentResult[]
  dismissedPrompt: boolean
}

/** What was active before the last plan replacement, so it can be restored. */
export type PreviousPlan = { plan: GeneratedPlan | null; planStart: DayKey; override: Settings['override'] }

/* ---------------- AI coach ---------------- */

export type AiTurn = { screen: AiScreen; answer: unknown }

export type AiInterview = {
  startedAt: string
  block: BlockId
  turns: AiTurn[]
  /** fetched screens not yet answered */
  queue: AiScreen[]
  /** screens answered in the current block */
  blockAsked: number
  notes: string | null
  summaries: Partial<Record<BlockId, string>>
  corrections: Partial<Record<BlockId, string>>
  /** a block summary waiting for "looks right" / a correction */
  pendingSummary: string | null
  done: boolean
}

export type AiState = {
  passcode: string
  interview: AiInterview | null
  result: AiResult | null
  resultAt: string | null
  /** the curriculum as the player is shaping it on the Build page */
  build: { modules: AiModule[]; minutes: number; days: number } | null
}

/** A piece the player is learning by ear: the video they chose, the sections they marked, the coach's guide. */
export type EarPiece = {
  title: string
  artist: string
  youtubeId: string | null
  about: string
  sections: Moment[]
  guide: EarGuide | null
  guideAt: string | null
}

export type AppData = {
  version: number
  settings: Settings
  sessions: Session[]
  lessonState: Record<string, LessonState>
  /** "done when" checks, key = `b{block}:{index}` */
  doneWhen: Record<string, boolean>
  /** Custom moments per lesson (replaces the defaults when present). */
  moments: Record<string, Moment[]>
  /** Learn-by-ear pieces, keyed by earKey(title, artist). */
  ear: Record<string, EarPiece>
  draft: Draft | null
  labTime: LabTime
  assessment: AssessmentState
  /** null = Clay's original hand-built plan */
  plan: GeneratedPlan | null
  previousPlan: PreviousPlan | null
  ai: AiState
}

export const emptyParts = (): Record<PartId, boolean> => ({ triads: false, arps: false, concept: false, application: false })
export const zeroElapsed = (): Record<PartId, number> => ({ triads: 0, arps: 0, concept: 0, application: 0 })

export function defaultData(): AppData {
  return {
    version: DATA_VERSION,
    settings: {
      planStart: todayKey(),
      override: null,
      sessionLength: 30,
      guided: true,
      dadPhone: '',
      theme: 'system',
      ladderPasses: 4,
    },
    sessions: [],
    lessonState: {},
    doneWhen: {},
    moments: {},
    ear: {},
    draft: null,
    labTime: {},
    assessment: { draft: null, results: [], dismissedPrompt: false },
    plan: null,
    previousPlan: null,
    ai: { passcode: '', interview: null, result: null, resultAt: null, build: null },
  }
}

/* ---------------- validation / migration ---------------- */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function normParts(v: unknown): Record<PartId, boolean> {
  const out = emptyParts()
  if (isObj(v)) for (const p of PART_IDS) out[p] = !!v[p]
  return out
}

function normSession(v: unknown): Session | null {
  if (!isObj(v) || !isValidKey(v.date)) return null
  const minutes = Math.max(0, Math.round(Number(v.minutes) || 0))
  return {
    id: typeof v.id === 'string' ? v.id : `${v.date}-${Math.random().toString(36).slice(2, 8)}`,
    date: v.date,
    minutes,
    parts: normParts(v.parts),
    note: typeof v.note === 'string' && v.note ? v.note : undefined,
    lengthMode: v.lengthMode === 60 ? 60 : 30,
    block: typeof v.block === 'number' ? v.block : undefined,
    week: typeof v.week === 'number' ? v.week : undefined,
    partLabels: Array.isArray(v.partLabels) ? v.partLabels.filter((x): x is string => typeof x === 'string') : undefined,
    partSeconds: isObj(v.partSeconds)
      ? (Object.fromEntries(PART_IDS.map((p) => [p, Math.max(0, Math.round(Number((v.partSeconds as Record<string, unknown>)[p]) || 0))])) as Record<PartId, number>)
      : undefined,
    finishedAt: typeof v.finishedAt === 'string' ? v.finishedAt : new Date().toISOString(),
  }
}

/** Accepts anything (old versions, hand-edited files) and returns valid AppData. */
export function normalize(raw: unknown): AppData {
  const d = defaultData()
  if (!isObj(raw)) return d
  const s = isObj(raw.settings) ? raw.settings : {}
  const ov = isObj(s.override) ? s.override : null
  d.settings = {
    planStart: isValidKey(s.planStart) ? s.planStart : d.settings.planStart,
    override:
      ov && Number(ov.block) >= 1 && Number(ov.week) >= 1 ? { block: Math.round(Number(ov.block)), week: Math.round(Number(ov.week)) } : null,
    sessionLength: s.sessionLength === 60 ? 60 : 30,
    guided: s.guided !== false,
    dadPhone: typeof s.dadPhone === 'string' ? s.dadPhone : '',
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
    ladderPasses: Math.min(20, Math.max(1, Math.round(Number(s.ladderPasses) || 4))),
  }
  if (Array.isArray(raw.sessions)) {
    d.sessions = raw.sessions.map(normSession).filter((x): x is Session => !!x)
    d.sessions.sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : 1))
  }
  if (isObj(raw.lessonState)) {
    for (const [id, v] of Object.entries(raw.lessonState)) {
      if (isObj(v) && (v.status === 'approved' || v.status === 'candidate' || v.status === 'rejected')) {
        d.lessonState[id] = {
          status: v.status,
          youtubeId: typeof v.youtubeId === 'string' ? v.youtubeId : undefined,
          decidedAt: typeof v.decidedAt === 'string' ? v.decidedAt : undefined,
        }
      }
    }
  }
  if (isObj(raw.doneWhen)) for (const [k, v] of Object.entries(raw.doneWhen)) if (v) d.doneWhen[k] = true
  if (isObj(raw.ear)) {
    for (const [k, v] of Object.entries(raw.ear)) {
      if (!isObj(v) || typeof v.title !== 'string') continue
      d.ear[k] = {
        title: v.title,
        artist: typeof v.artist === 'string' ? v.artist : '',
        youtubeId: typeof v.youtubeId === 'string' && v.youtubeId ? v.youtubeId : null,
        about: typeof v.about === 'string' ? v.about : '',
        sections: Array.isArray(v.sections)
          ? (v.sections.filter((m) => isObj(m) && typeof m.label === 'string' && Number.isFinite(Number(m.a)) && Number.isFinite(Number(m.b))) as unknown as Moment[])
          : [],
        guide: isObj(v.guide) && isObj(v.guide.underlying) && Array.isArray(v.guide.sections) ? (v.guide as unknown as EarGuide) : null,
        guideAt: typeof v.guideAt === 'string' ? v.guideAt : null,
      }
    }
  }
  if (isObj(raw.moments)) {
    for (const [id, list] of Object.entries(raw.moments)) {
      if (!Array.isArray(list)) continue
      d.moments[id] = list
        .filter(isObj)
        .map((m) => ({ label: String(m.label ?? 'Loop'), a: Number(m.a) || 0, b: Number(m.b) || 0 }))
        .filter((m) => m.b > m.a)
    }
  }
  if (isObj(raw.labTime)) {
    for (const [day, modes] of Object.entries(raw.labTime)) {
      if (!isValidKey(day) || !isObj(modes)) continue
      const row: Partial<Record<LabMode, number>> = {}
      for (const m of LAB_MODES) {
        const n = Math.round(Number(modes[m]) || 0)
        if (n > 0) row[m] = n
      }
      if (Object.keys(row).length) d.labTime[day] = row
    }
  }
  if (isObj(raw.assessment)) {
    const a = raw.assessment
    const dr = isObj(a.draft) ? a.draft : null
    d.assessment = {
      draft:
        dr && isObj(dr.answers) && Array.isArray(dr.order)
          ? { answers: dr.answers as Answers, order: dr.order.filter((x): x is string => typeof x === 'string'), startedAt: String(dr.startedAt ?? '') }
          : null,
      results: Array.isArray(a.results)
        ? (a.results.filter((r) => isObj(r) && typeof r.id === 'string' && isObj(r.skills) && Array.isArray(r.genres)) as unknown as AssessmentResult[])
        : [],
      dismissedPrompt: !!a.dismissedPrompt,
    }
  }
  if (isObj(raw.plan) && Array.isArray(raw.plan.blocks) && raw.plan.blocks.length) d.plan = raw.plan as unknown as GeneratedPlan
  if (isObj(raw.previousPlan) && isValidKey(raw.previousPlan.planStart)) {
    const pp = raw.previousPlan
    d.previousPlan = {
      plan: isObj(pp.plan) && Array.isArray(pp.plan.blocks) ? (pp.plan as unknown as GeneratedPlan) : null,
      planStart: pp.planStart as DayKey,
      override: isObj(pp.override) ? { block: Number(pp.override.block) || 1, week: Number(pp.override.week) || 1 } : null,
    }
  }
  if (isObj(raw.ai)) {
    const a = raw.ai
    const iv = isObj(a.interview) ? a.interview : null
    const BLOCKS = ['skills', 'taste', 'vision']
    d.ai = {
      passcode: typeof a.passcode === 'string' ? a.passcode : '',
      interview:
        iv && Array.isArray(iv.turns) && BLOCKS.includes(iv.block as string)
          ? {
              startedAt: String(iv.startedAt ?? ''),
              block: iv.block as BlockId,
              turns: iv.turns.filter((t): t is AiTurn => isObj(t) && isObj(t.screen) && typeof t.screen.id === 'string'),
              queue: Array.isArray(iv.queue) ? (iv.queue.filter((s) => isObj(s) && typeof s.id === 'string') as AiScreen[]) : [],
              blockAsked: Math.max(0, Number(iv.blockAsked) || 0),
              notes: typeof iv.notes === 'string' ? iv.notes : null,
              summaries: isObj(iv.summaries) ? (iv.summaries as AiInterview['summaries']) : {},
              corrections: isObj(iv.corrections) ? (iv.corrections as AiInterview['corrections']) : {},
              pendingSummary: typeof iv.pendingSummary === 'string' ? iv.pendingSummary : null,
              done: !!iv.done,
            }
          : null,
      result: isObj(a.result) && isObj(a.result.profile) && Array.isArray(a.result.modules) ? (a.result as unknown as AiResult) : null,
      resultAt: typeof a.resultAt === 'string' ? a.resultAt : null,
      build:
        isObj(a.build) && Array.isArray(a.build.modules)
          ? { modules: a.build.modules as AiModule[], minutes: Number(a.build.minutes) || 30, days: Number(a.build.days) || 5 }
          : null,
    }
  }
  if (isObj(raw.draft) && isValidKey(raw.draft.date)) {
    const r = raw.draft
    const el = zeroElapsed()
    if (isObj(r.elapsed)) for (const p of PART_IDS) el[p] = Math.max(0, Number(r.elapsed[p]) || 0)
    const running = PART_IDS.includes(r.running as PartId) ? (r.running as PartId) : null
    d.draft = {
      date: r.date as DayKey,
      lengthMode: r.lengthMode === 60 ? 60 : 30,
      elapsed: el,
      running,
      startedAt: running && Number(r.startedAt) > 0 ? Number(r.startedAt) : null,
      done: normParts(r.done),
      note: typeof r.note === 'string' ? r.note : '',
    }
  }
  return d
}

/* ---------------- persistence ---------------- */

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function writeStorage(key: string, value: string | null): boolean {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function load(): AppData {
  const raw = readStorage(STORAGE_KEY)
  if (!raw) return defaultData()
  try {
    return normalize(JSON.parse(raw))
  } catch {
    return defaultData()
  }
}

let data: AppData = load()
let saveOk = true
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function getData(): AppData {
  return data
}

/** Whether the last write to localStorage worked (private mode, full storage…). */
export function storageHealthy(): boolean {
  return saveOk
}

export function setData(next: AppData) {
  data = next
  saveOk = writeStorage(STORAGE_KEY, JSON.stringify(next))
  emit()
}

export function update(fn: (d: AppData) => AppData) {
  setData(fn(data))
}

export function updateSettings(patch: Partial<Settings>) {
  update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
}

export function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Keep several open tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      data = load()
      emit()
    }
  })
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData, getData)
}

/* ---------------- export / import / reset ---------------- */

export type BackupFile = {
  app: 'practice-coach'
  exportedAt: string
  data: AppData
  /** Fretboard Lab's own saved settings, so a restore brings those back too. */
  fretboardLab: unknown
}

export function buildBackup(): BackupFile {
  let lab: unknown = null
  try {
    lab = JSON.parse(readStorage(LAB_STORAGE_KEY) || 'null')
  } catch {
    lab = null
  }
  return { app: 'practice-coach', exportedAt: new Date().toISOString(), data, fretboardLab: lab }
}

export function exportFileName(): string {
  return `practice-coach-backup-${todayKey()}.json`
}

/** Returns a human summary on success; throws an Error with a readable message on failure. */
export function importBackup(text: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (!isObj(parsed)) throw new Error("That file doesn't look like a Practice Coach backup.")
  // Accept both the wrapped backup and a bare AppData object.
  const inner = parsed.app === 'practice-coach' && isObj(parsed.data) ? parsed.data : parsed
  if (!isObj(inner) || !('settings' in inner || 'sessions' in inner)) {
    throw new Error("That file doesn't look like a Practice Coach backup.")
  }
  const next = normalize(inner)
  setData(next)
  if ('fretboardLab' in parsed && parsed.fretboardLab) {
    writeStorage(LAB_STORAGE_KEY, JSON.stringify(parsed.fretboardLab))
  }
  return `Restored ${next.sessions.length} session${next.sessions.length === 1 ? '' : 's'}.`
}

export function resetAll() {
  writeStorage(LAB_STORAGE_KEY, null)
  setData(defaultData())
}

/** Store key for a learn-by-ear piece. */
export function earKey(title: string, artist: string): string {
  return `${title}|${artist}`.toLowerCase().replace(/[’'"().,!?]/g, '').replace(/\s+/g, ' ').trim()
}
