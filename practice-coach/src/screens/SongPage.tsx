import { moduleIn } from '../ai/actions'
import { Icon } from '../components/Icon'
import { SongViewer } from '../components/SongViewer'
import { href } from '../lib/router'
import { useData } from '../store/store'

/** A song from the plan, inside the app (video search, looper, reroll). */
export function SongPage({ query }: { query: URLSearchParams }) {
  const title = (query.get('title') ?? '').trim()
  const artist = (query.get('artist') ?? '').trim()
  const moduleId = query.get('m') ?? undefined
  const data = useData()
  const module = moduleId ? moduleIn(data, moduleId) : undefined

  if (!title) {
    return (
      <div className="screen">
        <div className="card empty">
          <h2>Which song?</h2>
          <p className="small muted">Open this page from a song in your plan.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="screen">
      <a className="back-link" href={href('/practice')}>
        <Icon name="back" size={20} /> Practice
      </a>
      <div className="screen-head">
        <span className="eyebrow">{module ? `${module.title} · ${module.emphasis ?? 'application'}` : 'Application'}</span>
        <h1>{title}</h1>
        {artist && <p className="muted">{artist}</p>}
        {module && (
          <p className="small">
            <strong>The idea:</strong> {module.concept.label}. {module.application.instruction}
          </p>
        )}
      </div>
      <SongViewer title={title} artist={artist} moduleId={moduleId} />
    </div>
  )
}
