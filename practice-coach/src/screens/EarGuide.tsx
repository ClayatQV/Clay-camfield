import { useEffect, useState } from 'react'
import type { EarGuide as Guide } from '../../api/_lib/schemas'
import { getEarGuide } from '../ai/client'
import { useAiStatus } from '../ai/hooks'
import { Icon } from '../components/Icon'
import { InlineLab } from '../components/InlineLab'
import { VideoFinder } from '../components/VideoFinder'
import { VideoWorkbench } from '../components/VideoWorkbench'
import { href } from '../lib/router'
import { earKey, update, useData, type EarPiece } from '../store/store'

/**
 * Learn it by ear: for a recording or performance with no transcription.
 * The player supplies the video and marks its sections; the coach supplies
 * the song's skeleton and what to listen for. Nothing here pretends to have
 * heard the recording.
 */
export function EarGuide({ query }: { query: URLSearchParams }) {
  const title = (query.get('title') ?? '').trim()
  const artist = (query.get('artist') ?? '').trim()
  const data = useData()
  const key = earKey(title, artist)
  const piece: EarPiece = data.ear[key] ?? { title, artist, youtubeId: null, about: '', sections: [], guide: null, guideAt: null }
  const save = (patch: Partial<EarPiece>) => update((d) => ({ ...d, ear: { ...d.ear, [key]: { ...piece, ...d.ear[key], ...patch } } }))

  if (!title) {
    return (
      <div className="screen">
        <div className="card empty">
          <h2>Which piece?</h2>
          <p className="small muted">Open this page from a song in your plan, or add the title to the address.</p>
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
        <span className="eyebrow">Learn it by ear</span>
        <h1>{title}</h1>
        {artist && <p className="muted">{artist}</p>}
        <p className="small muted">No transcription exists for this one, so you learn it the way players always have: the record, slowed down, one section at a time. The coach gives you the song's skeleton and what to listen for.</p>
      </div>

      {piece.youtubeId ? (
        <VideoWorkbench
          videoId={piece.youtubeId}
          sections={piece.sections}
          onSections={(s) => save({ sections: s })}
          heading="1 · The recording"
          markHelp="Play it through once. Each time a new part of the song starts (verse, bridge, solo…), name it and press Mark. Then loop one section at a time."
          actions={
            <button className="btn sm ghost" onClick={() => save({ youtubeId: null })}>
              Change video
            </button>
          }
        />
      ) : (
        <VideoFinder query={`${title} ${artist}`.trim()} exclude={[]} onPick={(v) => save({ youtubeId: v.id })} heading="1 · The recording" />
      )}

      <GuideCard piece={piece} onGuide={(g) => save({ guide: g, guideAt: new Date().toISOString() })} onAbout={(about) => save({ about })} />
    </div>
  )
}

/* ---------------- the coach's guide ---------------- */

function GuideCard({ piece, onGuide, onAbout }: { piece: EarPiece; onGuide: (g: Guide) => void; onAbout: (s: string) => void }) {
  const ai = useAiStatus()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [about, setAbout] = useState(piece.about)
  const [openLab, setOpenLab] = useState<{ url: string; label: string } | null>(null)
  useEffect(() => setAbout(piece.about), [piece.about])

  async function write() {
    setBusy(true)
    setErr(null)
    try {
      const g = await getEarGuide({ title: piece.title, artist: piece.artist, about: about.trim() || null })
      onGuide(g)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const g = piece.guide
  return (
    <section className="card">
      <h2>3 · The coach's guide</h2>
      {!g && (
        <>
          <p className="small muted">The coach can't hear the recording. What it can do: name the song underneath, give you its form and changes, and tell you what to listen for in each section. Everything about the performance itself is for you to confirm by ear.</p>
          <div className="field">
            <label htmlFor="about">Anything about this performance? (optional)</label>
            <input
              id="about"
              className="input"
              placeholder="e.g. acoustic, from a 2019 interview, he plays it in open tuning…"
              value={about}
              maxLength={400}
              onChange={(e) => setAbout(e.target.value)}
              onBlur={() => onAbout(about)}
            />
          </div>
          {ai.configured && ai.hasPasscode ? (
            <button className="btn primary block" onClick={() => void write()} disabled={busy}>
              {busy ? 'Writing the guide…' : 'Write the guide'}
            </button>
          ) : (
            <p className="small muted">
              The AI coach isn't available here{ai.hasPasscode ? '' : ' (enter the passcode on the Assessment page)'}. The looper above still works.
            </p>
          )}
          {err && <p className="small" style={{ color: 'var(--amber)' }}>{err}</p>}
        </>
      )}
      {g && (
        <div className="stack">
          <p className="why">{g.honesty}</p>
          <div>
            <span className="label">The song underneath</span>
            <p>
              <strong>{g.underlying.song}</strong> · {g.underlying.by}
              {g.underlying.key ? ` · ${g.underlying.key}` : ''}
              {g.underlying.meter ? ` · ${g.underlying.meter}` : ''}
              {g.underlying.form ? ` · ${g.underlying.form}` : ''}
            </p>
            {g.underlying.learnFirst && (
              <p className="small">
                <strong>Learn this first:</strong> {g.underlying.learnFirst}
                {g.underlying.hasTranscriptions && (
                  <>
                    {' '}
                    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${g.underlying.song} ${g.underlying.by} guitar transcription tab`)}`} target="_blank" rel="noreferrer">
                      Find tabs for the original ›
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
          {g.skeleton.length > 0 && (
            <div>
              <span className="label">The form and changes (original)</span>
              <table className="skeleton">
                <tbody>
                  {g.skeleton.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{r.section}</strong>
                        {r.bars && <div className="small muted">{r.bars}</div>}
                      </td>
                      <td className="mono small">{r.chords}</td>
                      <td className="small muted">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div>
            <span className="label">Section by section: what to listen for</span>
            <div className="stack-sm">
              {g.sections.map((s, i) => (
                <div key={i} className="card flat">
                  <strong>{s.label}</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: 18 }} className="small">
                    {s.listenFor.map((l, k) => (
                      <li key={k}>{l}</li>
                    ))}
                  </ul>
                  <p className="small muted" style={{ margin: 0 }}>
                    Try: {s.tryThis}
                  </p>
                  {s.lab && (
                    <button className="link-row as-button" style={{ color: 'var(--accent)' }} onClick={() => setOpenLab(openLab?.url === '/lab?' + s.lab ? null : { url: '/lab?' + s.lab, label: s.label })}>
                      <Icon name="lab" size={18} />
                      <span className="grow">Chord tones for {s.label} in the Lab</span>
                      <span aria-hidden>{openLab?.url === '/lab?' + s.lab ? '▾' : '›'}</span>
                    </button>
                  )}
                  {openLab && openLab.url === '/lab?' + s.lab && <InlineLab labUrl={openLab.url} label={openLab.label} onClose={() => setOpenLab(null)} />}
                </div>
              ))}
            </div>
          </div>
          {g.tips.length > 0 && (
            <div>
              <span className="label">Tips</span>
              <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
                {g.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <span className="label">You'll know it's working when</span>
            <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
              {g.doneWhen.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="row-between small muted">
            <span>Confidence: {g.confidence}</span>
            <button className="linklike" onClick={() => void write()} disabled={busy}>
              {busy ? 'Rewriting…' : 'Rewrite the guide'}
            </button>
          </div>
          {err && <p className="small" style={{ color: 'var(--amber)' }}>{err}</p>}
        </div>
      )}
    </section>
  )
}
