import { useEffect, useState } from 'react'
import type { EarGuide as Guide } from '../../api/_lib/schemas'
import { getEarGuide } from '../ai/client'
import { useAiStatus } from '../ai/hooks'
import { Icon } from '../components/Icon'
import { InlineLab } from '../components/InlineLab'
import { toast } from '../components/Toast'
import { SPEEDS, useLoop } from '../components/useLoop'
import { useYouTube } from '../components/useYouTube'
import type { Moment } from '../content/types'
import { fmtTime } from '../lib/lessons'
import { href } from '../lib/router'
import { ytErrorMessage, ytWatchUrl } from '../lib/youtube'
import { earKey, update, useData, type EarPiece } from '../store/store'

/**
 * Learn it by ear: for a recording or performance with no transcription.
 * The player supplies the video and marks its sections; the coach supplies
 * the song's skeleton and what to listen for. Nothing here pretends to have
 * heard the recording.
 */
export function EarGuide({ query }: { query: URLSearchParams }) {
  const title = (query.get('title') ?? '').trim()
  const artist = (query.get('artist') ?? '').trim()
  const data = useData()
  const key = earKey(title, artist)
  const piece: EarPiece = data.ear[key] ?? { title, artist, youtubeId: null, about: '', sections: [], guide: null, guideAt: null }
  const save = (patch: Partial<EarPiece>) => update((d) => ({ ...d, ear: { ...d.ear, [key]: { ...piece, ...d.ear[key], ...patch } } }))

  if (!title) {
    return (
      <div className="screen">
        <div className="card empty">
          <h2>Which piece?</h2>
          <p className="small muted">Open this page from a song in your plan, or add the title to the address.</p>
        </div>
      </div>
    )
  }

  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist}`.trim())}`

  return (
    <div className="screen">
      <a className="back-link" href={href('/practice')}>
        <Icon name="back" size={20} /> Practice
      </a>
      <div className="screen-head">
        <span className="eyebrow">Learn it by ear</span>
        <h1>{title}</h1>
        {artist && <p className="muted">{artist}</p>}
        <p className="small muted">No transcription exists for this one, so you learn it the way players always have: the record, slowed down, one section at a time. The coach gives you the song's skeleton and what to listen for.</p>
      </div>

      {piece.youtubeId ? (
        <Player piece={piece} onSections={(s) => save({ sections: s })} onChangeVideo={() => save({ youtubeId: null })} />
      ) : (
        <VideoPicker search={search} onPick={(id) => save({ youtubeId: id })} />
      )}

      <GuideCard piece={piece} onGuide={(g) => save({ guide: g, guideAt: new Date().toISOString() })} onAbout={(about) => save({ about })} />
    </div>
  )
}

/* ---------------- video ---------------- */

function parseYouTube(input: string): string | null {
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

function VideoPicker({ search, onPick }: { search: string; onPick: (id: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <section className="card">
      <h2>1 · The recording</h2>
      <p className="small muted">Find the performance on YouTube and paste its link here. It stays on this device.</p>
      <div className="row">
        <a className="btn" href={search} target="_blank" rel="noreferrer">
          <Icon name="external" size={18} /> Find it on YouTube
        </a>
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          const id = parseYouTube(val)
          if (!id) {
            toast('That doesn’t look like a YouTube link')
            return
          }
          onPick(id)
        }}
      >
        <input className="input grow" placeholder="Paste the YouTube link" value={val} onChange={(e) => setVal(e.target.value)} inputMode="url" />
        <button className="btn primary" type="submit" disabled={!val.trim()}>
          Use it
        </button>
      </form>
    </section>
  )
}

function Player({ piece, onSections, onChangeVideo }: { piece: EarPiece; onSections: (s: Moment[]) => void; onChangeVideo: () => void }) {
  const videoId = piece.youtubeId!
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
  const sections = [...piece.sections].sort((a, b) => a.a - b.a)

  // Mark the start of a section at the current time; it ends where the next one starts (or +20 s for now).
  const mark = () => {
    const t = Math.round(loop.now() * 10) / 10
    const name = label.trim() || `Section ${sections.length + 1}`
    const next = sections.filter((s) => Math.abs(s.a - t) > 0.5)
    next.push({ label: name, a: t, b: t + 20 })
    next.sort((a, b) => a.a - b.a)
    for (let i = 0; i < next.length - 1; i++) next[i] = { ...next[i], b: next[i + 1].a }
    onSections(next)
    setLabel('')
  }
  const setEnd = (i: number) => {
    const t = Math.round(loop.now() * 10) / 10
    if (t <= sections[i].a + 0.3) {
      toast('The end has to be after the start')
      return
    }
    onSections(sections.map((s, k) => (k === i ? { ...s, b: t } : s)))
  }

  return (
    <section className="card">
      <div className="row-between">
        <h2>1 · The recording</h2>
        <button className="btn sm ghost" onClick={onChangeVideo}>
          Change video
        </button>
      </div>
      <div className="video-box">
        <div ref={yt.mountRef} className="video-mount" />
        {yt.status === 'loading' && <div className="video-overlay muted small">Loading video…</div>}
        {yt.status === 'error' && yt.error !== null && (
          <div className="video-overlay">
            <p>{ytErrorMessage(yt.error)}</p>
            <a className="btn primary" href={ytWatchUrl(videoId, loop.a ?? undefined)} target="_blank" rel="noreferrer">
              <Icon name="external" size={18} /> Open on YouTube
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
        <span className="label">2 · Mark the sections as they go by</span>
        <p className="small muted">Play it through once. Each time a new part of the song starts (verse, bridge, solo…), name it and press Mark. Then loop one section at a time.</p>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            mark()
          }}
        >
          <input className="input grow" placeholder="Verse 1, Bridge, Outro…" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button className="btn primary" type="submit" disabled={!ready}>
            Mark here · {fmtTime(loop.time)}
          </button>
        </form>
      </div>

      {sections.length > 0 && (
        <ul className="moments">
          {sections.map((s, i) => {
            const active = loop.loopOn && loop.a === s.a && loop.b === s.b
            return (
              <li key={`${s.a}`} className={`moment-row${active ? ' on' : ''}`}>
                <button className="btn sm primary" disabled={!ready} onClick={() => loop.playLoop(s.a, s.b)}>
                  <Icon name="loop" size={16} /> Loop
                </button>
                <span className="grow">
                  <strong>{s.label}</strong> <span className="mono small muted">{fmtTime(s.a)} – {fmtTime(s.b)}</span>
                </span>
                <button className="btn sm ghost" disabled={!ready} onClick={() => setEnd(i)} title="Set the end of this section to the current time">
                  End here
                </button>
                <button className="btn sm ghost" aria-label="Remove section" onClick={() => onSections(sections.filter((_, k) => k !== i))}>
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

/* ---------------- the coach's guide ---------------- */

function GuideCard({ piece, onGuide, onAbout }: { piece: EarPiece; onGuide: (g: Guide) => void; onAbout: (s: string) => void }) {
  const ai = useAiStatus()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [about, setAbout] = useState(piece.about)
  const [openLab, setOpenLab] = useState<{ url: string; label: string } | null>(null)
  useEffect(() => setAbout(piece.about), [piece.about])

  async function write() {
    setBusy(true)
    setErr(null)
    try {
      const g = await getEarGuide({ title: piece.title, artist: piece.artist, about: about.trim() || null })
      onGuide(g)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const g = piece.guide
  return (
    <section className="card">
      <h2>3 · The coach's guide</h2>
      {!g && (
        <>
          <p className="small muted">The coach can't hear the recording. What it can do: name the song underneath, give you its form and changes, and tell you what to listen for in each section. Everything about the performance itself is for you to confirm by ear.</p>
          <div className="field">
            <label htmlFor="about">Anything about this performance? (optional)</label>
            <input
              id="about"
              className="input"
              placeholder="e.g. acoustic, from a 2019 interview, he plays it in open tuning…"
              value={about}
              maxLength={400}
              onChange={(e) => setAbout(e.target.value)}
              onBlur={() => onAbout(about)}
            />
          </div>
          {ai.configured && ai.hasPasscode ? (
            <button className="btn primary block" onClick={() => void write()} disabled={busy}>
              {busy ? 'Writing the guide…' : 'Write the guide'}
            </button>
          ) : (
            <p className="small muted">
              The AI coach isn't available here{ai.hasPasscode ? '' : ' (enter the passcode on the Assessment page)'}. The looper above still works.
            </p>
          )}
          {err && <p className="small" style={{ color: 'var(--amber)' }}>{err}</p>}
        </>
      )}
      {g && (
        <div className="stack">
          <p className="why">{g.honesty}</p>
          <div>
            <span className="label">The song underneath</span>
            <p>
              <strong>{g.underlying.song}</strong> · {g.underlying.by}
              {g.underlying.key ? ` · ${g.underlying.key}` : ''}
              {g.underlying.meter ? ` · ${g.underlying.meter}` : ''}
              {g.underlying.form ? ` · ${g.underlying.form}` : ''}
            </p>
            {g.underlying.learnFirst && (
              <p className="small">
                <strong>Learn this first:</strong> {g.underlying.learnFirst}
                {g.underlying.hasTranscriptions && (
                  <>
                    {' '}
                    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${g.underlying.song} ${g.underlying.by} guitar transcription tab`)}`} target="_blank" rel="noreferrer">
                      Find tabs for the original ›
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
          {g.skeleton.length > 0 && (
            <div>
              <span className="label">The form and changes (original)</span>
              <table className="skeleton">
                <tbody>
                  {g.skeleton.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{r.section}</strong>
                        {r.bars && <div className="small muted">{r.bars}</div>}
                      </td>
                      <td className="mono small">{r.chords}</td>
                      <td className="small muted">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div>
            <span className="label">Section by section: what to listen for</span>
            <div className="stack-sm">
              {g.sections.map((s, i) => (
                <div key={i} className="card flat">
                  <strong>{s.label}</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: 18 }} className="small">
                    {s.listenFor.map((l, k) => (
                      <li key={k}>{l}</li>
                    ))}
                  </ul>
                  <p className="small muted" style={{ margin: 0 }}>
                    Try: {s.tryThis}
                  </p>
                  {s.lab && (
                    <button className="link-row as-button" style={{ color: 'var(--accent)' }} onClick={() => setOpenLab(openLab?.url === '/lab?' + s.lab ? null : { url: '/lab?' + s.lab, label: s.label })}>
                      <Icon name="lab" size={18} />
                      <span className="grow">Chord tones for {s.label} in the Lab</span>
                      <span aria-hidden>{openLab?.url === '/lab?' + s.lab ? '▾' : '›'}</span>
                    </button>
                  )}
                  {openLab && openLab.url === '/lab?' + s.lab && <InlineLab labUrl={openLab.url} label={openLab.label} onClose={() => setOpenLab(null)} />}
                </div>
              ))}
            </div>
          </div>
          {g.tips.length > 0 && (
            <div>
              <span className="label">Tips</span>
              <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
                {g.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <span className="label">You'll know it's working when</span>
            <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
              {g.doneWhen.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="row-between small muted">
            <span>Confidence: {g.confidence}</span>
            <button className="linklike" onClick={() => void write()} disabled={busy}>
              {busy ? 'Rewriting…' : 'Rewrite the guide'}
            </button>
          </div>
          {err && <p className="small" style={{ color: 'var(--amber)' }}>{err}</p>}
        </div>
      )}
    </section>
  )
}
