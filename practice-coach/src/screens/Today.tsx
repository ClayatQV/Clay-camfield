import { useEffect, useMemo, useRef, useState } from 'react'
import type { PartId, SessionPart } from '../content/types'
import { PART_IDS } from '../content/types'
import { Icon } from '../components/Icon'
import { ShareCard } from '../components/ShareCard'
import { WeekStrip } from '../components/WeekStrip'
import { AssessmentCard } from '../components/AssessmentCard'
import { formatClock, formatLong, formatShort } from '../lib/dates'
import { chime, keepAwake, primeAudio } from '../lib/feedback'
import { useNow, useStats, useToday } from '../lib/hooks'
import { planPosition } from '../lib/plan'
import { href } from '../lib/router'
import { activePlan } from '../plan/model'
import {
  discardDraft,
  draftHasContent,
  elapsedOf,
  finishSession,
  pauseAll,
  resetPartClock,
  setLengthMode,
  setNote,
  startPart,
  toggleDone,
  totalElapsed,
} from '../store/actions'
import { useData, type LengthMode } from '../store/store'

export function Today() {
  const data = useData()
  const today = useToday()
  const plan = useMemo(() => activePlan(data), [data])
  const pos = planPosition(data.settings, today, plan)
  const block = plan.blocks[pos.block - 1]
  const parts = block.weekParts[pos.week - 1] ?? block.weekParts[0]
  const detailed = block.detailed
  const stats = useStats(data, today)

  const draft = data.draft
  const stale = draft && draft.date !== today && draftHasContent(draft) ? draft : null
  const live = draft && draft.date === today ? draft : null
  const active = stale ?? live
  const lengthMode: LengthMode = active?.lengthMode ?? data.settings.sessionLength
  const running = active?.running ?? null
  const now = useNow(!!running, 500)

  const [finishing, setFinishing] = useState(false)
  const todaysSessions = stats.byDay.get(today) ?? []

  // Keep the screen on while a timer runs.
  useEffect(() => {
    keepAwake(!!running)
    return () => keepAwake(false)
  }, [running])

  // Chime once when the running part crosses its target.
  const chimed = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!running || !active) return
    const part = parts.find((p) => p.id === running)
    if (!part) return
    const key = `${active.date}:${running}:${lengthMode}`
    const target = part.minutes[lengthMode] * 60
    if (elapsedOf(active, running, now) >= target && !chimed.current.has(key)) {
      chimed.current.add(key)
      chime()
    }
  }, [now, running, active, parts, lengthMode])

  const targetTotal = parts.reduce((s, p) => s + p.minutes[lengthMode], 0)
  const total = totalElapsed(active, now)
  const doneCount = active ? PART_IDS.filter((p) => active.done[p]).length : 0

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

      {todaysSessions.length > 0 && !live && <ShareCard sessions={todaysSessions} streak={stats.current} today={today} phone={data.settings.dadPhone} />}

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

      <div className="row-between">
        <div className="seg" role="group" aria-label="Session length">
          {([30, 60] as const).map((m) => (
            <button key={m} aria-pressed={lengthMode === m} onClick={() => setLengthMode(today, m)} disabled={!!stale}>
              {m} min
            </button>
          ))}
        </div>
        <div className="mono small muted" aria-label="Total time">
          {formatClock(total)} / {targetTotal}:00
        </div>
      </div>

      {!detailed && (
        <p className="small muted">
          Block {pos.block}'s week-by-week detail isn't written yet, so today uses the permanent warm-ups plus the block's focus.
        </p>
      )}

      <div className="stack" style={stale ? { opacity: 0.5, pointerEvents: 'none' } : undefined} aria-disabled={!!stale}>
        {parts.map((p, i) => (
          <PartCard
            key={p.id}
            index={i + 1}
            part={p}
            lengthMode={lengthMode}
            seconds={elapsedOf(active, p.id, now)}
            running={running === p.id}
            done={!!active?.done[p.id]}
            onToggleRun={() => {
              primeAudio()
              if (running === p.id) pauseAll(today)
              else startPart(today, p.id)
            }}
            onToggleDone={() => toggleDone(today, p.id)}
            onReset={() => resetPartClock(today, p.id)}
          />
        ))}
      </div>

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
          Start a timer or check a part to begin.
        </p>
      )}

      {finishing && active && (
        <FinishCard
          key={active.date}
          parts={parts}
          seconds={totalElapsed(active, now)}
          done={active.done}
          lengthMode={lengthMode}
          initialNote={active.note}
          dateLabel={active.date === today ? 'today' : formatShort(active.date)}
          onNote={(n) => setNote(today, n)}
          onCancel={() => setFinishing(false)}
          onLog={(minutes, note, done) => {
            finishSession({
              minutes,
              note,
              parts: done,
              partLabels: parts.filter((p) => done[p.id]).map((p) => p.shareLabel),
              block: pos.block,
              week: pos.week,
            })
            setFinishing(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}

      {todaysSessions.length > 0 && live && <ShareCard sessions={todaysSessions} streak={stats.current} today={today} phone={data.settings.dadPhone} compact />}
    </div>
  )
}

function PartCard(props: {
  index: number
  part: SessionPart
  lengthMode: LengthMode
  seconds: number
  running: boolean
  done: boolean
  onToggleRun: () => void
  onToggleDone: () => void
  onReset: () => void
}) {
  const { part, lengthMode, seconds, running, done } = props
  const target = part.minutes[lengthMode] * 60
  const pct = Math.min(100, (seconds / target) * 100)
  const reached = seconds >= target
  return (
    <section className={`card part${done ? ' done' : ''}${running ? ' running' : ''}`} aria-label={part.title}>
      <div className="row-between">
        <span className="eyebrow">
          {props.index} · {part.title}
        </span>
        <span className="small muted">{part.minutes[lengthMode]} min</span>
      </div>
      <h3>{part.focus}</h3>
      <p className="small muted">{part.instruction}</p>

      <div className="part-controls">
        <button className={`btn timer${running ? ' amber' : ''}`} onClick={props.onToggleRun} aria-pressed={running} aria-label={running ? 'Pause timer' : 'Start timer'}>
          <Icon name={running ? 'pause' : 'play'} size={20} />
          <span className="mono">{formatClock(seconds)}</span>
          <span className="timer-bar" aria-hidden>
            <span style={{ width: `${pct}%`, background: reached ? 'var(--accent)' : undefined }} />
          </span>
        </button>
        <button className={`btn done-btn${done ? ' on' : ''}`} onClick={props.onToggleDone} aria-pressed={done}>
          <Icon name="check" size={20} />
          {done ? 'Done' : 'Done?'}
        </button>
      </div>

      {part.options && part.options.length > 0 && (
        <div className="options">
          <span className="label">Pick one</span>
          {part.options.map((o) => (
            <a key={o.label} className={`option-row ${o.kind}`} href={o.url} target="_blank" rel="noreferrer">
              <span className="grow">
                <strong>{o.label}</strong>
                {o.sub && <span className="small muted"> · {o.sub}</span>}
              </span>
              <Icon name="external" size={18} label="Find a transcription" />
            </a>
          ))}
        </div>
      )}

      {(part.labLinks?.length || part.lessonId || part.externalLinks?.length || seconds > 0) && (
        <div className="links">
          {part.labLinks?.map((l) => (
            <a key={l.labUrl} className="link-row" href={href(l.labUrl)}>
              <Icon name="lab" size={18} />
              <span className="grow">{l.label}</span>
              <span aria-hidden>›</span>
            </a>
          ))}
          {part.lessonId && (
            <a className="link-row" href={href(`/lessons/${part.lessonId}`)}>
              <Icon name="lessons" size={18} />
              <span className="grow">{part.options?.length ? 'Extra resource: lesson video' : 'Open the lesson video'}</span>
              <span aria-hidden>›</span>
            </a>
          )}
          {part.externalLinks?.map((l) => (
            <a key={l.url} className="link-row" href={l.url} target="_blank" rel="noreferrer">
              <Icon name="external" size={18} />
              <span className="grow">{l.label}</span>
            </a>
          ))}
          {seconds > 0 && !running && (
            <button className="link-row as-button" onClick={props.onReset}>
              <Icon name="reset" size={18} />
              <span className="grow">Reset this timer</span>
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function FinishCard(props: {
  parts: SessionPart[]
  seconds: number
  done: Record<PartId, boolean>
  lengthMode: LengthMode
  initialNote: string
  dateLabel: string
  onNote: (n: string) => void
  onCancel: () => void
  onLog: (minutes: number, note: string, done: Record<PartId, boolean>) => void
}) {
  const fromClock = Math.round(props.seconds / 60)
  const fromTargets = props.parts.filter((p) => props.done[p.id]).reduce((s, p) => s + p.minutes[props.lengthMode], 0)
  const [minutes, setMinutes] = useState(Math.max(1, fromClock || fromTargets || 1))
  const [note, setNoteLocal] = useState(props.initialNote)
  const [done, setDone] = useState(props.done)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <section className="card" style={{ borderColor: 'var(--accent)' }} aria-label="Finish session">
      <h2>Log {props.dateLabel === 'today' ? "today's" : `${props.dateLabel}'s`} session</h2>

      <div className="field">
        <span className="label">Minutes {fromClock > 0 && <span className="muted">(clock says {fromClock})</span>}</span>
        <div className="row">
          <button className="btn icon" onClick={() => setMinutes((m) => Math.max(1, m - 5))} aria-label="Minus 5 minutes">
            −5
          </button>
          <button className="btn icon" onClick={() => setMinutes((m) => Math.max(1, m - 1))} aria-label="Minus 1 minute">
            <Icon name="minus" size={18} />
          </button>
          <input
            className="input mono grow"
            style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, minWidth: 70 }}
            type="number"
            inputMode="numeric"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Math.round(Number(e.target.value) || 1)))}
            aria-label="Minutes practiced"
          />
          <button className="btn icon" onClick={() => setMinutes((m) => m + 1)} aria-label="Plus 1 minute">
            <Icon name="plus" size={18} />
          </button>
          <button className="btn icon" onClick={() => setMinutes((m) => m + 5)} aria-label="Plus 5 minutes">
            +5
          </button>
        </div>
      </div>

      <div className="stack-sm">
        <span className="label">Parts completed</span>
        {props.parts.map((p) => (
          <label key={p.id} className="check-row">
            <input type="checkbox" checked={done[p.id]} onChange={() => setDone((d) => ({ ...d, [p.id]: !d[p.id] }))} />
            <span>
              <strong>{p.title}</strong> <span className="muted small">· {p.shareLabel}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="field">
        <label htmlFor="note">One-line note (optional)</label>
        <input
          ref={inputRef}
          id="note"
          className="input"
          placeholder="e.g. Kid Charlemagne bar 7 run at 70%"
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
        <button className="btn primary grow big" onClick={() => props.onLog(minutes, note, done)}>
          <Icon name="check" /> Log session
        </button>
      </div>
    </section>
  )
}
