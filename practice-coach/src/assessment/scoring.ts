/**
 * Turns answers into results: where you are on every ladder, genre depth,
 * spot-check adjustments, player type, a short honest read, the biggest
 * unlock and a listening list. Rule-based for now; an AI writer can replace
 * `buildRead` later using the same result object.
 */
import { asGrid, asList, asOne, checkId, followId, genrePlan, gridId, isYes, rungId, appliedId, feelsId, mustId, type Depth } from './engine'
import { genreName, slug } from './genres'
import { SKILL_AREAS } from './skills'
import type { Answers, Era, GenreArtist, GenreModule, Ladder } from './types'

export type LadderResult = {
  /** index of the highest rung reached (-1 = none) */
  top: number
  label: string | null
  /** the next rung up (what to learn next) */
  next: string | null
  of: number
  play?: boolean
  use?: boolean
  explain?: boolean
  adjusted?: string
}

export type GenreResult = {
  id: string
  name: string
  rank: number
  depth: Depth
  known: number
  canPlay: number
  rootsGap: boolean
  unknownArtists: GenreArtist[]
  songsKnown: string[]
  songsPlayable: string[]
  forms: LadderResult
  feels: string[]
  language: LadderResult | null
  mustHaves: string[]
  /** highest weight picked on the graded question, 0–3 */
  appliedLevel: number | null
}

export type Adjustment = { area: string; reason: string }

export type AssessmentResult = {
  id: string
  takenAt: string
  genres: GenreResult[]
  topGenres: string[]
  otherGenres: string[]
  target: string | null
  roles: string[]
  influences: string[]
  targets: string[]
  skills: Record<string, LadderResult>
  technique: string[]
  speed: string | null
  timing: string[]
  vocab: string | null
  sameLicks: boolean | null
  reading: string[]
  experience: { highest: string | null; now: string | null; venues: string[]; plays: string[]; studio: string | null; releases: string | null }
  goals: { for: string[]; next: string[]; length: string | null; minutes: number; days: number; setup: string[]; songs: string[] }
  learning: { sources: string[]; solos: string | null; routine: boolean | null }
  adjustments: Adjustment[]
  playerType: string
  read: string[]
  unlock: { area: string; label: string; text: string } | null
  listening: { artist: string; genre: string; era: Era; inst?: string }[]
}

/* ---------------- ladders ---------------- */

function ladderResult(l: Ladder, ans: Answers, areaName: string, adjustments: Adjustment[]): LadderResult {
  let top = -1
  l.rungs.forEach((r, i) => {
    if (isYes(ans[rungId(l, r.id)])) top = Math.max(top, i)
  })
  // Spot checks: a missed check at or below the top rung moves the result down a step.
  let adjusted: string | undefined
  for (let i = 0; i <= top; i++) {
    const r = l.rungs[i]
    const v = ans[checkId(l, r.id)]
    if (r.check && typeof v === 'string' && v !== r.check.answer) {
      top = Math.max(-1, top - 1)
      adjusted = `You said yes to ${r.label}, but missed the quick check ("${r.check.prompt}" → ${r.check.answer}), so we placed you one step lower.`
      adjustments.push({ area: areaName, reason: adjusted })
      break
    }
  }
  const res: LadderResult = {
    top,
    label: top >= 0 ? l.rungs[top].label : null,
    next: top + 1 < l.rungs.length ? l.rungs[top + 1].label : null,
    of: l.rungs.length,
    adjusted,
  }
  // Follow-ups are keyed to the rung that was actually reached in the flow.
  let flowTop = -1
  l.rungs.forEach((r, i) => {
    if (isYes(ans[rungId(l, r.id)])) flowTop = Math.max(flowTop, i)
  })
  if (flowTop >= 0) {
    const rid = l.rungs[flowTop].id
    for (const f of ['play', 'use', 'explain'] as const) {
      const v = ans[followId(l, rid, f)]
      if (v === 'yes' || v === 'no' || v === 'unsure') res[f] = v === 'yes'
    }
  }
  return res
}

const pct = (r: LadderResult) => (r.top + 1) / r.of

/* ---------------- main ---------------- */

export function scoreAssessment(ans: Answers, now = new Date()): AssessmentResult {
  const adjustments: Adjustment[] = []

  const genres: GenreResult[] = genrePlan(ans).map((p) => genreResult(p.module, p.index, p.depth, ans, adjustments))

  const skills: Record<string, LadderResult> = {}
  for (const a of SKILL_AREAS) skills[a.id] = ladderResult(a.ladder, ans, a.name, adjustments)

  const nameOf = (id: string) => {
    for (const g of genres) {
      const m = g.unknownArtists.find((a) => slug(a.name) === id)
      if (m) return m.name
    }
    return id
  }
  const allArtists = new Map<string, string>()
  for (const p of genrePlan(ans)) for (const a of p.module.artists) allArtists.set(slug(a.name), a.name)
  const artistName = (id: string) => allArtists.get(id) ?? nameOf(id)

  const result: AssessmentResult = {
    id: `a-${now.getTime().toString(36)}`,
    takenAt: now.toISOString(),
    genres,
    topGenres: asList(ans['s1']).slice(0, 3),
    otherGenres: asList(ans['s2']),
    target: asOne(ans['s3']) === 'deeper' ? null : asOne(ans['s3']),
    roles: asList(ans['s4']),
    influences: asList(ans['influences']).map(artistName),
    targets: asList(ans['targets']).map(artistName),
    skills,
    technique: asList(ans['technique']),
    speed: asOne(ans['speed']),
    timing: asList(ans['timing']),
    vocab: asOne(ans['vocab']),
    sameLicks: ans['samelicks'] === 'yes' ? true : ans['samelicks'] === 'no' ? false : null,
    reading: asList(ans['reading']),
    experience: {
      highest: asOne(ans['x1']),
      now: asOne(ans['x2']),
      venues: asList(ans['x3']),
      plays: asList(ans['x4']),
      studio: asOne(ans['x5']),
      releases: asOne(ans['x6']),
    },
    goals: {
      for: asList(ans['g1']),
      next: asList(ans['g2']),
      length: asOne(ans['g3']),
      minutes: Number(asOne(ans['g4']) ?? 30) || 30,
      days: Number(asOne(ans['g5']) ?? 5) || 5,
      setup: asList(ans['g6']),
      songs: asList(ans['g7']).filter(Boolean),
    },
    learning: {
      sources: asList(ans['l1']),
      solos: asOne(ans['l2']),
      routine: ans['l3'] === 'yes' ? true : ans['l3'] === 'no' ? false : null,
    },
    adjustments,
    playerType: '',
    read: [],
    unlock: null,
    listening: [],
  }
  result.playerType = playerType(result)
  result.unlock = biggestUnlock(result)
  result.listening = listening(result)
  result.read = buildRead(result)
  return result
}

function genreResult(g: GenreModule, index: number, depth: Depth, ans: Answers, adjustments: Adjustment[]): GenreResult {
  const artists = asGrid(ans[gridId(g.id, 'artists')])
  const songs = asGrid(ans[gridId(g.id, 'songs')])
  const knownSet = (a: GenreArtist) => (artists[slug(a.name)] ?? 0) >= 1
  const known = g.artists.filter(knownSet)
  const roots = g.artists.filter((a) => a.era === 'roots')
  const modern = g.artists.filter((a) => a.era === 'modern')
  const rootsGap = roots.filter(knownSet).length <= 1 && modern.filter(knownSet).length >= 2
  const order: Record<Era, number> = { roots: 0, classic: 1, modern: 2 }
  const unknown = g.artists.filter((a) => !knownSet(a)).sort((a, b) => order[a.era] - order[b.era])
  const graded = g.applied.find((x) => x.kind === 'graded')
  let appliedLevel: number | null = null
  if (graded && graded.kind === 'graded') {
    const picks = asList(ans[appliedId(graded)])
    if (ans[appliedId(graded)] !== undefined) {
      appliedLevel = Math.max(0, ...graded.options.filter((o) => picks.includes(slug(o.label))).map((o) => o.weight))
    }
  }
  for (const q of g.applied) {
    if (q.kind !== 'quiz') continue
    const v = ans[appliedId(q)]
    if (typeof v === 'string' && v !== q.answer) {
      adjustments.push({ area: g.name, reason: `Quick check missed: "${q.prompt}" → ${q.answer}. Your plan includes this.` })
    }
  }
  const feelIds = asList(ans[feelsId(g.id)])
  const mustIds = asList(ans[mustId(g.id)])
  return {
    id: g.id,
    name: g.name,
    rank: index + 1,
    depth,
    known: known.length,
    canPlay: g.artists.filter((a) => (artists[slug(a.name)] ?? 0) >= 2).length,
    rootsGap,
    unknownArtists: unknown,
    songsKnown: g.songs.filter((s) => (songs[slug(s.title)] ?? 0) === 1).map((s) => s.title),
    songsPlayable: g.songs.filter((s) => (songs[slug(s.title)] ?? 0) >= 2).map((s) => s.title),
    forms: ladderResult(g.forms, ans, `${g.name} forms`, adjustments),
    feels: g.feels.filter((f) => feelIds.includes(slug(f))),
    language: ans[rungId(g.language, g.language.rungs[g.language.start].id)] !== undefined ? ladderResult(g.language, ans, g.name, adjustments) : null,
    mustHaves: g.mustHaves.filter((m) => mustIds.includes(slug(m))),
    appliedLevel,
  }
}

/* ---------------- interpretation ---------------- */

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
  reading: ['theory'],
}

const AREA_NAMES: Record<string, string> = Object.fromEntries(SKILL_AREAS.map((a) => [a.id, a.name]))

export function playerType(r: AssessmentResult): string {
  const s = r.skills
  const home = r.genres[0]
  const second = r.genres[1]
  const avg = Object.values(s).reduce((t, x) => t + pct(x), 0) / Math.max(1, Object.values(s).length)
  let adj = 'Well-Rounded'
  if (home && home.known >= 12 && (home.mustHaves.length >= 3 || home.feels.length >= 3) && s.improv.top <= 1) adj = 'Feel-First'
  else if (s.theory.top >= 4 && s.improv.top >= 3) adj = 'Harmony-Minded'
  else if (s.comping.top >= 3 && r.roles.includes('rhythm')) adj = 'Groove-Driven'
  else if ((r.speed === '120' || r.technique.length >= 5) && s.improv.top <= 2) adj = 'Technical'
  else if (avg < 0.35) adj = 'Rising'
  const g1 = home ? shortGenre(home.id) : r.topGenres[0] ? genreName(r.topGenres[0]) : ''
  const g2 = second ? shortGenre(second.id) : ''
  const noun = r.roles.includes('chordmelody') ? 'Guitarist' : 'Player'
  return [adj, [g1, g2].filter(Boolean).join(' & '), noun].filter(Boolean).join(' ')
}

const shortGenre = (id: string) => (id === 'soul' ? 'Soul' : genreName(id))

function biggestUnlock(r: AssessmentResult): AssessmentResult['unlock'] {
  const goalAreas = new Set(r.goals.next.flatMap((g) => GOAL_AREAS[g] ?? []))
  let best: { area: string; score: number } | null = null
  for (const [area, res] of Object.entries(r.skills)) {
    let score = 0
    if (res.top >= 0 && res.use === false) score += 2 + pct(res) // knows it, doesn't use it
    if (goalAreas.has(area)) score += 1.5
    if (area === 'improv' && r.sameLicks) score += 1
    if (res.top === res.of - 1 && res.use !== false) score -= 3 // already at the top and using it
    if (!best || score > best.score) best = { area, score }
  }
  if (!best || best.score <= 0) return null
  const res = r.skills[best.area]
  const name = AREA_NAMES[best.area]
  if (res.top >= 0 && res.use === false) {
    return {
      area: best.area,
      label: res.label ?? name,
      text: `${name}: you know ${res.label}, but it isn't showing up in your playing yet.${res.next ? ` Next step: ${res.next}.` : ''} Your plan starts there, with real music.`,
    }
  }
  return {
    area: best.area,
    label: res.next ?? name,
    text: res.next ? `Next step in ${name.toLowerCase()}: ${res.next}.` : `Keep building ${name.toLowerCase()}.`,
  }
}

function listening(r: AssessmentResult): AssessmentResult['listening'] {
  const out: AssessmentResult['listening'] = []
  for (const g of r.genres) {
    for (const a of g.unknownArtists.slice(0, g.rank === 1 ? 6 : 4)) out.push({ artist: a.name, genre: g.name, era: a.era, inst: a.inst })
  }
  return out
}

const names = (xs: GenreArtist[]) => {
  const n = xs.slice(0, 3).map((a) => a.name)
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n[0] ?? ''
}

export function buildRead(r: AssessmentResult): string[] {
  const out: string[] = []
  const s = r.skills
  // Strengths: the two areas furthest up their ladders that you also use.
  const strong = Object.entries(s)
    .filter(([, x]) => x.top >= 0 && x.use !== false)
    .sort((a, b) => pct(b[1]) - pct(a[1]))
    .slice(0, 2)
    .map(([k, x]) => `${AREA_NAMES[k].toLowerCase()} (up to ${x.label})`)
  const home = r.genres[0]
  if (home && home.known >= 12) out.push(`Deep roots in ${home.name}: you know ${home.known} of its 20 essential artists.`)
  if (strong.length) out.push(`Strongest areas: ${strong.join(' and ')}.`)
  if (r.unlock) out.push(`Biggest unlock: ${r.unlock.text}`)
  if (r.sameLicks) out.push('The same licks keep coming out. Your plan ties new vocabulary to specific chords so it becomes automatic.')
  const pro = r.experience.highest === 'national' || r.experience.highest === 'major' || r.experience.highest === 'regional'
  const lessNow = r.experience.now === 'never' || r.experience.now === 'yearly' || r.experience.now === 'monthly'
  if (pro && lessNow) out.push("You've played at a high level and play out less now. The plan skips fundamentals you own and moves fast.")
  // Honest, next-step genre gaps.
  for (const g of r.genres) {
    if (g.rootsGap) out.push(`You know the modern ${g.name} players but not its roots — start with ${names(g.unknownArtists)}.`)
    else if (g.known < 12) out.push(`You know ${g.known} of the 20 ${g.name} essentials — your listening list starts with ${names(g.unknownArtists)}.`)
  }
  return out
}
