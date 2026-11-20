import { useEffect, useRef, useState } from 'react'
import type { AiResult } from '../../api/_lib/schemas'
import { resultsRequest, setResult, startInterview } from '../ai/actions'
import { getResults } from '../ai/client'
import { LEVEL_NAMES } from '../ai/hooks'
import { Icon } from '../components/Icon'
import { formatShort, toKey } from '../lib/dates'
import { href, navigate } from '../lib/router'
import { useData } from '../store/store'

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
const spotify = (q: string) => `https://open.spotify.com/search/${encodeURIComponent(q)}`

/** Results of the AI assessment; generates them first if the interview just finished. */
export function AiResults() {
  const data = useData()
  const { interview: iv, result, resultAt } = data.ai
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  const needGenerate = !result && !!iv?.done

  useEffect(() => {
    if (!needGenerate || busy.current || error || !iv) return
    busy.current = true
    getResults(resultsRequest(iv))
      .then((core) => setResult({ ...core, modules: [] }))
      .catch((e) => setError(e instanceof Error ? e.message : 'Something went wrong.'))
      .finally(() => {
        busy.current = false
      })
  }, [needGenerate, error, iv])

  if (!result) {
    if (!iv?.done) {
      return (
        <div className="screen">
          <div className="card empty">
            <h2>No results yet</h2>
            <p>Finish the assessment and your results appear here.</p>
            <a className="btn primary" href={href('/assessment')}>
              Go to the assessment
            </a>
          </div>
        </div>
      )
    }
    return (
      <div className="screen">
        <div className="card empty">
          {error ? (
            <>
              <h2>Couldn't build your results</h2>
              <p className="small muted">{error}</p>
              <button className="btn primary" onClick={() => setError(null)}>
                Try again
              </button>
            </>
          ) : (
            <>
              <span className="ai-dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <h2>Reading everything you told me…</h2>
              <p className="small muted">Your player profile: strengths, gaps, taste. About half a minute.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return <ResultView r={result} at={resultAt} />
}

function ResultView({ r, at }: { r: AiResult; at: string | null }) {
  const areas = [...new Set(r.skills.map((s) => s.area))]
  const checks = r.profile.trust >= 0.95 ? 'All quick checks right' : r.profile.trust >= 0.7 ? 'Most quick checks right' : 'Several quick checks missed — levels adjusted'
  return (
    <div className="screen results">
      <a className="back-link" href={href('/assessment')}>
        <Icon name="back" size={20} /> Assessment
      </a>

      <section className="card result-hero">
        <span className="eyebrow">Your player type{at ? ` · ${formatShort(toKey(new Date(at)))}` : ''}</span>
        <h1>{r.profile.type}</h1>
        <ul className="read">
          {r.profile.read.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="small muted">{checks}.</p>
        <a className="btn primary big block" href={href('/assessment/build')}>
          Build your practice routine
        </a>
      </section>

      {r.vision.statement && (
        <section className="card vision-card">
          <span className="eyebrow">Your vision</span>
          <blockquote className="vision-quote">“{r.vision.statement}”</blockquote>
          {r.vision.pieces.length > 0 && (
            <div className="stack">
              {r.vision.pieces.map((p) => (
                <div key={p.title} className="piece">
                  <strong>
                    {p.title}
                    {p.artist ? <span className="muted"> — {p.artist}</span> : null}
                  </strong>
                  <div className="piece-cols small">
                    <div>
                      <span className="label">You have</span>
                      <div>{p.have.length ? p.have.join(' · ') : '—'}</div>
                    </div>
                    <div>
                      <span className="label">Still missing</span>
                      <div>{p.missing.length ? p.missing.join(' · ') : 'Nothing major — go play it'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {r.vision.wants.length > 0 && <p className="small muted">Wants: {r.vision.wants.join(' · ')}</p>}
        </section>
      )}

      <section className="card">
        <h2>Skill map</h2>
        <p className="small muted">Six steps per skill: not yet → know it → play it slowly → at tempo → use it in music → can teach it.</p>
        {areas.map((a) => (
          <div key={a} className="skill-area">
            <span className="eyebrow">{a}</span>
            {r.skills
              .filter((s) => s.area === a)
              .map((s) => (
                <div key={s.skill} className="skill-row" title={s.evidence}>
                  <div className="row-between">
                    <strong>{s.skill}</strong>
                    <span className="small muted">{LEVEL_NAMES[s.level]}</span>
                  </div>
                  <div className="level-meter" aria-label={`${s.skill}: ${LEVEL_NAMES[s.level]}`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <i key={n} className={n <= s.level ? 'on' : ''} />
                    ))}
                  </div>
                  <div className="small muted">{s.evidence}</div>
                </div>
              ))}
          </div>
        ))}
      </section>

      <section className="card unlock">
        <h2>What unlocks your vision</h2>
        <ol className="gaps">
          {r.gaps.map((g) => (
            <li key={g.skill}>
              <strong>{g.skill}</strong>
              <span className="small muted">
                {' '}
                · {LEVEL_NAMES[g.from]} → {LEVEL_NAMES[g.to]}
              </span>
              <div className="small">{g.why}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>Taste profile</h2>
        <div className="row" style={{ gap: 6 }}>
          {r.taste.genres
            .sort((a, b) => a.rank - b.rank)
            .map((g) => (
              <span key={g.id} className="tag">
                #{g.rank} {g.name} · {g.depth}
              </span>
            ))}
        </div>
        {r.taste.dimensions.length > 0 && (
          <div className="stack-sm">
            {r.taste.dimensions.map((d) => (
              <div key={d.name} className="row-between small">
                <span className="muted">{d.name}</span>
                <strong>{d.lean}</strong>
              </div>
            ))}
          </div>
        )}
        {r.taste.inspires.length > 0 && (
          <p className="small">
            <strong>What inspires you:</strong> {r.taste.inspires.join(' · ')}
          </p>
        )}
        {r.taste.listening.length > 0 && (
          <div className="stack-sm">
            <span className="label">Albums to put on this week</span>
            {r.taste.listening.map((l) => (
              <div key={l.artist} className="listen-row">
                <div className="grow">
                  <strong>{l.album ? `${l.artist} — ${l.album}` : l.artist}</strong>
                  <div className="small muted">
                    {l.genre} · {l.why}
                  </div>
                </div>
                <a className="btn sm" href={spotify(`${l.artist} ${l.album ?? ''}`.trim())} target="_blank" rel="noreferrer">
                  Spotify
                </a>
                <a className="btn sm" href={yt(`${l.artist} ${l.album ?? ''} full album`.trim())} target="_blank" rel="noreferrer">
                  YouTube
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Next: build your practice routine</h2>
        <p className="small muted">The coach drafts a routine from this profile and what you said you want to work on first. You keep, swap, drop, reorder, set time, and add your own.</p>
        <a className="btn primary big block" href={href('/assessment/build')}>
          Build your practice routine
        </a>
      </section>

      <button
        className="btn block"
        onClick={() => {
          if (confirm('Retake the whole assessment? Your current results stay until the new ones are ready.')) {
            startInterview(true)
            navigate('/assessment/ai')
          }
        }}
      >
        Retake the assessment
      </button>
    </div>
  )
}
