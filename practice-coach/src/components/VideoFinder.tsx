import { useEffect, useRef, useState } from 'react'
import type { VideoHit } from '../../api/_lib/schemas'
import { searchVideos } from '../ai/client'
import { useAiStatus } from '../ai/hooks'
import { ytThumb } from '../lib/youtube'
import { Icon } from './Icon'
import { toast } from './Toast'
import { parseYouTube } from './VideoWorkbench'

export type PickedVideo = { id: string; title: string | null; channel: string | null }

/**
 * Find a transcription video without leaving the app: search runs on the
 * server, results show here with a "looks like tabs on screen" hint, and the
 * player picks one. A paste box covers the case where the server is off.
 */
export function VideoFinder({ query, exclude, onPick, heading = 'Find the transcription' }: { query: string; exclude: string[]; onPick: (v: PickedVideo) => void; heading?: string }) {
  const ai = useAiStatus()
  const canSearch = ai.configured && ai.hasPasscode
  const [q, setQ] = useState(query)
  const [hits, setHits] = useState<VideoHit[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [paste, setPaste] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const ran = useRef(false)

  async function run(text = q) {
    if (!text.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const r = await searchVideos({ q: text.trim(), exclude })
      setHits(r.results)
      if (!r.results.length) setErr('Nothing found for that search. Try other words, or paste a link.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Search failed.')
      setShowPaste(true)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (canSearch && !ran.current) {
      ran.current = true
      void run(query)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSearch])

  return (
    <section className="card">
      <h2>{heading}</h2>
      {canSearch ? (
        <>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault()
              void run()
            }}
          >
            <input className="input grow" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
            <button className="btn primary" type="submit" disabled={busy || !q.trim()}>
              {busy ? 'Searching…' : 'Search'}
            </button>
          </form>
          <p className="small muted">Results stay inside the app. The hint under each title is a guess from the title; the player decides once it's playing.</p>
          {err && <p className="small" style={{ color: 'var(--amber)' }}>{err}</p>}
          {hits && hits.length > 0 && (
            <ul className="video-hits">
              {hits.map((h) => (
                <li key={h.id} className={`video-hit${h.score >= 3 ? ' likely' : ''}`}>
                  <img src={ytThumb(h.id)} alt="" loading="lazy" />
                  <span className="grow">
                    <strong>{h.title}</strong>
                    <div className="small muted">
                      {h.channel}
                      {h.length ? ` · ${h.length}` : ''}
                      {h.hint ? ` · ${h.hint}` : ''}
                    </div>
                  </span>
                  <button className={`btn sm${h.score >= 3 ? ' primary' : ''}`} onClick={() => onPick({ id: h.id, title: h.title, channel: h.channel })}>
                    Use this
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="small muted">In-app search needs the coach's server{ai.hasPasscode ? '' : ' and your passcode (Assessment page)'}. You can still paste a link.</p>
      )}
      {canSearch && !showPaste ? (
        <button className="linklike small" onClick={() => setShowPaste(true)}>
          I have a link to paste
        </button>
      ) : (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            const id = parseYouTube(paste)
            if (!id) {
              toast('That doesn’t look like a YouTube link')
              return
            }
            onPick({ id, title: null, channel: null })
          }}
        >
          <input className="input grow" placeholder="Paste a YouTube link" value={paste} onChange={(e) => setPaste(e.target.value)} inputMode="url" />
          <button className="btn" type="submit" disabled={!paste.trim()}>
            <Icon name="check" size={16} /> Use it
          </button>
        </form>
      )}
    </section>
  )
}
