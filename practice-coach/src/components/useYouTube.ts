import { useEffect, useRef, useState } from 'react'
import { loadYouTubeApi } from '../lib/youtube'
import { logEvent } from '../lib/events'

export type YtStatus = 'loading' | 'ready' | 'error'

/**
 * Mounts a YT.Player inside `mountRef` (React owns the wrapper, the API owns
 * the inner element). Re-cues when videoId changes.
 */
export function useYouTube(videoId: string) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const [status, setStatus] = useState<YtStatus>('loading')
  const [error, setError] = useState<number | 'offline' | null>(null)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [ended, setEnded] = useState(0)
  const videoRef = useRef(videoId)

  useEffect(() => {
    let cancelled = false
    const host = mountRef.current
    if (!host) return
    setStatus('loading')
    setError(null)
    loadYouTubeApi()
      .then((Y) => {
        if (cancelled) return
        const el = document.createElement('div')
        host.innerHTML = ''
        host.appendChild(el)
        playerRef.current = new Y.Player(el, {
          videoId: videoRef.current,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin },
          events: {
            onReady: () => !cancelled && setStatus('ready'),
            onError: (e) => {
              if (cancelled) return
              setError(e.data)
              setStatus('error')
            },
            onStateChange: (e) => {
              if (cancelled) return
              if (e.data === 1) logEvent('video', { id: videoRef.current, state: 'play' })
              if (e.data === 2) logEvent('video', { id: videoRef.current, state: 'pause' })
              setPlaying(e.data === 1 || e.data === 3)
              if (e.data === 0) setEnded((n) => n + 1)
            },
            onPlaybackRateChange: (e) => !cancelled && setRate(e.data),
          },
        })
      })
      .catch(() => {
        if (cancelled) return
        setError('offline')
        setStatus('error')
      })
    return () => {
      cancelled = true
      try {
        playerRef.current?.destroy()
      } catch {
        /* ignore */
      }
      playerRef.current = null
      host.innerHTML = ''
    }
  }, [])

  // Switch videos without rebuilding the player.
  useEffect(() => {
    if (videoRef.current === videoId) return
    videoRef.current = videoId
    setError(null)
    const p = playerRef.current
    if (p && status !== 'loading') {
      try {
        p.cueVideoById(videoId)
        setStatus('ready')
      } catch {
        /* ignore */
      }
    }
  }, [videoId, status])

  return { mountRef, playerRef, status, error, playing, rate, ended }
}
