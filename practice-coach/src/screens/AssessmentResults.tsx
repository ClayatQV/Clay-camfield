import { startAssessment } from '../assessment/actions'
import type { AssessmentResult, LadderResult } from '../assessment/scoring'
import { SKILL_AREAS } from '../assessment/skills'
import { Icon } from '../components/Icon'
import { formatShort, toKey } from '../lib/dates'
import { href, navigate } from '../lib/router'
import { useData } from '../store/store'
import { NotFound } from './NotFound'

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
const spotify = (q: string) => `https://open.spotify.com/search/${encodeURIComponent(q)}`

export function AssessmentResults({ id }: { id?: string }) {
  const data = useData()
  const all = data.assessment.results
  const r = id ? all.find((x) => x.id === id) : all[all.length - 1]
  if (!r) {
    if (!all.length) {
      return (
        <div className="screen">
          <div className="card empty">
            <h2>No results yet</h2>
            <p>Take the 10-minute assessment and your plan gets built around you.</p>
            <a className="btn primary" href={href('/assessment')}>
              Start the assessment
            </a>
          </div>
        </div>
      )
    }
    return <NotFound />
  }
  const builtFrom = data.plan?.resultId === r.id

  return (
    <div className="screen results">
      <a className="back-link" href={href('/plan')}>
        <Icon name="back" size={20} /> Plan
      </a>

      <section className="card result-hero">
        <span className="eyebrow">Your player type · {formatShort(toKey(new Date(r.takenAt)))}</span>
        <h1>{r.playerType}</h1>
        <ul className="read">
          {r.read.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        {builtFrom ? (
          <a className="btn primary block" href={href('/plan')}>
            See the plan built from this
          </a>
        ) : null}
      </section>

      {r.unlock && (
        <section className="card unlock">
          <span className="eyebrow">Biggest unlock</span>
          <h2>{r.unlock.label[0].toUpperCase() + r.unlock.label.slice(1)}</h2>
          <p>{r.unlock.text}</p>
        </section>
      )}

      {r.adjustments.length > 0 && (
        <section className="card adjust">
          <h2>What the quick checks changed</h2>
          {r.adjustments.map((a, i) => (
            <p key={i} className="small">
              <strong>{a.area}:</strong> {a.reason}
            </p>
          ))}
        </section>
      )}

      <section className="stack">
        <h2>Your genres</h2>
        {r.genres.length === 0 && <p className="small muted">Your top genres don't have a full module yet, so this read is built from your skills.</p>}
        {r.genres.map((g) => (
          <div key={g.id} className="card">
            <div className="row-between">
              <strong>
                #{g.rank} {g.name}
              </strong>
              <span className="pill">{g.known}/20 artists</span>
            </div>
            <Bar value={g.known / 20} />
            <p className="small muted">
              {g.depth === 'listen' ? 'Listening first: start by getting these artists in your ears. ' : ''}
              {g.rootsGap ? 'Roots gap: you know the modern players, not the originators. ' : ''}
              {g.songsPlayable.length ? `You can play ${g.songsPlayable.length} of its standards. ` : ''}
              {g.forms.label ? `Forms: up to ${g.forms.label}.` : ''}
              {g.appliedLevel !== null ? ` Harmony over the changes: ${['basic', 'foundation', 'solid', 'advanced'][g.appliedLevel]}.` : ''}
            </p>
          </div>
        ))}
        {r.topGenres
          .filter((id) => !r.genres.some((g) => g.id === id))
          .map((id) => (
            <p key={id} className="small muted">
              A full {id} module is coming; for now it shapes your taste and listening.
            </p>
          ))}
      </section>

      <section className="card">
        <h2>Skill map</h2>
        <p className="small muted">How far up each ladder you are, and whether you can play it, use it and explain it.</p>
        {SKILL_AREAS.map((a) => (
          <SkillRow key={a.id} name={a.name} r={r.skills[a.id]} />
        ))}
      </section>

      {r.listening.length > 0 && (
        <section className="card">
          <h2>Listening list</h2>
          <p className="small muted">The essentials you don't know yet, roots first. Put one on this week.</p>
          {r.listening.map((l) => (
            <div key={l.genre + l.artist} className="listen-row">
              <div className="grow">
                <strong>{l.artist}</strong>
                <div className="small muted">
                  {l.genre} · {l.era}
                  {l.inst ? ` · ${l.inst}` : ''}
                </div>
              </div>
              <a className="btn sm" href={spotify(l.artist)} target="_blank" rel="noreferrer">
                Spotify
              </a>
              <a className="btn sm" href={yt(`${l.artist} essential`)} target="_blank" rel="noreferrer">
                YouTube
              </a>
            </div>
          ))}
        </section>
      )}

      <Details r={r} />

      <button
        className="btn block"
        onClick={() => {
          startAssessment(true)
          navigate('/assessment')
        }}
      >
        Retake the assessment
      </button>
    </div>
  )
}

function Bar({ value }: { value: number }) {
  return (
    <div className="meter" aria-hidden>
      <span style={{ width: `${Math.max(2, Math.min(1, value) * 100)}%` }} />
    </div>
  )
}

function SkillRow({ name, r }: { name: string; r: LadderResult }) {
  const mark = (v: boolean | undefined, l: string) =>
    v === undefined ? null : (
      <span className={`tag ${v ? 'theory' : 'outside'}`}>
        {v ? '✓' : '✗'} {l}
      </span>
    )
  return (
    <div className="skill-row">
      <div className="row-between">
        <strong>{name}</strong>
        <span className="small muted">
          {r.top + 1}/{r.of}
        </span>
      </div>
      <Bar value={(r.top + 1) / r.of} />
      <div className="small">
        {r.label ? `Up to ${r.label}` : 'Starting from the beginning'}
        {r.next ? <span className="muted"> · next: {r.next}</span> : null}
      </div>
      <div className="row" style={{ gap: 4 }}>
        {mark(r.play, 'play')}
        {mark(r.use, 'use')}
        {mark(r.explain, 'explain')}
        {r.adjusted && <span className="tag fast">adjusted</span>}
      </div>
    </div>
  )
}

function Details({ r }: { r: AssessmentResult }) {
  const rows: [string, string][] = [
    ['Influences', r.influences.join(', ')],
    ['Want to sound like', r.targets.join(', ')],
    ['Practice', `${r.goals.minutes} min × ${r.goals.days} days`],
    ['Goals', r.goals.next.join(', ')],
    ['Songs to learn', r.goals.songs.join(', ')],
  ].filter(([, v]) => v) as [string, string][]
  if (!rows.length) return null
  return (
    <section className="card">
      <details>
        <summary>Your answers at a glance</summary>
        <div className="stack-sm">
          {rows.map(([k, v]) => (
            <div key={k}>
              <span className="label">{k}</span>
              <div>{v}</div>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}
