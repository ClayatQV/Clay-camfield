import { useEffect, useState } from 'react'
import { findTranscription } from '../../api/_lib/transcriptions'
import { moduleIn, rerollSong, setSongSections, setSongVideo } from '../ai/actions'
import { LESSONS } from '../content/lessons'
import { href, navigate } from '../lib/router'
import { songKey, useData, type SongVideo } from '../store/store'
import { Icon } from './Icon'
import { toast } from './Toast'
import { VideoFinder } from './VideoFinder'
import { VideoWorkbench } from './VideoWorkbench'

/**
 * A song inside the app: find its transcription video here, play it in the
 * looper, reject a poor video, or ask for a different song for the same idea.
 * Used by the song page and the application exercise page.
 */
export function SongViewer({ title, artist, moduleId, onNewSong }: { title: string; artist: string; moduleId?: string; onNewSong?: (s: { title: string; artist: string }) => void }) {
  const data = useData()
  const key = songKey(title, artist)
  const entry: SongVideo = data.songs[key] ?? { title, artist, youtubeId: null, videoTitle: null, channel: null, rejected: [], sections: [], chosenAt: null }
  const module = moduleId ? moduleIn(data, moduleId) : undefined
  const song = module?.application.songs.find((s) => s.title === title)
  const [rolling, setRolling] = useState(false)

  // Library pieces have a full lesson (video, bar map, drills): use it.
  const lib = findTranscription(title, artist)
  const lesson = lib && LESSONS.find((l) => l.id === lib.id || l.youtubeId === lib.youtubeId)
  useEffect(() => {
    if (lesson && entry.youtubeId !== lesson.youtubeId) setSongVideo(title, artist, { id: lesson.youtubeId, title: lesson.videoTitle ?? lesson.title, channel: lesson.channel })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id])

  async function newSong() {
    if (!moduleId) return
    setRolling(true)
    try {
      const fresh = await rerollSong(moduleId, title)
      if (fresh) {
        toast(`New song: ${fresh.title}`)
        if (onNewSong) onNewSong(fresh)
        else navigate(`/song?${new URLSearchParams({ title: fresh.title, artist: fresh.artist, m: moduleId }).toString()}`, { replace: true })
      }
    } catch (e) {
      toast(`Couldn't pick a new song: ${e instanceof Error ? e.message : 'unknown error'}`, 5000)
    } finally {
      setRolling(false)
    }
  }

  const q = `${title} ${artist} guitar transcription tab`.trim()
  return (
    <div className="stack song-viewer">
      {song?.note && <p className="small muted">{song.note}</p>}
      {entry.youtubeId ? (
        <VideoWorkbench
          videoId={entry.youtubeId}
          sections={entry.sections}
          onSections={(s) => setSongSections(title, artist, s)}
          heading={entry.videoTitle ?? 'The transcription'}
          markHelp="Mark the sections you want to work on (the lick, the turnaround, bars 7–9…), then loop each one slowed down. The speed ladder walks you up to tempo."
          actions={
            <>
              {lesson && (
                <a className="btn sm" href={href(`/lessons/${lesson.id}`)}>
                  Bar map & drills
                </a>
              )}
              <button className="btn sm ghost" onClick={() => setSongVideo(title, artist, null)} title="Not a good transcription? Pick a different video">
                Video isn't good
              </button>
            </>
          }
        />
      ) : (
        <VideoFinder key={entry.rejected.length} query={q} exclude={entry.rejected} onPick={(v) => setSongVideo(title, artist, v)} heading={entry.rejected.length ? 'Pick a better video' : 'Find the transcription'} />
      )}
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
    </div>
  )
}
