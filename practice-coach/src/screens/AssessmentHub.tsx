import { useState } from 'react'
import { BLOCK_NAMES, BLOCK_ORDER, setPasscode, startInterview } from '../ai/actions'
import { verifyPasscode } from '../ai/client'
import { useAiStatus } from '../ai/hooks'
import { flowState } from '../assessment/engine'
import { startAssessment } from '../assessment/actions'
import { Icon } from '../components/Icon'
import { toast } from '../components/Toast'
import { formatShort, toKey } from '../lib/dates'
import { href, navigate } from '../lib/router'
import { useData } from '../store/store'

/** The assessment home: the AI coach (5–7 min, three blocks) and the quick tap version. */
export function AssessmentHub() {
  const data = useData()
  const st = useAiStatus()
  const iv = data.ai.interview
  const result = data.ai.result

  return (
    <div className="screen">
      <div className="screen-head">
        <span className="eyebrow">Assessment</span>
        <h1>Let the app get to know you</h1>
        <p className="muted small">
          Three short blocks: your skills, your taste and genres, then your vision. About 5–7 minutes of quick taps. Then you see your results and build your practice plan.
        </p>
      </div>

      <section className="card assess-card">
        <div className="row-between">
          <h2>AI coach assessment</h2>
          <span className="pill">5–7 min</span>
        </div>
        <ol className="block-steps">
          {BLOCK_ORDER.map((b, i) => {
            const done = iv ? (iv.done || BLOCK_ORDER.indexOf(iv.block) > i) && !!iv.summaries[b] : !!result
            const now = iv && !iv.done && iv.block === b
            return (
              <li key={b} className={done ? 'done' : now ? 'now' : ''}>
                <span className="step-num">{done ? <Icon name="check" size={14} /> : i + 1}</span>
                <span>{BLOCK_NAMES[b]}</span>
              </li>
            )
          })}
        </ol>

        {st.loading ? (
          <p className="small muted">Checking the coach…</p>
        ) : !st.server ? (
          <p className="small muted">The AI coach runs on the Vercel version of this app, not on this address. Open the app from its Vercel link to use it.</p>
        ) : !st.configured ? (
          <p className="small muted">The AI coach isn't set up on the server yet (API key or passcode missing). The quick tap version below works in the meantime.</p>
        ) : !st.hasPasscode ? (
          <PasscodeEntry />
        ) : (
          <div className="stack-sm">
            {result && !iv && (
              <>
                <p className="small">
                  <strong>{result.profile.type}</strong>
                  {data.ai.resultAt ? ` · ${formatShort(toKey(new Date(data.ai.resultAt)))}` : ''}
                </p>
                <div className="row">
                  <a className="btn grow" href={href('/assessment/ai/results')}>
                    See results
                  </a>
                  <a className="btn primary grow" href={href('/assessment/build')}>
                    Build my plan
                  </a>
                </div>
              </>
            )}
            {iv && !iv.done && (
              <div className="row">
                <button
                  className="btn primary grow big"
                  onClick={() => navigate('/assessment/ai')}
                >
                  Resume · {BLOCK_NAMES[iv.block]}
                </button>
              </div>
            )}
            {iv && iv.done && !result && (
              <a className="btn primary grow big" href={href('/assessment/ai/results')}>
                See my results
              </a>
            )}
            <div className="row">
              {!iv && !result && (
                <button
                  className="btn primary grow big"
                  onClick={() => {
                    startInterview(true)
                    navigate('/assessment/ai')
                  }}
                >
                  <Icon name="play" /> Start
                </button>
              )}
              {(iv || result) && (
                <button
                  className="btn sm ghost"
                  onClick={() => {
                    if (confirm('Start the assessment over? Your current answers will be cleared.')) {
                      startInterview(true)
                      navigate('/assessment/ai')
                    }
                  }}
                >
                  Start over
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <TapCard />
    </div>
  )
}

function PasscodeEntry() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="stack-sm"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await verifyPasscode(code.trim())
          setPasscode(code)
          toast('Passcode saved')
        } catch (err) {
          toast(err instanceof Error ? err.message : 'Wrong passcode', 3200)
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="label" htmlFor="pc">
        Passcode
      </label>
      <div className="row">
        <input id="pc" className="input grow" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} placeholder="The coach passcode" />
        <button className="btn primary" disabled={!code.trim() || busy} type="submit">
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </div>
      <p className="small muted">Set on the server so only you can use the coach. You can change it later in Settings.</p>
    </form>
  )
}

function TapCard() {
  const data = useData()
  const { draft, results } = data.assessment
  const last = results[results.length - 1]
  return (
    <section className="card">
      <div className="row-between">
        <h2>Quick tap version</h2>
        <span className="pill">~8 min · offline</span>
      </div>
      <p className="small muted">The built-in assessment: fixed questions, no AI, works without a connection. Builds a plan from your answers.</p>
      {draft && draft.order.length > 0 ? (
        <a className="btn block" href={href('/assessment/tap')}>
          Resume · {flowState(draft.answers).answered} answered
        </a>
      ) : (
        <div className="row">
          {last && (
            <a className="btn grow" href={href(`/assessment/results/${last.id}`)}>
              Results · {last.playerType}
            </a>
          )}
          <button
            className="btn grow"
            onClick={() => {
              startAssessment(true)
              navigate('/assessment/tap')
            }}
          >
            {last ? 'Retake' : 'Start'}
          </button>
        </div>
      )}
    </section>
  )
}
