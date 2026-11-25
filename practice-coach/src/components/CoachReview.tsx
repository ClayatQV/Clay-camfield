import { useState } from 'react'
import { useAiStatus } from '../ai/hooks'
import { acceptProposal, reviewDue, runReview, vetoProposal } from '../ai/review'
import { useToday } from '../lib/hooks'
import { useData } from '../store/store'
import { Icon } from './Icon'
import { toast } from './Toast'

/**
 * The coach's weekly note: what the logs show, and small proposals the
 * player accepts or vetoes. Shown on Home and Plan when there's something
 * to say, with an "ask now" button when enough new practice has been logged.
 */
export function CoachReview({ always = false }: { always?: boolean }) {
  const data = useData()
  const today = useToday()
  const ai = useAiStatus()
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const latest = data.coach.reviews[data.coach.reviews.length - 1]
  const open = latest?.proposals.filter((p) => p.status === 'open') ?? []
  const due = reviewDue(data, today)
  const canAsk = ai.configured && ai.hasPasscode
  const fresh = latest && Date.now() - Date.parse(latest.at) < 7 * 86400e3

  if (!latest && !due && !always) return null
  if (latest && !open.length && !due && !always && !fresh) return null

  async function ask() {
    setBusy('review')
    setErr(null)
    try {
      await runReview(today)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }
  async function accept(pid: string) {
    if (!latest) return
    const p = latest.proposals.find((x) => x.id === pid)
    if (!p) return
    setBusy(pid)
    try {
      toast(await acceptProposal(latest.id, p, today), 3500)
    } catch (e) {
      toast(`Couldn't apply that: ${e instanceof Error ? e.message : 'unknown error'}`, 5000)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card coach-review">
      <div className="row-between">
        <span className="eyebrow">Coach's review{latest ? ` · ${latest.at.slice(0, 10)}` : ''}</span>
        {canAsk && (
          <button className="btn sm" onClick={() => void ask()} disabled={busy !== null}>
            {busy === 'review' ? 'Reading your week…' : latest ? 'Review again' : 'Ask for a review'}
          </button>
        )}
      </div>
      {!latest && (
        <p className="small muted">
          {canAsk ? 'You have logged enough practice for the coach to look at your week: what the timers, tempos and the Lab say, and what it would change.' : 'The coach needs the server and your passcode (Assessment page) to review your week.'}
        </p>
      )}
      {err && <p className="small" style={{ color: 'var(--amber)' }}>{err}</p>}
      {latest && (
        <>
          <p>{latest.note}</p>
          {latest.proposals.length > 0 && (
            <div className="stack-sm">
              {latest.proposals.map((p) => (
                <div key={p.id} className={`proposal${p.status !== 'open' ? ' ' + p.status : ''}`}>
                  <div className="grow">
                    <strong>{p.title}</strong>
                    <div className="small muted">{p.evidence}</div>
                  </div>
                  {p.status === 'open' ? (
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn sm ghost" onClick={() => vetoProposal(latest.id, p.id)} disabled={busy !== null}>
                        Not now
                      </button>
                      <button className="btn sm primary" onClick={() => void accept(p.id)} disabled={busy !== null}>
                        {busy === p.id ? 'Applying…' : 'Accept'}
                      </button>
                    </div>
                  ) : (
                    <span className="pill">
                      <Icon name={p.status === 'accepted' ? 'check' : 'close'} size={14} /> {p.status === 'accepted' ? (p.kind === 'note' ? 'Noted' : 'Done') : 'Vetoed'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {data.coach.memory && (
            <details className="small">
              <summary className="muted">What the coach remembers about you</summary>
              <p className="muted">{data.coach.memory}</p>
            </details>
          )}
        </>
      )}
    </section>
  )
}
