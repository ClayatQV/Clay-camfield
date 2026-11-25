import { useState } from 'react'
import type { RecheckScreen } from '../../api/_lib/schemas'
import { moduleIn } from '../ai/actions'
import { getRecheck } from '../ai/client'
import { useAiStatus } from '../ai/hooks'
import { logEvent } from '../lib/events'
import { doneKey, type ActivePlan } from '../plan/model'
import { update, useData } from '../store/store'
import { AnswerInput, aiToUi } from './AnswerInput'
import { Icon } from './Icon'
import { toast } from './Toast'

/**
 * Two questions with right answers when a module ends. The skill map moves
 * only on this kind of proof, never on a self-report.
 */
export function RecheckCard({ plan, block }: { plan: ActivePlan; block: number }) {
  const data = useData()
  const ai = useAiStatus()
  const b = plan.blocks[block - 1]
  const moduleId = b.focusId?.startsWith('ai:') ? b.focusId.slice(3) : null
  const module = moduleId ? moduleIn(data, moduleId) : undefined
  const [screens, setScreens] = useState<RecheckScreen[] | null>(null)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<{ skill: string; question: string; passed: boolean; level: number | null }[]>([])
  const [busy, setBusy] = useState(false)
  const done = data.coach.rechecks.filter((r) => r.moduleId === moduleId)
  if (!module || !moduleId || !ai.configured || !ai.hasPasscode) return null

  async function start() {
    setBusy(true)
    try {
      const res = await getRecheck({
        module: { title: module!.title, concept: `${module!.concept.label}. ${module!.concept.instruction}`, trains: module!.trains, doneWhen: module!.doneWhen },
        skills: (data.ai.result?.skills ?? []).map((s) => ({ skill: s.skill, level: s.level })).slice(0, 30),
        checks: (b.doneWhen ?? []).map((t, k) => ({ text: t, done: !!data.doneWhen[doneKey(plan, block, k)] })),
      })
      if (!res.screens.length) throw new Error('No questions came back.')
      setScreens(res.screens)
      setI(0)
      setAnswers([])
    } catch (e) {
      toast(`Couldn't start the re-check: ${e instanceof Error ? e.message : 'unknown error'}`, 5000)
    } finally {
      setBusy(false)
    }
  }

  function answer(value: unknown) {
    if (!screens) return
    const s = screens[i]
    const passed = s.kind === 'quiz' ? value === s.correct : value === 'yes'
    const next = [...answers, { skill: s.skill, question: s.prompt, passed, level: s.level ?? null }]
    setAnswers(next)
    if (i + 1 < screens.length) {
      setI(i + 1)
      return
    }
    // Apply to the skill map: a pass at level L lifts the skill to at least L; a miss caps it below L (quiz miss caps at 1).
    update((d) => {
      const result = d.ai.result
      const skills = result
        ? result.skills.map((sk) => {
            const hits = next.filter((a) => a.skill.toLowerCase() === sk.skill.toLowerCase())
            if (!hits.length) return sk
            let level = sk.level
            for (const h of hits) {
              const L = h.level ?? 1
              if (h.passed) level = Math.max(level, L)
              else level = Math.min(level, Math.max(0, (h.level ?? 2) - 1))
            }
            return level === sk.level ? sk : { ...sk, level, evidence: `${sk.evidence} Re-check ${new Date().toISOString().slice(0, 10)}: ${hits.map((h) => (h.passed ? 'passed' : 'missed')).join(', ')}.` }
          })
        : []
      return {
        ...d,
        ai: result ? { ...d.ai, result: { ...result, skills } } : d.ai,
        coach: { ...d.coach, rechecks: [...d.coach.rechecks, { at: new Date().toISOString(), moduleId: moduleId!, results: next }] },
      }
    })
    logEvent('recheck', { module: moduleId, passed: next.filter((a) => a.passed).length, of: next.length })
    setScreens(null)
  }

  if (screens) {
    const s = screens[i]
    return (
      <section className="card recheck">
        <span className="eyebrow">
          Re-check · {i + 1} of {screens.length} · {s.skill}
        </span>
        <AnswerInput key={s.id} screen={aiToUi(s)} onAnswer={(_, v) => answer(v)} />
      </section>
    )
  }
  const last = done[done.length - 1]
  return (
    <section className="card recheck">
      <div className="row-between">
        <div>
          <h2>Did it stick?</h2>
          <p className="small muted">Two quick questions with right answers. Your skill map only moves on this kind of proof.</p>
          {last && (
            <p className="small">
              Last re-check {last.at.slice(0, 10)}: {last.results.map((r) => `${r.skill} ${r.passed ? '✓' : '✗'}`).join(' · ')}
            </p>
          )}
        </div>
        <button className="btn primary" onClick={() => void start()} disabled={busy}>
          <Icon name="check" size={16} /> {busy ? 'Writing…' : last ? 'Re-check again' : 'Re-check now'}
        </button>
      </div>
    </section>
  )
}
