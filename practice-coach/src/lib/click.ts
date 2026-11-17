/**
 * Metronome click settings. They live in Fretboard Lab's own saved state
 * (localStorage "fretboard-lab": clickVol, clickTone) so the Lab and the app
 * share one setting. The tone table mirrors CLICK_TONES in fretboard-lab.html.
 */
import { LAB_STORAGE_KEY } from '../store/store'

export type ClickTone = 'classic' | 'wood' | 'beep' | 'low'
export const CLICK_TONES: { id: ClickTone; label: string; type: OscillatorType; f: [number, number, number]; len: number; k: number }[] = [
  { id: 'classic', label: 'Classic', type: 'sine', f: [800, 1100, 1650], len: 0.045, k: 1 },
  { id: 'wood', label: 'Woodblock', type: 'triangle', f: [620, 880, 1250], len: 0.03, k: 1.25 },
  { id: 'beep', label: 'Beep', type: 'square', f: [880, 1320, 1760], len: 0.05, k: 0.4 },
  { id: 'low', label: 'Low', type: 'sine', f: [330, 440, 550], len: 0.07, k: 1.3 },
]

function readLab(): Record<string, unknown> {
  try {
    const v = JSON.parse(localStorage.getItem(LAB_STORAGE_KEY) || 'null')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

export function getClick(): { vol: number; tone: ClickTone } {
  const s = readLab()
  const vol = Number(s.clickVol)
  const tone = CLICK_TONES.some((t) => t.id === s.clickTone) ? (s.clickTone as ClickTone) : 'classic'
  return { vol: Number.isFinite(vol) ? Math.min(100, Math.max(0, vol)) : 70, tone }
}

export function setClick(patch: Partial<{ vol: number; tone: ClickTone }>) {
  const s = readLab()
  if (patch.vol !== undefined) s.clickVol = patch.vol
  if (patch.tone !== undefined) s.clickTone = patch.tone
  try {
    localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

let ctx: AudioContext | null = null
/** One bar of four clicks (accent first) at the given tempo. */
export function testClick(bpm = 90) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = ctx || new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    const { vol, tone } = getClick()
    const T = CLICK_TONES.find((x) => x.id === tone)!
    const factor = vol / 70
    if (factor <= 0) return
    const t0 = ctx.currentTime + 0.05
    for (let i = 0; i < 4; i++) {
      const level = i === 0 ? 2 : 1
      const t = t0 + (i * 60) / bpm
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = T.type
      o.frequency.value = T.f[level]
      const v = Math.min(0.95, (level === 2 ? 0.55 : 0.32) * T.k * factor)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(v, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.0001, t + T.len)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + T.len + 0.02)
    }
  } catch {
    /* audio is optional */
  }
}
