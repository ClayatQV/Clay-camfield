/**
 * The active plan, in one shape whether it's Clay's original hand-built plan
 * or one generated from an assessment. Everything is plain JSON so a
 * generated plan can be stored, exported and (later) written by AI.
 */
import { BLOCKS } from '../content/blocks'
import type { BlockWeek, PartId, SessionPart } from '../content/types'
import { sessionParts } from '../lib/session'
import type { Vision } from '../assessment/scoring'

export type PlanBlock = {
  n: number
  title: string
  summary: string
  /** plan weeks covered, inclusive (1-based) */
  weeks: [number, number]
  focusId?: string
  daily?: { part: PartId; m30: number; m60: number; what: string }[]
  table?: BlockWeek[]
  doneWhen?: string[]
  tune?: { title: string; artist: string }
  notes?: string[]
  /** [week-in-block][part] */
  weekParts: SessionPart[][]
  /** false = no week-by-week detail written (generic warm-ups + focus) */
  detailed: boolean
  /** the signature piece this block works toward */
  towards?: string
  /** one line: why this block, in terms of the player's vision */
  why?: string
}

export type Milestone = { piece: string; blocks: number[] }

export type GeneratedPlan = {
  id: string
  createdAt: string
  source: 'assessment'
  resultId: string
  title: string
  summary: string
  blocks: PlanBlock[]
  vision?: Vision
  milestones?: Milestone[]
  /** focus ids the player swapped out ("not feeling this block") */
  rejected?: string[]
}

export type ActivePlan = {
  id: string
  source: 'original' | 'assessment'
  title: string
  summary: string
  createdAt?: string
  blocks: PlanBlock[]
  totalWeeks: number
  vision?: Vision
  milestones?: Milestone[]
}

let original: ActivePlan | null = null

/** Clay's hand-built 26-week plan, materialized into the shared shape. */
export function originalPlan(): ActivePlan {
  if (original) return original
  const blocks: PlanBlock[] = BLOCKS.map((b) => {
    const len = b.weeks[1] - b.weeks[0] + 1
    const weekParts = Array.from({ length: len }, (_, i) => sessionParts(b.n, i + 1).parts)
    return {
      n: b.n,
      title: b.title,
      summary: b.summary,
      weeks: b.weeks,
      daily: b.detail?.daily,
      table: b.detail?.table,
      doneWhen: b.detail?.doneWhen,
      tune: b.detail?.tune,
      notes: b.detail?.notes,
      weekParts,
      detailed: !!b.detail,
    }
  })
  original = {
    id: 'original',
    source: 'original',
    title: 'Six months, nine blocks',
    summary: 'Clay’s original hand-built plan.',
    blocks,
    totalWeeks: blocks[blocks.length - 1].weeks[1],
  }
  return original
}

export function activePlan(data: { plan: GeneratedPlan | null }): ActivePlan {
  const g = data.plan
  if (!g || !g.blocks.length) return originalPlan()
  return {
    id: g.id,
    source: 'assessment',
    title: g.title,
    summary: g.summary,
    createdAt: g.createdAt,
    blocks: g.blocks,
    totalWeeks: g.blocks[g.blocks.length - 1].weeks[1],
    vision: g.vision,
    milestones: g.milestones,
  }
}

/** Storage key for a "done when" check. The original plan keeps its old keys. */
export function doneKey(plan: ActivePlan, block: number, i: number): string {
  return plan.source === 'original' ? `b${block}:${i}` : `${plan.id}:b${block}:${i}`
}

export const blockLen = (b: PlanBlock) => b.weeks[1] - b.weeks[0] + 1
