/**
 * Fretboard Lab deep links. A preset is a flat set of query params understood
 * by public/fretboard-lab.html (see the "URL presets" block in that file).
 *
 *   labPath({ mode: 'scales', root: 'G', scale: 'majpent', pos: 7 })
 *     → "/lab?mode=scales&root=G&scale=majpent&pos=7"   (in-app route)
 *   labFileUrl(query) → "fretboard-lab.html?mode=…"      (iframe src)
 */
export type LabMode = 'chords' | 'arpeggios' | 'scales' | 'technique'

export type LabPreset = {
  mode: LabMode
  root?: string
  /** chord/arpeggio type id: maj, min, maj7, m7, 7, 7b9, … */
  type?: string
  /** scales: majpent, minpent, dorian, lyddom, altered, … */
  scale?: string
  /** chords: close3, open3, shell37, shell73, close4, drop2, drop3, drop24 */
  voicing?: string
  /** chords: string set, index or names like "GBE", "DGB", "ADG" */
  set?: string | number
  /** static, c4, c5, chrom, 251, m251, custom */
  move?: string
  custom?: string
  zone?: 'low' | 'mid' | 'high'
  /** fret 0–12 (arpeggios, scales, technique) */
  pos?: number
  /** arpeggios: low | r | 3 | 5 | 7 */
  start?: string
  /** arpeggios: ud | up | dn; scales: line | 3rds | 4ths | g3 | g4 | tri | sev */
  pat?: string
  /** scales: box | 2 | 3 | 4 */
  fing?: string
  bpm?: number
  label?: 'deg' | 'note'
  ex?: string
}

export function labQuery(p: LabPreset): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') q.set(k, String(v))
  return q.toString()
}

/** In-app route that opens the Lab screen with a preset. */
export function labPath(p: LabPreset): string {
  return '/lab?' + labQuery(p)
}

/** Params the Lab page understands (anything else in the app route is dropped). */
const LAB_KEYS = new Set([
  'mode', 'root', 'type', 'scale', 'voicing', 'set', 'move', 'custom', 'zone', 'bass', 'beats', 'all', 'pos',
  'start', 'pat', 'fing', 'deg', 'rate', 'bpm', 'label', 'ex', 'perm', 'pair', 'rounds', 'qmode',
])

export function labFileUrl(appQuery: URLSearchParams, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams()
  appQuery.forEach((v, k) => {
    if (LAB_KEYS.has(k)) q.set(k, v)
  })
  for (const [k, v] of Object.entries(extra)) q.set(k, v)
  const s = q.toString()
  return 'fretboard-lab.html' + (s ? '?' + s : '')
}
