import { useEffect, useRef, useState } from 'react'
import type { AiModule } from '../../api/_lib/schemas'
import { applyBuild, setBuildModules, setBuildTime, setModules } from '../ai/actions'
import { getModules, writeModule } from '../ai/client'
import { Icon } from '../components/Icon'
import { toast } from '../components/Toast'
import { href, navigate } from '../lib/router'
import { useData } from '../store/store'

/** The player shapes the recommended curriculum, then it becomes their plan. */
export function BuildPlan() {
  const data = useData()
  const { result, build, interview } = data.ai
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [request, setRequest] = useState('')
  const [genError, setGenError] = useState<string | null>(null)
  const [customMin, setCustomMin] = useState('')
  const generating = useRef(false)

  // First visit after results: have the coach draft the routine now (not during results).
  const needModules = !!result && result.modules.length === 0 && !genError
  useEffect(() => {
    if (!needModules || generating.current || !result) return
    generating.current = true
    const { modules: _m, ...core } = result
    void _m
    const turns = interview?.turns ?? []
    getModules({ turns, core })
      .then(({ modules }) => setModules(modules))
      .catch((e) => setGenError(e instanceof Error ? e.message : 'Something went wrong.'))
      .finally(() => {
        generating.current = false
      })
  }, [needModules, result, interview])

  if (result && result.modules.length === 0) {
    return (
      <div className="screen">
        <div className="card empty">
          {genError ? (
            <>
              <h2>Couldn't draft your routine</h2>
              <p className="small muted">{genError}</p>
              <button className="btn primary" onClick={() => setGenError(null)}>
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
              <h2>Drafting your practice routine…</h2>
              <p className="small muted">Built from your profile and what you said you want to work on first. About half a minute. You shape it next.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!result || !build) {
    return (
      <div className="screen">
        <div className="card empty">
          <h2>Nothing to build yet</h2>
          <p>Take the assessment first; the coach recommends a curriculum you can shape here.</p>
          <a className="btn primary" href={href('/assessment')}>
            Go to the assessment
          </a>
        </div>
      </div>
    )
  }

  const mods = build.modules
  const totalWeeks = mods.reduce((s, m) => s + m.weeks, 0)
  const set = (next: AiModule[]) => setBuildModules(next)
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= mods.length) return
    const next = [...mods]
    ;[next[i], next[j]] = [next[j], next[i]]
    set(next)
  }
  const ctx = { profile: result.profile, vision: result.vision, skills: result.skills, gaps: result.gaps, taste: result.taste }

  async function swap(i: number) {
    const m = mods[i]
    setBusyId(m.id)
    try {
      const fresh = await writeModule({
        request: `Something different from "${m.title}" (${m.why}) that still serves ${m.towards ? `"${m.towards}"` : m.trains.join(', ')}. Different approach or material, same purpose.`,
        result: ctx,
        existing: mods.map((x) => x.title),
      })
      set(mods.map((x, k) => (k === i ? { ...fresh, id: `${fresh.id}-${Date.now().toString(36)}` } : x)))
      toast('Swapped')
    } catch (e) {
      toast(`Swap failed: ${e instanceof Error ? e.message : 'unknown error'}`, 5000)
    } finally {
      setBusyId(null)
    }
  }

  async function add() {
    if (!request.trim()) return
    setBusyId('new')
    try {
      const fresh = await writeModule({ request: request.trim(), result: ctx, existing: mods.map((x) => x.title) })
      set([...mods, { ...fresh, id: `${fresh.id}-${Date.now().toString(36)}` }])
      setRequest('')
      setAdding(false)
      toast('Added to your plan')
    } catch (e) {
      toast(`Add failed: ${e instanceof Error ? e.message : 'unknown error'}`, 5000)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="screen">
      <a className="back-link" href={href('/assessment/ai/results')}>
        <Icon name="back" size={20} /> Results
      </a>
      <div className="screen-head">
        <span className="eyebrow">Build your practice plan</span>
        <h1>Make it yours</h1>
        <p className="muted small">
          The coach's recommendation, in order. Keep what inspires you, swap what doesn't, add what you want. Modules are 1–3 weeks; you can repeat any of them.
        </p>
      </div>

      <section className="card">
        <div className="row-between">
          <h2>Time</h2>
          <span className="small muted">{totalWeeks} weeks total</span>
        </div>
        <div className="field">
          <span className="label">Minutes a day · {build.minutes}</span>
          <div className="seg full" role="group">
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <button key={m} aria-pressed={build.minutes === m} onClick={() => setBuildTime(m, build.days)}>
                {m}
              </button>
            ))}
          </div>
          <div className="row">
            <input
              className="input"
              style={{ maxWidth: 160 }}
              type="number"
              inputMode="numeric"
              min={5}
              max={720}
              placeholder="Custom minutes"
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              onBlur={() => {
                const n = Math.round(Number(customMin))
                if (n >= 5 && n <= 720) setBuildTime(n, build.days)
              }}
            />
            <span className="small muted">Two short warm-ups on your gaps, the idea, then about half the time on a song you chose.</span>
          </div>
        </div>
        <div className="field">
          <span className="label">Days a week</span>
          <div className="seg full" role="group">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <button key={d} aria-pressed={build.days === d} onClick={() => setBuildTime(build.minutes, d)}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="stack">
        {mods.map((m, i) => (
          <article key={m.id} className={`card module-card${busyId === m.id ? ' busy' : ''}`}>
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div className="stack-sm" style={{ gap: 2 }}>
                <span className="eyebrow">
                  Module {i + 1}
                  {m.towards ? ` · toward “${m.towards}”` : ''}
                </span>
                <h3>{m.title}</h3>
              </div>
              <div className="seg" role="group" aria-label="Weeks">
                {[1, 2, 3].map((w) => (
                  <button key={w} aria-pressed={m.weeks === w} onClick={() => set(mods.map((x, k) => (k === i ? { ...x, weeks: w } : x)))}>
                    {w}w
                  </button>
                ))}
              </div>
            </div>
            <p className="why">Why: {m.why}</p>
            <details>
              <summary>What's in it</summary>
              <div className="stack-sm small">
                <div>
                  <span className="label">Daily warm-ups</span>
                  {m.warmups.map((w) => (
                    <div key={w.label}>
                      <strong>{w.label}</strong> — {w.instruction}
                    </div>
                  ))}
                </div>
                <div>
                  <span className="label">The idea</span>
                  <div>
                    <strong>{m.concept.label}</strong> — {m.concept.instruction}
                  </div>
                </div>
                <div>
                  <span className="label">Apply it to</span>
                  <div>{m.application.songs.map((s) => `${s.title} (${s.artist})`).join(' · ')}</div>
                  <div className="muted">{m.application.instruction}</div>
                </div>
                <div>
                  <span className="label">Done when</span>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {m.doneWhen.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
            <div className="row module-actions">
              <button className="btn sm icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                ↑
              </button>
              <button className="btn sm icon" onClick={() => move(i, 1)} disabled={i === mods.length - 1} aria-label="Move down">
                ↓
              </button>
              <button className="btn sm" onClick={() => swap(i)} disabled={busyId !== null}>
                {busyId === m.id ? 'Swapping…' : 'Swap'}
              </button>
              <button className="btn sm ghost" onClick={() => set(mods.filter((_, k) => k !== i))} disabled={mods.length <= 1}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>Add something you want</h2>
        {adding ? (
          <form
            className="stack-sm"
            onSubmit={(e) => {
              e.preventDefault()
              void add()
            }}
          >
            <input className="input" autoFocus placeholder="e.g. the solo on Isn’t She Lovely, or get my sweep picking clean" value={request} onChange={(e) => setRequest(e.target.value)} />
            <div className="row">
              <button type="button" className="btn grow" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary grow" disabled={!request.trim() || busyId !== null}>
                {busyId === 'new' ? 'Writing it…' : 'Add module'}
              </button>
            </div>
          </form>
        ) : (
          <button className="btn block" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} /> Add my own module
          </button>
        )}
        <button className="btn sm ghost" onClick={() => set(result.modules)}>
          Reset to the coach's recommendation
        </button>
      </section>

      <button
        className="btn primary big block"
        disabled={!mods.length}
        onClick={() => {
          if (applyBuild()) {
            toast('Your plan is ready — starting today')
            navigate('/plan')
          }
        }}
      >
        <Icon name="check" /> Make this my plan · {totalWeeks} weeks
      </button>
      {data.plan && <p className="small muted" style={{ textAlign: 'center' }}>Your current plan stays restorable from the Plan page.</p>}
    </div>
  )
}
