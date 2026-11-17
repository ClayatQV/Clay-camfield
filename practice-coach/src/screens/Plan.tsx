import { BLOCKS } from '../content/blocks'
import { COMMITMENT, PROFILE } from '../content/profile'
import { tunesForBlock } from '../content/repertoire'
import type { PartId } from '../content/types'
import { Icon } from '../components/Icon'
import { formatShort, addDays } from '../lib/dates'
import { useToday } from '../lib/hooks'
import { planPosition } from '../lib/plan'
import { href } from '../lib/router'
import { sessionParts } from '../lib/session'
import { update, useData } from '../store/store'
import { REPERTOIRE } from '../content/repertoire'
import { AssessmentCard } from '../components/AssessmentCard'

const PART_NAMES: Record<PartId, string> = { triads: 'Triads', arps: 'Arpeggios', concept: 'Concept', application: 'Application' }

export function Plan({ blockParam }: { blockParam?: string }) {
  const n = Number(blockParam)
  if (blockParam && n >= 1 && n <= BLOCKS.length) return <BlockDetail n={n} />
  return <PlanHome />
}

function PlanHome() {
  const data = useData()
  const today = useToday()
  const pos = planPosition(data.settings, today)
  const p = PROFILE

  return (
    <div className="screen">
      <div className="screen-head">
        <span className="eyebrow">Plan</span>
        <h1>Six months, nine blocks</h1>
        <p className="muted small">
          {COMMITMENT} Started {formatShort(data.settings.planStart)}
          {pos.source === 'override' ? ' · pinned' : ''}. <a href={href('/settings')}>Change</a>
        </p>
      </div>

      <AssessmentCard />

      <section className="stack-sm" aria-label="Block sequence">
        {BLOCKS.map((b) => {
          const current = b.n === pos.block
          const past = b.n < pos.block
          const startDay = addDays(data.settings.planStart, (b.weeks[0] - 1) * 7)
          return (
            <a key={b.n} href={href(`/plan/block/${b.n}`)} className="card-link">
              <div className={`card block-row${current ? ' current' : ''}${past ? ' past' : ''}`}>
                <div className="block-num" aria-hidden>
                  {past ? <Icon name="check" size={18} /> : b.n}
                </div>
                <div className="grow stack-sm" style={{ gap: 2 }}>
                  <div className="row-between">
                    <strong>{b.title}</strong>
                  </div>
                  <span className="small muted">
                    Weeks {b.weeks[0]}–{b.weeks[1]}
                    {pos.source === 'auto' ? ` · from ${formatShort(startDay)}` : ''}
                    {current ? ` · now in week ${pos.week}` : ''}
                  </span>
                  <span className="small">{b.summary}</span>
                </div>
                <span className="muted" aria-hidden>
                  ›
                </span>
              </div>
            </a>
          )
        })}
      </section>

      <section className="card">
        <span className="eyebrow">Player profile</span>
        <h2>{p.identity}</h2>
        <Profile label="North star" text={p.northStar} />
        <Profile label="The test" text={p.test} />
        <Profile label="Chasing" text={p.chasing} />
        <Profile label="Strengths" text={p.strengths} />
        <Profile label="Gaps" text={p.gaps} />
        <Profile label="Theory" text={p.theory} />
        <Profile label="Core problem" text={p.coreProblem} />
        <details>
          <summary>Listening, heroes and learning style</summary>
          <div className="stack">
            <Profile label="Top genres (Spotify, 12 months)" text={p.listening.genres.join(', ')} />
            <Profile label="Top artists" text={p.listening.artists.join(', ')} />
            <Profile label="Guitar heroes now" text={p.guitarHeroesNow.join(', ')} />
            <Profile label="Foundation" text={p.foundation.join(', ')} />
            <Profile label="Learning style" text={p.learningStyle} />
          </div>
        </details>
      </section>

      <section className="card">
        <h2>Repertoire bank</h2>
        <div className="table-wrap">
          <table className="plain">
            <thead>
              <tr>
                <th>Tune</th>
                <th>Lane</th>
                <th>Blocks</th>
              </tr>
            </thead>
            <tbody>
              {REPERTOIRE.map((t) => (
                <tr key={t.title}>
                  <td>
                    <strong>{t.title}</strong>
                    <div className="small muted">{t.artist}</div>
                  </td>
                  <td className="small">{t.lane}</td>
                  <td className="small mono">{t.blocks.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Profile({ label, text }: { label: string; text: string }) {
  return (
    <div className="stack-sm" style={{ gap: 2 }}>
      <span className="label">{label}</span>
      <span>{text}</span>
    </div>
  )
}

function BlockDetail({ n }: { n: number }) {
  const data = useData()
  const today = useToday()
  const pos = planPosition(data.settings, today)
  const b = BLOCKS[n - 1]
  const d = b.detail
  const tunes = tunesForBlock(n)
  const isCurrent = pos.block === n

  return (
    <div className="screen">
      <a className="back-link" href={href('/plan')}>
        <Icon name="back" size={20} /> Plan
      </a>
      <div className="screen-head">
        <span className="eyebrow">
          Block {b.n} · Weeks {b.weeks[0]}–{b.weeks[1]}
          {isCurrent ? ` · you're in week ${pos.week}` : ''}
        </span>
        <h1>{b.title}</h1>
        <p className="muted">{b.summary}</p>
      </div>

      {d ? (
        <>
          <section className="card">
            <h2>Daily session</h2>
            <div className="table-wrap">
              <table className="plain">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>30</th>
                    <th>60</th>
                    <th>What</th>
                  </tr>
                </thead>
                <tbody>
                  {d.daily.map((r) => (
                    <tr key={r.part}>
                      <td>
                        <strong>{PART_NAMES[r.part]}</strong>
                      </td>
                      <td className="mono">{r.m30}</td>
                      <td className="mono">{r.m60}</td>
                      <td className="small">{r.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="stack">
            <h2>Week by week</h2>
            {d.table.map((w) => {
              const cur = isCurrent && pos.week === w.week
              const parts = sessionParts(n, w.week).parts
              return (
                <div key={w.week} className={`card week-card${cur ? ' current' : ''}`}>
                  <div className="row-between">
                    <strong>Week {w.week}</strong>
                    {cur && <span className="pill">This week</span>}
                  </div>
                  <WeekRow label="Triads" text={w.triads} link={parts[0].labLinks?.[0]?.labUrl} />
                  <WeekRow label="Arpeggios" text={w.arps} link={parts[1].labLinks?.[0]?.labUrl} />
                  <WeekRow label="Concept" text={w.concept} link={parts[2].labLinks?.[0]?.labUrl} />
                  <WeekRow label="Application" text={w.application} lesson={parts[3].lessonId} />
                </div>
              )
            })}
          </section>

          <section className="card">
            <h2>Done when</h2>
            {d.doneWhen.map((t, i) => {
              const key = `b${n}:${i}`
              const checked = !!data.doneWhen[key]
              return (
                <label key={key} className="check-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      update((x) => {
                        const next = { ...x.doneWhen }
                        if (checked) delete next[key]
                        else next[key] = true
                        return { ...x, doneWhen: next }
                      })
                    }
                  />
                  <span style={checked ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>{t}</span>
                </label>
              )
            })}
          </section>

          {(d.tune || d.notes) && (
            <section className="card">
              {d.tune && (
                <>
                  <span className="label">Block tune</span>
                  <strong>
                    “{d.tune.title}” <span className="muted">— {d.tune.artist}</span>
                  </strong>
                </>
              )}
              {d.notes?.map((t) => (
                <p key={t} className="small">
                  {t}
                </p>
              ))}
            </section>
          )}
        </>
      ) : (
        <section className="card empty">
          <p>The week-by-week detail for this block gets written when you get close to it.</p>
          <p className="small">Until then, Today runs the permanent triads and arpeggios plus this block's focus.</p>
        </section>
      )}

      {tunes.length > 0 && (
        <section className="card">
          <h2>Tunes for this block</h2>
          {tunes.map((t) => (
            <div key={t.title} className="row-between">
              <span>
                <strong>{t.title}</strong> <span className="muted small">· {t.artist}</span>
              </span>
              <span className="tag">{t.lane}</span>
            </div>
          ))}
        </section>
      )}

      <div className="row">
        {n > 1 && (
          <a className="btn grow" href={href(`/plan/block/${n - 1}`)}>
            ‹ Block {n - 1}
          </a>
        )}
        {n < BLOCKS.length && (
          <a className="btn grow" href={href(`/plan/block/${n + 1}`)}>
            Block {n + 1} ›
          </a>
        )}
      </div>
    </div>
  )
}

function WeekRow({ label, text, link, lesson }: { label: string; text: string; link?: string; lesson?: string }) {
  const target = link ? href(link) : lesson ? href(`/lessons/${lesson}`) : null
  return (
    <div className="week-row">
      <span className="label">{label}</span>
      <span className="small">{text}</span>
      {target && (
        <a className="small" href={target}>
          {link ? 'Open in Lab ›' : 'Open lesson ›'}
        </a>
      )}
    </div>
  )
}
