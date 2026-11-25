import type { AiModule } from '../../api/_lib/schemas'
import type { PlanBlock } from './model'

/**
 * Reconstruct the module behind an AI plan block (plans saved before the plan
 * carried its modules). Enough for genre changes and song rerolls to work.
 */
export function moduleFromBlock(b: PlanBlock): AiModule | null {
  if (!b.focusId?.startsWith('ai:')) return null
  const parts = b.weekParts?.[0]
  if (!parts || parts.length < 4) return null
  const lab = (p: { labLinks?: { labUrl: string }[] }) => p.labLinks?.[0]?.labUrl.replace(/^\/lab\?/, '') ?? null
  const songs = (parts[3].options ?? []).map((o) => {
    const bits = (o.sub ?? '').split(' · ').map((x) => x.trim())
    const artist = bits[0] && !/tabs on screen|find the transcription|learn it by ear/i.test(bits[0]) ? bits[0] : ''
    let title = o.label
    if (artist && title.endsWith(`(${artist})`)) title = title.slice(0, -artist.length - 2).trim()
    return { title, artist, note: null, how: /learn it by ear/i.test(o.sub ?? '') ? ('ear' as const) : ('transcription' as const) }
  })
  return {
    id: b.focusId.slice(3),
    title: b.title,
    weeks: Math.max(1, Math.min(3, b.weeks[1] - b.weeks[0] + 1)),
    why: b.why ?? b.summary,
    towards: b.towards ?? null,
    trains: [],
    emphasis: b.emphasis ?? null,
    listening: b.listening ?? [],
    listen: b.listen ?? [],
    warmups: [
      { label: parts[0].focus, instruction: parts[0].instruction, lab: lab(parts[0]) },
      { label: parts[1].focus, instruction: parts[1].instruction, lab: lab(parts[1]) },
    ],
    concept: { label: parts[2].focus, instruction: parts[2].instruction, lab: lab(parts[2]) },
    application: { instruction: parts[3].instruction, songs },
    doneWhen: b.doneWhen ?? [],
  }
}
