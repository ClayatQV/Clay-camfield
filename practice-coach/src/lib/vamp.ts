/**
 * Chord vamps: parse "G7 | G7 | Cmaj7 | Cmaj7" (or chord symbols found in an
 * instruction) into bars, and voice them for the WebAudio vamp player.
 */
export type Chord = { symbol: string; root: string; pc: number; quality: string; intervals: number[] }
export type VampBar = { chord: Chord; beats: number }

const PCS: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11, 'E#': 5, 'B#': 0, Fb: 4 }

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  maj: [0, 4, 7],
  M: [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  '-': [0, 3, 7],
  dim: [0, 3, 6],
  '°': [0, 3, 6],
  aug: [0, 4, 8],
  '+': [0, 4, 8],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  sus: [0, 5, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  add9: [0, 4, 7, 14],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  M7: [0, 4, 7, 11],
  Δ7: [0, 4, 7, 11],
  Δ: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  '-7': [0, 3, 7, 10],
  mMaj7: [0, 3, 7, 11],
  m7b5: [0, 3, 6, 10],
  ø7: [0, 3, 6, 10],
  ø: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  '°7': [0, 3, 6, 9],
  '7sus4': [0, 5, 7, 10],
  '7sus': [0, 5, 7, 10],
  '9': [0, 4, 10, 14],
  maj9: [0, 4, 11, 14],
  m9: [0, 3, 10, 14],
  '11': [0, 7, 10, 17],
  '13': [0, 4, 10, 21],
  '7b9': [0, 4, 10, 13],
  '7#9': [0, 4, 10, 15],
  '7#11': [0, 4, 10, 18],
  '7b13': [0, 4, 10, 20],
  '7alt': [0, 4, 10, 13, 20],
  alt: [0, 4, 10, 13, 20],
  '7#5': [0, 4, 8, 10],
  '7b5': [0, 4, 6, 10],
}

const SYMBOL = /^([A-G](?:#|b)?)(.*)$/
const norm = (q: string) =>
  q
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/\(|\)/g, '')
    .replace(/^ma7$/, 'maj7')
    .replace(/^mi7$/, 'm7')
    .replace(/^dom7$/, '7')
    .replace(/^-7b5$/, 'm7b5')
    .replace(/^half-dim$/, 'm7b5')
    .trim()

export function parseChord(sym: string): Chord | null {
  const s = sym.trim().replace(/\/[A-G](?:#|b)?$/, '') // drop slash bass for voicing
  const m = s.match(SYMBOL)
  if (!m) return null
  const root = m[1]
  const quality = norm(m[2])
  const intervals = QUALITIES[quality]
  if (!intervals || !(root in PCS)) return null
  return { symbol: sym.trim(), root, pc: PCS[root], quality, intervals }
}

/** "G7 | G7 | Cmaj7 Cmaj7" → bars. Bars split on | ; chords within a bar share it. */
export function parseVamp(text: string): VampBar[] {
  const bars: VampBar[] = []
  for (const barText of text.split('|')) {
    const syms = barText.trim().split(/[\s,]+/).filter(Boolean)
    const chords = syms.map(parseChord).filter((c): c is Chord => !!c)
    if (!chords.length) continue
    const beats = Math.max(1, Math.round(4 / chords.length))
    for (const c of chords) bars.push({ chord: c, beats })
  }
  return bars.slice(0, 16)
}

/**
 * Chord symbols mentioned in free text ("loop a G7 vamp", "Dm7 → G7 → Cmaj7").
 * Requires a quality suffix so string names like "G–B–E" don't become chords.
 */
export function chordsInText(text: string): Chord[] {
  const re = /\b([A-G](?:#|b|♭|♯)?)(maj7|maj9|m7b5|ø7|m7|min7|dim7|°7|7b9|7#9|7♭9|7♯9|7alt|7sus4|m6|mMaj7|maj|min|dim|aug|sus4|sus2|add9|13|11|9|7|6|m)\b/g
  const out: Chord[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const c = parseChord(m[1] + m[2])
    if (c && !seen.has(c.symbol)) {
      seen.add(c.symbol)
      out.push(c)
    }
  }
  return out.slice(0, 8)
}

/** A vamp for a part: the module's explicit vamp if any, else the chords named in its text, one bar each (a lone chord gets two bars). */
export function vampFor(explicit: string | null | undefined, ...texts: string[]): VampBar[] {
  if (explicit) {
    const bars = parseVamp(explicit)
    if (bars.length) return bars
  }
  const chords = chordsInText(texts.join(' '))
  if (!chords.length) return []
  if (chords.length === 1) return [{ chord: chords[0], beats: 4 }, { chord: chords[0], beats: 4 }]
  return chords.map((c) => ({ chord: c, beats: 4 }))
}

/** MIDI note numbers for a close voicing of the chord around middle C, plus a bass note. */
export function voice(chord: Chord): { bass: number; notes: number[] } {
  const base = 60 + ((chord.pc - 60) % 12) // nearest root pitch class above middle C region
  let root = 60 + chord.pc
  if (root > 66) root -= 12
  const notes = chord.intervals.map((i) => {
    let n = root + i
    while (n > 79) n -= 12
    return n
  })
  const bass = root - 24 + (root - 24 < 36 ? 12 : 0)
  void base
  return { bass, notes: [...new Set(notes)].sort((a, b) => a - b) }
}

export const midiHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
