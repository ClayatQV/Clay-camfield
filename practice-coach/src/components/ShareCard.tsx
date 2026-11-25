import type { Session } from '../store/store'
import type { DayKey } from '../lib/dates'
import { buildShareText, copyText, nativeShare } from '../lib/share'
import { Icon } from './Icon'
import { toast } from './Toast'

/** Summary of a day's practice with Share (the device's share sheet) and Copy text. */
export function ShareCard({ sessions, streak, today, compact }: { sessions: Session[]; streak: number; today: DayKey; compact?: boolean }) {
  const minutes = sessions.reduce((s, x) => s + x.minutes, 0)
  const labels: string[] = []
  for (const s of sessions) for (const d of s.partDetails ?? []) if (!labels.includes(d.label)) labels.push(d.tempo ? `${d.label} (${d.tempo} bpm)` : d.label)
  if (!labels.length) for (const s of sessions) for (const l of s.partLabels ?? []) if (!labels.includes(l)) labels.push(l)
  const note = sessions
    .map((s) => s.note)
    .filter(Boolean)
    .join('; ')
  const text = buildShareText({ minutes, labels, note, streak, date: sessions[0].date, today })

  async function share() {
    const r = await nativeShare(text)
    if (r === 'shared' || r === 'cancelled') return
    toast((await copyText(text)) ? 'Copied' : "Couldn't copy. Long-press the text to copy it.", 3200)
  }
  async function copy() {
    toast((await copyText(text)) ? 'Copied' : "Couldn't copy. Long-press the text to copy it.")
  }

  return (
    <section className="card share-card" aria-label="Today's practice">
      <div className="row-between">
        <span className="pill">
          <Icon name="check" size={16} /> {minutes} min logged
        </span>
        {streak > 0 && (
          <span className="pill fire">
            <Icon name="fire" size={16} /> {streak}-day streak
          </span>
        )}
      </div>
      {!compact && <p className="share-text">{text}</p>}
      <div className="row">
        <button className="btn primary grow" onClick={share}>
          <Icon name="share" /> Share
        </button>
        <button className="btn grow" onClick={copy}>
          <Icon name="copy" size={18} /> Copy text
        </button>
      </div>
    </section>
  )
}
