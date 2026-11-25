import { useEffect, useRef, useState } from 'react'
import type { PartId, SessionPart } from '../content/types'
import { PART_IDS } from '../content/types'
import { AssessmentCard } from '../components/AssessmentCard'
import { Icon } from '../components/Icon'
import { ShareCard } from '../components/ShareCard'
import { WeekStrip } from '../components/WeekStrip'
import { formatClock, formatLong, formatShort } from '../lib/dates'
import { chime } from '../lib/feedback'
import { href, navigate } from '../lib/router'
import { lastDetail } from '../lib/sessionScale'
import { discardDraft, draftHasContent, elapsedOf, finishSession, pauseAll, setNote, toggleDone, totalElapsed } from '../store/actions'
import { updateSettings, type Draft, type LengthMode } from '../store/store'
import { usePractice } from './practice/usePractice'

/** Today's routine: the four parts as a list. Each opens its own exercise page. */
export function Today({ query }: { query: URLSearchParams }) {
  const { data, today, plan, pos, block, parts, lengthMode, stale, live, active, running, now, stats, doneCount, targetTotal } = usePractice()
  const detailed = block.detailed
  const [finishing, setFinishing] = useState(query.get('finish') === '1')
  const [editingLength, setEditingLength] = useState(false)
  const todaysSessions = stats.byDay.get(today) ?? []

  useEffect(() => {
    if (query.get('finish') === '1') navigate('/practice', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Chime once when the running part crosses its target (also while on this page).
  const chimed = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!running || !active) return
    const part = parts.find((p) => p.id === running)
    if (!part) return
    const key = `${active.date}:${running}:${lengthMode}`
    if (elapsedOf(active, running, now) >= part.minutes[lengthMode] * 60 && !chimed.current.has(key)) {
      chimed.current.add(key)
      chime()
    }
  }, [now, running, active, parts, lengthMode])

  const total = totalElapsed(active, now)
  const guided = data.settings.guided
  const firstOpen = Math.max(0, parts.findIndex((p) => !active?.done[p.id]))
  const [step, setStep] = useState(firstOpen)

  return (
    <div className="screen">
      <header className="row-between" style={{ alignItems: 'flex-start' }}>
        <div className="screen-head">
          <span className="eyebrow">{formatLong(today)}</span>
          <h1>
            Block {pos.block} · Week {pos.week}
          </h1>
          <a className="muted small" href={href(`/plan/block/${pos.block}`)} style={{ textDecoration: 'none' }}>
            {block.title} ›
          </a>
        </div>
        <a href={href('/progress')} className="pill fire" style={{ textDecoration: 'none', marginTop: 4 }} aria-label={`Streak ${stats.current} days`}>
          <Icon name="fire" size={16} />
          {stats.current}
        </a>
      </header>

      <WeekStrip practiced={(d) => stats.byDay.has(d)} frozen={stats.frozen} today={today} />

      <AssessmentCard dismissible />

      {pos.status === 'before' && (
        <div className="card flat small">
          The plan starts {formatShort(data.settings.planStart)} ({pos.daysUntilStart} day{pos.daysUntilStart === 1 ? '' : 's'}). Here's Week 1 to warm up
          with. <a href={href('/settings')}>Change start date</a>
        </div>
      )}
      {pos.status === 'after' && (
        <div className="card flat small">
          All {plan.totalWeeks} weeks done. You're on the final week until you set a new start date in <a href={href('/settings')}>Settings</a>.
        </div>
      )}
      {stats.pendingFreeze && !stats.practicedToday && (
        <div className="card flat small" style={{ borderColor: 'var(--freeze)' }}>
          <span>
            <Icon name="snow" size={16} /> Your weekly freeze is covering yesterday. Practice today to keep the {stats.current}-day streak.
          </span>
        </div>
      )}

      {todaysSessions.length > 0 && !live && <ShareCard sessions={todaysSessions} streak={stats.current} today={today} />}

      {stale && (
        <div className="card" style={{ borderColor: 'var(--amber)' }}>
          <strong>Unfinished session from {formatShort(stale.date)}</strong>
          <p className="small muted">
            {Math.round(totalElapsed(stale, now) / 60)} min on the clock, {PART_IDS.filter((p) => stale.done[p]).length} of 4 parts checked.
          </p>
          <div className="row">
            <button className="btn grow" onClick={() => discardDraft()}>
              Discard
            </button>
            <button className="btn primary grow" onClick={() => setFinishing(true)}>
              Log it for {formatShort(stale.date).split(',')[0]}
            </button>
          </div>
        </div>
      )}

      <div className="row-between practice-bar">
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <strong>Session · {targetTotal} min</strong>
          <button className="btn sm" onClick={() => setEditingLength((e) => !e)} disabled={!!stale} aria-expanded={editingLength}>
            Edit
          </button>
        </div>
        <div className="mono small muted" aria-label="Total time">
          {formatClock(total)} / {targetTotal}:00
        </div>
      </div>
      {editingLength && <LengthEditor current={data.settings.sessionMinutes} planMinutes={plan.blocks[pos.block - 1].weekParts[0].reduce((s, p) => s + p.minutes[60], 0)} onDone={() => setEditingLength(false)} />}

      {!detailed && (
        <p className="small muted">
          Block {pos.block}'s week-by-week detail isn't written yet, so today uses the permanent warm-ups plus the block's focus.
        </p>
      )}

      {guided ? (
        <div className="stack guided" style={stale ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
          <ol className="stepper" aria-label="Session parts">
            {parts.map((p, k) => (
              <li key={p.id}>
                <button className={`step${k === step ? ' current' : ''}${active?.done[p.id] ? ' done' : ''}${running === p.id ? ' running' : ''}`} onClick={() => setStep(k)} aria-current={k === step ? 'step' : undefined}>
                  <span className="step-n">{active?.done[p.id] ? <Icon name="check" size={14} /> : k + 1}</span>
                  <span className="step-t">{p.title}</span>
                  <span className="step-m small muted">{p.minutes[lengthMode]} min</span>
                </button>
              </li>
            ))}
          </ol>
          <PartCard index={step + 1} part={parts[step]} lengthMode={lengthMode} draft={active} now={now} sessions={data.sessions} onToggleDone={() => toggleDone(today, parts[step].id)} />
        </div>
      ) : (
        <div className="stack parts-grid" style={stale ? { opacity: 0.5, pointerEvents: 'none' } : undefined} aria-disabled={!!stale}>
          {parts.map((p, i) => (
            <PartCard key={p.id} index={i + 1} part={p} lengthMode={lengthMode} draft={active} now={now} sessions={data.sessions} onToggleDone={() => toggleDone(today, p.id)} />
          ))}
        </div>
      )}

      {!finishing && !stale && (
        <button
          className="btn primary big block"
          onClick={() => {
            if (running) pauseAll(today)
            setFinishing(true)
          }}
          disabled={!draftHasContent(live)}
        >
          <Icon name="check" /> Finish session{doneCount ? ` · ${doneCount}/4` : ''}
        </button>
      )}
      {!finishing && !stale && !draftHasContent(live) && todaysSessions.length === 0 && (
        <p className="small muted" style={{ textAlign: 'center', marginTop: -6 }}>
          Start an exercise to begin.
        </p>
      )}

      {finishing && active && (
        <FinishCard
          key={active.date}
          parts={parts}
          draft={active}
          now={now}
          lengthMode={lengthMode}
          sessions={data.sessions}
          dateLabel={active.date === today ? 'today' : formatShort(active.date)}
          onNote={(n) => setNote(today, n)}
          onCancel={() => setFinishing(false)}
          onLog={(rows, note) => {
            const done = Object.fromEntries(PART_IDS.map((p) => [p, !!rows.find((r) => r.part === p)?.done])) as Record<PartId, boolean>
            const details = rows.filter((r) => r.done || r.minutes > 0).map((r) => ({ part: r.part, label: r.label, minutes: r.minutes, tempo: r.tempo }))
            finishSession({
              minutes: Math.max(1, details.reduce((s, r) => s + r.minutes, 0)),
              note,
              parts: done,
              partLabels: details.map((r) => r.label),
              partDetails: details,
              block: pos.block,
              week: pos.week,
            })
            setFinishing(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}

      {todaysSessions.length > 0 && live && <ShareCard sessions={todaysSessions} streak={stats.current} today={today} compact />}
    </div>
  )
}

/** Pick any session length; the four parts keep their shares. */
function LengthEditor({ current, planMinutes, onDone }: { current: number | null; planMinutes: number; onDone: () => void }) {
  const [val, setVal] = useState(String(current ?? planMinutes))
  const apply = (m: number | null) => {
    updateSettings({ sessionMinutes: m })
    onDone()
  }
  return (
    <div className="card flat length-editor">
      <div className="seg full" role="group" aria-label="Session length">
        {[15, 30, 45, 60, 90].map((m) => (
          <button key={m} aria-pressed={(current ?? planMinutes) === m} onClick={() => apply(m)}>
            {m}
          </button>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          const n = Math.round(Number(val))
          if (n >= 5 && n <= 720) apply(n)
        }}
      >
        <input className="input mono" style={{ width: 110, textAlign: 'center' }} type="number" inputMode="numeric" min={5} max={720} value={val} onChange={(e) => setVal(e.target.value)} aria-label="Minutes" />
        <button className="btn primary" type="submit">
          Set
        </button>
        <button type="button" className="btn ghost" onClick={() => apply(null)}>
          Plan default · {planMinutes}
        </button>
      </form>
    </div>
  )
}

function PartCard({ index, part, lengthMode, draft, now, sessions, onToggleDone }: { index: number; part: SessionPart; lengthMode: LengthMode; draft: Draft | null; now: number; sessions: Parameters<typeof lastDetail>[0]; onToggleDone: () => void }) {
  const seconds = elapsedOf(draft, part.id, now)
  const running = draft?.running === part.id
  const done = !!draft?.done[part.id]
  const last = lastDetail(sessions, part.shareLabel)
  const tempo = draft?.tempo?.[part.id]
  return (
    <section className={`card part${done ? ' done' : ''}${running ? ' running' : ''}`} aria-label={part.title}>
      <div className="row-between">
        <span className="eyebrow">
          {index} · {part.title}
        </span>
        <span className="small muted">{part.minutes[lengthMode]} min</span>
      </div>
      <h3>{part.focus}</h3>
      <p className="small muted">
        {running ? `Running · ${formatClock(seconds)}` : seconds > 0 ? `${formatClock(seconds)} on the clock` : last ? `Last time: ${last.minutes} min${last.tempo ? ` · ${last.tempo} bpm` : ''}` : part.shareLabel}
        {tempo ? ` · ${tempo} bpm` : ''}
      </p>
      <div className="part-controls">
        <a className={`btn ${done ? '' : 'primary'} start-btn`} href={href(`/practice/exercise/${part.id}${done || seconds > 0 ? '' : '?go=1'}`)}>
          <Icon name={done ? 'check' : running ? 'pause' : 'play'} size={18} /> {done ? 'Open' : running ? 'Continue' : seconds > 0 ? 'Continue' : 'Start exercise'}
        </a>
        <button className={`btn done-btn${done ? ' on' : ''}`} onClick={onToggleDone} aria-pressed={done}>
          <Icon name="check" size={20} />
          {done ? 'Done' : 'Done?'}
        </button>
      </div>
    </section>
  )
}

type Row = { part: PartId; label: string; done: boolean; minutes: number; tempo: number | null }

/** The log writes itself: per part, what it was, the minutes on the clock, the tempo reached. All editable. */
function FinishCard(props: {
  parts: SessionPart[]
  draft: Draft
  now: number
  lengthMode: LengthMode
  sessions: Parameters<typeof lastDetail>[0]
  dateLabel: string
  onNote: (n: string) => void
  onCancel: () => void
  onLog: (rows: Row[], note: string) => void
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    props.parts.map((p) => {
      const secs = elapsedOf(props.draft, p.id, props.now)
      const done = !!props.draft.done[p.id]
      const fromClock = Math.round(secs / 60)
      const last = lastDetail(props.sessions, p.shareLabel)
      return { part: p.id, label: p.shareLabel, done, minutes: fromClock || (done ? p.minutes[props.lengthMode] : 0), tempo: props.draft.tempo?.[p.id] ?? (done ? (last?.tempo ?? null) : null) }
    }),
  )
  const [note, setNoteLocal] = useState(props.draft.note)
  const total = rows.reduce((s, r) => s + (r.done || r.minutes > 0 ? r.minutes : 0), 0)
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)))

  return (
    <section className="card" style={{ borderColor: 'var(--accent)' }} aria-label="Finish session">
      <h2>Log {props.dateLabel === 'today' ? "today's" : `${props.dateLabel}'s`} session</h2>
      <p className="small muted">Filled in from your timers and the Lab click. Fix anything that's off.</p>
      <div className="log-rows">
        {rows.map((r, i) => (
          <div key={r.part} className={`log-row${r.done ? ' done' : ''}`}>
            <label className="check-row" style={{ flex: 1, minWidth: 0 }}>
              <input type="checkbox" checked={r.done} onChange={() => set(i, { done: !r.done, minutes: !r.done && r.minutes === 0 ? props.parts[i].minutes[props.lengthMode] : r.minutes })} />
              <span style={{ minWidth: 0 }}>
                <strong>{props.parts[i].title}</strong> <span className="muted small">· {r.label}</span>
              </span>
            </label>
            <label className="row" style={{ gap: 4, alignItems: 'center' }}>
              <input className="input mono" style={{ width: 64, textAlign: 'center' }} type="number" inputMode="numeric" min={0} value={r.minutes} onChange={(e) => set(i, { minutes: Math.max(0, Math.round(Number(e.target.value) || 0)) })} aria-label={`${props.parts[i].title} minutes`} />
              <span className="small muted">min</span>
            </label>
            <label className="row" style={{ gap: 4, alignItems: 'center' }}>
              <input className="input mono" style={{ width: 70, textAlign: 'center' }} type="number" inputMode="numeric" min={30} max={240} placeholder="—" value={r.tempo ?? ''} onChange={(e) => set(i, { tempo: e.target.value ? Math.round(Number(e.target.value)) : null })} aria-label={`${props.parts[i].title} tempo`} />
              <span className="small muted">bpm</span>
            </label>
          </div>
        ))}
      </div>
      <div className="row-between">
        <span className="label">Total</span>
        <strong className="mono">{total} min</strong>
      </div>

      <div className="field">
        <label htmlFor="note">One-line note (optional)</label>
        <input
          id="note"
          className="input"
          placeholder="e.g. bar 7 run clean at 70%"
          maxLength={160}
          value={note}
          onChange={(e) => {
            setNoteLocal(e.target.value)
            props.onNote(e.target.value)
          }}
          enterKeyHint="done"
        />
      </div>

      <div className="row">
        <button className="btn grow" onClick={props.onCancel}>
          Back
        </button>
        <button className="btn primary grow big" onClick={() => props.onLog(rows, note)} disabled={total < 1}>
          <Icon name="check" /> Log session
        </button>
      </div>
    </section>
  )
}
