import { useEffect, useRef, useState } from 'react'
import type { AiScreen } from '../../api/_lib/schemas'
import type { AnswerValue, Screen } from '../assessment/types'
import { Icon } from './Icon'

/**
 * One shape for a question on screen, whether it came from the built-in offline
 * assessment (Screen) or from the AI interviewer (AiScreen).
 */
export type UiScreen = {
  id: string
  kind: 'welcome' | 'yn' | 'one' | 'quiz' | 'multi' | 'rank' | 'grid' | 'text' | 'longtext'
  prompt: string
  help?: string | null
  eyebrow?: string | null
  options?: { id: string; label: string; sub?: string | null }[]
  max?: number | null
  noneLabel?: string | null
  playLabel?: string | null
  placeholder?: string | null
  examples?: string[] | null
}

export function toUi(s: Screen): UiScreen {
  const base = { id: s.id, kind: s.kind, prompt: s.prompt, help: s.help, eyebrow: s.eyebrow } as UiScreen
  switch (s.kind) {
    case 'one':
    case 'quiz':
      return { ...base, options: s.options }
    case 'multi':
      return { ...base, options: s.options, max: s.max, noneLabel: s.noneLabel }
    case 'rank':
      return { ...base, options: s.options, max: s.max }
    case 'grid':
      return { ...base, options: s.items, playLabel: s.playLabel }
    case 'text':
      return { ...base, max: s.max, placeholder: s.placeholder }
    case 'longtext':
      return { ...base, placeholder: s.placeholder, examples: s.examples }
    default:
      return base
  }
}

export function aiToUi(s: AiScreen): UiScreen {
  return {
    id: s.id,
    kind: s.kind,
    prompt: s.prompt,
    help: s.help,
    eyebrow: s.eyebrow,
    options: s.options ?? undefined,
    max: s.max,
    noneLabel: s.noneLabel,
    playLabel: s.playLabel,
    placeholder: s.placeholder,
    examples: s.examples,
  }
}

type Props = { screen: UiScreen; prior?: AnswerValue | null; onAnswer: (id: string, value: AnswerValue | null) => void }

export function AnswerInput({ screen: s, prior, onAnswer }: Props) {
  const answer = onAnswer
  switch (s.kind) {
    case 'welcome':
      return (
        <div className="stack">
          <ul className="assess-points">
            <li>Quick questions. Most are Yes / No.</li>
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
            I don't know
          </button>
        </div>
      )
    case 'one':
    case 'quiz':
      return <One s={s} answer={answer} />
    case 'multi':
      return <Multi s={s} prior={Array.isArray(prior) ? prior : []} answer={answer} />
    case 'rank':
      return <Rank s={s} prior={Array.isArray(prior) ? prior : []} answer={answer} />
    case 'grid':
      return <Grid s={s} prior={prior && typeof prior === 'object' && !Array.isArray(prior) ? prior : {}} answer={answer} />
    case 'text':
      return <TextList s={s} prior={Array.isArray(prior) ? prior : []} answer={answer} />
    case 'longtext':
      return <LongText s={s} prior={typeof prior === 'string' ? prior : ''} answer={answer} />
  }
}

type Sub = { s: UiScreen; answer: Props['onAnswer'] }

const isOther = (id: string) => id === 'other' || id.startsWith('other')

/** Small text field shown when a list has an "Other (type it)" option selected. */
function OtherInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input className="input" autoFocus placeholder="Type it here" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Other" />
}

function One({ s, answer }: Sub) {
  const [other, setOther] = useState<string | null>(null)
  return (
    <div className="assess-choices">
      {(s.options ?? []).map((o) =>
        isOther(o.id) && s.kind !== 'quiz' ? (
          <div key={o.id} className="stack-sm">
            <button className="btn big block choice" aria-pressed={other !== null} onClick={() => setOther(other === null ? '' : null)}>
              <span className="grow" style={{ textAlign: 'left' }}>
                {o.label}
              </span>
            </button>
            {other !== null && (
              <div className="row">
                <OtherInput value={other} onChange={setOther} />
                <button className="btn primary" disabled={!other.trim()} onClick={() => answer(s.id, `other:${other.trim()}`)}>
                  Done
                </button>
              </div>
            )}
          </div>
        ) : (
          <button key={o.id} className="btn big block choice" onClick={() => answer(s.id, o.id)}>
            <span className="grow" style={{ textAlign: 'left' }}>
              {o.label}
              {o.sub && <span className="tap-sub"> · {o.sub}</span>}
            </span>
          </button>
        ),
      )}
    </div>
  )
}

/** Replaces a selected "other" id with the typed text so the coach sees it. */
const withOther = (sel: string[], other: string) => sel.map((id) => (isOther(id) && other.trim() ? `other:${other.trim()}` : id))

function Multi({ s, prior, answer }: Sub & { prior: string[] }) {
  const [sel, setSel] = useState<string[]>(prior)
  const [other, setOther] = useState('')
  const max = s.max ?? Infinity
  const toggle = (id: string) =>
    setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length >= max ? (max === 1 ? [id] : x) : [...x, id]))
  return (
    <div className="stack">
      {s.max ? <p className="small muted">Pick up to {s.max}.</p> : null}
      <div className="tap-grid">
        {(s.options ?? []).map((o) => (
          <button key={o.id} className="tap" aria-pressed={sel.includes(o.id)} onClick={() => toggle(o.id)}>
            {o.label}
            {o.sub && <span className="tap-sub"> · {o.sub}</span>}
          </button>
        ))}
      </div>
      {sel.some(isOther) && <OtherInput value={other} onChange={setOther} />}
      <div className="row">
        {s.noneLabel && (
          <button className="btn grow" onClick={() => answer(s.id, [])}>
            {s.noneLabel}
          </button>
        )}
        <button className="btn primary grow" disabled={!!s.noneLabel && !sel.length} onClick={() => answer(s.id, withOther(sel, other))}>
          Done{sel.length ? ` · ${sel.length}` : ''}
        </button>
      </div>
    </div>
  )
}

function Rank({ s, prior, answer }: Sub & { prior: string[] }) {
  const [sel, setSel] = useState<string[]>(prior)
  const [other, setOther] = useState('')
  const max = s.max ?? 3
  const toggle = (id: string) => setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length >= max ? x : [...x, id]))
  return (
    <div className="stack">
      <div className="tap-grid">
        {(s.options ?? []).map((o) => {
          const i = sel.indexOf(o.id)
          return (
            <button key={o.id} className="tap" aria-pressed={i >= 0} onClick={() => toggle(o.id)}>
              {i >= 0 && <span className="rank-badge">{i + 1}</span>}
              {o.label}
            </button>
          )
        })}
      </div>
      {sel.some(isOther) && <OtherInput value={other} onChange={setOther} />}
      <button className="btn primary block big" disabled={!sel.length} onClick={() => answer(s.id, withOther(sel, other))}>
        {sel.length ? `Done · ${sel.length} picked` : `Pick up to ${max}`}
      </button>
    </div>
  )
}

function Grid({ s, prior, answer }: Sub & { prior: Record<string, number> }) {
  const [vals, setVals] = useState<Record<string, number>>(prior)
  const playLabel = s.playLabel || 'can play it'
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
          <i className="tap-dot play" /> {playLabel[0].toUpperCase() + playLabel.slice(1)}
        </span>
      </div>
      <div className="tap-grid">
        {(s.options ?? []).map((o) => {
          const v = vals[o.id] ?? 0
          return (
            <button key={o.id} className={`tap grid-tap v${v}`} aria-pressed={v > 0} onClick={() => cycle(o.id)} aria-label={`${o.label}${v === 2 ? ', ' + playLabel : v === 1 ? ', know' : ''}`}>
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
        {known ? `Done · ${known} known${play ? `, ${play} ${playLabel}` : ''}` : 'None of these — next'}
      </button>
    </div>
  )
}

type Recognition = { start: () => void; stop: () => void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
const SpeechCtor = (): (new () => Recognition) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function LongText({ s, prior, answer }: Sub & { prior: string }) {
  const [val, setVal] = useState(prior)
  const [listening, setListening] = useState(false)
  const rec = useRef<Recognition | null>(null)
  const canSpeak = !!SpeechCtor()
  useEffect(() => () => rec.current?.stop(), [])
  const toggleMic = () => {
    if (listening) {
      rec.current?.stop()
      setListening(false)
      return
    }
    const C = SpeechCtor()
    if (!C) return
    const r = new C()
    r.continuous = true
    r.interimResults = true
    r.lang = navigator.language || 'en-US'
    const base = val ? val.trimEnd() + ' ' : ''
    r.onresult = (e) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      setVal(base + text)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    rec.current = r
    r.start()
    setListening(true)
  }
  return (
    <div className="stack">
      <textarea className="input longtext" rows={5} placeholder={s.placeholder ?? undefined} value={val} onChange={(e) => setVal(e.target.value)} />
      {canSpeak && (
        <button className={`btn sm${listening ? ' amber' : ''}`} onClick={toggleMic} type="button" aria-pressed={listening}>
          {listening ? '● Listening… press to stop' : '🎤 Speak it instead'}
        </button>
      )}
      {s.examples && s.examples.length > 0 && !val && (
        <div className="stack-sm">
          <span className="small muted">Need a spark? Tap one to start from it:</span>
          <div className="tap-grid">
            {s.examples.map((x) => (
              <button key={x} className="tap" onClick={() => setVal(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
      )}
      <button className="btn primary block big" disabled={!val.trim()} onClick={() => answer(s.id, val.trim())}>
        Continue
      </button>
    </div>
  )
}

function TextList({ s, prior, answer }: Sub & { prior: string[] }) {
  const n = Math.max(1, Math.min(5, s.max ?? 3))
  const [vals, setVals] = useState<string[]>(Array.from({ length: n }, (_, i) => prior[i] ?? ''))
  return (
    <div className="stack">
      {vals.map((v, i) => (
        <input
          key={i}
          className="input"
          placeholder={s.placeholder ?? undefined}
          value={v}
          onChange={(e) => setVals((x) => x.map((y, j) => (j === i ? e.target.value : y)))}
          enterKeyHint={i === vals.length - 1 ? 'done' : 'next'}
        />
      ))}
      <button className="btn primary block big" onClick={() => answer(s.id, vals.map((x) => x.trim()).filter(Boolean))}>
        {vals.some((x) => x.trim()) ? 'Done' : 'Skip for now'}
      </button>
    </div>
  )
}
