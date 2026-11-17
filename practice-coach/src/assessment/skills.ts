/**
 * Skill placement ladders. Each rung is a yes/no question; placement starts at
 * `start`, jumps up on Yes and steps down on No (a binary search), then asks
 * the Know → Play → Use → Explain follow-ups at the top rung reached.
 */
import type { Followup, SkillArea } from './types'

export const SKILL_AREAS: SkillArea[] = [
  {
    id: 'chords',
    name: 'Chords and voicings',
    followups: ['play', 'use', 'explain'],
    ladder: {
      id: 'chords',
      title: 'Chords and voicings',
      start: 4,
      rungs: [
        { id: 'c1', prompt: 'Do you know your open chords?', label: 'open chords' },
        { id: 'c2', prompt: 'Do you know barre chords on the E and A strings?', label: 'barre chords' },
        { id: 'c3', prompt: 'Do you know maj7, m7 and dominant 7 chord shapes?', label: '7th chords' },
        {
          id: 'c4',
          prompt: 'Do you know major and minor triads on the top 3 strings, in every inversion?',
          label: 'triads on the top strings',
          check: { prompt: 'A C major triad in 2nd inversion has which note on the bottom?', options: ['C', 'E', 'G', 'B'], answer: 'G' },
        },
        { id: 'c5', prompt: 'Do you know triads on every string set, in every inversion?', label: 'triads on every string set' },
        { id: 'c6', prompt: 'Do you know drop 2 voicings?', label: 'drop 2 voicings' },
        { id: 'c7', prompt: 'Do you know drop 3 and shell voicings for comping?', label: 'drop 3 and shell voicings' },
        { id: 'c8', prompt: 'Do you know upper-extension chords (9, 11, 13)?', label: 'upper extensions' },
        { id: 'c9', prompt: 'Do you know altered dominant chords (7♭9, 7♯9, 7alt)?', label: 'altered dominants' },
        { id: 'c10', prompt: 'Can you arrange chord-melody (the melody on top of the chords)?', label: 'chord-melody' },
      ],
    },
  },
  {
    id: 'scales',
    name: 'Scales and modes',
    followups: ['play', 'use', 'explain'],
    ladder: {
      id: 'scales',
      title: 'Scales and modes',
      start: 3,
      rungs: [
        { id: 's1', prompt: 'Do you know the minor pentatonic in one position?', label: 'minor pentatonic (one box)' },
        { id: 's2', prompt: 'Do you know all five pentatonic positions?', label: 'all five pentatonic positions' },
        { id: 's3', prompt: 'Do you know the major scale across the whole neck?', label: 'the major scale everywhere' },
        {
          id: 's4',
          prompt: 'Do you know the modes of the major scale (Dorian, Mixolydian…)?',
          label: 'the major modes',
          check: { prompt: 'Dorian is the major scale started from which degree?', options: ['2nd', '3rd', '5th', '6th'], answer: '2nd' },
        },
        { id: 's5', prompt: 'Do you know melodic minor and its modes (Lydian dominant, altered)?', label: 'melodic minor modes' },
        { id: 's6', prompt: 'Do you know harmonic minor and its modes (like Phrygian dominant)?', label: 'harmonic minor modes' },
        { id: 's7', prompt: 'Do you know the symmetric scales (diminished, whole tone)?', label: 'diminished and whole-tone scales' },
      ],
    },
  },
  {
    id: 'arps',
    name: 'Arpeggios',
    followups: ['play', 'use'],
    ladder: {
      id: 'arps',
      title: 'Arpeggios',
      start: 2,
      rungs: [
        { id: 'a1', prompt: 'Do you know major and minor triad arpeggios?', label: 'triad arpeggios' },
        { id: 'a2', prompt: 'Do you know 7th-chord arpeggios in one position?', label: '7th arpeggios in one position' },
        { id: 'a3', prompt: 'Can you play 7th arpeggios through the cycle of 4ths?', label: '7th arpeggios through the cycle' },
        { id: 'a4', prompt: 'Can you connect arpeggios smoothly through a ii–V–I?', label: 'arpeggios through a ii–V–I' },
        { id: 'a5', prompt: 'Do you know extended and altered arpeggios (9ths, diminished from the 3rd of a V7)?', label: 'extended and altered arpeggios' },
      ],
    },
  },
  {
    id: 'fretboard',
    name: 'Fretboard',
    followups: [],
    ladder: {
      id: 'fretboard',
      title: 'Fretboard',
      start: 1,
      rungs: [
        { id: 'n1', prompt: 'Do you know the note names on the low E and A strings?', label: 'notes on the low strings' },
        {
          id: 'n2',
          prompt: 'Can you find any note on any string within about 3 seconds?',
          label: 'any note, any string',
          check: { prompt: 'What note is at the 5th fret of the G string?', options: ['C', 'D', 'B', 'A'], answer: 'C' },
        },
        { id: 'n3', prompt: 'Do you know the CAGED system?', label: 'the CAGED system' },
        { id: 'n4', prompt: 'Can you find any chord tone (like the 3rd of any chord) anywhere on the neck?', label: 'chord tones anywhere' },
      ],
    },
  },
  {
    id: 'theory',
    name: 'Theory',
    followups: ['use', 'explain'],
    ladder: {
      id: 'theory',
      title: 'Theory',
      start: 2,
      rungs: [
        { id: 't1', prompt: 'Do you know note names and scale degrees?', label: 'note names and scale degrees' },
        { id: 't2', prompt: 'Do you know the cycle of 4ths and 5ths from memory?', label: 'the cycle of 4ths/5ths' },
        {
          id: 't3',
          prompt: 'Do you know the chords in any key and Nashville numbers?',
          label: 'diatonic chords and Nashville numbers',
          check: { prompt: 'A 1–4–5 in G is…', options: ['G C D', 'G B D', 'G C E', 'G D A'], answer: 'G C D' },
        },
        {
          id: 't4',
          prompt: 'Can you name the ii–V–I in any key instantly?',
          label: 'ii–V–I in any key',
          check: { prompt: 'The ii–V–I in B♭ is…', options: ['Cm7–F7–B♭maj7', 'Dm7–G7–Cmaj7', 'Gm7–C7–Fmaj7', 'Cm7–F7–E♭maj7'], answer: 'Cm7–F7–B♭maj7' },
        },
        { id: 't5', prompt: 'Do you know secondary dominants?', label: 'secondary dominants' },
        { id: 't6', prompt: 'Do you know tritone substitution and modal interchange?', label: 'tritone subs and modal interchange' },
        { id: 't7', prompt: 'Do you know negative harmony?', label: 'negative harmony' },
      ],
    },
  },
  {
    id: 'ear',
    name: 'Ear',
    followups: [],
    ladder: {
      id: 'ear',
      title: 'Ear',
      start: 2,
      rungs: [
        { id: 'e1', prompt: 'Can you hear the difference between major and minor?', label: 'major vs. minor' },
        { id: 'e2', prompt: 'Can you learn a melody by ear?', label: 'melodies by ear' },
        { id: 'e3', prompt: 'Can you hear I–IV–V changes in a song?', label: 'hearing I–IV–V changes' },
        { id: 'e4', prompt: 'Can you transcribe a solo by ear?', label: 'transcribing solos' },
        { id: 'e5', prompt: 'Can you hear chord colors (7♭9 vs. 7♯9, maj7 vs. 6)?', label: 'hearing chord colors' },
      ],
    },
  },
  {
    id: 'improv',
    name: 'Improvising over changes',
    followups: ['use'],
    ladder: {
      id: 'improv',
      title: 'Improvising over changes',
      start: 1,
      rungs: [
        { id: 'i1', prompt: 'Can you improvise with one scale over a whole tune?', label: 'one scale over a tune' },
        { id: 'i2', prompt: 'Do you change scales as the chords change?', label: 'changing scales with the chords' },
        { id: 'i3', prompt: 'Do you land on chord tones on beat 1 when the chord changes?', label: 'landing on chord tones' },
        { id: 'i4', prompt: 'Can you play guide-tone lines (3rds and 7ths) through changes?', label: 'guide-tone lines' },
        { id: 'i5', prompt: 'Can you go outside and resolve back on purpose?', label: 'outside and back' },
      ],
    },
  },
  {
    id: 'comping',
    name: 'Rhythm and comping',
    followups: [],
    ladder: {
      id: 'comping',
      title: 'Rhythm and comping',
      start: 2,
      rungs: [
        { id: 'r1', prompt: 'Can you play strumming patterns in time?', label: 'strumming patterns' },
        { id: 'r2', prompt: 'Can you play rhythm parts straight from records?', label: 'rhythm parts from records' },
        { id: 'r3', prompt: 'Can you comp with 3–4 note voicings?', label: 'comping with small voicings' },
        { id: 'r4', prompt: 'Can you voice-lead through changes while comping?', label: 'voice-led comping' },
        { id: 'r5', prompt: 'Can you vary your comping rhythm (Freddie Green, Charleston, anticipations)?', label: 'rhythmic comping variety' },
      ],
    },
  },
]

export const FOLLOWUP_PROMPT: Record<Followup, (label: string) => string> = {
  play: (l) => `Can you play ${l} on demand, without stopping to think?`,
  use: (l) => `When you improvise or play songs, do you actually use ${l}?`,
  explain: (l) => `Could you explain ${l} to a student?`,
}

export const skillArea = (id: string) => SKILL_AREAS.find((a) => a.id === id)
