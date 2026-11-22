/**
 * AI-written modules → the plan shape the app runs (same as a generated plan),
 * so Practice, Plan and Home need no AI-specific code.
 */
import type { AiModule, AiResult } from '../../api/_lib/schemas'
import { findTranscription } from '../../api/_lib/transcriptions'
import { LESSONS } from '../content/lessons'
import type { Vision } from '../assessment/scoring'
import type { BlockWeek, PartOption, SessionPart } from '../content/types'
import type { GeneratedPlan, Milestone, PlanBlock } from './model'

/** Part lengths as a share of the session: two short warm-ups, the idea, about half on a song. */
const RATIO = { triads: 0.16, arps: 0.16, concept: 0.2, application: 0.48 } as const
type Mins = { 30: number; 60: number }
/** The `60` key is the plan's FULL session (whatever the player chose on the Build page); `30` is a short day, about half. */
function minsFor(part: keyof typeof RATIO, sessionMinutes: number): Mins {
  const full = Math.max(10, sessionMinutes)
  const short = Math.max(5, Math.round(full / 2))
  return { 30: Math.max(1, Math.round(short * RATIO[part])), 60: Math.max(1, Math.round(full * RATIO[part])) }
}

const search = (title: string, artist: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist} guitar transcription tab`.trim())}`
const earPage = (title: string, artist: string) => `#/ear?${new URLSearchParams({ title, artist }).toString()}`

/** Where a module song sends the player: the lesson (tabs on screen, looper) when the library has it; the record for by-ear pieces; else a transcription search. */
export function songLink(s: { title: string; artist: string; how?: 'transcription' | 'ear' | null }): { url: string; via: 'lesson' | 'ear' | 'search' } {
  const t = findTranscription(s.title, s.artist)
  const lesson = t && LESSONS.find((l) => l.id === t.id || l.youtubeId === t.youtubeId)
  if (lesson) return { url: `#/lessons/${lesson.id}`, via: 'lesson' }
  if (s.how === 'ear') return { url: earPage(s.title, s.artist), via: 'ear' }
  return { url: search(s.title, s.artist), via: 'search' }
}

const labUrl = (q: string | null) => (q ? '/lab?' + q : null)

export function visionFromAi(r: AiResult): Vision {
  return {
    statement: r.vision.statement,
    where: r.vision.where,
    pieces: r.vision.pieces.map((p) => ({ text: p.artist ? `${p.title} — ${p.artist}` : p.title, elements: p.missing.slice(0, 4) })),
    wants: r.vision.wants,
  }
}

export function planFromModules(result: AiResult, modules: AiModule[], now = new Date(), sessionMinutes = 30): GeneratedPlan {
  const MIN = {
    triads: minsFor('triads', sessionMinutes),
    arps: minsFor('arps', sessionMinutes),
    concept: minsFor('concept', sessionMinutes),
    application: minsFor('application', sessionMinutes),
  }
  const pieceTitles = result.vision.pieces.map((p) => p.title.toLowerCase())
  const blocks: PlanBlock[] = []
  let gw = 1
  modules.forEach((m, bi) => {
    const weekParts: SessionPart[][] = []
    const table: BlockWeek[] = []
    const [w0, w1] = m.warmups
    for (let w = 1; w <= m.weeks; w++, gw++) {
      const chords: SessionPart = {
        id: 'triads',
        title: 'Warm-up 1',
        shareLabel: w0.label,
        focus: w0.label,
        instruction: w0.instruction,
        minutes: MIN.triads,
        labLinks: labUrl(w0.lab) ? [{ label: w0.label, labUrl: labUrl(w0.lab)! }] : [],
        why: 'A fundamental you need, kept short.',
      }
      const arps: SessionPart = {
        id: 'arps',
        title: 'Warm-up 2',
        shareLabel: w1.label,
        focus: w1.label,
        instruction: w1.instruction,
        minutes: MIN.arps,
        labLinks: labUrl(w1.lab) ? [{ label: w1.label, labUrl: labUrl(w1.lab)! }] : [],
        why: 'A fundamental you need, kept short.',
      }
      const concept: SessionPart = {
        id: 'concept',
        title: 'Concept',
        shareLabel: m.concept.label,
        focus: m.concept.label,
        instruction: m.concept.instruction,
        minutes: MIN.concept,
        labLinks: labUrl(m.concept.lab) ? [{ label: m.concept.label, labUrl: labUrl(m.concept.lab)! }] : [],
        why: m.why,
      }
      // Rotate which song leads each week so the choice stays fresh.
      const songs = m.application.songs
      const rot = (w - 1) % Math.max(1, songs.length)
      const ordered = [...songs.slice(rot), ...songs.slice(0, rot)]
      const dupTitles = new Set(songs.map((s) => s.title.toLowerCase()).filter((t, i, a) => a.indexOf(t) !== i))
      const options: PartOption[] = ordered.map((s) => {
        const link = songLink(s)
        const via = link.via === 'lesson' ? 'tabs on screen · looper' : link.via === 'ear' ? 'learn it by ear · guide + looper' : null
        return {
          // Same title by two artists in one module (three "Amazing Grace"s): keep the labels distinct.
          label: dupTitles.has(s.title.toLowerCase()) && s.artist ? `${s.title} (${s.artist})` : s.title,
          sub: [s.artist, via, s.note].filter(Boolean).join(' · ') || undefined,
          url: link.url,
          kind: pieceTitles.includes(s.title.toLowerCase()) ? 'goal' : s.note?.toLowerCase().includes('discover') ? 'discover' : 'song',
        }
      })
      const app: SessionPart = {
        id: 'application',
        title: 'Application',
        shareLabel: options[0]?.label ?? m.title,
        focus: m.towards ? `Work on “${m.towards}”, or pick another song` : 'Pick one song and learn it from a transcription',
        instruction: m.application.instruction,
        minutes: MIN.application,
        options,
        why: m.towards ? 'This is the music you said you want to play.' : 'Real music, so the idea sticks.',
      }
      weekParts.push([chords, arps, concept, app])
      table.push({ week: w, triads: w0.label, arps: w1.label, concept: m.concept.label, application: options.map((o) => o.label).join(' · ') })
    }
    blocks.push({
      n: bi + 1,
      title: m.title,
      summary: m.why,
      weeks: [gw - m.weeks, gw - 1],
      focusId: `ai:${m.id}`,
      towards: m.towards ?? undefined,
      why: m.why,
      emphasis: m.emphasis ?? undefined,
      listening: m.listening?.length ? m.listening : undefined,
      listen: m.listen?.length ? m.listen : undefined,
      daily: [
        { part: 'triads', m30: MIN.triads[30], m60: MIN.triads[60], what: w0.label },
        { part: 'arps', m30: MIN.arps[30], m60: MIN.arps[60], what: w1.label },
        { part: 'concept', m30: MIN.concept[30], m60: MIN.concept[60], what: m.concept.label },
        { part: 'application', m30: MIN.application[30], m60: MIN.application[60], what: m.towards ? `“${m.towards}” or a song from your genres` : 'A song from your genres' },
      ],
      table,
      doneWhen: m.doneWhen,
      tune: m.towards ? { title: m.towards, artist: result.vision.pieces.find((p) => p.title === m.towards)?.artist ?? '' } : undefined,
      weekParts,
      detailed: true,
    })
  })
  const milestones: Milestone[] = result.vision.pieces.map((p) => ({
    piece: p.artist ? `${p.title} — ${p.artist}` : p.title,
    blocks: blocks.filter((b) => b.towards === p.title).map((b) => b.n),
  }))
  return {
    id: `ai-${now.getTime().toString(36)}`,
    createdAt: now.toISOString(),
    source: 'assessment',
    resultId: `ai-result`,
    title: `${blocks.length} modules toward your vision`,
    summary: `Built with your AI coach from your assessment: ${result.profile.type}.`,
    blocks,
    vision: visionFromAi(result),
    milestones,
    rejected: [],
  }
}
