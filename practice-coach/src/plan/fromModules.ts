/**
 * AI-written modules → the plan shape the app runs (same as a generated plan),
 * so Practice, Plan and Home need no AI-specific code.
 */
import type { AiModule, AiResult } from '../../api/_lib/schemas'
import type { Vision } from '../assessment/scoring'
import type { BlockWeek, PartOption, SessionPart } from '../content/types'
import type { GeneratedPlan, Milestone, PlanBlock } from './model'

const MIN = {
  triads: { 30: 5, 60: 8 },
  arps: { 30: 5, 60: 8 },
  concept: { 30: 5, 60: 14 },
  application: { 30: 15, 60: 30 },
} as const

const search = (title: string, artist: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist} guitar transcription tab`.trim())}`

const labUrl = (q: string | null) => (q ? '/lab?' + q : null)

export function visionFromAi(r: AiResult): Vision {
  return {
    statement: r.vision.statement,
    where: r.vision.where,
    pieces: r.vision.pieces.map((p) => ({ text: p.artist ? `${p.title} — ${p.artist}` : p.title, elements: p.missing.slice(0, 4) })),
    wants: r.vision.wants,
  }
}

export function planFromModules(result: AiResult, modules: AiModule[], now = new Date()): GeneratedPlan {
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
      const options: PartOption[] = ordered.map((s) => ({
        label: s.title,
        sub: [s.artist, s.note].filter(Boolean).join(' · ') || undefined,
        url: search(s.title, s.artist),
        kind: pieceTitles.includes(s.title.toLowerCase()) ? 'goal' : s.note?.toLowerCase().includes('discover') ? 'discover' : 'song',
      }))
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
