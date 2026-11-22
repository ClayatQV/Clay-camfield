import { useState } from 'react'
import type { Moment } from '../content/types'
import { fmtTime } from '../lib/lessons'
import { ytErrorMessage, ytWatchUrl } from '../lib/youtube'
import { useData } from '../store/store'
import { Icon } from './Icon'
import { toast } from './Toast'
import { SPEEDS, useLoop } from './useLoop'
import { useYouTube } from './useYouTube'

/**
 * A video with the tools for learning from it inside the app: play/pause,
 * speed, "mark a section here", and per-section looping with the speed
 * ladder. Used by the song page and the learn-by-ear page.
 */
export function VideoWorkbench({
  videoId,
  sections,
  onSections,
  heading,
  actions,
  markHelp,
}: {
  videoId: string
  sections: Moment[]
  onSections: (s: Moment[]) => void
  heading: string
  /** buttons shown next to the heading (change video, etc.) */
  actions?: React.ReactNode
  markHelp?: string
}) {
  const { settings } = useData()
  const yt = useYouTube(videoId)
  const ready = yt.status === 'ready'
  const loop = useLoop(yt.playerRef, ready, settings.ladderPasses, yt.ended)
  const [label, setLabel] = useState('')
  const call = (fn: (p: YT.Player) => void) => {
    const p = yt.playerRef.current
    if (!p || !ready) return
    try {
      fn(p)
    } catch {
      /* ignore */
    }
  }
  const sorted = [...sections].sort((a, b) => a.a - b.a)

  // Mark the start of a section at the current time; it ends where the next one starts (or +20 s for now).
  const mark = () => {
    const t = Math.round(loop.now() * 10) / 10
    const name = label.trim() || `Section ${sorted.length + 1}`
    const next = sorted.filter((s) => Math.abs(s.a - t) > 0.5)
    next.push({ label: name, a: t, b: t + 20 })
    next.sort((a, b) => a.a - b.a)
    for (let i = 0; i < next.length - 1; i++) next[i] = { ...next[i], b: next[i + 1].a }
    onSections(next)
    setLabel('')
  }
  const setEnd = (i: number) => {
    const t = Math.round(loop.now() * 10) / 10
    if (t <= sorted[i].a + 0.3) {
      toast('The end has to be after the start')
      return
    }
    onSections(sorted.map((s, k) => (k === i ? { ...s, b: t } : s)))
  }

  return (
    <section className="card">
      <div className="row-between">
        <h2>{heading}</h2>
        {actions && <div className="row" style={{ gap: 6 }}>{actions}</div>}
      </div>
      <div className="video-box">
        <div ref={yt.mountRef} className="video-mount" />
        {yt.status === 'loading' && <div className="video-overlay muted small">Loading video…</div>}
        {yt.status === 'error' && yt.error !== null && (
          <div className="video-overlay">
            <p>{ytErrorMessage(yt.error)}</p>
            <p className="small muted">This video can't be played inside the app. Pick another one.</p>
            <a className="btn sm ghost" href={ytWatchUrl(videoId, loop.a ?? undefined)} target="_blank" rel="noreferrer">
              Open on YouTube anyway
            </a>
          </div>
        )}
      </div>

      <div className="row-between">
        <button className="btn primary" style={{ minWidth: 120 }} disabled={!ready} onClick={() => call((p) => (yt.playing ? p.pauseVideo() : p.playVideo()))}>
          <Icon name={yt.playing ? 'pause' : 'play'} size={20} /> {yt.playing ? 'Pause' : 'Play'}
        </button>
        <span className="mono" aria-label="Current time">
          {fmtTime(loop.time)}
        </span>
        <button className="btn icon" disabled={!ready} aria-label="Back 2 seconds" onClick={() => call((p) => p.seekTo(Math.max(0, p.getCurrentTime() - 2), true))}>
          −2s
        </button>
      </div>
      <div className="field">
        <span className="label">Speed</span>
        <div className="seg full" role="group" aria-label="Playback speed">
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              aria-pressed={Math.abs(yt.rate - sp) < 0.01}
              disabled={!ready}
              onClick={() => {
                loop.stopLadder()
                call((p) => p.setPlaybackRate(sp))
              }}
            >
              {sp}×
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Mark the sections as they go by</span>
        <p className="small muted">{markHelp ?? 'Play it through once. Each time a new part starts (intro, verse, the lick you want…), name it and press Mark. Then loop one section at a time.'}</p>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            mark()
          }}
        >
          <input className="input grow" placeholder="Intro, bar 7 run, bridge…" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button className="btn primary" type="submit" disabled={!ready}>
            Mark here · {fmtTime(loop.time)}
          </button>
        </form>
      </div>

      {sorted.length > 0 && (
        <ul className="moments">
          {sorted.map((s, i) => {
            const active = loop.loopOn && loop.a === s.a && loop.b === s.b
            return (
              <li key={`${s.a}`} className={`moment-row${active ? ' on' : ''}`}>
                <button className="btn sm primary" disabled={!ready} onClick={() => loop.playLoop(s.a, s.b)}>
                  <Icon name="loop" size={16} /> Loop
                </button>
                <span className="grow">
                  <strong>{s.label}</strong>{' '}
                  <span className="mono small muted">
                    {fmtTime(s.a)} – {fmtTime(s.b)}
                  </span>
                </span>
                <button className="btn sm ghost" disabled={!ready} onClick={() => setEnd(i)} title="Set the end of this section to the current time">
                  End here
                </button>
                <button className="btn sm ghost" aria-label="Remove section" onClick={() => onSections(sorted.filter((_, k) => k !== i))}>
                  <Icon name="close" size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {loop.loopOn && (
        <div className="row-between small">
          <span className="muted">
            Looping {fmtTime(loop.a ?? 0)} – {fmtTime(loop.b ?? 0)}
            {loop.ladder ? ` · ladder ${SPEEDS[loop.ladder.idx]}× pass ${loop.ladder.pass + 1}/${settings.ladderPasses}` : ''}
          </span>
          <span className="row" style={{ gap: 6 }}>
            {!loop.ladder && (
              <button className="btn sm" onClick={() => loop.startLadder() || toast('Set a section first')}>
                Speed ladder
              </button>
            )}
            <button
              className="btn sm ghost"
              onClick={() => {
                loop.setLoopOn(false)
                loop.stopLadder()
              }}
            >
              Stop loop
            </button>
          </span>
        </div>
      )}
    </section>
  )
}

/** "https://youtu.be/ID", "watch?v=ID", shorts, or a bare 11-char id → the id. */
export function parseYouTube(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const u = new URL(s)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1, 12) || null
    const v = u.searchParams.get('v')
    if (v && /^[\w-]{11}$/.test(v)) return v
    const m = u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{11})/)
    return m ? m[1] : null
  } catch {
    return null
  }
}
