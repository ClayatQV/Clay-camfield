/**
 * Sample players for tests (and for checking the plan builder by eye).
 * A persona answers every screen the engine shows; the engine decides which.
 */
import { flowState } from './engine'
import { slug } from './genres'
import type { Answers, Screen } from './types'

export type Persona = {
  name: string
  /** fixed answers by screen id (s1, g4, technique…) */
  fixed: Answers
  /** ladder id → highest rung index answered yes (-1 = none) */
  ladders: Record<string, number>
  /** ladder id → follow-up answers at the top rung */
  followups?: Record<string, Partial<Record<'play' | 'use' | 'explain', 'yes' | 'no'>>>
  /** artist / song names known (1) or playable (2), per genre; 'most' = all but 2 */
  grids?: Record<string, Record<string, number> | 'most' | 'few' | 'none'>
  /** spot-check ids to answer wrong */
  miss?: string[]
}

export function answerFor(p: Persona, s: Screen): Answers[string] {
  if (s.id in p.fixed) return p.fixed[s.id]
  switch (s.kind) {
    case 'welcome':
      return 'ok'
    case 'yn': {
      const parts = s.id.split(':')
      if (parts.length === 1) return 'no'
      const ladder = parts[0]
      if (parts.length === 3) return p.followups?.[ladder]?.[parts[2] as 'play'] ?? 'yes'
      const top = p.ladders[ladder] ?? -1
      const idx = Number(parts[1].replace(/\D/g, '')) - 1
      return idx <= top ? 'yes' : 'no'
    }
    case 'quiz':
      return p.miss?.includes(s.id) ? s.options.find((o) => o.id !== s.correct)!.id : s.correct
    case 'grid': {
      const g = p.grids?.[s.id] ?? 'none'
      if (g === 'none') return {}
      if (g === 'few') return Object.fromEntries(s.items.slice(0, 3).map((i) => [i.id, 1]))
      if (g === 'most') return Object.fromEntries(s.items.slice(0, -2).map((i, k) => [i.id, k % 3 === 0 ? 2 : 1]))
      return Object.fromEntries(Object.entries(g).map(([name, v]) => [slug(name), v]))
    }
    case 'multi':
      return s.options.slice(0, Math.min(s.max ?? 3, 3)).map((o) => o.id)
    case 'rank':
      return s.options.slice(0, s.max).map((o) => o.id)
    case 'one':
      return s.options[0].id
    case 'text':
      return []
    case 'longtext':
      return 'I want to play what I love.'
  }
}

export function simulate(p: Persona): { answers: Answers; screens: number } {
  const answers: Answers = {}
  for (let i = 0; i < 400; i++) {
    const { current } = flowState(answers)
    if (!current) return { answers, screens: i }
    answers[current.id] = answerFor(p, current)
  }
  throw new Error('assessment did not finish')
}

export const CLAY: Persona = {
  name: 'Clay',
  fixed: {
    v1: 'Phrase like Louis Armstrong’s trumpet and Stevie’s harmonica over the changes. Every solo should make people cry or give them stank face.',
    v2: ['gigs', 'recording'],
    v3: ['Kid Charlemagne solo — Larry Carlton', 'They Can’t Take That Away From Me — Ella & Louis', 'Amazing Grace — Isaiah Sharkey'],
    'v4:0': ['fastruns', 'outside'],
    'v4:1': ['changes', 'melody'],
    'v4:2': ['chordmelody'],
    w1: ['changes', 'phrasing', 'fretboard'],
    w2: 'changes',
    s1: ['blues', 'soul', 'jazz'],
    s2: ['funk', 'gospel', 'rock'],
    s3: 'jazz',
    s4: ['soloist', 'rhythm'],
    'blues:feels': ['shuffle', 'texas-shuffle', 'slow-blues-in-12-8', 'chicago', 'funky-straight-16ths-blues'],
    'blues:musthaves': ['bends-in-tune-whole-step', 'controlled-vibrato', 'call-and-response-with-a-singer', 'fills-behind-a-singer', 'mixing-major-and-minor-pentatonic-with-the-chord'],
    'applied:blues-a1': ['minor-pentatonic-of-the-key', 'the-v7-arpeggio', 'mixolydian-of-v', 'half-whole-diminished-of-v'],
    'applied:soul-a1': ['a-minor-pentatonic', 'a-dorian', 'the-am7-arpeggio'],
    'applied:jazz-a1': ['g-mixolydian', 'the-g7-arpeggio'],
    technique: ['alternate', 'legato', 'hybrid', 'muting'],
    speed: '100',
    timing: ['metronome', 'two-four', 'pocket', 'placement'],
    vocab: '20',
    samelicks: 'yes',
    reading: ['tab', 'charts', 'nashville'],
    x1: 'national',
    x2: 'monthly',
    x3: ['bedroom', 'bars', 'clubs'],
    x4: ['originals', 'covers'],
    x5: 'others',
    x6: 'indie',
    g1: ['comeback', 'growth'],
    g3: '6m',
    g4: '60',
    g5: '7',
    g6: ['phone', 'electric'],
    g7: [],
    l1: ['transcriptions', 'ear'],
    l2: 'loop',
    l3: 'no',
  },
  ladders: {
    'blues-forms': 3,
    'blues-language': 2,
    'soul-forms': 2,
    'jazz-forms': 1,
    chords: 4,
    scales: 5,
    arps: 2,
    fretboard: 0,
    theory: 4,
    ear: 3,
    improv: 1,
    comping: 3,
  },
  followups: {
    chords: { play: 'yes', use: 'yes', explain: 'yes' },
    scales: { play: 'yes', use: 'no', explain: 'yes' },
    arps: { play: 'yes', use: 'no' },
    theory: { use: 'no', explain: 'yes' },
    improv: { use: 'no' },
  },
  grids: {
    'blues:artists': 'most',
    'blues:songs': 'most',
    'soul:artists': 'most',
    'soul:songs': 'most',
    'jazz:artists': 'most',
    'jazz:songs': 'few',
  },
}

export const NEW_ROCK_PLAYER: Persona = {
  name: 'Beginner rock player',
  fixed: {
    v1: 'Play the rock songs I grew up on with my friends.',
    v2: ['friends'],
    v3: ["Sweet Child O' Mine — Guns N' Roses"],
    'v4:0': ['riffs', 'licks'],
    w1: ['songs', 'speed', 'lead'],
    w2: 'songs',
    s1: ['rock', 'metal', 'pop'],
    s2: [],
    s3: 'deeper',
    s4: [],
    speed: 'lt80',
    vocab: '1',
    samelicks: 'yes',
    x1: 'self',
    x2: 'never',
    g1: ['growth'],
    g3: '3m',
    g4: '30',
    g5: '5',
  },
  ladders: { 'rock-forms': 1, chords: 1, scales: 0, arps: -1, fretboard: -1, theory: 0, ear: 1, improv: 0, comping: 1 },
  followups: { chords: { play: 'yes', use: 'yes', explain: 'no' }, scales: { play: 'yes', use: 'yes', explain: 'no' } },
  grids: {
    'rock:artists': { 'Jimi Hendrix': 1, Slash: 2, 'Tom Morello': 1, 'Jack White': 1, 'Eddie Van Halen': 1 },
    'rock:songs': { "Sweet Child O' Mine": 2, 'Back in Black': 1 },
  },
}
