import { useMemo } from 'react'
import { moduleIn } from '../../ai/actions'
import { PART_IDS } from '../../content/types'
import { useNow, useStats, useToday } from '../../lib/hooks'
import { planPosition } from '../../lib/plan'
import { partsForSession } from '../../lib/sessionScale'
import { activePlan } from '../../plan/model'
import { draftHasContent } from '../../store/actions'
import { useData } from '../../store/store'

/** Everything the Practice page and an exercise page need about today. */
export function usePractice() {
  const data = useData()
  const today = useToday()
  const plan = useMemo(() => activePlan(data), [data])
  const pos = planPosition(data.settings, today, plan)
  const block = plan.blocks[pos.block - 1]
  const rawParts = block.weekParts[pos.week - 1] ?? block.weekParts[0]
  const draft = data.draft
  const stale = draft && draft.date !== today && draftHasContent(draft) ? draft : null
  const live = draft && draft.date === today ? draft : null
  const active = stale ?? live
  const { parts, lengthMode } = partsForSession(rawParts, data.settings.sessionMinutes, active?.lengthMode ?? data.settings.sessionLength)
  const running = active?.running ?? null
  const now = useNow(!!running, 500)
  const stats = useStats(data, today)
  const moduleId = block.focusId?.startsWith('ai:') && moduleIn(data, block.focusId.slice(3)) ? block.focusId.slice(3) : null
  const doneCount = active ? PART_IDS.filter((p) => active.done[p]).length : 0
  const targetTotal = parts.reduce((s, p) => s + p.minutes[lengthMode], 0)
  return { data, today, plan, pos, block, parts, lengthMode, draft, stale, live, active, running, now, stats, moduleId, doneCount, targetTotal }
}
