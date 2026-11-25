/**
 * The weekly coach review: build the evidence from the logs, ask the coach,
 * keep its note and proposals, apply what the player accepts. Everything the
 * coach sees is a summary built here; the raw activity log stays on the device.
 */
import type { Proposal } from '../../api/_lib/schemas'
import { activityText } from '../lib/events'
import { addDays, type DayKey } from '../lib/dates'
import { planPosition } from '../lib/plan'
import { activePlan, doneKey } from '../plan/model'
import { getData, update, updateSettings, type AppData, type CoachReview } from '../store/store'
import { moduleIn, setModuleGenre, updateModule } from './actions'
import { getReview } from './client'

const DAYS_BACK = 14

export function buildReviewRequest(data: AppData, today: DayKey) {
  const plan = activePlan(data)
  const pos = planPosition(data.settings, today, plan)
  const block = plan.blocks[pos.block - 1]
  const module = block.focusId?.startsWith('ai:') ? moduleIn(data, block.focusId.slice(3)) : undefined
  const next = plan.blocks[pos.block]
  const from = addDays(today, -DAYS_BACK)

  const planText = [
    `Plan: ${plan.title}. Week ${pos.week} of block ${pos.block} (${block.title}), block weeks ${block.weeks[0]}–${block.weeks[1]} of ${plan.totalWeeks}.`,
    module
      ? `Current module id=${module.id}: emphasis ${module.emphasis ?? '(none)'}; warm-ups: ${module.warmups.map((w) => `"${w.label}"`).join(', ')}; concept: "${module.concept.label}"; songs: ${module.application.songs.map((s) => s.title).join(', ')}; done when: ${module.doneWhen.join(' / ')}`
      : `Current block parts: ${(block.weekParts[pos.week - 1] ?? block.weekParts[0]).map((p) => `"${p.shareLabel}" (${p.minutes[60]} min)`).join(', ')}`,
    next ? `Next: ${next.title}.` : 'This is the last block.',
    `Session length setting: ${data.settings.sessionMinutes ?? 'plan default'} min.`,
  ].join('\n')

  const sessions = data.sessions.filter((s) => s.date >= from)
  const sessionsText = sessions.length
    ? sessions
        .map((s) => {
          const parts = s.partDetails?.length
            ? s.partDetails.map((d) => `${d.label} ${d.minutes}m${d.tempo ? `@${d.tempo}bpm` : ''}`).join('; ')
            : (s.partLabels ?? []).join('; ')
          return `${s.date}: ${s.minutes} min · ${parts || '(no part detail)'}${s.note ? ` · note: "${s.note}"` : ''}`
        })
        .join('\n')
    : `(no sessions logged in the last ${DAYS_BACK} days)`

  const recheckText = data.coach.rechecks
    .slice(-4)
    .map((r) => `${r.at.slice(0, 10)} re-check (module ${r.moduleId}): ${r.results.map((x) => `${x.skill}: ${x.passed ? 'passed' : 'missed'}${x.level ? ` (level ${x.level})` : ''}`).join('; ')}`)
    .join('\n')
  const checksText = [block.doneWhen?.length ? block.doneWhen.map((t, i) => `${data.doneWhen[doneKey(plan, pos.block, i)] ? '[x]' : '[ ]'} ${t}`).join('\n') : '', recheckText].filter(Boolean).join('\n') || null

  const decisions = data.coach.reviews
    .slice(-3)
    .flatMap((r) => r.proposals.map((p) => `${r.at.slice(0, 10)}: "${p.title}" → ${p.status}`))
    .join('\n')

  const profile = data.ai.result ? `${data.ai.result.profile.type}. Gaps: ${data.ai.result.gaps.map((g) => g.skill).join(', ')}.` : null

  return {
    plan: planText,
    sessions: sessionsText,
    activity: activityText(data, from),
    checks: checksText,
    memory: data.coach.memory,
    decisions: decisions || null,
    profile,
    today,
  }
}

/** Enough new evidence since the last review to be worth asking? */
export function reviewDue(data: AppData, today: DayKey): boolean {
  const last = data.coach.lastReviewAt?.slice(0, 10) as DayKey | undefined
  const since = data.sessions.filter((s) => !last || s.date > last).length
  const daysSince = last ? Math.round((Date.parse(today) - Date.parse(last)) / 86400e3) : 99
  return since >= 3 && daysSince >= 6
}

export async function runReview(today: DayKey): Promise<CoachReview> {
  const data = getData()
  const req = buildReviewRequest(data, today)
  const out = await getReview(req)
  const review: CoachReview = {
    id: `rv-${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    note: out.note,
    proposals: out.proposals.map((p) => ({ ...p, status: p.kind === 'note' ? 'accepted' : 'open' })),
  }
  update((d) => ({ ...d, coach: { ...d.coach, memory: out.memory || d.coach.memory, lastReviewAt: review.at, reviews: [...d.coach.reviews.slice(-11), review] } }))
  return review
}

function setStatus(reviewId: string, proposalId: string, status: 'accepted' | 'vetoed') {
  update((d) => ({
    ...d,
    coach: { ...d.coach, reviews: d.coach.reviews.map((r) => (r.id === reviewId ? { ...r, proposals: r.proposals.map((p) => (p.id === proposalId ? { ...p, status } : p)) } : r)) },
  }))
}

export function vetoProposal(reviewId: string, proposalId: string) {
  setStatus(reviewId, proposalId, 'vetoed')
}

/** Apply one accepted proposal. Returns what was done, for the toast. */
export async function acceptProposal(reviewId: string, p: Proposal, today: DayKey): Promise<string> {
  const data = getData()
  const c = p.change
  let done = 'Noted'
  switch (p.kind) {
    case 'tempo': {
      if (c.label && c.bpm) {
        update((d) => ({ ...d, coach: { ...d.coach, tempoTargets: { ...d.coach.tempoTargets, [c.label!.trim().toLowerCase()]: c.bpm! } } }))
        done = `Target for ${c.label}: ${c.bpm} bpm`
      }
      break
    }
    case 'extend': {
      const m = c.moduleId ? moduleIn(data, c.moduleId) : undefined
      if (m && c.weeks) {
        updateModule(m.id, { weeks: Math.max(1, Math.min(3, c.weeks)) })
        done = `${m.title}: now ${c.weeks} week${c.weeks === 1 ? '' : 's'}`
      }
      break
    }
    case 'advance': {
      const plan = activePlan(data)
      const pos = planPosition(data.settings, today, plan)
      if (pos.block < plan.blocks.length) {
        updateSettings({ override: { block: pos.block + 1, week: 1 } })
        done = `Moved on to block ${pos.block + 1}`
      }
      break
    }
    case 'swap_warmup': {
      const m = c.moduleId ? moduleIn(data, c.moduleId) : undefined
      if (m && c.warmup) {
        const i = Math.max(0, m.warmups.findIndex((w) => c.label && w.label.toLowerCase() === c.label.toLowerCase()))
        const warmups = m.warmups.map((w, k) => (k === i ? { label: c.warmup!.label, instruction: c.warmup!.instruction, lab: c.warmup!.lab } : w))
        updateModule(m.id, { warmups })
        done = `Warm-up swapped: ${c.warmup.label}`
      }
      break
    }
    case 'emphasis': {
      const m = c.moduleId ? moduleIn(data, c.moduleId) : undefined
      if (m && c.genre) {
        await setModuleGenre(m.id, c.genre)
        done = `Songs now in ${c.genre}`
      }
      break
    }
    case 'session_length': {
      if (c.minutes) {
        updateSettings({ sessionMinutes: c.minutes })
        done = `Session length: ${c.minutes} min`
      }
      break
    }
    case 'note':
      break
  }
  setStatus(reviewId, p.id, 'accepted')
  return done
}

/** The coach's tempo target for an exercise, if it set one. */
export function tempoTarget(data: Pick<AppData, 'coach'>, label: string): number | null {
  return data.coach.tempoTargets[label.trim().toLowerCase()] ?? null
}
