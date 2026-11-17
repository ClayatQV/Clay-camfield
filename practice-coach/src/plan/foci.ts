/**
 * The focus library: every 3-week block a plan can be built from. Clay's
 * original nine blocks are here (now with week-by-week content), plus
 * foundation blocks for newer players. The planner picks and orders them
 * from assessment results; each focus says what it trains, when it makes
 * sense (`need`) and when it's no longer needed (`done`).
 */
import type { AssessmentResult } from '../assessment/scoring'
import type { LabPreset } from '../lib/lab'

export type FocusWeek = { concept: string; instruction: string; lab: { label: string; p: LabPreset }[] }

export type Focus = {
  id: string
  title: string
  summary: string
  /** skill areas this block trains (assessment skill ids) */
  trains: string[]
  /** 1 foundation · 2 core · 3 advanced · 4 finish */
  tier: 1 | 2 | 3 | 4
  genres?: string[]
  /** goal ids (assessment g2) this block serves directly */
  goals?: string[]
  need?: (r: AssessmentResult) => boolean
  done?: (r: AssessmentResult) => boolean
  weeks: FocusWeek[]
  doneWhen: string[]
  songs?: { title: string; artist: string }[]
  lessonId?: string
  weeksLong?: number
}

const top = (r: AssessmentResult, area: string) => r.skills[area]?.top ?? -1
const uses = (r: AssessmentResult, area: string) => r.skills[area]?.use !== false

export const FOCI: Focus[] = [
  {
    id: 'pentatonic',
    title: 'Pentatonic everywhere',
    summary: 'All five pentatonic positions, connected, so the whole neck is yours.',
    trains: ['scales', 'fretboard'],
    tier: 1,
    goals: ['fretboard', 'speed'],
    done: (r) => top(r, 'scales') >= 1,
    weeks: [
      { concept: 'Positions 1 and 2 of A minor pentatonic', instruction: 'Play each position up and down saying the root every time you hit it. Then make one lick that crosses from position 1 into 2.', lab: [{ label: 'A minor pentatonic · position 1 (5th fret)', p: { mode: 'scales', root: 'A', scale: 'minpent', pos: 5 } }, { label: 'A minor pentatonic · position 2', p: { mode: 'scales', root: 'A', scale: 'minpent', pos: 7 } }] },
      { concept: 'Positions 3, 4 and 5', instruction: 'Learn the last three shapes, then slide between neighboring positions on one string.', lab: [{ label: 'A minor pentatonic · position 3', p: { mode: 'scales', root: 'A', scale: 'minpent', pos: 9 } }, { label: 'A minor pentatonic · position 5', p: { mode: 'scales', root: 'A', scale: 'minpent', pos: 12 } }] },
      { concept: 'The whole neck over a blues', instruction: 'Improvise over a slow blues in A, moving through all five positions in one chorus. Then do it in E and G.', lab: [{ label: 'A minor pentatonic · in 3rds', p: { mode: 'scales', root: 'A', scale: 'minpent', pos: 5, pat: '3rds' } }] },
    ],
    doneWhen: ['Play all five minor pentatonic positions in any key', 'Connect two positions inside one lick', 'Solo a full chorus that uses at least three positions'],
  },
  {
    id: 'neck',
    title: 'Know the neck',
    summary: 'Note names everywhere, octave shapes and the CAGED system.',
    trains: ['fretboard', 'theory'],
    tier: 1,
    goals: ['fretboard'],
    done: (r) => top(r, 'fretboard') >= 2,
    weeks: [
      { concept: 'Every note on the E and A strings', instruction: 'Name a random note, find it on both low strings within 3 seconds. Say it out loud. Ten minutes, every key.', lab: [{ label: 'C major with note names · open position', p: { mode: 'scales', root: 'C', scale: 'ionian', pos: 0, label: 'note' } }] },
      { concept: 'Octave shapes: every note on every string', instruction: 'Use octave shapes to jump from the low strings to the high ones. Find all the Cs, then all the F♯s.', lab: [{ label: 'G major with note names · 5th position', p: { mode: 'scales', root: 'G', scale: 'ionian', pos: 5, label: 'note' } }] },
      { concept: 'CAGED: one chord in five places', instruction: 'Play a C major arpeggio in each of the five CAGED positions, then do G and D.', lab: [{ label: 'C major arpeggio · open', p: { mode: 'arpeggios', root: 'C', type: 'maj', pos: 0, move: 'static' } }, { label: 'C major arpeggio · 8th fret', p: { mode: 'arpeggios', root: 'C', type: 'maj', pos: 8, move: 'static' } }] },
    ],
    doneWhen: ['Name any note on any string within 3 seconds', 'Play one chord in all five CAGED shapes', 'Find the 3rd of any major chord without counting'],
  },
  {
    id: 'sevenths',
    title: '7th chords and the ii–V–I',
    summary: 'maj7, m7 and 7 shapes, and the progression behind almost every song.',
    trains: ['chords', 'theory'],
    tier: 1,
    goals: ['theory', 'voicings'],
    done: (r) => top(r, 'chords') >= 2 && top(r, 'theory') >= 3,
    weeks: [
      { concept: 'maj7, m7 and 7 with roots on the 6th and 5th strings', instruction: 'Play each shape in four keys. Say the chord name and quality as you play it.', lab: [{ label: 'Drop 2 maj7 · cycle of 4ths', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'drop2', move: 'c4' } }] },
      { concept: 'ii–V–I in four keys', instruction: 'Dm7–G7–Cmaj7, then F, B♭ and G. Smallest move between shapes.', lab: [{ label: 'Drop 2 · ii–V–I through the cycle', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'drop2', move: '251' } }] },
      { concept: 'ii–V–I in all keys + Nashville numbers', instruction: 'Call out "2–5–1 in E♭" and play it. Do all twelve keys, then play a I–vi–ii–V by number.', lab: [{ label: 'Shells · ii–V–I', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'shell37', set: 0, move: '251' } }] },
    ],
    doneWhen: ['Play maj7, m7 and 7 from either bass string in any key', 'Play a ii–V–I in any key on call', 'Play a progression from Nashville numbers'],
  },
  {
    id: 'triads',
    title: 'Triads all over',
    summary: 'Major and minor triads on every string set and inversion — the map behind every chord.',
    trains: ['chords', 'fretboard'],
    tier: 1,
    goals: ['fretboard', 'voicings'],
    done: (r) => top(r, 'chords') >= 4,
    weeks: [
      { concept: 'Major triads on the top strings (G–B–E)', instruction: 'Through the cycle of 4ths, nearest inversion each time. Say the chord tones out loud.', lab: [{ label: 'Major triads · G–B–E · cycle of 4ths', p: { mode: 'chords', root: 'C', type: 'maj', voicing: 'close3', set: 'GBE', move: 'c4', zone: 'mid' } }] },
      { concept: 'Major and minor on D–G–B', instruction: 'Alternate major and minor through the cycle, staying within five frets.', lab: [{ label: 'Minor triads · D–G–B', p: { mode: 'chords', root: 'C', type: 'min', voicing: 'close3', set: 'DGB', move: 'c4', zone: 'mid' } }] },
      { concept: 'ii–V–I triads on A–D–G', instruction: 'Dm–G–C through the cycle on the lower strings, smallest move between shapes.', lab: [{ label: 'ii–V–I triads · A–D–G', p: { mode: 'chords', root: 'C', type: 'maj', voicing: 'close3', set: 'ADG', move: '251', zone: 'mid' } }] },
    ],
    doneWhen: ['Play any major or minor triad in any inversion on three string sets', 'Move through the cycle of 4ths without leaving a five-fret zone'],
  },
  {
    id: 'time',
    title: 'Lock the time',
    summary: 'Click on 2 and 4, clean subdivisions and placing the beat on purpose.',
    trains: ['comping'],
    tier: 1,
    goals: ['groove'],
    done: (r) => r.timing.length >= 4,
    weeks: [
      { concept: 'The click on 2 and 4', instruction: 'Set the click to half speed and hear it as beats 2 and 4. Strum and comp until it feels like a drummer.', lab: [{ label: 'Spider exercise · click at 60', p: { mode: 'technique', ex: 'spider', pos: 5, bpm: 60 } }] },
      { concept: 'Subdivisions: 8ths, triplets, 16ths', instruction: 'Same chord, same tempo: switch between 8ths, triplets and 16ths every four bars without speeding up.', lab: [{ label: 'Legato pairs · 2 notes per beat', p: { mode: 'technique', ex: 'legato', pos: 5, bpm: 70 } }] },
      { concept: 'Behind and ahead of the beat', instruction: 'Play a groove laid back, then pushed. Record both and listen back.', lab: [{ label: 'Chord drill with beats per chord', p: { mode: 'chords', root: 'C', type: 'm7', voicing: 'drop2', move: '251', bpm: 80 } }] },
    ],
    doneWhen: ['Hold a groove with the click on 2 and 4 for 3 minutes', 'Switch subdivisions without drifting', 'Record yourself and hear no rushing'],
  },
  {
    id: 'genreforms',
    title: 'Forms and feels',
    summary: 'The forms and feels every player in your home genre is expected to know.',
    trains: ['comping'],
    tier: 1,
    weeks: [],
    doneWhen: [],
  },
  {
    id: 'chordtones',
    title: 'See the chord, hit the chord',
    summary: 'Triads, 7th arpeggios and guide tones through ii–V–I.',
    trains: ['improv', 'arps', 'theory', 'fretboard'],
    tier: 2,
    genres: ['jazz', 'soul', 'blues', 'gospel'],
    goals: ['changes', 'fretboard', 'jazzvocab', 'theory'],
    need: (r) => top(r, 'chords') >= 2 || top(r, 'arps') >= 1,
    done: (r) => top(r, 'improv') >= 3 && uses(r, 'improv'),
    weeks: [
      { concept: 'Two-note guide-tone line through ii–V–I in all 12 keys', instruction: 'In C: Dm7 (F, C) → G7 (F, B) → Cmaj7 (E, B). One note moves a half step, the other holds. Then every key round the cycle.', lab: [{ label: 'Shells R·3·7 · ii–V–I', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'shell37', set: 0, move: '251', zone: 'mid' } }] },
      { concept: 'Land on the 3rd of every chord on beat 1', instruction: 'Over a ii–V–I, improvise a line that hits the 3rd of each chord exactly on beat 1. Say the target before you land.', lab: [{ label: 'ii–V–I arpeggios · start on the 3rd', p: { mode: 'arpeggios', root: 'C', type: 'maj7', pos: 5, move: '251', start: '3', pat: 'up', bpm: 60 } }] },
      { concept: 'Chord-tone-only solo, then one approach note into each target', instruction: 'Solo using only chord tones. Then add a single half-step approach (from above or below) into each target note.', lab: [{ label: 'ii–V–I arpeggios · position 5', p: { mode: 'arpeggios', root: 'C', type: 'maj7', pos: 5, move: '251', pat: 'ud', bpm: 60 } }] },
    ],
    doneWhen: ['Name and play any major or minor triad in any inversion on three string sets', 'Guide tones through a ii–V–I in any key at 80 bpm', 'Solo a full chorus over the tune without falling back on a pentatonic box'],
    songs: [{ title: "They Can't Take That Away From Me", artist: 'Ella Fitzgerald & Louis Armstrong' }],
    lessonId: 'chase-wes-arpeggios',
  },
  {
    id: 'modes',
    title: 'Modes in your playing',
    summary: 'Dorian, Mixolydian and Lydian as sounds over chords, not shapes.',
    trains: ['scales', 'improv'],
    tier: 2,
    goals: ['jazzvocab', 'theory'],
    need: (r) => top(r, 'scales') >= 2,
    done: (r) => top(r, 'scales') >= 3 && uses(r, 'scales'),
    weeks: [
      { concept: 'Dorian over m7 vamps: target the 6th', instruction: 'Vamp on Am7. Make every phrase land on F♯, the note that makes Dorian sound like Dorian.', lab: [{ label: 'A Dorian · 5th position', p: { mode: 'scales', root: 'A', scale: 'dorian', pos: 5 } }] },
      { concept: 'Mixolydian over dominant vamps: target ♭7 and 3', instruction: 'Vamp on G7. Lines that lean on F and B.', lab: [{ label: 'G Mixolydian · 3rd position', p: { mode: 'scales', root: 'G', scale: 'mixolydian', pos: 3 } }] },
      { concept: 'Lydian over maj7: the ♯11', instruction: 'Vamp on Cmaj7. Use F♯ as a color, resolving to G or E.', lab: [{ label: 'C Lydian · 7th position', p: { mode: 'scales', root: 'C', scale: 'lydian', pos: 7 } }] },
    ],
    doneWhen: ['Hear the difference between Dorian, Mixolydian and Lydian over a vamp', 'Improvise 16 bars over each that sounds like the mode'],
    lessonId: 'kid-charlemagne',
  },
  {
    id: 'b9',
    title: 'The ♭9 sound',
    summary: 'Diminished arpeggio from the 3rd of a dominant = 7♭9, resolved to I.',
    trains: ['arps', 'improv', 'scales'],
    tier: 3,
    genres: ['jazz', 'blues', 'soul', 'gospel'],
    goals: ['jazzvocab', 'changes'],
    need: (r) => top(r, 'improv') >= 2 || top(r, 'arps') >= 2,
    done: (r) => top(r, 'arps') >= 4 && uses(r, 'arps'),
    weeks: [
      { concept: 'Diminished arpeggio from the 3rd of V7', instruction: 'Over C7, play E°7 (E G B♭ D♭): that\'s C7♭9 without the root. Resolve each line into F.', lab: [{ label: 'E°7 arpeggio (= C7♭9 from the 3rd)', p: { mode: 'arpeggios', root: 'E', type: 'dim7', pos: 7, move: 'static', pat: 'ud' } }] },
      { concept: '7♭9 resolving to I through the cycle', instruction: 'ii–V–I in every key with the ♭9 on the V. Hear the ♭9 fall a half step into the 5th of the I.', lab: [{ label: '7♭9 arpeggios · cycle of 4ths', p: { mode: 'arpeggios', root: 'C', type: '7b9', pos: 5, move: 'c4', pat: 'ud' } }] },
      { concept: 'Diminished licks inside your blues', instruction: 'Take a blues in your home key and drop one diminished lick into every V chord. Eric Gales / Robben Ford style.', lab: [{ label: 'G half-whole diminished', p: { mode: 'scales', root: 'G', scale: 'hwdim', pos: 3 } }] },
    ],
    doneWhen: ['Play a diminished arpeggio from the 3rd of any dominant', 'Resolve a ♭9 into the I chord in any key', 'Use a diminished lick in a blues without it sounding like an exercise'],
    lessonId: 'kid-charlemagne',
  },
  {
    id: 'harmonicminor',
    title: 'Harmonic minor in your lines',
    summary: 'You know harmonic minor; this block puts it into minor ii–V–is and minor blues.',
    trains: ['scales', 'improv'],
    tier: 3,
    genres: ['jazz', 'blues', 'soul'],
    goals: ['jazzvocab'],
    need: (r) => top(r, 'scales') >= 5,
    done: (r) => top(r, 'scales') >= 5 && uses(r, 'scales'),
    weeks: [
      { concept: 'Phrygian dominant over the V7 of a minor key', instruction: 'In A minor, play E Phrygian dominant over E7 and resolve to Am. Hear the ♭9 and the major 3rd together.', lab: [{ label: 'E Phrygian dominant', p: { mode: 'scales', root: 'E', scale: 'phrdom', pos: 7 } }] },
      { concept: 'Harmonic minor through a minor ii–V–i', instruction: 'Bm7♭5–E7♭9–Am6: harmonic minor over the V, Dorian over the i.', lab: [{ label: 'Minor ii–V–i arpeggios', p: { mode: 'arpeggios', root: 'A', type: 'm6', pos: 5, move: 'm251' } }] },
      { concept: 'Into a minor blues', instruction: 'Use the V7 sound in bars 9–10 of a minor blues. One harmonic-minor lick per chorus.', lab: [{ label: 'A harmonic minor', p: { mode: 'scales', root: 'A', scale: 'harmin', pos: 5 } }] },
    ],
    doneWhen: ['Play over a minor ii–V–i in any key using harmonic minor on the V', 'Play a harmonic-minor lick in a minor blues on purpose'],
  },
  {
    id: 'altered',
    title: 'Altered tension',
    summary: '♯9, ♭13 and the altered scale, blended into blues lines à la Eric Gales and Robben Ford.',
    trains: ['scales', 'improv'],
    tier: 3,
    genres: ['jazz', 'blues', 'fusion'],
    goals: ['jazzvocab'],
    need: (r) => top(r, 'scales') >= 3,
    done: (r) => top(r, 'scales') >= 4 && uses(r, 'scales'),
    weeks: [
      { concept: 'The altered scale over V7', instruction: 'G altered = A♭ melodic minor. Play it over G7 and resolve every line into C.', lab: [{ label: 'G altered scale', p: { mode: 'scales', root: 'G', scale: 'altered', pos: 3 } }] },
      { concept: '♯9 and ♭13 as targets', instruction: 'Over a dominant, land on the ♯9 and ♭13 and resolve them by half step.', lab: [{ label: '7♯9 voicings', p: { mode: 'chords', root: 'G', type: '7s9', voicing: 'drop2', move: 'c4' } }] },
      { concept: 'Altered colors in a blues', instruction: 'Blend one altered phrase into each turnaround of a blues, then get back to the blues language.', lab: [{ label: '7alt arpeggio', p: { mode: 'arpeggios', root: 'G', type: '7alt', pos: 3, move: 'static' } }] },
    ],
    doneWhen: ['Play the altered scale over any dominant', 'Resolve ♯9 and ♭13 into the next chord', 'Use altered tension in a blues and get back home'],
  },
  {
    id: 'voicings',
    title: 'Soul harmony and voicings',
    summary: 'Drop 2 / drop 3, triads over bass, moving inner voices, gospel passing chords.',
    trains: ['chords', 'comping'],
    tier: 2,
    genres: ['soul', 'gospel', 'funk', 'jazz'],
    goals: ['voicings', 'chordmelody'],
    need: (r) => top(r, 'chords') >= 3,
    done: (r) => top(r, 'chords') >= 6 && top(r, 'comping') >= 3,
    weeks: [
      { concept: 'Drop 2 through ii–V–I', instruction: 'All four inversions of Dm7, G7 and Cmaj7 on the top four strings, connected by the smallest move.', lab: [{ label: 'Drop 2 · ii–V–I', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'drop2', move: '251' } }] },
      { concept: 'Drop 3 and triads over bass', instruction: 'Drop 3 shapes with the root on the 6th string; then play upper triads over a bass note (D/C, F/G).', lab: [{ label: 'Drop 3 · ii–V–I', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'drop3', move: '251' } }] },
      { concept: 'Moving inner voices and gospel passing chords', instruction: 'Keep the top note, move an inner voice (sus4 → 3, 6 → ♭7). Add diminished passing chords between 1 and 2, 4 and 5.', lab: [{ label: 'Close 4-note 6/9', p: { mode: 'chords', root: 'C', type: '69', voicing: 'close4', move: 'c4' } }] },
    ],
    doneWhen: ['Comp through a ii–V–I in drop 2 and drop 3 in any key', 'Use a passing chord and a moving inner voice in a song'],
    songs: [{ title: 'Superwoman', artist: 'Stevie Wonder' }],
  },
  {
    id: 'groove',
    title: 'Groove vocabulary',
    summary: "16th-note scratch, ghost notes and interlocking parts — D'Angelo, Tower of Power, the Meters.",
    trains: ['comping'],
    tier: 2,
    genres: ['funk', 'soul', 'reggae', 'gospel'],
    goals: ['groove'],
    done: (r) => top(r, 'comping') >= 4 && r.timing.includes('pocket'),
    weeks: [
      { concept: '16th-note scratch and ghost notes', instruction: 'Keep the strumming hand moving on every 16th. Mute everything except the accents.', lab: [{ label: 'E9 voicings · drop 2', p: { mode: 'chords', root: 'E', type: '9', voicing: 'drop2', move: 'static' } }] },
      { concept: 'Interlocking parts', instruction: 'Play a part that fills the gaps between the bass and the hi-hat. Learn one Meters or D\'Angelo rhythm part by ear.', lab: [{ label: 'E Dorian · 7th position', p: { mode: 'scales', root: 'E', scale: 'dorian', pos: 7 } }] },
      { concept: 'One-chord vamps with variation', instruction: 'Hold a one-chord vamp for four minutes, changing one small thing every eight bars.', lab: [{ label: '13 chord · static', p: { mode: 'chords', root: 'A', type: '13', voicing: 'drop2', move: 'static' } }] },
    ],
    doneWhen: ['Hold a 16th-note groove for three minutes in the pocket', 'Play an interlocking part from a record by ear'],
    songs: [{ title: "Let's Stay Together", artist: 'Al Green' }],
  },
  {
    id: 'singer',
    title: 'Phrase like a singer',
    summary: 'Melodies from singers and horn players, motif development and space.',
    trains: ['improv', 'ear'],
    tier: 2,
    goals: ['phrasing'],
    weeks: [
      { concept: 'Learn a vocal melody by ear', instruction: 'Pick a singer you love. Learn 8 bars of the melody by ear, saying the note names, and copy every bend and slide.', lab: [{ label: 'Major pentatonic + major blues', p: { mode: 'scales', root: 'C', scale: 'majblues', pos: 7 } }] },
      { concept: 'One motif, four variations', instruction: 'Take a 3-note idea and play it four ways: displaced, inverted, extended, answered.', lab: [{ label: 'C major pentatonic · position 8', p: { mode: 'scales', root: 'C', scale: 'majpent', pos: 8 } }] },
      { concept: 'Space: rest between phrases', instruction: 'Solo leaving two full beats of silence after every phrase. Call and response with yourself.', lab: [{ label: 'C major scale in 3rds', p: { mode: 'scales', root: 'C', scale: 'ionian', pos: 7, pat: '3rds' } }] },
    ],
    doneWhen: ['Play a vocal melody with the singer\'s phrasing', 'Develop one motif through a whole chorus', 'Leave space without losing the thread'],
    songs: [{ title: 'Tenderly', artist: 'Ella Fitzgerald & Louis Armstrong' }],
  },
  {
    id: 'chordmelody',
    title: 'Chord-melody',
    summary: 'Arrange a ballad with the melody on top. Models: Isaiah Sharkey\'s "Amazing Grace", Ted Greene.',
    trains: ['chords'],
    tier: 3,
    genres: ['jazz', 'gospel', 'soul'],
    goals: ['chordmelody'],
    need: (r) => top(r, 'chords') >= 5,
    done: (r) => top(r, 'chords') >= 9,
    weeks: [
      { concept: 'Melody on top with triads', instruction: 'Play the melody on the top two strings and put a triad under each melody note on the strong beats.', lab: [{ label: 'Triads · G–B–E · static', p: { mode: 'chords', root: 'C', type: 'maj', voicing: 'close3', set: 'GBE', move: 'static' } }] },
      { concept: 'Harmonize the melody in drop 2', instruction: 'Find the drop 2 voicing with the melody note on top for each chord change.', lab: [{ label: 'Drop 2 · melody on top', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'drop2', move: 'c4' } }] },
      { concept: 'Arrange a ballad chorus', instruction: 'Arrange one full chorus: melody, chords, one passing chord per phrase. Record it.', lab: [{ label: 'Close 4-note maj9', p: { mode: 'chords', root: 'C', type: 'maj9', voicing: 'close4', move: 'static' } }] },
    ],
    doneWhen: ['Play one chorus of a ballad as chord-melody', 'Harmonize a melody note with a drop 2 voicing on demand'],
    songs: [{ title: 'Amazing Grace', artist: 'Isaiah Sharkey' }],
  },
  {
    id: 'outside',
    title: 'Outside and back',
    summary: 'Chromatic approach, side-stepping, tension that resolves — Eric Gales, Julian Lage.',
    trains: ['improv', 'theory'],
    tier: 3,
    genres: ['jazz', 'blues', 'fusion', 'rock'],
    goals: ['changes', 'jazzvocab'],
    need: (r) => top(r, 'improv') >= 3,
    done: (r) => top(r, 'improv') >= 4 && uses(r, 'improv'),
    weeks: [
      { concept: 'Chromatic approach and enclosures', instruction: 'Approach every chord tone from a half step above and below before landing.', lab: [{ label: 'Bebop dominant scale', p: { mode: 'scales', root: 'G', scale: 'bebdom', pos: 3 } }] },
      { concept: 'Side-stepping', instruction: 'Play a pentatonic idea a half step up for one beat, then resolve back in. Tension, then release.', lab: [{ label: 'B♭ Lydian dominant', p: { mode: 'scales', root: 'Bb', scale: 'lyddom', pos: 5 } }] },
      { concept: 'Tension that resolves', instruction: 'Use one outside sound per chorus and make the resolution the loudest moment.', lab: [{ label: 'Whole-tone scale', p: { mode: 'scales', root: 'C', scale: 'whole', pos: 7 } }] },
    ],
    doneWhen: ['Go outside and resolve on purpose, in time', 'Enclose any chord tone at tempo'],
    lessonId: 'kid-charlemagne',
  },
  {
    id: 'ears',
    title: 'Ears first',
    summary: 'Melodies, changes and solos by ear.',
    trains: ['ear'],
    tier: 1,
    goals: ['ear'],
    done: (r) => top(r, 'ear') >= 3,
    weeks: [
      { concept: 'A melody by ear every day', instruction: 'Pick a short melody, find it on the guitar by ear, say the note names. No tab.', lab: [{ label: 'Major scale with note names', p: { mode: 'scales', root: 'G', scale: 'ionian', pos: 2, label: 'note' } }] },
      { concept: 'Hear I–IV–V, then ii–V', instruction: 'Listen to three songs and write the Nashville numbers before checking.', lab: [{ label: 'Diatonic 7th chords · cycle', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'drop2', move: '251' } }] },
      { concept: 'Transcribe four bars of a solo', instruction: 'Slow it down and loop it, but find every note by ear first.', lab: [{ label: 'Minor pentatonic · 5th position', p: { mode: 'scales', root: 'A', scale: 'minpent', pos: 5 } }] },
    ],
    doneWhen: ['Learn a short melody by ear', 'Hear the changes of a simple song', 'Transcribe four bars of a solo'],
  },
  {
    id: 'together',
    title: 'Put it together',
    summary: 'Play through your repertoire using everything from the plan. Record and listen back.',
    trains: [],
    tier: 4,
    weeksLong: 2,
    weeks: [
      { concept: 'Run your repertoire', instruction: 'Play every song from this plan start to finish. Record the best take of each.', lab: [{ label: 'ii–V–I arpeggios · review', p: { mode: 'arpeggios', root: 'C', type: 'maj7', pos: 5, move: '251' } }] },
      { concept: 'Your own chorus', instruction: 'Solo over your favorite tune using one idea from every block. Send it to someone.', lab: [{ label: 'Drop 2 · ii–V–I review', p: { mode: 'chords', root: 'C', type: 'maj7', voicing: 'drop2', move: '251' } }] },
    ],
    doneWhen: ['Play your repertoire start to finish', 'Record a chorus you\'re proud of'],
  },
]

export const focusById = (id: string) => FOCI.find((f) => f.id === id)
