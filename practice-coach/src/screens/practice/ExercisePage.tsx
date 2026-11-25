import { useEffect, useRef, useState } from 'react'
import type { PartId, SessionPart } from '../../content/types'
import { PART_IDS } from '../../content/types'
import { Icon } from '../../components/Icon'
import { SongViewer } from '../../components/SongViewer'
import { formatClock } from '../../lib/dates'
import { chime, keepAwake, primeAudio } from '../../lib/feedback'
import { labFileUrl } from '../../lib/lab'
import { useLabTimer } from '../../lib/labTimer'
import { href, navigate } from '../../lib/router'
import { lastDetail, suggestedTempo } from '../../lib/sessionScale'
import { effectiveTheme } from '../../lib/theme'
import { elapsedOf, pauseAll, resetPartClock, setPartTempo, startPart, toggleDone } from '../../store/actions'
import { usePractice } from './usePractice'

/**
 * One part of today's session on its own page: the instruction, the timer,
 * and the tool for doing it (the Lab for warm-ups and concepts, the song
 * viewer for the application). "Done · move on" takes you to the next part.
 */
export function ExercisePage({ partId, query }: { partId: string; query: URLSearchParams }) {
  const { data, today, parts, lengthMode, active, running, now, moduleId, pos } = usePractice()
  const idx = PART_IDS.indexOf(partId as PartId)
  const part = idx >= 0 ? parts[idx] : undefined
  const next = idx >= 0 && idx < parts.length - 1 ? parts[idx + 1] : null
  const autoStart = query.get('go') === '1'
  const started = useRef(false)

  // Arriving via "Start exercise" starts the clock; otherwise the player presses play.
  useEffect(() => {
    if (!part || !autoStart || started.current) return
    started.current = true
    if (running !== part.id && !active?.done[part.id]) {
      primeAudio()
      startPart(today, part.id)
    }
    navigate(`/practice/exercise/${part.id}`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part?.id])

  useEffect(() => {
    keepAwake(!!running)
    return () => keepAwake(false)
  }, [running])

  const chimed = useRef(false)
  const seconds = part ? elapsedOf(active, part.id, now) : 0
  const target = part ? part.minutes[lengthMode] * 60 : 0
  useEffect(() => {
    if (part && running === part.id && seconds >= target && !chimed.current) {
      chimed.current = true
      chime()
    }
  }, [seconds, target, running, part])

  if (!part) {
    return (
      <div className="screen">
        <div className="card empty">
          <h2>No such part</h2>
          <a className="btn primary" href={href('/practice')}>
            Back to the routine
          </a>
        </div>
      </div>
    )
  }

  const isRunning = running === part.id
  const done = !!active?.done[part.id]
  const last = lastDetail(data.sessions, part.shareLabel)
  const suggest = suggestedTempo(data.sessions, part.shareLabel)
  const tempo = active?.tempo?.[part.id] ?? null
  const pct = target ? Math.min(100, (seconds / target) * 100) : 0

  const moveOn = () => {
    if (!done) toggleDone(today, part.id)
    else if (isRunning) pauseAll(today)
    if (next) navigate(`/practice/exercise/${next.id}?go=1`)
    else navigate('/practice?finish=1')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="screen exercise">
      <a className="back-link" href={href('/practice')}>
        <Icon name="back" size={20} /> Routine
      </a>
      <div className="screen-head">
        <span className="eyebrow">
          {idx + 1} of {parts.length} · {part.title} · Block {pos.block} week {pos.week}
        </span>
        <h1>{part.focus}</h1>
        <p className="muted">{part.instruction}</p>
        {(last || suggest) && (
          <p className="small muted">
            {last ? `Last time: ${last.minutes} min${last.tempo ? ` · ${last.tempo} bpm` : ''}` : ''}
            {suggest ? `${last ? ' · ' : ''}Try ${suggest} bpm today` : ''}
          </p>
        )}
      </div>

      <section className="card exercise-timer">
        <div className="part-controls">
          <button
            className={`btn timer${isRunning ? ' amber' : ''}`}
            onClick={() => {
              primeAudio()
              if (isRunning) pauseAll(today)
              else startPart(today, part.id)
            }}
            aria-pressed={isRunning}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            <Icon name={isRunning ? 'pause' : 'play'} size={22} />
            <span className="mono">{formatClock(seconds)}</span>
            <span className="small muted" style={{ marginLeft: 'auto' }}>
              / {part.minutes[lengthMode]}:00
            </span>
            <span className="timer-bar" aria-hidden>
              <span style={{ width: `${pct}%`, background: seconds >= target ? 'var(--accent)' : undefined }} />
            </span>
          </button>
          <button className={`btn done-btn${done ? ' on' : ''}`} onClick={() => toggleDone(today, part.id)} aria-pressed={done}>
            <Icon name="check" size={20} />
            {done ? 'Done' : 'Done?'}
          </button>
        </div>
        <div className="row-between small">
          <label className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="muted">Tempo</span>
            <input
              className="input mono"
              style={{ width: 90, textAlign: 'center' }}
              type="number"
              inputMode="numeric"
              min={30}
              max={240}
              placeholder="bpm"
              value={tempo ?? ''}
              onChange={(e) => setPartTempo(today, part.id, e.target.value ? Number(e.target.value) : null)}
            />
            <span className="muted">bpm {part.labLinks?.length ? '· fills in from the Lab click' : ''}</span>
          </label>
          {seconds > 0 && !isRunning && (
            <button className="linklike small" onClick={() => resetPartClock(today, part.id)}>
              Reset timer
            </button>
          )}
        </div>
      </section>

      {part.id === 'application' ? (
        <ApplicationTool part={part} moduleId={moduleId} />
      ) : part.labLinks?.length ? (
        <LabTool part={part} onBpm={(b) => setPartTempo(today, part.id, b)} />
      ) : null}

      {part.lessonId && (
        <a className="btn block" href={href(`/lessons/${part.lessonId}`)}>
          <Icon name="lessons" size={18} /> Open the lesson video
        </a>
      )}

      <div className="row guided-nav">
        <a className="btn" href={href('/practice')}>
          Routine
        </a>
        <button className="btn primary grow big" onClick={moveOn}>
          <Icon name="check" /> {next ? `Done · move on to ${next.title.toLowerCase()}` : 'Done · finish session'}
        </button>
      </div>
    </div>
  )
}

/** The Lab, full width, with its click tempo reported back to the session. */
function LabTool({ part, onBpm }: { part: SessionPart; onBpm: (bpm: number) => void }) {
  const theme = effectiveTheme(usePractice().data.settings.theme)
  const links = part.labLinks ?? []
  const [which, setWhich] = useState(0)
  const frameRef = useRef<HTMLIFrameElement>(null)
  useLabTimer(frameRef, (bpm) => onBpm(bpm))
  const link = links[which] ?? links[0]
  const query = new URLSearchParams(link.labUrl.split('?')[1] ?? '')
  const src = labFileUrl(query, { theme, embed: '1' })
  return (
    <section className="card exercise-tool">
      {links.length > 1 && (
        <div className="chips" role="group" aria-label="Exercise variant">
          {links.map((l, i) => (
            <button key={l.labUrl} className="chip" aria-pressed={i === which} onClick={() => setWhich(i)}>
              {l.label}
            </button>
          ))}
        </div>
      )}
      {links.length === 1 && <span className="label">{link.label}</span>}
      <iframe ref={frameRef} key={src} className="exercise-lab" src={src} title={`Fretboard Lab: ${link.label}`} />
    </section>
  )
}

/** The application: pick one of the module's songs, then work on it in the viewer. */
function ApplicationTool({ part, moduleId }: { part: SessionPart; moduleId: string | null }) {
  const options = part.options ?? []
  const [sel, setSel] = useState(0)
  const [override, setOverride] = useState<{ title: string; artist: string } | null>(null)
  const current = override ?? (options[sel] ? parse(options[sel]) : null)
  if (!current) {
    return (
      <section className="card">
        <p className="muted">{part.instruction}</p>
        {part.lessonId && (
          <a className="btn primary" href={href(`/lessons/${part.lessonId}`)}>
            Open the lesson
          </a>
        )}
      </section>
    )
  }
  return (
    <section className="card exercise-tool">
      {options.length > 1 && (
        <div className="chips" role="group" aria-label="Song">
          {options.map((o, i) => (
            <button
              key={o.label}
              className={`chip${o.kind === 'goal' ? ' goal' : ''}`}
              aria-pressed={!override && i === sel}
              onClick={() => {
                setOverride(null)
                setSel(i)
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <h3 style={{ margin: '4px 0 0' }}>
        {current.title} <span className="muted small">{current.artist}</span>
      </h3>
      <SongViewer key={`${current.title}|${current.artist}`} title={current.title} artist={current.artist} moduleId={moduleId ?? undefined} onNewSong={(s) => setOverride(s)} />
    </section>
  )
}

/** "Title (Artist)" + sub "Artist · …" → title and artist. */
function parse(o: { label: string; sub?: string }): { title: string; artist: string } {
  const artist = (o.sub ?? '').split(' · ')[0]?.trim() ?? ''
  let title = o.label
  if (artist && title.endsWith(`(${artist})`)) title = title.slice(0, -artist.length - 2).trim()
  return { title, artist: artist === 'tabs on screen' || artist === 'find the transcription' ? '' : artist }
}
