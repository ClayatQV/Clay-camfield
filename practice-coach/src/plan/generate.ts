/**
 * Rule-based plan builder: assessment results → a full plan in the same shape
 * the app runs. Later an AI planner can produce the same GeneratedPlan JSON.
 *
 * How it chooses: every block, score each eligible focus by how much the
 * player needs what it trains (low on the ladder, or knows-but-doesn't-use),
 * their goals, genre fit and "same licks" — pick the best, assume the player
 * grows a step in what it trained, repeat. That keeps foundations first and
 * advanced material later, without hand-ordering.
 */
import { genreName, moduleFor } from '../assessment/genres'
import { skillArea } from '../assessment/skills'
import type { AssessmentResult, LadderResult } from '../assessment/scoring'
import type { BlockWeek, PartOption, SessionPart } from '../content/types'
import { CYCLE_OF_4THS } from '../content/blocks'
import { labPath, type LabPreset } from '../lib/lab'
import { FOCI, type Focus, type FocusWeek } from './foci'
import type { GeneratedPlan, PlanBlock } from './model'

const MIN = {
  triads: { 30: 5, 60: 8 },
  arps: { 30: 5, 60: 8 },
  concept: { 30: 5, 60: 14 },
  application: { 30: 15, 60: 30 },
} as const

const GOAL_AREAS: Record<string, string[]> = {
  changes: ['improv', 'arps'],
  fretboard: ['fretboard', 'chords'],
  jazzvocab: ['improv', 'scales'],
  chordmelody: ['chords'],
  voicings: ['chords', 'comping'],
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

export function scoreFocus(f: Focus, r: AssessmentResult): number {
  let s = f.trains.reduce((t, a) => t + areaNeed(r, a), 0)
  const goals = r.goals.next
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

export function chooseFoci(result: AssessmentResult, count: number): Focus[] {
  const r = clone(result)
  const pool: Focus[] = FOCI.filter((f) => f.id !== 'together' && f.id !== 'genreforms')
  const forms = homeFormsFocus(r)
  if (forms && (r.genres[0]?.depth === 'listen' || r.genres[0]?.forms.top < 2)) pool.push(forms)
  const picked: Focus[] = []
  for (let i = 0; i < count; i++) {
    let best: { f: Focus; s: number } | null = null
    // First choice: blocks the player still needs. If those run out (a long
    // plan for an advanced player), take the best remaining eligible block.
    for (const relaxed of [false, true]) {
      for (const f of pool) {
        if (picked.includes(f)) continue
        if (f.need && !f.need(r)) continue
        if (!relaxed && f.done && f.done(r)) continue
        const s = scoreFocus(f, r) - (relaxed && f.done?.(r) ? 1 : 0)
        if (!best || s > best.s) best = { f, s }
      }
      if (best) break
    }
    if (!best) break
    picked.push(best.f)
    grow(r, best.f)
  }
  return picked
}

/* ---------------- weekly warm-ups ---------------- */

const SETS = [
  { set: 'GBE', name: 'G–B–E' },
  { set: 'DGB', name: 'D–G–B' },
  { set: 'ADG', name: 'A–D–G' },
]

function warmupChords(r: AssessmentResult, gw: number): SessionPart {
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
  return {
    id: 'triads',
    title: 'Chords',
    shareLabel: share,
    focus,
    instruction: `Cycle of 4ths (${CYCLE_OF_4THS.join(' ')}), nearest shape each time. Say the chord tones out loud.`,
    minutes: MIN.triads,
    labLinks: [{ label, labUrl: labPath(p) }],
  }
}

function warmupArps(r: AssessmentResult, gw: number): SessionPart {
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
  return {
    id: 'arps',
    title: 'Arpeggios',
    shareLabel: share,
    focus,
    instruction: 'With the click at 60. Start slow enough to name every note as you play it.',
    minutes: MIN.arps,
    labLinks: [{ label: focus.replace(' through the cycle, two octaves where possible', ' · cycle of 4ths'), labUrl: labPath(p) }],
  }
}

/* ---------------- application options ---------------- */

const transcription = (title: string, artist: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist} guitar transcription tab`)}`

type Cand = PartOption & { key: string }

function songPool(r: AssessmentResult, f: Focus): { own: Cand[]; discover: Cand[] } {
  const own: Cand[] = []
  const seen = new Set<string>()
  const add = (list: Cand[], c: Cand) => {
    if (seen.has(c.key)) return
    seen.add(c.key)
    list.push(c)
  }
  for (const s of r.goals.songs) add(own, { key: s, label: s, sub: 'A song you want to learn', url: transcription(s, ''), kind: 'song' })
  for (const s of f.songs ?? []) add(own, { key: s.title, label: s.title, sub: s.artist, url: transcription(s.title, s.artist), kind: 'song' })
  // Songs from your genres you know but can't play yet, then ones you haven't marked.
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
  // Interleave genres so each week mixes them.
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

function applicationPart(r: AssessmentResult, f: Focus, week: number, gw: number): SessionPart {
  const { own, discover } = songPool(r, f)
  const n = Math.max(1, own.length)
  const start = ((gw - 1) * 3) % n
  const picks: PartOption[] = []
  for (let k = 0; k < Math.min(3, own.length); k++) {
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
  return {
    id: 'application',
    title: 'Application',
    shareLabel: picks[0] ? picks[0].label : 'repertoire',
    focus: 'Pick one song and learn it from a transcription',
    instruction: `Learn it from a video with the tab on screen, then solo over it using only this week's idea${fw ? ` (${fw.concept.toLowerCase()})` : ''}.`,
    minutes: MIN.application,
    options: picks,
    lessonId: f.lessonId,
  }
}

/* ---------------- build ---------------- */

const LENGTHS: Record<string, { blocks: number; finish: number }> = {
  '4w': { blocks: 1, finish: 1 },
  '3m': { blocks: 4, finish: 1 },
  '6m': { blocks: 8, finish: 2 },
  ongoing: { blocks: 8, finish: 2 },
}

export function buildPlan(result: AssessmentResult, now = new Date()): GeneratedPlan {
  const len = LENGTHS[result.goals.length ?? '6m'] ?? LENGTHS['6m']
  const foci = chooseFoci(result, len.blocks)
  const together = FOCI.find((f) => f.id === 'together')!
  const sequence: { f: Focus; weeks: number }[] = [...foci.map((f) => ({ f, weeks: 3 })), { f: together, weeks: len.finish }]
  const blocks: PlanBlock[] = []
  let gw = 1
  const growing = clone(result)
  sequence.forEach(({ f, weeks }, bi) => {
    const weekParts: SessionPart[][] = []
    const table: BlockWeek[] = []
    for (let w = 1; w <= weeks; w++, gw++) {
      const fw = f.weeks[Math.min(w - 1, f.weeks.length - 1)]
      const chords = warmupChords(growing, gw)
      const arps = warmupArps(growing, gw)
      const concept: SessionPart = {
        id: 'concept',
        title: 'Concept',
        shareLabel: fw.concept.length > 40 ? f.title : fw.concept,
        focus: fw.concept,
        instruction: fw.instruction,
        minutes: MIN.concept,
        labLinks: fw.lab.map((l) => ({ label: l.label, labUrl: labPath(l.p) })),
      }
      const app = applicationPart(result, f, w, gw)
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
    blocks.push({
      n: bi + 1,
      title: f.title,
      summary: f.summary,
      weeks: [gw - weeks, gw - 1],
      focusId: f.id,
      daily: [
        { part: 'triads', m30: MIN.triads[30], m60: MIN.triads[60], what: 'Chord warm-up through the cycle of 4ths, nearest shape each time' },
        { part: 'arps', m30: MIN.arps[30], m60: MIN.arps[60], what: 'Arpeggio warm-up with the click' },
        { part: 'concept', m30: MIN.concept[30], m60: MIN.concept[60], what: `This block's idea — ${f.summary}` },
        { part: 'application', m30: MIN.application[30], m60: MIN.application[60], what: 'A song from your genres, learned from a transcription, then soloed over with the week\'s idea' },
      ],
      table,
      doneWhen: f.doneWhen,
      tune: f.songs?.[0],
      weekParts,
      detailed: true,
    })
  })
  const home = result.genres[0] ? result.genres[0].name : result.topGenres[0] ? genreName(result.topGenres[0]) : 'your music'
  return {
    id: `p-${now.getTime().toString(36)}`,
    createdAt: now.toISOString(),
    source: 'assessment',
    resultId: result.id,
    title: `${blocks.length} blocks built for you`,
    summary: `Built from your assessment: ${result.playerType}. Rooted in ${home}, aimed first at ${result.unlock ? (skillArea(result.unlock.area)?.name ?? result.unlock.label).toLowerCase() : 'your goals'}.`,
    blocks,
  }
}
