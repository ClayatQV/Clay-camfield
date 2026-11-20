import { useEffect, useRef, useState, type RefObject } from 'react'
import { lessonById } from '../content/lessons'
import type { Moment } from '../content/types'
import { Icon } from '../components/Icon'
import { toast } from '../components/Toast'
import { useYouTube } from '../components/useYouTube'
import {
  clearLessonStatus,
  fmtTime,
  momentsFor,
  resetMoments,
  resolveLesson,
  saveMoments,
  setLessonStatus,
  tagClass,
  type ResolvedLesson,
} from '../lib/lessons'
import { href, navigate } from '../lib/router'
import { ytErrorMessage, ytWatchUrl } from '../lib/youtube'
import { updateSettings, useData } from '../store/store'
import { NotFound } from './NotFound'

const SPEEDS = [0.25, 0.5, 0.75, 1]
type Tab = 'watch' | 'understand' | 'drill'
const r1 = (t: number) => Math.round(t * 10) / 10

export function LessonPage({ id, query }: { id: string; query: URLSearchParams }) {
  const data = useData()
  const base = lessonById(id)
  if (!base) return <NotFound />
  return <LessonView key={id} lesson={resolveLesson(base, data)} initialTab={(query.get('tab') as Tab) || 'watch'} />
}

function LessonView({ lesson, initialTab }: { lesson: ResolvedLesson; initialTab: Tab }) {
  const data = useData()
  const [tab, setTab] = useState<Tab>(['watch', 'understand', 'drill'].includes(initialTab) ? initialTab : 'watch')
  const videos = [
    { youtubeId: lesson.youtubeId, channel: lesson.channel, title: lesson.videoTitle ?? lesson.title, note: undefined as string | undefined },
    ...(lesson.altVideos ?? []),
  ]
  const [videoId, setVideoId] = useState(lesson.effectiveVideo)
  const [playerKey, setPlayerKey] = useState(0)
  const passes = data.settings.ladderPasses
  const { list: moments, custom } = momentsFor(lesson, data)

  return (
    <div className="screen lesson">
      <a className="back-link" href={href('/lessons')}>
        <Icon name="back" size={20} /> Lessons
      </a>
      <div className="screen-head">
        <span className="eyebrow">
          {lesson.kind === 'concept' ? 'Concept video' : lesson.artist}
          {lesson.year ? ` · ${lesson.album ? lesson.album + ', ' : ''}${lesson.year}` : ''}
        </span>
        <h1>{lesson.title}</h1>
        <p className="small muted">
          {lesson.channel}
          {lesson.tempo ? ` · ♩=${lesson.tempo}` : ''}
          {lesson.bars ? ` · ${lesson.bars} bars` : ''}
        </p>
      </div>

      <ReviewCard lesson={lesson} videos={videos} videoId={videoId} setVideoId={setVideoId} />

      <Player
        key={playerKey}
        videoId={videoId}
        lesson={lesson}
        moments={moments}
        customMoments={custom}
        passes={passes}
        tab={tab}
        setTab={setTab}
        onRetry={() => setPlayerKey((k) => k + 1)}
      />
    </div>
  )
}

/* ---------------- review (candidates) ---------------- */

function ReviewCard({
  lesson,
  videos,
  videoId,
  setVideoId,
}: {
  lesson: ResolvedLesson
  videos: { youtubeId: string; channel: string; title: string; note?: string }[]
  videoId: string
  setVideoId: (id: string) => void
}) {
  const s = lesson.effectiveStatus
  if (s === 'candidate') {
    return (
      <section className="card review-card">
        <div className="row-between">
          <span className="pill amber">To review</span>
        </div>
        <p className="small">
          Check that the tabs are <strong>on screen with the recording</strong> and the chord changes are shown. Then approve or reject.
        </p>
        {lesson.verification && <p className="small muted">{lesson.verification}</p>}
        {videos.length > 1 && (
          <div className="stack-sm">
            <span className="label">Candidate videos</span>
            <div className="chips">
              {videos.map((v, i) => (
                <button key={v.youtubeId} className="chip" aria-pressed={videoId === v.youtubeId} onClick={() => setVideoId(v.youtubeId)}>
                  {i + 1} · {v.channel}
                </button>
              ))}
            </div>
            {videos.find((v) => v.youtubeId === videoId)?.note && <p className="small muted">{videos.find((v) => v.youtubeId === videoId)!.note}</p>}
          </div>
        )}
        {lesson.rejectedVideos?.map((v) => (
          <p key={v.youtubeId} className="small muted">
            Already rejected: {v.youtubeId} — {v.note}
          </p>
        ))}
        <div className="row">
          <button
            className="btn danger grow"
            onClick={() => {
              setLessonStatus(lesson.id, 'rejected', videoId)
              toast('Rejected')
            }}
          >
            <Icon name="close" size={18} /> Reject
          </button>
          <button
            className="btn primary grow"
            onClick={() => {
              setLessonStatus(lesson.id, 'approved', videoId)
              toast(videos.length > 1 ? `Approved with video ${videos.findIndex((v) => v.youtubeId === videoId) + 1}` : 'Approved')
            }}
          >
            <Icon name="check" size={18} /> Approve
          </button>
        </div>
      </section>
    )
  }
  if (!lesson.decided) return null
  return (
    <p className="small muted">
      You {s === 'approved' ? 'approved' : 'rejected'} this lesson.{' '}
      <button className="linklike" onClick={() => clearLessonStatus(lesson.id)}>
        Undo
      </button>
    </p>
  )
}

/* ---------------- player + tabs ---------------- */

function Player({
  videoId,
  lesson,
  moments,
  customMoments,
  passes,
  tab,
  setTab,
  onRetry,
}: {
  videoId: string
  lesson: ResolvedLesson
  moments: Moment[]
  customMoments: boolean
  passes: number
  tab: Tab
  setTab: (t: Tab) => void
  onRetry: () => void
}) {
  const yt = useYouTube(videoId)
  const ready = yt.status === 'ready'
  const loop = useLoop(yt.playerRef, ready, passes, yt.ended)

  const seekAndPlay = (t: number) => {
    const p = yt.playerRef.current
    if (!p || !ready) return
    try {
      p.seekTo(Math.max(0, t), true)
      p.playVideo()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="lesson-grid">
      <div className="lesson-video">
      <div className="video-sticky">
        <div className="video-box">
          <div ref={yt.mountRef} className="video-mount" />
          {yt.status === 'loading' && <div className="video-overlay muted small">Loading video…</div>}
          {yt.status === 'error' && yt.error !== null && (
            <div className="video-overlay">
              <p>{ytErrorMessage(yt.error)}</p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <a className="btn primary" href={ytWatchUrl(videoId, loop.a ?? undefined)} target="_blank" rel="noreferrer">
                  <Icon name="external" size={18} /> Open on YouTube
                </a>
                {yt.error === 'offline' && (
                  <button className="btn" onClick={onRetry}>
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      </div>
      <div className="lesson-side">
      <div className="seg full" role="tablist" aria-label="Lesson sections">
        {(['watch', 'understand', 'drill'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === 'watch' ? 'Watch' : t === 'understand' ? 'Understand' : 'Drill'}
          </button>
        ))}
      </div>

      {tab === 'watch' && (
        <WatchTab
          ready={ready}
          playing={yt.playing}
          rate={yt.rate}
          loop={loop}
          playerRef={yt.playerRef}
          lessonId={lesson.id}
          moments={moments}
          customMoments={customMoments}
          passes={passes}
          videoId={videoId}
        />
      )}
      {tab === 'understand' && (
        <UnderstandTab
          lesson={lesson}
          onRow={(t) => {
            setTab('watch')
            loop.setLoopOn(false)
            loop.stopLadder()
            seekAndPlay(t)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}
      {tab === 'drill' && <DrillTab lesson={lesson} />}
      </div>
    </div>
  )
}

/* ---------------- loop engine ---------------- */

type Ladder = { idx: number; pass: number }

function useLoop(playerRef: RefObject<YT.Player | null>, ready: boolean, passes: number, ended: number) {
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [loopOn, setLoopOn] = useState(false)
  const [ladder, setLadder] = useState<Ladder | null>(null)
  const [time, setTime] = useState(0)
  const s = useRef({ a, b, loopOn, ladder, passes, cooldown: 0, lastUi: 0 })
  s.current.a = a
  s.current.b = b
  s.current.loopOn = loopOn
  s.current.ladder = ladder
  s.current.passes = passes

  const player = () => playerRef.current

  // ~50 ms poll: when past B, jump back to A. Also feeds the time readout.
  useEffect(() => {
    if (!ready) return
    const id = setInterval(() => {
      const p = player()
      if (!p) return
      let t: number
      try {
        t = p.getCurrentTime()
      } catch {
        return
      }
      const st = s.current
      const now = performance.now()
      if (now - st.lastUi > 150) {
        st.lastUi = now
        setTime(t)
      }
      if (!st.loopOn || st.a === null || st.b === null || st.b <= st.a || now < st.cooldown) return
      if (t >= st.b) {
        st.cooldown = now + 300
        try {
          p.seekTo(st.a, true)
        } catch {
          return
        }
        if (st.ladder) advanceLadder(p)
      }
    }, 50)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // If B is at/after the end of the video, the ENDED event closes the loop.
  useEffect(() => {
    if (!ended) return
    const st = s.current
    const p = player()
    if (p && st.loopOn && st.a !== null) {
      try {
        p.seekTo(st.a, true)
        p.playVideo()
      } catch {
        /* ignore */
      }
      if (st.ladder) advanceLadder(p)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended])

  function advanceLadder(p: YT.Player) {
    const st = s.current
    if (!st.ladder) return
    let { idx, pass } = st.ladder
    pass += 1
    if (pass >= st.passes) {
      idx += 1
      pass = 0
      if (idx >= SPEEDS.length) {
        st.ladder = null
        setLadder(null)
        toast('Ladder done — you made it to full speed', 3200)
        return
      }
      try {
        p.setPlaybackRate(SPEEDS[idx])
      } catch {
        /* ignore */
      }
    }
    st.ladder = { idx, pass }
    setLadder(st.ladder)
  }

  const now = () => {
    try {
      return player()?.getCurrentTime() ?? time
    } catch {
      return time
    }
  }

  return {
    a,
    b,
    loopOn,
    ladder,
    time,
    setLoopOn,
    setA: (v: number | null) => setA(v === null ? null : Math.max(0, r1(v))),
    setB: (v: number | null) => setB(v === null ? null : Math.max(0, r1(v))),
    now,
    stopLadder: () => setLadder(null),
    startLadder: () => {
      const p = player()
      if (!p || a === null || b === null || b <= a) return false
      try {
        p.setPlaybackRate(SPEEDS[0])
        p.seekTo(a, true)
        p.playVideo()
      } catch {
        return false
      }
      s.current.cooldown = performance.now() + 300
      setLadder({ idx: 0, pass: 0 })
      setLoopOn(true)
      return true
    },
    playLoop: (aa: number, bb: number) => {
      const p = player()
      setA(r1(aa))
      setB(r1(bb))
      setLoopOn(true)
      s.current.cooldown = performance.now() + 300
      if (p) {
        try {
          p.seekTo(aa, true)
          p.playVideo()
        } catch {
          /* ignore */
        }
      }
    },
  }
}

type LoopApi = ReturnType<typeof useLoop>

/* ---------------- Watch ---------------- */

function WatchTab({
  ready,
  playing,
  rate,
  loop,
  playerRef,
  lessonId,
  moments,
  customMoments,
  passes,
  videoId,
}: {
  ready: boolean
  playing: boolean
  rate: number
  loop: LoopApi
  playerRef: RefObject<YT.Player | null>
  lessonId: string
  moments: Moment[]
  customMoments: boolean
  passes: number
  videoId: string
}) {
  const p = () => playerRef.current
  const call = (fn: (pl: YT.Player) => void) => {
    const pl = p()
    if (!pl || !ready) return
    try {
      fn(pl)
    } catch {
      /* ignore */
    }
  }
  const { a, b } = loop
  const valid = a !== null && b !== null && b > a
  const [editing, setEditing] = useState<number | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)

  const setAFromNow = () => {
    const t = loop.now()
    loop.setA(t)
    if (b !== null && b <= t + 0.1) loop.setB(null)
  }
  const setBFromNow = () => {
    const t = loop.now()
    const aa = a ?? 0
    if (t <= aa + 0.2) {
      toast('B has to be after A')
      return
    }
    if (a === null) loop.setA(0)
    loop.setB(t)
    loop.setLoopOn(true)
    call((pl) => pl.seekTo(aa, true))
  }
  const nudge = (which: 'a' | 'b', d: number) => {
    if (which === 'a' && a !== null) {
      const v = Math.max(0, r1(a + d))
      if (b === null || v < b - 0.2) loop.setA(v)
    }
    if (which === 'b' && b !== null) {
      const v = r1(b + d)
      if (a === null || v > a + 0.2) loop.setB(v)
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="row-between">
          <button
            className="btn primary"
            style={{ minWidth: 120 }}
            disabled={!ready}
            onClick={() => call((pl) => (playing ? pl.pauseVideo() : pl.playVideo()))}
          >
            <Icon name={playing ? 'pause' : 'play'} size={20} /> {playing ? 'Pause' : 'Play'}
          </button>
          <span className="mono" aria-label="Current time">
            {fmtTime(loop.time)}
          </span>
          <button className="btn icon" disabled={!ready} aria-label="Back 2 seconds" onClick={() => call((pl) => pl.seekTo(Math.max(0, pl.getCurrentTime() - 2), true))}>
            −2s
          </button>
        </div>
        <div className="field">
          <span className="label">Speed</span>
          <div className="seg full" role="group" aria-label="Playback speed">
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                aria-pressed={Math.abs(rate - sp) < 0.01}
                disabled={!ready}
                onClick={() => {
                  loop.stopLadder()
                  call((pl) => pl.setPlaybackRate(sp))
                }}
              >
                {sp}×
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>A–B loop</h2>
          <button
            className={`btn sm${loop.loopOn ? ' on' : ''}`}
            disabled={!valid}
            aria-pressed={loop.loopOn}
            onClick={() => {
              if (loop.loopOn) loop.stopLadder()
              loop.setLoopOn(!loop.loopOn)
            }}
          >
            <Icon name="loop" size={18} /> Loop {loop.loopOn ? 'on' : 'off'}
          </button>
        </div>
        {(['a', 'b'] as const).map((w) => {
          const v = w === 'a' ? a : b
          return (
            <div key={w} className="ab-row">
              <button className="btn ab-set" disabled={!ready} onClick={w === 'a' ? setAFromNow : setBFromNow}>
                Set {w.toUpperCase()}
              </button>
              <span className="mono ab-time">{v === null ? '—' : fmtTime(v)}</span>
              <button className="btn icon" disabled={v === null} aria-label={`${w.toUpperCase()} minus 0.1 seconds`} onClick={() => nudge(w, -0.1)}>
                −.1
              </button>
              <button className="btn icon" disabled={v === null} aria-label={`${w.toUpperCase()} plus 0.1 seconds`} onClick={() => nudge(w, 0.1)}>
                +.1
              </button>
            </div>
          )
        })}
        <div className="row">
          <button className="btn sm grow" disabled={!valid || !ready} onClick={() => call((pl) => (pl.seekTo(a!, true), pl.playVideo()))}>
            Jump to A
          </button>
          <button
            className="btn sm grow ghost"
            disabled={a === null && b === null}
            onClick={() => {
              loop.setA(null)
              loop.setB(null)
              loop.setLoopOn(false)
              loop.stopLadder()
            }}
          >
            Clear
          </button>
        </div>

        <hr className="divider" />
        <div className="row-between">
          <div className="stack-sm" style={{ gap: 0 }}>
            <strong>Speed ladder</strong>
            <span className="small muted">
              {loop.ladder
                ? `${SPEEDS[loop.ladder.idx]}× · pass ${loop.ladder.pass + 1} of ${passes}`
                : `${passes} passes each at 0.25×, 0.5×, 0.75×, 1×`}
            </span>
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <button className="btn icon sm" aria-label="Fewer passes" onClick={() => updateSettings({ ladderPasses: Math.max(1, passes - 1) })}>
              <Icon name="minus" size={16} />
            </button>
            <button className="btn icon sm" aria-label="More passes" onClick={() => updateSettings({ ladderPasses: Math.min(20, passes + 1) })}>
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>
        {loop.ladder && (
          <div className="ladder-steps" aria-hidden>
            {SPEEDS.map((sp, i) => (
              <span key={sp} className={i < loop.ladder!.idx ? 'done' : i === loop.ladder!.idx ? 'on' : ''}>
                {sp}×
              </span>
            ))}
          </div>
        )}
        <button
          className={`btn block${loop.ladder ? '' : ' amber'}`}
          disabled={!ready || (!valid && !loop.ladder)}
          onClick={() => {
            if (loop.ladder) loop.stopLadder()
            else if (!loop.startLadder()) toast('Pick a moment or set A and B first')
          }}
        >
          {loop.ladder ? 'Stop ladder' : valid ? 'Start speed ladder' : 'Set A and B to use the ladder'}
        </button>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Moments</h2>
          {customMoments && (
            <button className="btn sm ghost" onClick={() => resetMoments(lessonId)}>
              Reset
            </button>
          )}
        </div>
        {moments.length === 0 && <p className="small muted">No saved loops yet. Set A and B, then save it as a moment.</p>}
        {moments.map((m, i) => {
          const active = a === r1(m.a) && b === r1(m.b)
          return (
            <div key={i} className="moment">
              <div className="moment-main">
                <button className={`btn moment-btn${active ? ' on' : ''}`} disabled={!ready} onClick={() => loop.playLoop(m.a, m.b)}>
                  <Icon name="loop" size={18} />
                  <span className="grow moment-text">
                    <span>{m.label}</span>
                    <span className="mono small moment-times">
                      {fmtTime(m.a)}–{fmtTime(m.b)}
                    </span>
                  </span>
                </button>
                <button className="btn icon" aria-label={`Edit ${m.label}`} aria-expanded={editing === i} onClick={() => setEditing(editing === i ? null : i)}>
                  ⋯
                </button>
              </div>
              {editing === i && (
                <div className="row">
                  <button
                    className="btn sm grow"
                    disabled={!valid}
                    onClick={() => {
                      const next = moments.map((x, j) => (j === i ? { ...x, a: a!, b: b! } : x))
                      saveMoments(lessonId, next)
                      setEditing(null)
                      toast(`Saved ${fmtTime(a!)}–${fmtTime(b!)} to “${m.label}”`)
                    }}
                  >
                    Save current A/B here
                  </button>
                  <button
                    className="btn sm danger"
                    onClick={() => {
                      saveMoments(
                        lessonId,
                        moments.filter((_, j) => j !== i),
                      )
                      setEditing(null)
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {adding ? (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault()
              if (!valid) return
              saveMoments(lessonId, [...moments, { label: newLabel.trim() || `Loop ${fmtTime(a!)}`, a: a!, b: b! }])
              setNewLabel('')
              setAdding(false)
            }}
          >
            <input className="input grow" autoFocus placeholder="Name it (e.g. Bar 12 bend)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <button className="btn primary" type="submit">
              Save
            </button>
          </form>
        ) : (
          <button className="btn sm" disabled={!valid} onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Save A/B as a new moment
          </button>
        )}
      </section>

      <a className="small muted" href={ytWatchUrl(videoId, a ?? undefined)} target="_blank" rel="noreferrer" style={{ textAlign: 'center' }}>
        Open on YouTube ↗
      </a>
    </div>
  )
}

/* ---------------- Understand ---------------- */

function UnderstandTab({ lesson, onRow }: { lesson: ResolvedLesson; onRow: (t: number) => void }) {
  return (
    <div className="stack">
      {lesson.summary && <p>{lesson.summary}</p>}
      {lesson.barMap?.length ? (
        <section className="card" style={{ padding: 0, gap: 0 }}>
          <div className="row-between" style={{ padding: '12px 16px 6px' }}>
            <h2>Bar map</h2>
            <span className="small muted">Tap a row to hear it</span>
          </div>
          {lesson.barMap.map((r) => (
            <button key={r.t} className="bar-row" onClick={() => onRow(r.t)}>
              <span className="bar-time mono">{fmtTime(r.t).replace(/\.0$/, '')}</span>
              <span className="bar-body">
                <span className="bar-head">
                  <strong>Bars {r.bars}</strong> <span className="muted">· {r.chords}</span>
                </span>
                <span className="small">{r.what}</span>
                {r.tags.length > 0 && (
                  <span className="row" style={{ gap: 4 }}>
                    {r.tags.map((t) => (
                      <span key={t} className={tagClass(t)}>
                        {t}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </button>
          ))}
        </section>
      ) : (
        <section className="card empty">
          <Icon name="lessons" size={28} />
          <strong>{lesson.kind === 'concept' ? 'Concept video — no bar map' : 'Analysis coming'}</strong>
          <p className="small">
            {lesson.kind === 'concept'
              ? 'Watch at 0.5× with the A–B loop, then drill the shapes.'
              : 'The bar-by-bar map gets written once the video is verified.'}
          </p>
        </section>
      )}
      {lesson.theory?.length ? (
        <section className="card">
          <h2>Theory notes</h2>
          <ul className="theory">
            {lesson.theory.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="row" style={{ gap: 6 }}>
        {lesson.concepts.map((c) => (
          <a key={c} className="tag" href={href(`/lessons?tag=${encodeURIComponent(c)}`)} style={{ textDecoration: 'none' }}>
            {c}
          </a>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Drill ---------------- */

function DrillTab({ lesson }: { lesson: ResolvedLesson }) {
  if (!lesson.drills?.length) {
    return (
      <section className="card empty">
        <p>No drills for this lesson yet.</p>
        <button className="btn" onClick={() => navigate('/lab')}>
          Open Fretboard Lab
        </button>
      </section>
    )
  }
  return (
    <section className="stack-sm">
      <p className="small muted">Each opens Fretboard Lab set up for the idea. Use the Lab's click and stepper, then come back to the loop.</p>
      {lesson.drills.map((d) => (
        <a key={d.labUrl} className="btn block drill-btn" href={href(d.labUrl)}>
          <Icon name="lab" size={20} />
          <span className="grow" style={{ textAlign: 'left' }}>
            {d.label}
          </span>
          <span aria-hidden>›</span>
        </a>
      ))}
    </section>
  )
}
