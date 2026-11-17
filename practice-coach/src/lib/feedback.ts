/** Small device niceties for practicing with a guitar in your lap. */

let ctx: AudioContext | null = null

/** A soft two-note chime when a part's target time is reached. */
export function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = ctx || new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    ;[880, 1320].forEach((f, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.frequency.value = f
      o.type = 'sine'
      g.gain.setValueAtTime(0.0001, t + i * 0.18)
      g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.18 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.5)
      o.connect(g).connect(ctx!.destination)
      o.start(t + i * 0.18)
      o.stop(t + i * 0.18 + 0.55)
    })
  } catch {
    /* audio is a nicety */
  }
  try {
    navigator.vibrate?.([120, 80, 120])
  } catch {
    /* ignore */
  }
}

/** Unlock audio on a user gesture (iOS requires this before any sound). */
export function primeAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = ctx || new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* ignore */
  }
}

type WakeLockSentinelLike = { release: () => Promise<void>; released?: boolean }
let lock: WakeLockSentinelLike | null = null
let wanted = false

async function acquire() {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock
    if (!wl || lock) return
    lock = await wl.request('screen')
    ;(lock as unknown as EventTarget).addEventListener?.('release', () => {
      lock = null
    })
  } catch {
    lock = null
  }
}

/** Keep the screen awake while a practice timer runs. */
export function keepAwake(on: boolean) {
  wanted = on
  if (on) void acquire()
  else if (lock) {
    void lock.release().catch(() => {})
    lock = null
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') void acquire()
  })
}
