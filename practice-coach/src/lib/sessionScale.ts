import type { SessionPart } from '../content/types'
import type { LengthMode, Session } from '../store/store'

/**
 * The four parts rescaled to any session length, keeping each part's share.
 * Both minute keys are set to the scaled value so every reader agrees.
 */
export function scaleParts(parts: SessionPart[], minutes: number): SessionPart[] {
  const total = parts.reduce((s, p) => s + p.minutes[60], 0) || 1
  let used = 0
  return parts.map((p, i) => {
    const last = i === parts.length - 1
    const m = last ? Math.max(1, minutes - used) : Math.max(1, Math.round((p.minutes[60] / total) * minutes))
    used += m
    return { ...p, minutes: { 30: m, 60: m } }
  })
}

/** Parts for today given the player's settings: a custom length wins, else the plan's short/full mode. */
export function partsForSession(parts: SessionPart[], custom: number | null, lengthMode: LengthMode): { parts: SessionPart[]; lengthMode: LengthMode } {
  if (custom && custom >= 5) return { parts: scaleParts(parts, custom), lengthMode: 60 }
  return { parts, lengthMode }
}

export type PartDetail = { part: string; label: string; minutes: number; tempo: number | null }

/** The most recent logged detail for an exercise with this label ("last time: 15 min · 80 bpm"). */
export function lastDetail(sessions: Session[], label: string): (PartDetail & { date: string }) | null {
  const key = label.trim().toLowerCase()
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i]
    const d = s.partDetails?.find((x) => x.label.trim().toLowerCase() === key)
    if (d) return { ...d, date: s.date }
  }
  return null
}

/**
 * Daily rule, no model call: when the last two logged tempos for an exercise
 * were the same and both sessions marked it done, suggest +5 bpm.
 */
export function suggestedTempo(sessions: Session[], label: string): number | null {
  const key = label.trim().toLowerCase()
  const tempos: number[] = []
  for (let i = sessions.length - 1; i >= 0 && tempos.length < 2; i--) {
    const d = sessions[i].partDetails?.find((x) => x.label.trim().toLowerCase() === key)
    if (d?.tempo) tempos.push(d.tempo)
  }
  if (tempos.length === 2 && tempos[0] === tempos[1]) return tempos[0] + 5
  return null
}
