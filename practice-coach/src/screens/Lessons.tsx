import { Icon } from '../components/Icon'
import { toast } from '../components/Toast'
import { allLessons, setLessonStatus, type ResolvedLesson } from '../lib/lessons'
import { href, navigate } from '../lib/router'
import { ytThumb } from '../lib/youtube'
import { useData } from '../store/store'

type StatusFilter = 'approved' | 'review' | 'rejected'

export function Lessons({ query }: { query: URLSearchParams }) {
  const data = useData()
  const lessons = allLessons(data)
  const status = (query.get('status') as StatusFilter) || 'approved'
  const tag = query.get('tag') || ''

  const want = status === 'review' ? 'candidate' : status
  const byStatus = lessons.filter((l) => l.effectiveStatus === want)
  // Tags offered = concepts used by lessons in the current status (plus the selected one).
  const tags = [...new Set(byStatus.flatMap((l) => l.concepts))].sort((a, b) => a.localeCompare(b))
  if (tag && !tags.includes(tag)) tags.unshift(tag)
  const shown = tag ? byStatus.filter((l) => l.concepts.includes(tag)) : byStatus
  const counts = {
    approved: lessons.filter((l) => l.effectiveStatus === 'approved').length,
    review: lessons.filter((l) => l.effectiveStatus === 'candidate').length,
    rejected: lessons.filter((l) => l.effectiveStatus === 'rejected').length,
  }

  const go = (s: StatusFilter, t: string) => {
    const q = new URLSearchParams()
    if (s !== 'approved') q.set('status', s)
    if (t) q.set('tag', t)
    const qs = q.toString()
    navigate('/lessons' + (qs ? '?' + qs : ''), { replace: true })
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <span className="eyebrow">Lessons</span>
        <h1>Real music, tab on screen</h1>
      </div>

      <div className="seg full" role="group" aria-label="Status">
        {(['approved', 'review', 'rejected'] as StatusFilter[]).map((s) => (
          <button key={s} aria-pressed={status === s} onClick={() => go(s, '')}>
            {s === 'approved' ? 'Approved' : s === 'review' ? 'To review' : 'Rejected'}
            {counts[s] > 0 && <span className="count"> {counts[s]}</span>}
          </button>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="chips" role="group" aria-label="Concept">
          <button className="chip" aria-pressed={!tag} onClick={() => go(status, '')}>
            All concepts
          </button>
          {tags.map((t) => (
            <button key={t} className="chip" aria-pressed={tag === t} onClick={() => go(status, tag === t ? '' : t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="card empty">
          <Icon name="lessons" size={32} />
          {status === 'review' ? (
            <p>Nothing to review. New candidate lessons show up here.</p>
          ) : status === 'rejected' ? (
            <p>No rejected lessons.</p>
          ) : (
            <p>No approved lessons{tag ? ` tagged “${tag}”` : ''} yet.</p>
          )}
          {tag && (
            <button className="btn" onClick={() => go(status, '')}>
              Show all concepts
            </button>
          )}
        </div>
      ) : (
        <div className="stack">
          {shown.map((l) => (
            <LessonCard key={l.id} l={l} review={status === 'review'} />
          ))}
        </div>
      )}
    </div>
  )
}

function LessonCard({ l, review }: { l: ResolvedLesson; review: boolean }) {
  return (
    <article className="card lesson-card">
      <a href={href(`/lessons/${l.id}`)} className="lesson-link">
        <div className="thumb">
          <img src={ytThumb(l.effectiveVideo)} alt="" loading="lazy" onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')} />
          <span className="thumb-kind">{l.kind === 'concept' ? 'Concept' : 'Song'}</span>
        </div>
        <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
          <strong className="lesson-title">{l.title}</strong>
          <span className="small muted">
            {l.artist}
            {l.year ? ` · ${l.year}` : ''}
          </span>
          <span className="small muted">
            {l.barMap?.length ? `Bar map · ${l.moments?.length ?? 0} loops` : l.kind === 'concept' ? 'Concept video' : 'Analysis coming'}
          </span>
        </div>
      </a>
      <div className="row" style={{ gap: 4 }}>
        {l.concepts.slice(0, 4).map((c) => (
          <span key={c} className="tag">
            {c}
          </span>
        ))}
        {l.concepts.length > 4 && <span className="tag">+{l.concepts.length - 4}</span>}
      </div>
      {review && (
        <>
          {l.verification && <p className="small muted">{l.verification}</p>}
          <div className="row">
            <button
              className="btn sm danger grow"
              onClick={() => {
                setLessonStatus(l.id, 'rejected', l.effectiveVideo)
                toast(`Rejected “${l.title}”`)
              }}
            >
              <Icon name="close" size={16} /> Reject
            </button>
            <a className="btn sm grow" href={href(`/lessons/${l.id}`)}>
              Check video
            </a>
            <button
              className="btn sm primary grow"
              onClick={() => {
                setLessonStatus(l.id, 'approved', l.effectiveVideo)
                toast(`Approved “${l.title}”`)
              }}
            >
              <Icon name="check" size={16} /> Approve
            </button>
          </div>
        </>
      )}
    </article>
  )
}
