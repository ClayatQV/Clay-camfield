import { dismissAssessmentPrompt, startAssessment } from '../assessment/actions'
import { flowState } from '../assessment/engine'
import { formatShort, toKey } from '../lib/dates'
import { href, navigate } from '../lib/router'
import { useData } from '../store/store'

/** Entry point to the assessment: start, resume, or see results / retake. */
export function AssessmentCard({ dismissible }: { dismissible?: boolean }) {
  const data = useData()
  const { draft, results, dismissedPrompt } = data.assessment
  const last = results[results.length - 1]
  const ai = data.ai
  if (ai.interview && !ai.interview.done) {
    return (
      <section className="card assess-card">
        <span className="eyebrow">AI coach assessment</span>
        <h2>Pick up where you left off</h2>
        <a className="btn primary block" href={href('/assessment/ai')}>
          Resume
        </a>
      </section>
    )
  }
  if (ai.result) {
    if (dismissible) return null
    return (
      <section className="card">
        <span className="eyebrow">AI coach assessment{ai.resultAt ? ` · ${formatShort(toKey(new Date(ai.resultAt)))}` : ''}</span>
        <h2>{ai.result.profile.type}</h2>
        <div className="row">
          <a className="btn grow" href={href('/assessment/ai/results')}>
            See results
          </a>
          <a className="btn grow" href={href('/assessment/build')}>
            Build plan
          </a>
          <a className="btn grow ghost" href={href('/assessment')}>
            Retake
          </a>
        </div>
      </section>
    )
  }
  if (dismissible && (last || dismissedPrompt) && !draft) return null

  if (draft && draft.order.length > 0) {
    const { answered, estimate } = flowState(draft.answers)
    return (
      <section className="card assess-card">
        <span className="eyebrow">Player assessment</span>
        <h2>Pick up where you left off</h2>
        <p className="small muted">
          {answered} answered · about {Math.max(1, Math.round(((estimate - answered) * 5) / 60))} min left
        </p>
        <a className="btn primary block" href={href('/assessment/tap')}>
          Resume
        </a>
      </section>
    )
  }
  if (last) {
    return (
      <section className="card">
        <span className="eyebrow">Player assessment · {formatShort(toKey(new Date(last.takenAt)))}</span>
        <h2>{last.playerType}</h2>
        <div className="row">
          <a className="btn grow" href={href(`/assessment/results/${last.id}`)}>
            See results
          </a>
          <button
            className="btn grow"
            onClick={() => {
              startAssessment(true)
              navigate('/assessment/tap')
            }}
          >
            Retake
          </button>
        </div>
      </section>
    )
  }
  return (
    <section className="card assess-card">
      <span className="eyebrow">Player assessment · about 10 min</span>
      <h2>Let the app get to know you</h2>
      <p className="small">Quick taps about your genres, players, skills and goals. Your plan gets rebuilt around the answers.</p>
      <div className="row">
        {dismissible && (
          <button className="btn grow ghost" onClick={() => dismissAssessmentPrompt()}>
            Not now
          </button>
        )}
        <a className="btn primary grow" href={href('/assessment')}>
          Start
        </a>
      </div>
    </section>
  )
}
