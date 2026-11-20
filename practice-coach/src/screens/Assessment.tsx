import { useEffect } from 'react'
import { answer, back, finishAssessment, startAssessment } from '../assessment/actions'
import { flowState } from '../assessment/engine'
import { SECTION_NAMES } from '../assessment/types'
import { AnswerInput, toUi } from '../components/AnswerInput'
import { Icon } from '../components/Icon'
import { navigate } from '../lib/router'
import { useData } from '../store/store'

/** The 10-minute offline flow. One question per screen; choosing an answer moves on. */
export function Assessment() {
  const data = useData()
  const draft = data.assessment.draft

  useEffect(() => {
    if (!draft) startAssessment()
  }, [draft])

  const answers = draft?.answers ?? {}
  const { current, answered, estimate } = flowState(answers)

  // Finished: score it and show results.
  useEffect(() => {
    if (draft && !current && answered > 0) {
      const r = finishAssessment()
      if (r) navigate(`/assessment/results/${r.id}`, { replace: true })
    }
  }, [draft, current, answered])

  if (!draft || !current) {
    return (
      <div className="assess">
        <div className="assess-body">
          <p className="muted">Building your results…</p>
        </div>
      </div>
    )
  }

  const progress = Math.min(1, answered / estimate)
  const canBack = draft.order.length > 0

  return (
    <div className="assess">
      <header className="assess-top">
        <button className="btn icon ghost" onClick={() => back()} disabled={!canBack} aria-label="Back">
          <Icon name="back" />
        </button>
        <div className="assess-meta">
          <span className="eyebrow">{SECTION_NAMES[current.section]}</span>
          <div className="assess-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ width: `${Math.max(3, progress * 100)}%` }} />
          </div>
        </div>
        <button className="btn icon ghost" onClick={() => navigate('/assessment')} aria-label="Close (your answers are saved)">
          <Icon name="close" />
        </button>
      </header>

      <main className="assess-body" key={current.id}>
        {current.eyebrow && <span className="eyebrow">{current.eyebrow}</span>}
        <h1 className="assess-q">{current.prompt}</h1>
        {current.help && <p className="muted">{current.help}</p>}
        <AnswerInput screen={toUi(current)} prior={answers[current.id]} onAnswer={answer} />
      </main>

      {current.kind !== 'welcome' && (
        <footer className="assess-foot">
          <button className="linklike muted" onClick={() => answer(current.id, null)}>
            Skip
          </button>
          <span className="small muted">
            {answered} answered · about {Math.max(1, Math.round(((estimate - answered) * 5) / 60))} min left
          </span>
        </footer>
      )}
    </div>
  )
}
