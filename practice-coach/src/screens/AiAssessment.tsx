import { useEffect, useRef, useState } from 'react'
import type { AiScreen } from '../../api/_lib/schemas'
import {
  BLOCK_INTRO,
  BLOCK_NAMES,
  BLOCK_ORDER,
  BLOCK_SCREENS,
  acceptSummary,
  answerScreen,
  interviewRequest,
  receiveScreens,
  startInterview,
  undoAnswer,
} from '../ai/actions'
import { AiClientError, nextScreens } from '../ai/client'
import { AnswerInput, aiToUi } from '../components/AnswerInput'
import { Icon } from '../components/Icon'
import { navigate } from '../lib/router'
import { useData } from '../store/store'

/** The AI-run assessment: three blocks, one question per screen, written for this player. */
export function AiAssessment() {
  const data = useData()
  const iv = data.ai.interview
  const [began, setBegan] = useState<string | null>(null) // block id whose intro was dismissed
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null)
  const inFlight = useRef(false)
  const correction = useRef<string | null>(null)

  useEffect(() => {
    if (!iv) startInterview()
  }, [iv])

  useEffect(() => {
    if (iv?.done) navigate('/assessment/ai/results', { replace: true })
  }, [iv?.done])

  const current: AiScreen | null = iv?.queue[0] ?? null
  const needFetch = !!iv && !iv.done && !current && !iv.pendingSummary && began === iv.block && !error

  useEffect(() => {
    if (!needFetch || inFlight.current || !iv) return
    inFlight.current = true
    setLoading(true)
    const corr = correction.current
    correction.current = null
    nextScreens(interviewRequest(iv, corr))
      .then((res) => receiveScreens(res.screens, res.notes, res.blockDone, res.summary))
      .catch((e) => {
        correction.current = corr
        setError({ message: e instanceof Error ? e.message : 'Something went wrong.', retryable: e instanceof AiClientError ? e.retryable || e.status === 0 : true })
      })
      .finally(() => {
        inFlight.current = false
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needFetch, iv?.turns.length, iv?.block, iv?.pendingSummary])

  if (!iv) return null
  const blockIndex = BLOCK_ORDER.indexOf(iv.block)
  const budget = BLOCK_SCREENS[iv.block]
  const progress = Math.min(1, (blockIndex + Math.min(1, iv.blockAsked / budget)) / 3)
  const canBack = iv.turns.length > 0 && !iv.pendingSummary && !loading && iv.turns[iv.turns.length - 1]?.screen.id !== undefined

  const header = (
    <header className="assess-top">
      <button className="btn icon ghost" onClick={() => undoAnswer()} disabled={!canBack} aria-label="Back">
        <Icon name="back" />
      </button>
      <div className="assess-meta">
        <span className="eyebrow">
          Block {blockIndex + 1} of 3 · {BLOCK_NAMES[iv.block]}
        </span>
        <div className="assess-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span style={{ width: `${Math.max(3, progress * 100)}%` }} />
        </div>
      </div>
      <button className="btn icon ghost" onClick={() => navigate('/assessment')} aria-label="Close (your answers are saved)">
        <Icon name="close" />
      </button>
    </header>
  )

  // Block intro
  if (began !== iv.block && !current && !iv.pendingSummary && iv.blockAsked === 0) {
    return (
      <div className="assess">
        {header}
        <main className="assess-body">
          <span className="eyebrow">Block {blockIndex + 1} of 3</span>
          <h1 className="assess-q">{BLOCK_NAMES[iv.block]}</h1>
          <p className="muted">{BLOCK_INTRO[iv.block]}</p>
          {blockIndex === 0 && (
            <ul className="assess-points">
              <li>Specific questions you can answer yes or no. No rating yourself.</li>
              <li>It adapts: nothing too easy or too hard for you.</li>
              <li>A few quick checks have a right answer. Guess if you don't know.</li>
              <li>Everything saves as you go. Close any time and pick up later.</li>
            </ul>
          )}
          <button className="btn primary big block" onClick={() => setBegan(iv.block)}>
            {blockIndex === 0 ? 'Begin' : 'Continue'}
          </button>
        </main>
      </div>
    )
  }

  if (iv.pendingSummary) {
    return (
      <div className="assess">
        {header}
        <Summary
          text={iv.pendingSummary}
          last={blockIndex === BLOCK_ORDER.length - 1}
          onAccept={(corr) => {
            correction.current = corr
            acceptSummary(corr)
            setBegan(null)
          }}
        />
      </div>
    )
  }

  if (!current) {
    return (
      <div className="assess">
        {header}
        <main className="assess-body">
          {error ? (
            <div className="card" style={{ borderColor: 'var(--red)' }}>
              <strong>Couldn't get the next question.</strong>
              <p className="small muted">{error.message}</p>
              <div className="row">
                <button className="btn primary grow" onClick={() => setError(null)}>
                  Try again
                </button>
                <button className="btn grow" onClick={() => navigate('/assessment')}>
                  Pause for now
                </button>
              </div>
            </div>
          ) : (
            <div className="ai-thinking" aria-live="polite">
              <span className="ai-dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <p className="muted">{iv.turns.length === 0 ? 'Getting your first questions ready…' : 'Thinking about your next question…'}</p>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="assess">
      {header}
      <main className="assess-body" key={current.id}>
        {current.eyebrow && <span className="eyebrow">{current.eyebrow}</span>}
        <h1 className="assess-q">{current.prompt}</h1>
        {current.help && <p className="muted">{current.help}</p>}
        <AnswerInput screen={aiToUi(current)} onAnswer={(_, v) => answerScreen(current, v)} />
      </main>
      <footer className="assess-foot">
        <button className="linklike muted" onClick={() => answerScreen(current, null)}>
          Skip
        </button>
        <span className="small muted">
          {iv.blockAsked} of about {budget} in this block
        </span>
      </footer>
    </div>
  )
}

function Summary({ text, last, onAccept }: { text: string; last: boolean; onAccept: (correction: string | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [corr, setCorr] = useState('')
  return (
    <main className="assess-body">
      <span className="eyebrow">Here's what I heard</span>
      <blockquote className="vision-quote">{text}</blockquote>
      {!editing ? (
        <div className="stack-sm">
          <button className="btn primary big block" onClick={() => onAccept(null)}>
            Looks right{last ? ' — see my results' : ' — next block'}
          </button>
          <button className="btn block ghost" onClick={() => setEditing(true)}>
            Correct something
          </button>
        </div>
      ) : (
        <div className="stack-sm">
          <textarea className="input longtext" rows={4} autoFocus placeholder="What did I get wrong? e.g. I can play drop 2 voicings at tempo, I just don't use them when I solo." value={corr} onChange={(e) => setCorr(e.target.value)} />
          <div className="row">
            <button className="btn grow" onClick={() => setEditing(false)}>
              Back
            </button>
            <button className="btn primary grow" disabled={!corr.trim()} onClick={() => onAccept(corr.trim())}>
              Save correction{last ? ' — see results' : ' — next block'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
