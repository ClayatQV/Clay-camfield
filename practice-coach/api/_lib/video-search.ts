/**
 * In-app video search, so the player never has to leave for YouTube.
 * With YOUTUBE_API_KEY set it uses the YouTube Data API; without one it reads
 * the public results page (the same list a browser gets) and parses the
 * embedded JSON. Results are scored for "transcription with tabs on screen"
 * by title, which is a hint, not a verdict: the player confirms by watching.
 */
import type { VideoHit } from './schemas.js'
export type { VideoHit }

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

/** Pull every videoRenderer out of the results page's ytInitialData. Exported for tests. */
export function parseResultsPage(html: string): Omit<VideoHit, 'score' | 'hint'>[] {
  const m = html.match(/ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s) ?? html.match(/ytInitialData"\]\s*=\s*(\{.*?\});/s)
  if (!m) return []
  let data: unknown
  try {
    data = JSON.parse(m[1])
  } catch {
    return []
  }
  const out: Omit<VideoHit, 'score' | 'hint'>[] = []
  const seen = new Set<string>()
  const text = (o: unknown): string => {
    if (!o || typeof o !== 'object') return ''
    const r = o as { simpleText?: string; runs?: { text?: string }[] }
    if (typeof r.simpleText === 'string') return r.simpleText
    if (Array.isArray(r.runs)) return r.runs.map((x) => x.text ?? '').join('')
    return ''
  }
  const walk = (o: unknown) => {
    if (Array.isArray(o)) {
      for (const v of o) walk(v)
      return
    }
    if (!o || typeof o !== 'object') return
    const rec = o as Record<string, unknown>
    const vr = rec.videoRenderer as Record<string, unknown> | undefined
    if (vr && typeof vr.videoId === 'string' && !seen.has(vr.videoId)) {
      seen.add(vr.videoId)
      out.push({ id: vr.videoId, title: text(vr.title), channel: text(vr.ownerText) || text(vr.shortBylineText), length: text(vr.lengthText) || null })
    }
    for (const v of Object.values(rec)) walk(v)
  }
  walk(data)
  return out
}

const lengthMinutes = (len: string | null): number | null => {
  if (!len) return null
  const parts = len.split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return null
  return parts.length === 3 ? parts[0] * 60 + parts[1] + parts[2] / 60 : parts.length === 2 ? parts[0] + parts[1] / 60 : parts[0] / 60
}

/** Title-based score for "this is a transcription with tabs or notation on screen". */
export function scoreHit(h: Omit<VideoHit, 'score' | 'hint'>): { score: number; hint: string | null } {
  const t = h.title.toLowerCase()
  const c = h.channel.toLowerCase()
  let score = 0
  const tabs = /\b(tabs?|tablature|w\/ ?tab)\b/.test(t)
  const trans = /\b(transcription|transcribed|transcript)\b/.test(t) || /transcription/.test(c)
  const notation = /\b(notation|sheet music|score|standard notation)\b/.test(t) || /scores?\b/.test(c)
  if (tabs) score += 3
  if (trans) score += 3
  if (notation) score += 2
  if (/\bnote[- ]for[- ]note\b/.test(t)) score += 1
  if (/\bsolo\b/.test(t)) score += 1
  if (/\b(lesson|tutorial|how to|breakdown|explained)\b/.test(t)) score -= tabs ? 0 : 2
  if (/\b(backing track|karaoke|reaction|cover|live stream|playthrough|jam track|instrumental version|lyrics)\b/.test(t)) score -= 3
  if (/\b(official (video|audio|music video)|remaster)\b/.test(t)) score -= 2
  const mins = lengthMinutes(h.length)
  if (mins !== null && mins > 25) score -= 1
  let hint: string | null = null
  if (tabs && trans) hint = 'Transcription with tabs in the title'
  else if (tabs) hint = 'Tabs in the title'
  else if (trans || notation) hint = 'Transcription or notation in the title'
  else if (/\b(lesson|tutorial|how to)\b/.test(t)) hint = 'A lesson, not a transcription'
  else if (/\b(official|audio|remaster)\b/.test(t)) hint = 'Probably the original recording'
  return { score, hint }
}

async function fetchText(url: string, headers: Record<string, string>): Promise<string> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 15000)
  try {
    const res = await fetch(url, { headers, signal: ctl.signal, redirect: 'follow' })
    if (!res.ok) throw new Error(`fetch ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function viaDataApi(q: string, key: string): Promise<Omit<VideoHit, 'score' | 'hint'>[]> {
  const u = new URL('https://www.googleapis.com/youtube/v3/search')
  u.searchParams.set('part', 'snippet')
  u.searchParams.set('type', 'video')
  u.searchParams.set('maxResults', '15')
  u.searchParams.set('videoEmbeddable', 'true')
  u.searchParams.set('q', q)
  u.searchParams.set('key', key)
  const json = JSON.parse(await fetchText(u.toString(), { accept: 'application/json' })) as { items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }[] }
  return (json.items ?? [])
    .filter((i) => i.id?.videoId)
    .map((i) => ({ id: i.id!.videoId!, title: decodeEntities(i.snippet?.title ?? ''), channel: i.snippet?.channelTitle ?? '', length: null }))
}

async function viaResultsPage(q: string): Promise<Omit<VideoHit, 'score' | 'hint'>[]> {
  const html = await fetchText(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en`, {
    'user-agent': UA,
    'accept-language': 'en-US,en;q=0.9',
    accept: 'text/html',
    cookie: 'CONSENT=YES+1; PREF=hl=en',
  })
  return parseResultsPage(html)
}

const decodeEntities = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

export async function searchVideos(q: string, exclude: string[] = []): Promise<{ results: VideoHit[]; source: 'api' | 'page' }> {
  const key = process.env.YOUTUBE_API_KEY
  let raw: Omit<VideoHit, 'score' | 'hint'>[] = []
  let source: 'api' | 'page' = 'page'
  if (key) {
    try {
      raw = await viaDataApi(q, key)
      source = 'api'
    } catch {
      raw = []
    }
  }
  if (!raw.length) raw = await viaResultsPage(q)
  const ex = new Set(exclude)
  const results = raw
    .filter((h) => !ex.has(h.id))
    .map((h) => ({ ...h, ...scoreHit(h) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
  return { results, source }
}
