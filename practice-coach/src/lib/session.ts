/**
 * What today's session is made of. Block 1 has full week-by-week content;
 * blocks 2–9 fall back to their focus until their detail is written.
 */
import { BLOCKS, CYCLE_OF_4THS } from '../content/blocks'
import { block1Parts } from '../content/block1'
import { tunesForBlock } from '../content/repertoire'
import type { LabLink, SessionPart } from '../content/types'
import { labPath, type LabPreset } from './lab'

const SETS = [
  { set: 'GBE', name: 'G–B–E' },
  { set: 'DGB', name: 'D–G–B' },
  { set: 'ADG', name: 'A–D–G' },
]
const ARPS = [
  { type: 'maj7', name: 'maj7' },
  { type: 'm7', name: 'm7' },
  { type: '7', name: 'dominant 7' },
]

/** The concept device for blocks without written detail. */
const DEVICES: Record<number, { focus: string; share: string; links: { label: string; p: LabPreset }[] }> = {
  2: {
    focus: 'Diminished arpeggio from the 3rd of a dominant = 7♭9, resolve to I',
    share: '♭9 sound',
    links: [
      { label: 'E°7 arpeggio (= C7♭9 from the 3rd)', p: { mode: 'arpeggios', root: 'E', type: 'dim7', pos: 7, move: 'static', pat: 'ud' } },
      { label: '7♭9 through the cycle', p: { mode: 'arpeggios', root: 'C', type: '7b9', pos: 5, move: 'c4', pat: 'ud' } },
      { label: 'Half-whole diminished scale', p: { mode: 'scales', root: 'G', scale: 'hwdim', pos: 3 } },
    ],
  },
  3: {
    focus: '♯9, ♭13 and the altered scale, blended into blues lines',
    share: 'altered tension',
    links: [
      { label: 'G altered scale', p: { mode: 'scales', root: 'G', scale: 'altered', pos: 3 } },
      { label: '7♯9 voicings', p: { mode: 'chords', root: 'G', type: '7s9', voicing: 'drop2', move: 'c4' } },
      { label: '7alt arpeggio', p: { mode: 'arpeggios', root: 'G', type: '7alt', pos: 3 } },
    ],
  },
  4: {
    focus: 'Drop 2 / drop 3, triads over bass, moving inner voices, gospel passing chords',
    share: 'soul voicings',
    links: [
      { label: 'Drop 2 · ii–V–I', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'drop2', move: '251' } },
      { label: 'Drop 3 · ii–V–I', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'drop3', move: '251' } },
    ],
  },
  5: {
    focus: "Melodies from the Ella & Louis records and Stevie's harmonica; motif development; space",
    share: 'phrasing like a singer',
    links: [{ label: 'Major pentatonic + major blues', p: { mode: 'scales', root: 'C', scale: 'majblues', pos: 7 } }],
  },
  6: {
    focus: 'Chord-melody: arrange a ballad',
    share: 'chord-melody',
    links: [
      { label: 'Drop 2 maj7 · cycle of 4ths', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'drop2', move: 'c4' } },
      { label: 'Close 4-note 6/9', p: { mode: 'chords', root: 'C', type: '69', voicing: 'close4', move: 'c4' } },
    ],
  },
  7: {
    focus: 'Chromatic approach, negative harmony, tension that resolves',
    share: 'outside and back',
    links: [
      { label: 'Bebop dominant scale', p: { mode: 'scales', root: 'G', scale: 'bebdom', pos: 3 } },
      { label: 'Lydian dominant', p: { mode: 'scales', root: 'B', scale: 'lyddom', pos: 6 } },
    ],
  },
  8: {
    focus: "Groove vocabulary: D'Angelo, Tower of Power, Earth Wind & Fire, Sly",
    share: 'groove vocabulary',
    links: [
      { label: 'Dorian · E', p: { mode: 'scales', root: 'E', scale: 'dorian', pos: 7 } },
      { label: '9th chords · drop 2', p: { mode: 'chords', root: 'E', type: '9', voicing: 'drop2', move: 'static' } },
    ],
  },
  9: { focus: 'Play through the repertoire bank', share: 'repertoire run-through', links: [] },
}

const toLinks = (l: { label: string; p: LabPreset }[]): LabLink[] => l.map((x) => ({ label: x.label, labUrl: labPath(x.p) }))

export function sessionParts(block: number, week: number): { parts: SessionPart[]; detailed: boolean } {
  if (block === 1) return { parts: block1Parts(week), detailed: true }
  const b = BLOCKS[block - 1] ?? BLOCKS[0]
  const set = SETS[(week - 1) % 3]
  const arp = ARPS[(week - 1) % 3]
  const dev = DEVICES[block] ?? DEVICES[9]
  const tunes = tunesForBlock(block)
  return {
    detailed: false,
    parts: [
      {
        id: 'triads',
        title: 'Triads',
        shareLabel: `Triads (${set.name})`,
        focus: `Major and minor triads · ${set.name}`,
        instruction: `Cycle of 4ths (${CYCLE_OF_4THS.join(' ')}), nearest inversion each time. Say the chord tones out loud.`,
        minutes: { 30: 7, 60: 12 },
        labLinks: [{ label: `Triads · ${set.name} · cycle of 4ths`, labUrl: labPath({ mode: 'chords', root: 'C', type: 'maj', voicing: 'close3', set: set.set, move: 'c4', zone: 'mid' }) }],
      },
      {
        id: 'arps',
        title: 'Arpeggios',
        shareLabel: `${arp.name} arpeggios`,
        focus: `${arp.name} arpeggios through the cycle`,
        instruction: 'Through the cycle of 4ths with the click, two octaves where possible.',
        minutes: { 30: 7, 60: 12 },
        labLinks: [{ label: `${arp.name} · cycle of 4ths`, labUrl: labPath({ mode: 'arpeggios', root: 'C', type: arp.type, pos: 5, move: 'c4', pat: 'ud' }) }],
      },
      {
        id: 'concept',
        title: 'Concept',
        shareLabel: dev.share,
        focus: dev.focus,
        instruction: `Block ${b.n}: ${b.title}. ${b.summary}`,
        minutes: { 30: 8, 60: 16 },
        labLinks: toLinks(dev.links),
      },
      {
        id: 'application',
        title: 'Application',
        shareLabel: tunes[0] ? tunes[0].title : 'repertoire',
        focus: tunes.length ? `Tunes: ${tunes.map((t) => t.title).join(', ')}` : 'A tune from the repertoire bank',
        instruction: 'Find real music that uses this block\'s device, then take it to a tune: melody first, then solo using only what you practiced.',
        minutes: { 30: 8, 60: 20 },
      },
    ],
  }
}
