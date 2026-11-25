import { useMemo } from 'react'
import { splitPiece } from '../assessment/vision'
import { AssessmentCard } from '../components/AssessmentCard'
import { Icon } from '../components/Icon'
import { WeekStrip } from '../components/WeekStrip'
import { LESSONS } from '../content/lessons'
import type { PartOption } from '../content/types'
import { PART_IDS } from '../content/types'
import { diffDays, formatLong, weekStart } from '../lib/dates'
import { useStats, useToday } from '../lib/hooks'
import { planPosition } from '../lib/plan'
import { href } from '../lib/router'
import { ytThumb } from '../lib/youtube'
import { activePlan } from '../plan/model'
import { totalElapsed } from '../store/actions'
import { useData } from '../store/store'

/** Day-of-year style rotation so picks change daily but stay stable all day. */
const dayIndex = (key: string) => Math.abs(diffDays('2026-01-01', key))

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function Home() {
  const data = useData()
  const today = useToday()
  const plan = useMemo(() => activePlan(data), [data])
  const pos = planPosition(data.settings, today, plan)
  const block = plan.blocks[pos.block - 1]
  const parts = block.weekParts[pos.week - 1] ?? block.weekParts[0]
  const stats = useStats(data, today)
  const latest = data.assessment.results[data.assessment.results.length - 1]
  const vision = plan.vision ?? latest?.vision
  const todays = stats.byDay.get(today) ?? []
  const draft = data.draft && data.draft.date === today ? data.draft : null
  const doneParts = draft ? PART_IDS.filter((p) => draft.done[p]).length : 0
  const minutesToday = todays.reduce((s, x) => s + x.minutes, 0)

  // Song of the day: rotate through this week's song choices (not your goal pieces).
  const songs: PartOption[] = plan.blocks.flatMap((b) => b.weekParts.flatMap((w) => w[3]?.options ?? [])).filter((o) => o.kind !== 'goal')
  const uniqueSongs = [...new Map(songs.map((s) => [s.label, s])).values()]
  const songOfDay = uniqueSongs.length ? uniqueSongs[dayIndex(today) % uniqueSongs.length] : null

  // Our pick: an approved song lesson, rotating daily.
  const lessons = LESSONS.filter((l) => (data.lessonState[l.id]?.status ?? l.status) === 'approved' && l.kind === 'song')
  const pick = lessons.length ? lessons[dayIndex(today) % lessons.length] : null

  // Listen this week: the current module's picks (its listening genres) → the AI results' list → the tap assessment's list; rotating weekly.
  const wk = Math.floor(dayIndex(weekStart(today)) / 7)
  type Listen = { artist: string; album?: string; genre: string; sub?: string; why?: string }
  const pool: Listen[] = block.listen?.length
    ? block.listen.map((l) => ({ artist: l.artist, album: l.album, genre: l.genre, why: l.why }))
    : data.ai.result?.taste.listening.length
      ? data.ai.result.taste.listening.map((l) => ({ artist: l.artist, album: l.album ?? undefined, genre: l.genre, why: l.why }))
      : (latest?.listening ?? []).map((l) => ({ artist: l.artist, genre: l.genre, sub: l.era }))
  const listen = pool.length ? [pool[wk % pool.length], pool[(wk + 1) % pool.length]].filter((x, i, a) => a.indexOf(x) === i) : []
  const listenGenres = block.listening?.length ? block.listening.join(' + ') : null

  return (
    <div className="screen home">
      <header className="screen-head">
        <span className="eyebrow">{formatLong(today)}</span>
        <h1>{greeting()}.</h1>
      </header>

      <div className="home-grid">
        <div className="home-main">
          {vision?.statement ? (
            <section className="card vision-card">
              <span className="eyebrow">Your vision</span>
              <blockquote className="vision-quote">“{vision.statement}”</blockquote>
              {plan.milestones && plan.milestones.length > 0 && (
                <div className="milestones">
                  {plan.milestones.map((m) => {
                    const total = m.blocks.length
                    const done = m.blocks.filter((n) => n < pos.block).length
                    const now = m.blocks.includes(pos.block)
                    const next = m.blocks.find((n) => n > pos.block)
                    return (
                      <div key={m.piece} className="milestone">
                        <div className="row-between">
                          <strong>{splitPiece(m.piece).title}</strong>
                          <span className="small muted">
                            {done}/{total} blocks
                          </span>
                        </div>
                        <div className="meter">
                          <span style={{ width: `${Math.max(4, ((done + (now ? 0.5 : 0)) / Math.max(1, total)) * 100)}%` }} />
                        </div>
                        <span className="small muted">{now ? 'You’re working on it now' : next ? `Next up in block ${next}` : total ? 'Milestone reached' : 'Coming up'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          ) : (
            <AssessmentCard />
          )}

          <section className="card jump">
            <span className="eyebrow">
              Block {pos.block} · Week {pos.week}
              {block.towards ? ` · toward “${block.towards}”` : ''}
            </span>
            <h2>{block.title}</h2>
            <ul className="today-parts">
              {parts.map((p) => (
                <li key={p.id} className={draft?.done[p.id] ? 'done' : ''}>
                  <Icon name={draft?.done[p.id] ? 'check' : 'play'} size={14} />
                  <span>
                    <strong>{p.title}:</strong> {p.focus}
                  </span>
                </li>
              ))}
            </ul>
            {todays.length > 0 && !draft ? (
              <a className="btn block" href={href('/practice')}>
                <Icon name="check" /> Done today · {minutesToday} min — share or practice more
              </a>
            ) : (
              <a className="btn primary big block" href={href('/practice')}>
                <Icon name="play" /> {draft ? `Jump back in · ${doneParts}/4 done · ${Math.round(totalElapsed(draft) / 60)} min` : 'Start today’s practice'}
              </a>
            )}
          </section>

          {parts.some((p) => p.labLinks?.length) && (
            <section className="card">
              <h2>This week’s drills</h2>
              <div className="chips wrap">
                {parts.flatMap((p) => p.labLinks ?? []).map((l) => (
                  <a key={l.labUrl} className="chip" href={href(l.labUrl)}>
                    {l.label}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="home-side">
          <section className="card">
            <div className="row-between">
              <h2>Streak</h2>
              <span className="pill fire">
                <Icon name="fire" size={16} /> {stats.current} days
              </span>
            </div>
            <WeekStrip practiced={(d) => stats.byDay.has(d)} frozen={stats.frozen} today={today} />
          </section>

          {songOfDay && (
            <section className="card">
              <span className="eyebrow">Song of the day</span>
              <h3>{songOfDay.label}</h3>
              {songOfDay.sub && <p className="small muted">{songOfDay.sub}</p>}
              <a className="btn sm" href={songOfDay.url} {...(songOfDay.url.startsWith('#') ? {} : { target: '_blank', rel: 'noreferrer' })}>
                <Icon name={songOfDay.url.startsWith('#') ? 'play' : 'external'} size={16} /> {songOfDay.url.startsWith('#/lessons') ? 'Open the lesson' : 'Open in the app'}
              </a>
            </section>
          )}

          {pick && (
            <a className="card-link" href={href(`/lessons/${pick.id}`)}>
              <section className="card pick">
                <span className="eyebrow">Our pick</span>
                <div className="thumb">
                  <img src={ytThumb(data.lessonState[pick.id]?.youtubeId ?? pick.youtubeId)} alt="" loading="lazy" onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')} />
                </div>
                <h3>{pick.title}</h3>
                <p className="small muted">
                  {pick.artist}
                  {pick.summary ? ` — ${pick.summary}` : ''}
                </p>
              </section>
            </a>
          )}

          {listen.length > 0 && (
            <section className="card">
              <span className="eyebrow">Listen this week{listenGenres ? ` · ${listenGenres}` : ''}</span>
              {listen.map((l) => (
                <div key={`${l.artist}|${l.album ?? ''}`} className="listen-row">
                  <div className="grow">
                    <strong>{l.artist}</strong>
                    {l.album && <span> — {l.album}</span>}
                    <div className="small muted">
                      {l.genre}
                      {l.sub ? ` · ${l.sub}` : ''}
                      {l.why ? ` · ${l.why}` : ''}
                    </div>
                  </div>
                  <a className="btn sm" href={`https://open.spotify.com/search/${encodeURIComponent(`${l.artist} ${l.album ?? ''}`.trim())}`} target="_blank" rel="noreferrer">
                    Spotify
                  </a>
                </div>
              ))}
            </section>
          )}

          {vision?.statement && <AssessmentCard />}
        </div>
      </div>
    </div>
  )
}
