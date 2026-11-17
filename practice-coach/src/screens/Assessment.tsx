import { useEffect, useState } from 'react'
import { answer, back, finishAssessment, startAssessment } from '../assessment/actions'
import { flowState } from '../assessment/engine'
import { SECTION_NAMES, type AnswerValue, type Screen } from '../assessment/types'
import { Icon } from '../components/Icon'
import { navigate } from '../lib/router'
import { useData } from '../store/store'

/** The 10-minute tap flow. One question per screen; tapping an answer moves on. */
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
        <button className="btn icon ghost" onClick={() => navigate('/plan')} aria-label="Close (your answers are saved)">
          <Icon name="close" />
        </button>
      </header>

      <main className="assess-body" key={current.id}>
        {current.eyebrow && <span className="eyebrow">{current.eyebrow}</span>}
        <h1 className="assess-q">{current.prompt}</h1>
        {current.help && <p className="muted">{current.help}</p>}
        <Answer screen={current} prior={answers[current.id]} />
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

function Answer({ screen: s, prior }: { screen: Screen; prior: AnswerValue | null | undefined }) {
  switch (s.kind) {
    case 'welcome':
      return (
        <div className="stack">
          <ul className="assess-points">
            <li>Quick taps. Most questions are Yes / No.</li>
            <li>It adapts: you won't see questions that are too easy or too hard for you.</li>
            <li>A few quick checks keep it accurate.</li>
            <li>Your answers save as you go. Close it any time and pick up later.</li>
          </ul>
          <button className="btn primary big block" onClick={() => answer(s.id, 'ok')}>
            Start
          </button>
        </div>
      )
    case 'yn':
      return (
        <div className="assess-choices">
          <button className="btn big block choice" onClick={() => answer(s.id, 'yes')}>
            Yes
          </button>
          <button className="btn big block choice" onClick={() => answer(s.id, 'no')}>
            No
          </button>
          <button className="btn block ghost" onClick={() => answer(s.id, 'unsure')}>
            Not sure
          </button>
        </div>
      )
    case 'one':
    case 'quiz':
      return (
        <div className="assess-choices">
          {s.options.map((o) => (
            <button key={o.id} className="btn big block choice" onClick={() => answer(s.id, o.id)}>
              <span className="grow" style={{ textAlign: 'left' }}>
                {o.label}
              </span>
            </button>
          ))}
        </div>
      )
    case 'multi':
      return <Multi s={s} prior={Array.isArray(prior) ? prior : []} />
    case 'rank':
      return <Rank s={s} prior={Array.isArray(prior) ? prior : []} />
    case 'grid':
      return <Grid s={s} prior={prior && typeof prior === 'object' && !Array.isArray(prior) ? prior : {}} />
    case 'text':
      return <TextList s={s} />
  }
}

function Multi({ s, prior }: { s: Extract<Screen, { kind: 'multi' }>; prior: string[] }) {
  const [sel, setSel] = useState<string[]>(prior)
  const max = s.max ?? Infinity
  const toggle = (id: string) =>
    setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length >= max ? (max === 1 ? [id] : x) : [...x, id]))
  return (
    <div className="stack">
      {s.max && <p className="small muted">Pick up to {s.max}.</p>}
      <div className="tap-grid">
        {s.options.map((o) => (
          <button key={o.id} className="tap" aria-pressed={sel.includes(o.id)} onClick={() => toggle(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="row">
        {s.noneLabel && (
          <button className="btn grow" onClick={() => answer(s.id, [])}>
            {s.noneLabel}
          </button>
        )}
        <button className="btn primary grow" disabled={!!s.noneLabel && !sel.length} onClick={() => answer(s.id, sel)}>
          Done{sel.length ? ` · ${sel.length}` : ''}
        </button>
      </div>
    </div>
  )
}

function Rank({ s, prior }: { s: Extract<Screen, { kind: 'rank' }>; prior: string[] }) {
  const [sel, setSel] = useState<string[]>(prior)
  const toggle = (id: string) => setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length >= s.max ? x : [...x, id]))
  return (
    <div className="stack">
      <div className="tap-grid">
        {s.options.map((o) => {
          const i = sel.indexOf(o.id)
          return (
            <button key={o.id} className="tap" aria-pressed={i >= 0} onClick={() => toggle(o.id)}>
              {i >= 0 && <span className="rank-badge">{i + 1}</span>}
              {o.label}
            </button>
          )
        })}
      </div>
      <button className="btn primary block big" disabled={!sel.length} onClick={() => answer(s.id, sel)}>
        {sel.length ? `Done · ${sel.length} picked` : `Tap up to ${s.max}`}
      </button>
    </div>
  )
}

function Grid({ s, prior }: { s: Extract<Screen, { kind: 'grid' }>; prior: Record<string, number> }) {
  const [vals, setVals] = useState<Record<string, number>>(prior)
  const cycle = (id: string) =>
    setVals((v) => {
      const n = ((v[id] ?? 0) + 1) % 3
      const next = { ...v }
      if (n === 0) delete next[id]
      else next[id] = n
      return next
    })
  const known = Object.keys(vals).length
  const play = Object.values(vals).filter((n) => n === 2).length
  return (
    <div className="stack">
      <div className="grid-legend small">
        <span>
          <i className="tap-dot know" /> Know
        </span>
        <span>
          <i className="tap-dot play" /> {s.playLabel[0].toUpperCase() + s.playLabel.slice(1)}
        </span>
      </div>
      <div className="tap-grid">
        {s.items.map((o) => {
          const v = vals[o.id] ?? 0
          return (
            <button key={o.id} className={`tap grid-tap v${v}`} aria-pressed={v > 0} onClick={() => cycle(o.id)} aria-label={`${o.label}${v === 2 ? ', ' + s.playLabel : v === 1 ? ', know' : ''}`}>
              {v === 1 && <Icon name="check" size={14} />}
              {v === 2 && <Icon name="play" size={12} />}
              <span>
                {o.label}
                {o.sub && <span className="tap-sub"> · {o.sub}</span>}
              </span>
            </button>
          )
        })}
      </div>
      <button className="btn primary block big" onClick={() => answer(s.id, vals)}>
        {known ? `Done · ${known} known${play ? `, ${play} ${s.playLabel}` : ''}` : 'None of these — next'}
      </button>
    </div>
  )
}

function TextList({ s }: { s: Extract<Screen, { kind: 'text' }> }) {
  const [vals, setVals] = useState<string[]>(Array.from({ length: s.max }, () => ''))
  return (
    <div className="stack">
      {vals.map((v, i) => (
        <input
          key={i}
          className="input"
          placeholder={s.placeholder}
          value={v}
          onChange={(e) => setVals((x) => x.map((y, j) => (j === i ? e.target.value : y)))}
          enterKeyHint={i === vals.length - 1 ? 'done' : 'next'}
        />
      ))}
      <button className="btn primary block big" onClick={() => answer(s.id, vals.map((x) => x.trim()).filter(Boolean))}>
        {vals.some((x) => x.trim()) ? 'Done' : 'No songs right now'}
      </button>
    </div>
  )
}
