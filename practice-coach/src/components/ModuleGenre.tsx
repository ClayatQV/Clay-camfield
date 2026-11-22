import { useState } from 'react'
import { GENRES } from '../../api/_lib/genres'
import { rerollSong, setModuleGenre, setModuleListening } from '../ai/actions'
import { songLink } from '../plan/fromModules'
import { useData } from '../store/store'
import { Icon } from './Icon'
import { toast } from './Toast'

/**
 * A module's genre emphasis, its songs (each with "Pick a new song"), and its
 * listening genres and album picks. Changing the genre or rerolling a song
 * touches the songs only; the concept, warm-ups and checks stay.
 * Used on the Build page, the Plan block page and (songs only) Practice.
 */
export function ModuleGenre({ moduleId, compact = false }: { moduleId: string; compact?: boolean }) {
  const data = useData()
  const m = data.ai.build?.modules.find((x) => x.id === moduleId)
  const [busy, setBusy] = useState<string | null>(null)
  if (!m) return null
  const ranked = data.ai.result?.taste.genres.map((g) => g.name) ?? []
  const options = [...new Set([...(m.emphasis ? [m.emphasis] : []), ...ranked, ...GENRES])]
  const listeningOptions = [...new Set([...ranked, ...GENRES])]

  async function changeGenre(genre: string) {
    if (!genre || genre === m!.emphasis) return
    setBusy('genre')
    try {
      await setModuleGenre(moduleId, genre)
      toast(`Songs are now in ${genre}`)
    } catch (e) {
      toast(`Couldn't switch genre: ${e instanceof Error ? e.message : 'unknown error'}`, 5000)
    } finally {
      setBusy(null)
    }
  }
  async function reroll(title: string) {
    setBusy(title)
    try {
      await rerollSong(moduleId, title)
      toast('New song picked')
    } catch (e) {
      toast(`Couldn't pick a new song: ${e instanceof Error ? e.message : 'unknown error'}`, 5000)
    } finally {
      setBusy(null)
    }
  }
  const setListen = (i: 0 | 1, v: string) => {
    const next = [...(m.listening ?? [])]
    if (v) next[i] = v
    else next.splice(i, 1)
    setModuleListening(moduleId, [...new Set(next.filter(Boolean))])
  }

  return (
    <div className="module-genre stack-sm">
      <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="small" htmlFor={`genre-${moduleId}`}>
          <strong>Songs in</strong>
        </label>
        <select id={`genre-${moduleId}`} className="input" style={{ maxWidth: 240 }} value={m.emphasis ?? ''} disabled={busy !== null} onChange={(e) => void changeGenre(e.target.value)}>
          {!m.emphasis && <option value="">Coach's pick</option>}
          {options.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        {busy === 'genre' && <span className="small muted">Finding the same idea in that genre…</span>}
        {!compact && busy !== 'genre' && <span className="small muted">Same idea, different vehicle. Only the songs change.</span>}
      </div>

      <ul className="song-list">
        {m.application.songs.map((s) => {
          const link = songLink(s)
          const internal = link.via === 'lesson' || link.via === 'ear'
          return (
            <li key={`${s.title}|${s.artist}`} className={`song-row${busy === s.title ? ' busy' : ''}`}>
              <span className="grow">
                {internal ? <a href={link.url}>{s.title}</a> : <strong>{s.title}</strong>} <span className="muted">({s.artist})</span>
                {link.via === 'lesson' && <span className="pill"> tabs on screen</span>}
                {link.via === 'ear' && <span className="pill amber"> by ear</span>}
                {s.note && !compact && <div className="small muted">{s.note}</div>}
              </span>
              <button className="btn sm ghost" disabled={busy !== null} onClick={() => void reroll(s.title)} title="Not inspired by this one? Get a different song for the same idea">
                <Icon name="reset" size={14} /> {busy === s.title ? 'Picking…' : 'New song'}
              </button>
            </li>
          )
        })}
      </ul>

      {!compact && (
        <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="small">
            <strong>Listen in</strong>
          </span>
          {([0, 1] as const).map((i) => (
            <select key={i} className="input" style={{ maxWidth: 200 }} value={m.listening?.[i] ?? ''} onChange={(e) => setListen(i, e.target.value)} aria-label={`Listening genre ${i + 1}`}>
              <option value="">{i === 0 ? 'Genre' : 'Second genre (optional)'}</option>
              {listeningOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}
      {!compact && m.listen.length > 0 && (
        <div className="small">
          {m.listen.map((l) => (
            <div key={`${l.artist}|${l.album}`} className="listen-row">
              <span className="grow">
                <strong>{l.artist}</strong> — {l.album} <span className="muted">· {l.genre}</span>
                <div className="muted">{l.why}</div>
              </span>
              <a className="btn sm" href={`https://open.spotify.com/search/${encodeURIComponent(`${l.artist} ${l.album}`)}`} target="_blank" rel="noreferrer">
                Spotify
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
