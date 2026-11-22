import { useEffect, useState } from 'react'
import { moduleIn, rerollSong, setSongSections, setSongVideo } from '../ai/actions'
import { Icon } from '../components/Icon'
import { toast } from '../components/Toast'
import { VideoFinder } from '../components/VideoFinder'
import { VideoWorkbench } from '../components/VideoWorkbench'
import { findTranscription } from '../../api/_lib/transcriptions'
import { LESSONS } from '../content/lessons'
import { href, navigate } from '../lib/router'
import { songKey, useData, type SongVideo } from '../store/store'

/**
 * A song from the plan, inside the app: find its transcription video here
 * (no trip to YouTube), play it in the looper, and if the video turns out to
 * be poor or the song isn't inspiring, pick another video or another song.
 */
export function SongPage({ query }: { query: URLSearchParams }) {
  const title = (query.get('title') ?? '').trim()
  const artist = (query.get('artist') ?? '').trim()
  const moduleId = query.get('m') ?? undefined
  const data = useData()
  const key = songKey(title, artist)
  const entry: SongVideo = data.songs[key] ?? { title, artist, youtubeId: null, videoTitle: null, channel: null, rejected: [], sections: [], chosenAt: null }
  const module = moduleId ? moduleIn(data, moduleId) : undefined
  const song = module?.application.songs.find((s) => s.title === title)
  const [rolling, setRolling] = useState(false)

  // The library already has this one: go straight to the lesson (video, bar map, drills).
  const lib = findTranscription(title, artist)
  const lesson = lib && LESSONS.find((l) => l.id === lib.id || l.youtubeId === lib.youtubeId)
  useEffect(() => {
    if (lesson) navigate(`/lessons/${lesson.id}`, { replace: true })
  }, [lesson])

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
  if (lesson) return null

  async function newSong() {
    if (!moduleId) return
    setRolling(true)
    try {
      const fresh = await rerollSong(moduleId, title)
      if (fresh) {
        toast(`New song: ${fresh.title}`)
        navigate(`/song?${new URLSearchParams({ title: fresh.title, artist: fresh.artist, m: moduleId }).toString()}`, { replace: true })
      }
    } catch (e) {
      toast(`Couldn't pick a new song: ${e instanceof Error ? e.message : 'unknown error'}`, 5000)
    } finally {
      setRolling(false)
    }
  }

  const q = `${title} ${artist} guitar transcription tab`.trim()

  return (
    <div className="screen">
      <a className="back-link" href={href('/practice')}>
        <Icon name="back" size={20} /> Practice
      </a>
      <div className="screen-head">
        <span className="eyebrow">{module ? `${module.title} · ${module.emphasis ?? 'application'}` : 'Application'}</span>
        <h1>{title}</h1>
        {artist && <p className="muted">{artist}</p>}
        {song?.note && <p className="small muted">{song.note}</p>}
        {module && (
          <p className="small">
            <strong>The idea:</strong> {module.concept.label}. {module.application.instruction}
          </p>
        )}
      </div>

      {entry.youtubeId ? (
        <VideoWorkbench
          videoId={entry.youtubeId}
          sections={entry.sections}
          onSections={(s) => setSongSections(title, artist, s)}
          heading={entry.videoTitle ?? 'The transcription'}
          markHelp="Mark the sections you want to work on (the lick, the turnaround, bars 7–9…), then loop each one slowed down. The speed ladder walks you up to tempo."
          actions={
            <button className="btn sm ghost" onClick={() => setSongVideo(title, artist, null)} title="Not a good transcription? Pick a different video">
              Video isn't good
            </button>
          }
        />
      ) : (
        <VideoFinder
          key={entry.rejected.length}
          query={q}
          exclude={entry.rejected}
          onPick={(v) => setSongVideo(title, artist, v)}
          heading={entry.rejected.length ? 'Pick a better video' : 'Find the transcription'}
        />
      )}
      {entry.youtubeId && entry.channel && (
        <p className="small muted" style={{ marginTop: -8 }}>
          {entry.channel}
          {entry.rejected.length ? ` · ${entry.rejected.length} video${entry.rejected.length === 1 ? '' : 's'} rejected so far` : ''}
        </p>
      )}

      <section className="card">
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {moduleId && (
            <button className="btn grow" disabled={rolling} onClick={() => void newSong()} title="Not inspired by this song? Get a different one for the same idea, in the same genre">
              <Icon name="reset" size={16} /> {rolling ? 'Picking a new song…' : 'New song, same idea'}
            </button>
          )}
          <a className="btn grow" href={`#/ear?${new URLSearchParams({ title, artist, ...(moduleId ? { m: moduleId } : {}) }).toString()}`}>
            Learn it by ear instead
          </a>
        </div>
        <p className="small muted">"Video isn't good" remembers the video you rejected and offers others. "New song" keeps the module's idea and genre and changes only the song.</p>
      </section>
    </div>
  )
}
