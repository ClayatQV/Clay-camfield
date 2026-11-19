/**
 * The Fretboard Lab's preset vocabulary (mirrors public/fretboard-lab.html),
 * so AI-written Lab links can be validated before they reach the app, and
 * so the prompts can tell the AI exactly what it may use.
 */
export const LAB_MODES = ['chords', 'arpeggios', 'scales', 'technique'] as const
export const LAB_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const
export const LAB_CHORDS = [
  'maj', 'min', 'dim', 'aug', 'sus2', 'sus4', '6', 'm6', '69', 'maj7', '7', 'm7', 'm7b5', 'dim7', 'mmaj7', '7sus4', 'maj7s5', '7s5', '7b5',
  'add9', 'madd9', 'maj9', '9', 'm9', '7b9', '7s9', '9sus4', 'm11', 'maj7s11', '7s11', '13', 'm13', 'maj13', '13b9', '7b13', '7alt',
] as const
export const LAB_SCALES = [
  'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian', 'melmin', 'dorb2', 'lydaug', 'lyddom', 'mixb6', 'loc2', 'altered',
  'harmin', 'loc6', 'ion5', 'dor4', 'phrdom', 'lyd2', 'ultraloc', 'harmaj', 'hungmin', 'dblharm', 'whole', 'hwdim', 'whdim',
  'majpent', 'minpent', 'blues', 'majblues', 'dompent', 'min6pent', 'bebdom', 'bebmaj', 'bebdor', 'chrom',
] as const
export const LAB_VOICINGS = ['close3', 'open3', 'shell73', 'shell37', 'close4', 'drop2', 'drop3', 'drop24'] as const
export const LAB_MOVES = ['static', 'c4', 'c5', 'chrom', '251', 'm251'] as const
export const LAB_SETS = ['GBE', 'DGB', 'ADG', 'EAD'] as const
export const LAB_EX = ['spider', 'skip', 'legato', 'diag'] as const

const ROOT_RE = /^[A-G](#|b)?$/

/** Returns a cleaned query string, or null if the preset is not usable. */
export function cleanLabQuery(q: string | null | undefined): string | null {
  if (!q) return null
  let p: URLSearchParams
  try {
    p = new URLSearchParams(q.replace(/^\?/, ''))
  } catch {
    return null
  }
  const mode = p.get('mode') as (typeof LAB_MODES)[number] | null
  if (!mode || !LAB_MODES.includes(mode)) return null
  const out = new URLSearchParams()
  out.set('mode', mode)
  const root = p.get('root')
  if (root && ROOT_RE.test(root)) out.set('root', root)
  const num = (k: string, lo: number, hi: number) => {
    const v = Number(p.get(k))
    if (p.get(k) !== null && Number.isInteger(v) && v >= lo && v <= hi) out.set(k, String(v))
  }
  if (mode === 'chords') {
    const t = p.get('type')
    if (t && (LAB_CHORDS as readonly string[]).includes(t)) out.set('type', t)
    const v = p.get('voicing')
    if (v && (LAB_VOICINGS as readonly string[]).includes(v)) out.set('voicing', v)
    const s = p.get('set')
    if (s && ((LAB_SETS as readonly string[]).includes(s.toUpperCase()) || /^[0-3]$/.test(s))) out.set('set', /^\d$/.test(s) ? s : s.toUpperCase())
    const m = p.get('move')
    if (m && (LAB_MOVES as readonly string[]).includes(m)) out.set('move', m)
    const z = p.get('zone')
    if (z && ['low', 'mid', 'high'].includes(z)) out.set('zone', z)
  } else if (mode === 'arpeggios') {
    const t = p.get('type')
    if (t && (LAB_CHORDS as readonly string[]).includes(t)) out.set('type', t)
    num('pos', 0, 12)
    const m = p.get('move')
    if (m && (LAB_MOVES as readonly string[]).includes(m) && m !== 'chrom') out.set('move', m)
    const st = p.get('start')
    if (st && ['low', 'r', '3', '5', '7'].includes(st)) out.set('start', st)
    const pat = p.get('pat')
    if (pat && ['ud', 'up', 'dn'].includes(pat)) out.set('pat', pat)
  } else if (mode === 'scales') {
    const s = p.get('scale') ?? p.get('type')
    if (s && (LAB_SCALES as readonly string[]).includes(s)) out.set('scale', s)
    num('pos', 0, 12)
    const pat = p.get('pat')
    if (pat && ['line', '3rds', '4ths', 'g3', 'g4', 'tri', 'sev'].includes(pat)) out.set('pat', pat)
  } else {
    const ex = p.get('ex')
    if (ex && (LAB_EX as readonly string[]).includes(ex)) out.set('ex', ex)
    num('pos', 1, 12)
  }
  num('bpm', 30, 240)
  const label = p.get('label')
  if (label === 'deg' || label === 'note') out.set('label', label)
  return out.toString()
}

/** Compact description of the vocabulary for the prompts. */
export const LAB_VOCAB_TEXT = `Fretboard Lab presets are query strings. Allowed keys and values only:
- mode=chords: root (C Db D Eb E F F# G Ab A Bb B), type (${LAB_CHORDS.join(' ')}), voicing (${LAB_VOICINGS.join(' ')}), set (GBE DGB ADG EAD for 3-note voicings; 0–2 for 4-note), move (${LAB_MOVES.join(' ')}), zone (low mid high)
- mode=arpeggios: root, type (same chord ids), pos (0–12 = starting fret), move (static c4 c5 251 m251), start (low r 3 5 7), pat (ud up dn)
- mode=scales: root, scale (${LAB_SCALES.join(' ')}), pos (0–12), pat (line 3rds 4ths g3 g4 tri sev)
- mode=technique: ex (spider skip legato diag), pos (1–12)
- any mode: bpm (30–240), label (deg note)
Examples: "mode=chords&root=C&type=maj&voicing=close3&set=GBE&move=c4&zone=mid" · "mode=arpeggios&root=C&type=m7&pos=5&move=c4&bpm=60" · "mode=scales&root=G&scale=majpent&pos=7" · "mode=technique&ex=spider&pos=5&bpm=80". Use null when no preset fits.`
