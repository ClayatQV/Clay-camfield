/**
 * Listens to a Fretboard Lab iframe: counts active practice time per mode
 * for the stats page (while the page is visible and the Lab was touched or
 * its click ran within the last 90 s), and reports the click tempo so the
 * session log can record "80 bpm" without the player typing it.
 */
import { useEffect, useRef, type RefObject } from 'react'
import { todayKey } from './dates'
import { addLabTime } from '../store/actions'
import { LAB_MODES, type LabMode } from '../store/store'

const IDLE_MS = 90_000

export function useLabTimer(frameRef: RefObject<HTMLIFrameElement | null>, onBpm?: (bpm: number, metroOn: boolean) => void) {
  const st = useRef({ mode: null as LabMode | null, lastActive: 0, pending: 0, lastTick: Date.now() })
  const bpmRef = useRef(onBpm)
  bpmRef.current = onBpm

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frameRef.current?.contentWindow) return
      const d = e.data as { source?: string; type?: string; mode?: string; bpm?: number; metro?: boolean }
      if (d?.source !== 'fretboard-lab') return
      if (LAB_MODES.includes(d.mode as LabMode)) {
        if (st.current.mode !== d.mode) flush()
        st.current.mode = d.mode as LabMode
      }
      if (d.type === 'active') st.current.lastActive = Date.now()
      if (typeof d.bpm === 'number' && d.bpm >= 30 && d.bpm <= 240 && (d.type === 'bpm' || d.metro)) bpmRef.current?.(d.bpm, !!d.metro)
    }
    const tick = () => {
      const s = st.current
      const now = Date.now()
      const dt = (now - s.lastTick) / 1000
      s.lastTick = now
      if (document.visibilityState === 'visible' && now - s.lastActive < IDLE_MS && dt < 5) s.pending += dt
    }
    const flush = () => {
      tick()
      const s = st.current
      if (s.mode && s.pending >= 1) addLabTime(todayKey(), s.mode, s.pending)
      s.pending = 0
    }
    window.addEventListener('message', onMsg)
    const t1 = setInterval(tick, 1000)
    const t2 = setInterval(flush, 30_000)
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      flush()
      window.removeEventListener('message', onMsg)
      clearInterval(t1)
      clearInterval(t2)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [frameRef])
}
