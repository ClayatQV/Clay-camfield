/**
 * A–B loop engine over a YT.Player, with a speed ladder (N passes each at
 * 0.25×, 0.5×, 0.75×, 1×). Shared by the lesson page and the by-ear guide.
 */
import { useEffect, useRef, useState, type RefObject } from 'react'
import { toast } from './Toast'
import { logEvent } from '../lib/events'

export const SPEEDS = [0.25, 0.5, 0.75, 1]
export const r1 = (t: number) => Math.round(t * 10) / 10
type Ladder = { idx: number; pass: number }

export function useLoop(playerRef: RefObject<YT.Player | null>, ready: boolean, passes: number, ended: number) {
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [loopOn, setLoopOn] = useState(false)
  const [ladder, setLadder] = useState<Ladder | null>(null)
  const [time, setTime] = useState(0)
  const s = useRef({ a, b, loopOn, ladder, passes, cooldown: 0, lastUi: 0 })
  s.current.a = a
  s.current.b = b
  s.current.loopOn = loopOn
  s.current.ladder = ladder
  s.current.passes = passes

  const player = () => playerRef.current

  // ~50 ms poll: when past B, jump back to A. Also feeds the time readout.
  useEffect(() => {
    if (!ready) return
    const id = setInterval(() => {
      const p = player()
      if (!p) return
      let t: number
      try {
        t = p.getCurrentTime()
      } catch {
        return
      }
      const st = s.current
      const now = performance.now()
      if (now - st.lastUi > 150) {
        st.lastUi = now
        setTime(t)
      }
      if (!st.loopOn || st.a === null || st.b === null || st.b <= st.a || now < st.cooldown) return
      if (t >= st.b) {
        st.cooldown = now + 300
        try {
          p.seekTo(st.a, true)
        } catch {
          return
        }
        if (st.ladder) advanceLadder(p)
      }
    }, 50)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // If B is at/after the end of the video, the ENDED event closes the loop.
  useEffect(() => {
    if (!ended) return
    const st = s.current
    const p = player()
    if (p && st.loopOn && st.a !== null) {
      try {
        p.seekTo(st.a, true)
        p.playVideo()
      } catch {
        /* ignore */
      }
      if (st.ladder) advanceLadder(p)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended])

  function advanceLadder(p: YT.Player) {
    const st = s.current
    if (!st.ladder) return
    let { idx, pass } = st.ladder
    pass += 1
    logEvent('ladder', { speed: SPEEDS[idx], pass })
    if (pass >= st.passes) {
      idx += 1
      pass = 0
      if (idx >= SPEEDS.length) {
        st.ladder = null
        setLadder(null)
        toast('Ladder done — you made it to full speed', 3200)
        return
      }
      try {
        p.setPlaybackRate(SPEEDS[idx])
      } catch {
        /* ignore */
      }
    }
    st.ladder = { idx, pass }
    setLadder(st.ladder)
  }

  const now = () => {
    try {
      return player()?.getCurrentTime() ?? time
    } catch {
      return time
    }
  }

  return {
    a,
    b,
    loopOn,
    ladder,
    time,
    setLoopOn,
    setA: (v: number | null) => setA(v === null ? null : Math.max(0, r1(v))),
    setB: (v: number | null) => setB(v === null ? null : Math.max(0, r1(v))),
    now,
    stopLadder: () => setLadder(null),
    startLadder: () => {
      const p = player()
      if (!p || a === null || b === null || b <= a) return false
      try {
        p.setPlaybackRate(SPEEDS[0])
        p.seekTo(a, true)
        p.playVideo()
      } catch {
        return false
      }
      s.current.cooldown = performance.now() + 300
      setLadder({ idx: 0, pass: 0 })
      setLoopOn(true)
      return true
    },
    playLoop: (aa: number, bb: number) => {
      logEvent('loop', { a: r1(aa), b: r1(bb) })
      const p = player()
      setA(r1(aa))
      setB(r1(bb))
      setLoopOn(true)
      s.current.cooldown = performance.now() + 300
      if (p) {
        try {
          p.seekTo(aa, true)
          p.playVideo()
        } catch {
          /* ignore */
        }
      }
    },
  }
}

export type LoopApi = ReturnType<typeof useLoop>
