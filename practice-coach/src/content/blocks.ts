import type { Block } from './types'
import { BLOCK1_DETAIL } from './block1'

/** Six months = eight 3-week blocks + a 2-week finish (26 weeks). */
export const BLOCKS: Block[] = [
  {
    n: 1,
    title: 'See the chord, hit the chord',
    weeks: [1, 3],
    summary: 'Triads, 7th arpeggios and guide tones through ii–V–I.',
    detail: BLOCK1_DETAIL,
  },
  {
    n: 2,
    title: 'The ♭9 sound',
    weeks: [4, 6],
    summary: 'Diminished arpeggio from the 3rd of a dominant = 7♭9, resolved to I.',
  },
  {
    n: 3,
    title: 'Altered tension',
    weeks: [7, 9],
    summary: '♯9, ♭13 and the altered scale, blended into blues lines à la Eric Gales and Robben Ford.',
  },
  {
    n: 4,
    title: 'Soul harmony and voicings',
    weeks: [10, 12],
    summary: 'Drop 2 / drop 3, triads over bass, moving inner voices, gospel passing chords from Stevie Wonder and Cory Henry.',
  },
  {
    n: 5,
    title: 'Phrase like a singer',
    weeks: [13, 15],
    summary: "Melodies from the Ella & Louis records and Stevie's harmonica; motif development; space.",
  },
  {
    n: 6,
    title: 'Chord-melody',
    weeks: [16, 18],
    summary: 'Arrange a ballad. Models: Isaiah Sharkey\'s "Amazing Grace", Ted Greene.',
  },
  {
    n: 7,
    title: 'Outside and back',
    weeks: [19, 21],
    summary: 'Chromatic approach, negative harmony, tension that resolves. Eric Gales, Julian Lage.',
  },
  {
    n: 8,
    title: 'Groove vocabulary',
    weeks: [22, 24],
    summary: "D'Angelo, Tower of Power, Earth Wind & Fire, Sly.",
  },
  {
    n: 9,
    title: 'Put it together',
    weeks: [25, 26],
    summary: 'Play through the repertoire bank.',
  },
]

export const TOTAL_WEEKS = 26

export const CYCLE_OF_4THS = ['C', 'F', 'B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'B', 'E', 'A', 'D', 'G']

export function blockLength(n: number): number {
  const b = BLOCKS[n - 1]
  return b ? b.weeks[1] - b.weeks[0] + 1 : 3
}
