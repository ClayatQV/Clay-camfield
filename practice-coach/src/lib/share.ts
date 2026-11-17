import type { DayKey } from './dates'
import { diffDays, weekdayShort } from './dates'

export function buildShareText(opts: {
  minutes: number
  labels: string[]
  note?: string
  streak: number
  date: DayKey
  today: DayKey
}): string {
  const when = opts.date === opts.today ? 'today' : diffDays(opts.date, opts.today) === 1 ? 'yesterday' : `on ${weekdayShort(opts.date)}`
  const items = [...opts.labels]
  if (opts.note?.trim()) items.push(opts.note.trim())
  const body = items.length ? ` ${items.join(', ')}.` : ''
  const streak = opts.streak > 0 ? ` Streak: ${opts.streak} day${opts.streak === 1 ? '' : 's'}.` : ''
  return `Practiced ${opts.minutes} min ${when} ✅${body}${streak}`
}

/** sms: link that works on iOS and Android ("?&body=" is the cross-platform form). */
export function smsLink(phone: string, text: string): string {
  const num = phone.replace(/[^\d+]/g, '')
  return `sms:${num}?&body=${encodeURIComponent(text)}`
}

export type ShareResult = 'shared' | 'cancelled' | 'unsupported'

export async function nativeShare(text: string): Promise<ShareResult> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'unsupported'
  try {
    await navigator.share({ text })
    return 'shared'
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    return 'unsupported'
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older WebViews: hidden textarea + execCommand.
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}
