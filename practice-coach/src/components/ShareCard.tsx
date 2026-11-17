import type { Session } from '../store/store'
import type { DayKey } from '../lib/dates'
import { buildShareText, copyText, nativeShare, smsLink } from '../lib/share'
import { Icon } from './Icon'
import { toast } from './Toast'

/** Summary of a day's practice with "Share with Dad" (Web Share → sms: → clipboard). */
export function ShareCard({
  sessions,
  streak,
  today,
  phone,
  compact,
}: {
  sessions: Session[]
  streak: number
  today: DayKey
  phone: string
  compact?: boolean
}) {
  const minutes = sessions.reduce((s, x) => s + x.minutes, 0)
  const labels: string[] = []
  for (const s of sessions) for (const l of s.partLabels ?? []) if (!labels.includes(l)) labels.push(l)
  const note = sessions
    .map((s) => s.note)
    .filter(Boolean)
    .join('; ')
  const text = buildShareText({ minutes, labels, note, streak, date: sessions[0].date, today })

  async function share() {
    const r = await nativeShare(text)
    if (r === 'shared' || r === 'cancelled') return
    if (phone.trim()) {
      location.href = smsLink(phone, text)
      return
    }
    toast((await copyText(text)) ? 'Copied — paste it to Dad' : "Couldn't copy. Long-press the text to copy it.", 3200)
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
      <button className="btn primary big block" onClick={share}>
        <Icon name="share" /> Share with Dad
      </button>
      <div className="row">
        <a className="btn sm grow" href={smsLink(phone, text)}>
          <Icon name="message" size={18} /> Text Dad
        </a>
        <button className="btn sm grow" onClick={copy}>
          <Icon name="copy" size={18} /> Copy
        </button>
      </div>
    </section>
  )
}
