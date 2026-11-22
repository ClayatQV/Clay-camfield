import type { Block, SessionPart } from './types'
import { labPath } from '../lib/lab'

const CYCLE = 'C F B♭ E♭ A♭ D♭ G♭ B E A D G'
const TUNE = '"They Can\'t Take That Away From Me"'
// In-app song page (video search + looper), never a trip to YouTube.
const TUNE_SEARCH = '#/song?' + new URLSearchParams({ title: "They Can't Take That Away From Me", artist: 'Ella Fitzgerald & Louis Armstrong' }).toString()

export const BLOCK1_DETAIL: NonNullable<Block['detail']> = {
  daily: [
    { part: 'triads', m30: 7, m60: 12, what: 'Week\'s triad set through the cycle of 4ths, nearest inversion each time, say chord tones aloud' },
    { part: 'arps', m30: 7, m60: 12, what: "Week's 7th arpeggio through the cycle with the phone metronome, two octaves where possible" },
    { part: 'concept', m30: 8, m60: 16, what: 'Guide tones (3rds and 7ths) through ii–V–I, then targeting chord tones on beat 1' },
    { part: 'application', m30: 8, m60: 20, what: "Week's lesson idea, then the tune: melody first, then solo using only what you practiced" },
  ],
  table: [
    {
      week: 1,
      triads: 'Major, top 3 strings (G–B–E), stay within ~5 frets',
      arps: 'Maj7 from the root, 8ths at 60 bpm',
      concept: 'Two-note guide-tone line through ii–V–I in all 12 keys',
      application: 'Chase Maddox "8 SIMPLE Wes Montgomery Arpeggio Ideas" — learn 2',
    },
    {
      week: 2,
      triads: 'Major and minor, middle strings (D–G–B)',
      arps: 'm7, then start each from the 3rd',
      concept: 'Single-note line landing on the 3rd of every chord on beat 1',
      application: 'Chase Maddox "George Benson\'s Secret of the 2 Chords"; learn the tune\'s melody',
    },
    {
      week: 3,
      triads: 'ii–V–I triads (min, maj, maj), lower strings (A–D–G)',
      arps: 'ii–V–I arpeggios (m7, 7, maj7) through the cycle',
      concept: 'Chord-tone-only solo, then one chromatic approach note into each target',
      application: '2 more Wes ideas; solo over the full tune with only Block 1 material',
    },
  ],
  doneWhen: [
    'Name/play any major or minor triad in any inversion on all three string sets without stopping',
    'Guide tones through a ii–V–I in any key at 80 bpm',
    'Solo a full chorus over the tune without falling back on a pentatonic box',
  ],
  tune: { title: "They Can't Take That Away From Me", artist: 'Ella Fitzgerald & Louis Armstrong' },
  notes: [
    `Cycle of 4ths: ${CYCLE}.`,
    'Guide-tone line in C: Dm7 (F, C) → G7 (F, B) → Cmaj7 (E, B). One note moves by a half step, the other holds.',
  ],
}

const M = {
  triads: { 30: 7, 60: 12 },
  arps: { 30: 7, 60: 12 },
  concept: { 30: 8, 60: 16 },
  application: { 30: 8, 60: 20 },
} as const

/** The four session parts for Block 1, week 1–3. */
export function block1Parts(week: number): SessionPart[] {
  const w = Math.min(3, Math.max(1, week))
  const triads: SessionPart[] = [
    {
      id: 'triads',
      title: 'Triads',
      shareLabel: 'Triads (G–B–E)',
      focus: 'Major triads · top strings G–B–E',
      instruction: `Cycle of 4ths (${CYCLE}). Stay within ~5 frets: move to the nearest inversion each time. Say the chord tones out loud.`,
      minutes: M.triads,
      labLinks: [{ label: 'Major triads · G–B–E · cycle of 4ths', labUrl: labPath({ mode: 'chords', root: 'C', type: 'maj', voicing: 'close3', set: 'GBE', move: 'c4', zone: 'mid' }) }],
    },
    {
      id: 'triads',
      title: 'Triads',
      shareLabel: 'Triads (D–G–B)',
      focus: 'Major and minor triads · middle strings D–G–B',
      instruction: `Cycle of 4ths, alternating major and minor (C, Cm, F, Fm…). Nearest inversion each time, say the chord tones out loud.`,
      minutes: M.triads,
      labLinks: [
        { label: 'Major · D–G–B · cycle of 4ths', labUrl: labPath({ mode: 'chords', root: 'C', type: 'maj', voicing: 'close3', set: 'DGB', move: 'c4', zone: 'mid' }) },
        { label: 'Minor · D–G–B · cycle of 4ths', labUrl: labPath({ mode: 'chords', root: 'C', type: 'min', voicing: 'close3', set: 'DGB', move: 'c4', zone: 'mid' }) },
      ],
    },
    {
      id: 'triads',
      title: 'Triads',
      shareLabel: 'ii–V–I triads (A–D–G)',
      focus: 'ii–V–I triads (min, maj, maj) · lower strings A–D–G',
      instruction: 'ii–V–I through the cycle: Dm–G–C, Gm–C–F, … Smallest move between shapes, say the chord tones out loud.',
      minutes: M.triads,
      labLinks: [{ label: 'ii–V–I triads · A–D–G', labUrl: labPath({ mode: 'chords', root: 'C', type: 'maj', voicing: 'close3', set: 'ADG', move: '251', zone: 'mid' }) }],
    },
  ]
  const arps: SessionPart[] = [
    {
      id: 'arps',
      title: 'Arpeggios',
      shareLabel: 'maj7 arpeggios',
      focus: 'Maj7 from the root · 8ths at 60 bpm',
      instruction: 'Through the cycle of 4ths with the click at 60. Start on the root, two octaves where possible, up and down.',
      minutes: M.arps,
      labLinks: [{ label: 'Maj7 arpeggio · cycle of 4ths · 60 bpm', labUrl: labPath({ mode: 'arpeggios', root: 'C', type: 'maj7', pos: 5, move: 'c4', start: 'r', pat: 'ud', bpm: 60 }) }],
    },
    {
      id: 'arps',
      title: 'Arpeggios',
      shareLabel: 'm7 arpeggios',
      focus: 'm7 · then start each from the 3rd',
      instruction: 'Through the cycle of 4ths. First pass from the root, second pass starting every arpeggio on its 3rd.',
      minutes: M.arps,
      labLinks: [
        { label: 'm7 from the root · cycle of 4ths', labUrl: labPath({ mode: 'arpeggios', root: 'C', type: 'm7', pos: 5, move: 'c4', start: 'r', pat: 'ud', bpm: 60 }) },
        { label: 'm7 from the 3rd · cycle of 4ths', labUrl: labPath({ mode: 'arpeggios', root: 'C', type: 'm7', pos: 5, move: 'c4', start: '3', pat: 'ud', bpm: 60 }) },
      ],
    },
    {
      id: 'arps',
      title: 'Arpeggios',
      shareLabel: 'ii–V–I arpeggios',
      focus: 'ii–V–I arpeggios (m7, 7, maj7) through the cycle',
      instruction: 'Dm7–G7–Cmaj7, then down a 4th each time. Stay in one position; connect each arpeggio to the nearest note of the next.',
      minutes: M.arps,
      labLinks: [{ label: 'ii–V–I arpeggios · position 5', labUrl: labPath({ mode: 'arpeggios', root: 'C', type: 'maj7', pos: 5, move: '251', pat: 'ud', bpm: 60 }) }],
    },
  ]
  const concept: SessionPart[] = [
    {
      id: 'concept',
      title: 'Concept',
      shareLabel: 'guide tones',
      focus: 'Two-note guide-tone line through ii–V–I, all 12 keys',
      instruction: 'In C: Dm7 (F, C) → G7 (F, B) → Cmaj7 (E, B). One note moves a half step, the other holds. Then every key round the cycle.',
      minutes: M.concept,
      labLinks: [{ label: 'Shells R·3·7 · ii–V–I', labUrl: labPath({ mode: 'chords', root: 'C', type: 'maj7', voicing: 'shell37', set: 0, move: '251', zone: 'mid' }) }],
    },
    {
      id: 'concept',
      title: 'Concept',
      shareLabel: 'landing on 3rds',
      focus: 'Single-note line landing on the 3rd of every chord on beat 1',
      instruction: 'Over a ii–V–I, improvise a line that hits the 3rd of each chord exactly on beat 1. Slow is fine; say the target note before you land.',
      minutes: M.concept,
      labLinks: [{ label: 'ii–V–I arpeggios · start on the 3rd', labUrl: labPath({ mode: 'arpeggios', root: 'C', type: 'maj7', pos: 5, move: '251', start: '3', pat: 'up', bpm: 60 }) }],
    },
    {
      id: 'concept',
      title: 'Concept',
      shareLabel: 'chord-tone solo + approach notes',
      focus: 'Chord-tone-only solo, then one chromatic approach note into each target',
      instruction: 'Solo using only chord tones. Then add a single half-step approach (from above or below) into each target note.',
      minutes: M.concept,
      labLinks: [{ label: 'ii–V–I arpeggios · position 5', labUrl: labPath({ mode: 'arpeggios', root: 'C', type: 'maj7', pos: 5, move: '251', pat: 'ud', bpm: 60 }) }],
    },
  ]
  const application: SessionPart[] = [
    {
      id: 'application',
      title: 'Application',
      shareLabel: 'Wes arpeggio ideas',
      focus: 'Chase Maddox — 8 simple Wes Montgomery arpeggio ideas · learn 2',
      instruction: `Learn two of the Wes ideas, then take them to ${TUNE}: melody first, then solo using only what you practiced.`,
      minutes: M.application,
      lessonId: 'chase-wes-arpeggios',
      externalLinks: [{ label: 'Find the Ella & Louis recording', url: TUNE_SEARCH }],
    },
    {
      id: 'application',
      title: 'Application',
      shareLabel: 'Benson 2-chord idea + tune melody',
      focus: "Chase Maddox — George Benson's secret of the 2 chords · learn the tune's melody",
      instruction: `Get the Benson idea under your fingers, then learn the melody of ${TUNE} by ear, saying the note names.`,
      minutes: M.application,
      lessonId: 'chase-benson-2-chords',
      externalLinks: [{ label: 'Find the Ella & Louis recording', url: TUNE_SEARCH }],
    },
    {
      id: 'application',
      title: 'Application',
      shareLabel: 'Wes ideas + full chorus',
      focus: `2 more Wes ideas · solo over ${TUNE} with only Block 1 material`,
      instruction: 'Learn two more Wes ideas. Then solo over the full tune using only triads, arpeggios, guide tones and approach notes — no pentatonic box.',
      minutes: M.application,
      lessonId: 'chase-wes-arpeggios',
      externalLinks: [{ label: 'Find the Ella & Louis recording', url: TUNE_SEARCH }],
    },
  ]
  return [triads[w - 1], arps[w - 1], concept[w - 1], application[w - 1]]
}
