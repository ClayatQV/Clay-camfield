/**
 * Vision-led plan builder: assessment results → a full plan in the shape the
 * app runs. Later an AI planner can produce the same GeneratedPlan JSON.
 *
 * Order of priority (Clay: "wants lead, about 70/30"):
 *  1. Blocks are milestones toward the player's signature pieces — the skills
 *     inside the music they named, with stepping stones when a skill isn't
 *     reachable yet.
 *  2. Remaining blocks follow what they said they want to learn.
 *  3. What the assessment says they need fills any gaps, and drives the daily
 *     warm-ups (about 30% of each session).
 * Every block and part carries a one-line "why".
 */
import { genreName, moduleFor } from '../assessment/genres'
import { lessonById, LESSONS } from '../content/lessons'
import { wantIds, type AssessmentResult, type LadderResult } from '../assessment/scoring'
import { skillArea } from '../assessment/skills'
import { ELEMENT_OPTS, WANT_OPTS, label as optLabel, splitPiece } from '../assessment/vision'
import type { BlockWeek, PartOption, SessionPart } from '../content/types'
import { CYCLE_OF_4THS } from '../content/blocks'
import { labPath, type LabPreset } from '../lib/lab'
import { FOCI, focusById, type Focus, type FocusWeek } from './foci'
import type { GeneratedPlan, Milestone, PlanBlock } from './model'

const MIN = {
  triads: { 30: 5, 60: 8 },
  arps: { 30: 5, 60: 8 },
  concept: { 30: 5, 60: 14 },
  application: { 30: 15, 60: 30 },
} as const

/** What about a signature piece → the blocks that build it, best fit first. */
const ELEMENT_FOCI: Record<string, string[]> = {
  fastruns: ['speed', 'pentatonic', 'lead'],
  licks: ['lead', 'singer'],
  bends: ['lead'],
  changes: ['chordtones', 'b9', 'outside'],
  outside: ['outside', 'altered', 'b9'],
  chords: ['triads', 'voicings', 'sevenths'],
  rhythm: ['groove', 'time'],
  riffs: ['songs', 'speed'],
  chordmelody: ['chordmelody', 'voicings'],
  fingerstyle: ['fingerstyle'],
  melody: ['singer', 'ears'],
  whole: ['songs'],
}

/** General wants → blocks, best fit first. */
const WANT_FOCI: Record<string, string[]> = {
  solo: ['lead', 'pentatonic', 'modes', 'chordtones', 'singer', 'outside'],
  changes: ['chordtones', 'sevenths', 'b9', 'outside', 'altered', 'harmonicminor'],
  songs: ['songs', 'gig'],
  lead: ['lead', 'pentatonic', 'singer'],
  speed: ['speed', 'pentatonic'],
  groove: ['time', 'groove'],
  chords: ['triads', 'sevenths', 'voicings'],
  fingerstyle: ['fingerstyle'],
  chordmelody: ['triads', 'voicings', 'chordmelody'],
  fretboard: ['neck', 'pentatonic', 'triads'],
  theory: ['sevenths', 'modes', 'neck'],
  ear: ['ears', 'songs'],
  phrasing: ['singer', 'lead'],
  write: ['write'],
  gig: ['gig', 'songs', 'time'],
  reading: ['reading'],
}

/** "You want to …" phrasing for each want. */
const WANT_WHY: Record<string, string> = {
  solo: 'solo and improvise better',
  changes: 'solo over chord changes',
  songs: 'play the songs you love',
  lead: 'get your lead playing together',
  speed: 'build speed and clean technique',
  groove: 'tighten your rhythm and groove',
  chords: 'play better chords and voicings',
  fingerstyle: 'play fingerstyle',
  chordmelody: 'play chord-melody',
  fretboard: 'know the whole fretboard',
  theory: 'understand the theory behind what you play',
  ear: 'play by ear',
  phrasing: 'work on phrasing, feel and tone',
  write: 'write your own songs and parts',
  gig: 'get gig-ready',
  reading: 'read charts and notation',
}

/** When a block isn't reachable yet, these lead toward it. */
const STEPS: Record<string, string[]> = {
  chordmelody: ['voicings', 'triads'],
  voicings: ['sevenths', 'triads'],
  outside: ['chordtones', 'modes'],
  b9: ['chordtones', 'sevenths'],
  altered: ['modes', 'chordtones'],
  harmonicminor: ['modes'],
  chordtones: ['sevenths', 'triads'],
  modes: ['pentatonic', 'neck'],
}

const GOAL_AREAS: Record<string, string[]> = {
  solo: ['improv', 'scales'],
  changes: ['improv', 'arps'],
  lead: ['scales', 'improv'],
  fretboard: ['fretboard', 'chords'],
  chordmelody: ['chords'],
  chords: ['chords', 'comping'],
  speed: ['scales'],
  groove: ['comping'],
  theory: ['theory'],
  ear: ['ear'],
  phrasing: ['improv'],
}

const clone = (r: AssessmentResult): AssessmentResult => JSON.parse(JSON.stringify(r))
const pct = (x: LadderResult | undefined) => (x ? (x.top + 1) / x.of : 0)

function areaNeed(r: AssessmentResult, area: string): number {
  const x = r.skills[area]
  if (!x) return 0
  let n = 1 - pct(x)
  if (x.top >= 0 && x.use === false) n += 1.5
  if (x.top >= 0 && x.play === false) n += 0.5
  return n
}

/** Need-based score (used for fallback picks and as a tiebreaker). */
export function scoreFocus(f: Focus, r: AssessmentResult): number {
  let s = f.trains.reduce((t, a) => t + areaNeed(r, a), 0)
  const goals = wantIds(r)
  const goalAreas = new Set(goals.flatMap((g) => GOAL_AREAS[g] ?? []))
  if (f.trains.some((a) => goalAreas.has(a))) s += 1.5
  s += (f.goals ?? []).filter((g) => goals.includes(g)).length * 1.5
  if (r.sameLicks && ['chordtones', 'singer', 'outside'].includes(f.id)) s += f.id === 'outside' ? 0.5 : 1
  const genres = [...r.topGenres, r.target ?? '']
  if (f.genres?.some((g) => genres.includes(g))) s += 0.75
  return s
}

/** After a block, assume one step of growth in what it trained. */
function grow(r: AssessmentResult, f: Focus) {
  for (const a of f.trains) {
    const x = r.skills[a]
    if (!x) continue
    x.top = Math.min(x.of - 1, x.top + 1)
    x.use = true
    x.play = true
  }
  if (f.id === 'time') r.timing = [...new Set([...r.timing, 'metronome', 'two-four', 'pocket', 'swing'])]
  if (f.id === 'groove') r.timing = [...new Set([...r.timing, 'pocket'])]
}

function homeFormsFocus(r: AssessmentResult): Focus | null {
  const home = r.genres[0]
  if (!home) return null
  const m = moduleFor(home.id)
  if (!m) return null
  const next = m.forms.rungs.slice(home.forms.top + 1, home.forms.top + 4)
  const feelsLeft = m.feels.filter((f) => !home.feels.includes(f))
  if (next.length === 0 && feelsLeft.length < 3) return null
  const weeks: FocusWeek[] = [0, 1, 2].map((i) => {
    const rung = next[i]
    const feel = feelsLeft[i]
    return {
      concept: rung ? `${m.name}: ${rung.label}` : `${m.name} feel: ${feel ?? 'your favorite groove'}`,
      instruction: rung
        ? `${rung.prompt.replace(/^Can you /, 'Learn to ').replace(/^Do you know /, 'Learn ').replace(/\?$/, '.')} Play it in two keys${feel ? `, with a ${feel.toLowerCase()} feel` : ''}.`
        : `Play a whole song in this feel with a metronome, then without.`,
      lab: [],
    }
  })
  return {
    id: 'genreforms',
    title: `${m.name} forms and feels`,
    summary: `The forms and feels every ${m.name.toLowerCase()} player is expected to know.`,
    trains: ['comping'],
    tier: 1,
    genres: [home.id],
    weeks,
    doneWhen: [...next.map((x) => `Play ${x.label} in any key`), ...feelsLeft.slice(0, 2).map((f) => `Play a ${f.toLowerCase()} feel on demand`)].slice(0, 3),
  }
}

/* ---------------- choosing the blocks ---------------- */

export type Pick = {
  focus: Focus
  /** index into vision.pieces, when the block works toward a piece */
  piece: number | null
  element?: string
  want?: string
  /** this block is a stepping stone toward another focus */
  stepFor?: Focus
  why: string
}

const pieceTitle = (text: string) => splitPiece(text).title

export function choosePicks(result: AssessmentResult, count: number, rejected: string[] = []): Pick[] {
  const r = clone(result)
  const v = result.vision
  const used = new Set<string>(rejected)
  const picks: Pick[] = []
  const pool = (id: string): Focus | undefined => (id === 'genreforms' ? homeFormsFocus(r) ?? undefined : focusById(id))
  const reachable = (f: Focus) => !f.need || f.need(r)
  const fresh = (f: Focus) => !f.done || !f.done(r)

  /** First workable focus from a list: itself, or a stepping stone toward it. */
  const take = (ids: string[], relaxDone = false): { f: Focus; stepFor?: Focus } | null => {
    for (const id of ids) {
      const f = pool(id)
      if (!f || used.has(f.id)) continue
      if (reachable(f) && (relaxDone || fresh(f))) return { f }
      if (!reachable(f)) {
        for (const sid of STEPS[id] ?? []) {
          const s = pool(sid)
          if (s && !used.has(s.id) && reachable(s) && (relaxDone || fresh(s))) return { f: s, stepFor: f }
        }
      }
    }
    return null
  }

  const commit = (p: Pick) => {
    picks.push(p)
    used.add(p.focus.id)
    grow(r, p.focus)
  }

  // Slot plan: rounds over the signature pieces, one want slot after each round.
  const pieces = (v?.pieces ?? []).map((p) => ({ ...p, elements: p.elements.length ? p.elements : ['whole'] }))
  const wants = v?.wants.length ? v.wants : wantIds(result)
  const perPiece = pieces.length ? Math.max(1, Math.min(2, Math.floor((count * 0.75) / pieces.length))) : 0
  const slots: ({ kind: 'piece'; i: number } | { kind: 'want' })[] = []
  for (let round = 0; round < perPiece; round++) {
    pieces.forEach((_, i) => slots.push({ kind: 'piece', i }))
    slots.push({ kind: 'want' })
  }
  while (slots.length < count) slots.push({ kind: 'want' })
  slots.length = count

  let wantTurn = 0
  const pieceRound = pieces.map(() => 0)
  for (const slot of slots) {
    let p: Pick | null = null
    if (slot.kind === 'piece') {
      const piece = pieces[slot.i]
      // Each new block for a piece starts from a different part of it.
      const k = pieceRound[slot.i]++ % piece.elements.length
      const order = [...piece.elements.slice(k), ...piece.elements.slice(0, k)]
      for (const el of order) {
        const got = take(ELEMENT_FOCI[el] ?? [])
        if (!got) continue
        const elLabel = optLabel(ELEMENT_OPTS, el).toLowerCase()
        const title = pieceTitle(piece.text)
        p = {
          focus: got.f,
          piece: slot.i,
          element: el,
          stepFor: got.stepFor,
          why: got.stepFor
            ? `First step toward ${got.stepFor.title.toLowerCase()}, so you can play ${elLabel} in “${title}”.`
            : `“${title}” needs ${elLabel}. This block builds it.`,
        }
        break
      }
    }
    if (!p && wants.length) {
      for (let k = 0; k < wants.length && !p; k++) {
        const w = wants[(wantTurn + k) % wants.length]
        const got = take(WANT_FOCI[w] ?? [])
        if (got) {
          p = {
            focus: got.f,
            piece: null,
            want: w,
            stepFor: got.stepFor,
            why: `You want to ${WANT_WHY[w] ?? optLabel(WANT_OPTS, w).toLowerCase()}${got.stepFor ? ` — this builds toward ${got.stepFor.title.toLowerCase()}` : ''}.`,
          }
        }
      }
      wantTurn++
    }
    if (!p) {
      // Fall back to what the assessment says they need most.
      const candidates = [...FOCI.filter((f) => f.id !== 'together' && f.id !== 'genreforms')]
      const forms = homeFormsFocus(r)
      if (forms) candidates.push(forms)
      let best: { f: Focus; s: number } | null = null
      for (const relaxed of [false, true]) {
        for (const f of candidates) {
          if (used.has(f.id) || !reachable(f) || (!relaxed && !fresh(f))) continue
          const s = scoreFocus(f, r)
          if (!best || s > best.s) best = { f, s }
        }
        if (best) break
      }
      if (best) {
        const area = best.f.trains[0] ? skillArea(best.f.trains[0])?.name.toLowerCase() : null
        p = { focus: best.f, piece: null, why: area ? `Your assessment points to ${area} as a next step.` : best.f.summary }
      }
    }
    if (!p) break
    commit(p)
  }
  return picks
}

/** Kept for callers that only need the blocks. */
export function chooseFoci(result: AssessmentResult, count: number): Focus[] {
  return choosePicks(result, count).map((p) => p.focus)
}

/* ---------------- weekly warm-ups (the "needs" 30%) ---------------- */

const SETS = [
  { set: 'GBE', name: 'G–B–E' },
  { set: 'DGB', name: 'D–G–B' },
  { set: 'ADG', name: 'A–D–G' },
]

function warmupChords(r: AssessmentResult, gw: number, block: Focus): SessionPart {
  const lvl = r.skills.chords?.top ?? 0
  const i = gw - 1
  let focus: string, share: string, p: LabPreset, label: string
  if (lvl < 4) {
    const s = SETS[Math.floor(i / 2) % 3]
    const minor = i % 2 === 1
    focus = `${minor ? 'Minor' : 'Major'} triads · ${s.name}`
    share = `Triads (${s.name})`
    label = `${minor ? 'Minor' : 'Major'} triads · ${s.name} · cycle of 4ths`
    p = { mode: 'chords', root: 'C', type: minor ? 'min' : 'maj', voicing: 'close3', set: s.set, move: 'c4', zone: 'mid' }
  } else if (lvl < 6) {
    const types = ['maj7', 'm7', '7']
    const t = types[i % 3]
    focus = `Drop 2 ${t} voicings through the cycle`
    share = `drop 2 ${t}`
    label = `Drop 2 ${t} · cycle of 4ths`
    p = { mode: 'chords', root: 'C', type: t, voicing: 'drop2', set: i % 3, move: 'c4' }
  } else {
    const v = i % 2 === 0 ? 'drop3' : 'shell37'
    focus = `${v === 'drop3' ? 'Drop 3' : 'Shell'} ii–V–I through the cycle`
    share = v === 'drop3' ? 'drop 3 ii–V–I' : 'shell ii–V–I'
    label = `${v === 'drop3' ? 'Drop 3' : 'Shells'} · ii–V–I`
    p = { mode: 'chords', root: 'C', type: 'maj7', voicing: v, set: 0, move: '251' }
  }
  const next = r.skills.chords?.next
  return {
    id: 'triads',
    title: 'Chords',
    shareLabel: share,
    focus,
    instruction: `Cycle of 4ths (${CYCLE_OF_4THS.join(' ')}), nearest shape each time. Say the chord tones out loud.`,
    minutes: MIN.triads,
    labLinks: [{ label, labUrl: labPath(p) }],
    why: block.trains.includes('chords') ? `Sets up this block: ${block.title.toLowerCase()}.` : next ? `Your foundation: working toward ${next}.` : 'Keeps your chord vocabulary moving.',
  }
}

function warmupArps(r: AssessmentResult, gw: number, block: Focus): SessionPart {
  const lvl = r.skills.arps?.top ?? 0
  const i = gw - 1
  let focus: string, share: string, p: LabPreset
  if (lvl < 1) {
    const t = i % 2 === 0 ? 'maj' : 'min'
    focus = `${t === 'maj' ? 'Major' : 'Minor'} triad arpeggios through the cycle`
    share = `${t === 'maj' ? 'major' : 'minor'} arpeggios`
    p = { mode: 'arpeggios', root: 'C', type: t, pos: 5, move: 'c4', pat: 'ud', bpm: 60 }
  } else if (lvl < 3) {
    const t = ['maj7', 'm7', '7'][i % 3]
    focus = `${t} arpeggios through the cycle, two octaves where possible`
    share = `${t} arpeggios`
    p = { mode: 'arpeggios', root: 'C', type: t, pos: 5, move: 'c4', pat: 'ud', start: i % 2 ? '3' : 'r', bpm: 60 }
  } else if (lvl < 4) {
    focus = 'ii–V–I arpeggios (m7, 7, maj7) through the cycle'
    share = 'ii–V–I arpeggios'
    p = { mode: 'arpeggios', root: 'C', type: 'maj7', pos: [5, 8, 3][i % 3], move: '251', pat: 'ud', bpm: 60 }
  } else {
    const t = ['9', 'm9', '7b9'][i % 3]
    focus = `${t.replace('b', '♭')} arpeggios through the cycle`
    share = `${t.replace('b', '♭')} arpeggios`
    p = { mode: 'arpeggios', root: 'C', type: t, pos: 5, move: 'c4', pat: 'ud', bpm: 60 }
  }
  const supports = block.trains.some((a) => a === 'arps' || a === 'improv')
  return {
    id: 'arps',
    title: 'Arpeggios',
    shareLabel: share,
    focus,
    instruction: 'With the click at 60. Start slow enough to name every note as you play it.',
    minutes: MIN.arps,
    labLinks: [{ label: focus.replace(' through the cycle, two octaves where possible', ' · cycle of 4ths'), labUrl: labPath(p) }],
    why: supports ? `The note choices for this block's lines.` : 'Keeps chord tones under your fingers for everything else.',
  }
}

/* ---------------- application options ---------------- */

const transcription = (title: string, artist: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist} guitar transcription tab`)}`

/** A lesson in the library that matches a signature piece, if any. */
function lessonFor(text: string) {
  const t = text.toLowerCase()
  return LESSONS.find((l) => l.kind === 'song' && t.includes(l.song.toLowerCase()))
}

function pieceOption(text: string, label = 'Your goal'): PartOption {
  const { title, artist } = splitPiece(text)
  const lesson = lessonFor(text)
  return lesson
    ? { label: title, sub: `${label} · lesson with tab and bar map`, url: `#/lessons/${lesson.id}`, kind: 'goal' }
    : { label: title, sub: `${label}${artist ? ` · ${artist}` : ''}`, url: transcription(title, artist), kind: 'goal' }
}

type Cand = PartOption & { key: string }

function songPool(r: AssessmentResult, f: Focus): { own: Cand[]; discover: Cand[] } {
  const own: Cand[] = []
  const seen = new Set<string>()
  const add = (list: Cand[], c: Cand) => {
    if (seen.has(c.key)) return
    seen.add(c.key)
    list.push(c)
  }
  for (const s of f.songs ?? []) add(own, { key: s.title, label: s.title, sub: s.artist, url: transcription(s.title, s.artist), kind: 'song' })
  const genreIds = [...r.genres.map((g) => g.id)]
  if (r.target && !genreIds.includes(r.target)) genreIds.push(r.target)
  const perGenre: Cand[][] = genreIds.map((id) => {
    const m = moduleFor(id)
    const g = r.genres.find((x) => x.id === id)
    if (!m) return []
    const playable = new Set(g?.songsPlayable ?? [])
    const known = new Set(g?.songsKnown ?? [])
    return m.songs
      .filter((s) => !playable.has(s.title))
      .sort((a, b) => Number(known.has(b.title)) - Number(known.has(a.title)))
      .map((s) => ({ key: s.title, label: s.title, sub: `${s.artist} · ${m.name}`, url: transcription(s.title, s.artist), kind: 'song' as const }))
  })
  for (let i = 0; i < 12; i++) for (const list of perGenre) if (list[i]) add(own, list[i])
  const discover: Cand[] = []
  for (const id of r.otherGenres) {
    const m = moduleFor(id)
    if (!m || genreIds.includes(id)) continue
    for (const s of m.songs.slice(0, 4)) add(discover, { key: s.title, label: s.title, sub: `${s.artist} · ${m.name} · discovery pick`, url: transcription(s.title, s.artist), kind: 'discover' })
  }
  if (!discover.length) {
    const m = moduleFor(['jazz', 'soul', 'blues', 'funk'].find((g) => !genreIds.includes(g)) ?? 'jazz')
    if (m) for (const s of m.songs.slice(0, 4)) add(discover, { key: s.title, label: s.title, sub: `${s.artist} · ${m.name} · discovery pick`, url: transcription(s.title, s.artist), kind: 'discover' })
  }
  return { own, discover }
}

function applicationPart(r: AssessmentResult, pick: Pick, week: number, gw: number, finalForPiece: boolean): SessionPart {
  const f = pick.focus
  const v = r.vision
  const { own, discover } = songPool(r, f)
  const picks: PartOption[] = []
  const pieceText = pick.piece !== null ? v?.pieces[pick.piece]?.text : undefined
  if (pieceText) picks.push(pieceOption(pieceText))
  else if (v?.pieces.length) picks.push(pieceOption(v.pieces[(gw - 1) % v.pieces.length].text, 'One of your goals'))
  const want = 4 - picks.length - (discover.length ? 1 : 0)
  const n = Math.max(1, own.length)
  const start = ((gw - 1) * want) % n
  for (let k = 0; k < Math.min(want, own.length); k++) {
    const { key: _k, ...o } = own[(start + k) % n]
    void _k
    picks.push(o)
  }
  if (discover.length) {
    const { key: _k, ...o } = discover[(gw - 1) % discover.length]
    void _k
    picks.push(o)
  }
  const fw = f.weeks[Math.min(week - 1, f.weeks.length - 1)]
  const milestone = finalForPiece && pieceText && week === 3
  const title = pieceText ? pieceTitle(pieceText) : ''
  return {
    id: 'application',
    title: 'Application',
    shareLabel: pieceText ? title : picks[0] ? picks[0].label : 'repertoire',
    focus: milestone ? `Milestone: play “${title}” start to finish` : pieceText ? `Work on “${title}”, or pick another song` : 'Pick one song and learn it from a transcription',
    instruction: milestone
      ? `This is what the last few weeks were for. Play it all the way through, record it, and compare it with week 1.`
      : `Learn it from a video with the tab on screen, then solo over it using only this week's idea${fw ? ` (${fw.concept.toLowerCase()})` : ''}.`,
    minutes: MIN.application,
    options: picks,
    lessonId: f.lessonId && !(pieceText && lessonFor(pieceText)) ? f.lessonId : undefined,
    why: pieceText ? `This is the music you said you want to play.` : `Real music, so the idea sticks.`,
  }
}

/* ---------------- build ---------------- */

const LENGTHS: Record<string, { blocks: number; finish: number }> = {
  '4w': { blocks: 1, finish: 1 },
  '3m': { blocks: 4, finish: 1 },
  '6m': { blocks: 8, finish: 2 },
  ongoing: { blocks: 8, finish: 2 },
}

export function buildPlan(result: AssessmentResult, now = new Date(), rejected: string[] = []): GeneratedPlan {
  const len = LENGTHS[result.goals.length ?? '6m'] ?? LENGTHS['6m']
  const chosen = choosePicks(result, len.blocks, rejected)
  const together = focusById('together')!
  const sequence: { pick: Pick; weeks: number }[] = [
    ...chosen.map((pick) => ({ pick, weeks: 3 })),
    { pick: { focus: together, piece: null, why: 'Play everything you built, start to finish, and record it.' }, weeks: len.finish },
  ]
  const lastBlockForPiece = new Map<number, number>()
  sequence.forEach(({ pick }, bi) => {
    if (pick.piece !== null) lastBlockForPiece.set(pick.piece, bi)
  })
  const blocks: PlanBlock[] = []
  let gw = 1
  const growing = clone(result)
  const v = result.vision
  sequence.forEach(({ pick, weeks }, bi) => {
    const f = pick.focus
    const weekParts: SessionPart[][] = []
    const table: BlockWeek[] = []
    const finalForPiece = pick.piece !== null && lastBlockForPiece.get(pick.piece) === bi
    for (let w = 1; w <= weeks; w++, gw++) {
      const fw = f.weeks[Math.min(w - 1, f.weeks.length - 1)]
      const chords = warmupChords(growing, gw, f)
      const arps = warmupArps(growing, gw, f)
      const concept: SessionPart = {
        id: 'concept',
        title: 'Concept',
        shareLabel: fw.concept.length > 40 ? f.title : fw.concept,
        focus: fw.concept,
        instruction: fw.instruction,
        minutes: MIN.concept,
        labLinks: fw.lab.map((l) => ({ label: l.label, labUrl: labPath(l.p) })),
        why: pick.why,
      }
      // A signature piece with a lesson in the library: add its drills to the concept.
      const pieceText = pick.piece !== null ? v?.pieces[pick.piece]?.text : undefined
      const lesson = pieceText ? lessonFor(pieceText) : undefined
      if (lesson && w === 1) concept.labLinks = [...(concept.labLinks ?? []), ...(lessonById(lesson.id)?.drills ?? []).slice(0, 2)]
      // …and loop one of its moments each week, so the idea lands in the actual music.
      const moment = lesson?.moments?.[(bi + w - 1) % lesson.moments.length]
      if (lesson && moment) {
        concept.instruction = `${concept.instruction} Then open the ${lesson.song} lesson and loop “${moment.label}” with the speed ladder.`
      }
      const app = applicationPart(result, pick, w, gw, finalForPiece)
      weekParts.push([chords, arps, concept, app])
      table.push({
        week: w,
        triads: chords.focus,
        arps: arps.focus,
        concept: fw.concept,
        application: (app.options ?? []).map((o) => o.label).join(' · ') || 'Your repertoire',
      })
    }
    grow(growing, f)
    const pieceText = pick.piece !== null ? v?.pieces[pick.piece]?.text : undefined
    const elLabel = pick.element ? optLabel(ELEMENT_OPTS, pick.element).toLowerCase() : null
    blocks.push({
      n: bi + 1,
      title: f.title,
      summary: f.summary,
      weeks: [gw - weeks, gw - 1],
      focusId: f.id,
      towards: pieceText ? pieceTitle(pieceText) : undefined,
      why: pick.why,
      daily: [
        { part: 'triads', m30: MIN.triads[30], m60: MIN.triads[60], what: 'Chord warm-up through the cycle of 4ths: your foundation' },
        { part: 'arps', m30: MIN.arps[30], m60: MIN.arps[60], what: 'Arpeggio warm-up with the click: the notes behind every line' },
        { part: 'concept', m30: MIN.concept[30], m60: MIN.concept[60], what: `This block's idea — ${f.summary}` },
        { part: 'application', m30: MIN.application[30], m60: MIN.application[60], what: pieceText ? `“${pieceTitle(pieceText)}”, or a song from your genres, learned from a transcription` : 'A song from your genres, learned from a transcription, then soloed over with the week\'s idea' },
      ],
      table,
      doneWhen: [
        ...(pieceText && elLabel ? [`Play ${elLabel} in “${pieceTitle(pieceText)}” at full tempo`] : []),
        ...(finalForPiece && pieceText ? [`Play “${pieceTitle(pieceText)}” start to finish and record it`] : []),
        ...f.doneWhen,
      ].slice(0, 4),
      tune: pieceText ? splitPiece(pieceText) : f.songs?.[0],
      weekParts,
      detailed: true,
    })
  })
  const milestones: Milestone[] = (v?.pieces ?? []).map((p, i) => ({
    piece: p.text,
    blocks: sequence.map((s, bi) => (s.pick.piece === i ? bi + 1 : 0)).filter(Boolean),
  }))
  const home = result.genres[0] ? result.genres[0].name : result.topGenres[0] ? genreName(result.topGenres[0]) : 'your music'
  return {
    id: `p-${now.getTime().toString(36)}`,
    createdAt: now.toISOString(),
    source: 'assessment',
    resultId: result.id,
    title: v?.pieces.length ? `${blocks.length} blocks toward your vision` : `${blocks.length} blocks built for you`,
    summary: v?.statement ? `Built around your vision, rooted in ${home}.` : `Built from your assessment: ${result.playerType}. Rooted in ${home}.`,
    blocks,
    vision: v,
    milestones,
    rejected,
  }
}
