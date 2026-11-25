import { useEffect, useRef, useState } from 'react'
import { logEvent } from '../lib/events'
import { midiHz, parseVamp, voice, type VampBar } from '../lib/vamp'
import { Icon } from './Icon'

/**
 * A looping backing vamp made in the browser: bass on beat one, a chord stab
 * on beats one and three, a quiet click on every beat. Enough to practise
 * "half-whole diminished over G7, resolve on beat one" without a record.
 */
export function VampPlayer({ initial, bpm: initialBpm = 80, label }: { initial: VampBar[]; bpm?: number; label?: string }) {
  const [text, setText] = useState(initial.map((b) => b.chord.symbol).join(' | '))
  const [bars, setBars] = useState<VampBar[]>(initial)
  const [bpm, setBpm] = useState(initialBpm)
  const [on, setOn] = useState(false)
  const [cur, setCur] = useState(-1)
  const eng = useRef<Engine | null>(null)

  useEffect(() => {
    const parsed = parseVamp(text)
    setBars(parsed)
    eng.current?.setBars(parsed)
  }, [text])
  useEffect(() => {
    eng.current?.setBpm(bpm)
  }, [bpm])
  useEffect(() => () => eng.current?.stop(), [])

  const toggle = () => {
    if (on) {
      eng.current?.stop()
      setOn(false)
      setCur(-1)
      return
    }
    if (!bars.length) return
    if (!eng.current) eng.current = new Engine(setCur)
    eng.current.setBars(bars)
    eng.current.setBpm(bpm)
    eng.current.start()
    setOn(true)
    logEvent('vamp', { chords: bars.map((b) => b.chord.symbol).join(' '), bpm })
  }

  return (
    <section className="card vamp">
      <div className="row-between">
        <span className="label">{label ?? 'Vamp'}</span>
        <span className="small muted">bass · stabs · click</span>
      </div>
      <div className="vamp-bars" aria-live="polite">
        {bars.map((b, i) => (
          <span key={i} className={`vamp-bar${i === cur ? ' on' : ''}`}>
            {b.chord.symbol}
          </span>
        ))}
        {!bars.length && <span className="small muted">Type chords like G7 | Cmaj7 | Am7 | D7</span>}
      </div>
      <div className="row" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <button className={`btn primary${on ? ' amber' : ''}`} style={{ minWidth: 120 }} onClick={toggle} disabled={!bars.length}>
          <Icon name={on ? 'pause' : 'play'} size={18} /> {on ? 'Stop' : 'Loop it'}
        </button>
        <label className="row" style={{ gap: 6, alignItems: 'center' }}>
          <button className="btn icon sm" aria-label="Slower" onClick={() => setBpm((b) => Math.max(40, b - 5))}>
            −
          </button>
          <span className="mono">{bpm} bpm</span>
          <button className="btn icon sm" aria-label="Faster" onClick={() => setBpm((b) => Math.min(220, b + 5))}>
            +
          </button>
        </label>
        <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} aria-label="Chords, one bar per |" placeholder="G7 | G7 | Cmaj7 | Cmaj7" />
      </div>
    </section>
  )
}

/* ---------------- audio engine (lookahead scheduler) ---------------- */

class Engine {
  private ctx: AudioContext | null = null
  private bars: VampBar[] = []
  private bpm = 80
  private timer: number | null = null
  private nextTime = 0
  private pos = { bar: 0, beat: 0 }
  private onBar: (i: number) => void
  constructor(onBar: (i: number) => void) {
    this.onBar = onBar
  }
  setBars(b: VampBar[]) {
    this.bars = b
    if (this.pos.bar >= b.length) this.pos = { bar: 0, beat: 0 }
  }
  setBpm(b: number) {
    this.bpm = b
  }
  start() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    void this.ctx.resume()
    this.pos = { bar: 0, beat: 0 }
    this.nextTime = this.ctx.currentTime + 0.1
    this.timer = window.setInterval(() => this.schedule(), 25)
  }
  stop() {
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
  }
  private schedule() {
    const ctx = this.ctx
    if (!ctx || !this.bars.length) return
    while (this.nextTime < ctx.currentTime + 0.15) {
      const bar = this.bars[this.pos.bar]
      const t = this.nextTime
      this.play(bar, this.pos.beat, t)
      if (this.pos.beat === 0) {
        const i = this.pos.bar
        setTimeout(() => this.onBar(i), Math.max(0, (t - ctx.currentTime) * 1000))
      }
      this.nextTime += 60 / this.bpm
      this.pos.beat += 1
      if (this.pos.beat >= bar.beats) {
        this.pos.beat = 0
        this.pos.bar = (this.pos.bar + 1) % this.bars.length
      }
    }
  }
  private play(bar: VampBar, beat: number, t: number) {
    const ctx = this.ctx!
    const spb = 60 / this.bpm
    // click
    this.tone(ctx, beat === 0 ? 1600 : 1100, t, 0.03, 'square', beat === 0 ? 0.05 : 0.03)
    const v = voice(bar.chord)
    if (beat === 0) this.tone(ctx, midiHz(v.bass), t, Math.min(spb * 1.8, 1.2), 'sine', 0.22)
    if (beat === 0 || beat === 2 || bar.beats === 1) for (const n of v.notes) this.tone(ctx, midiHz(n), t + (beat === 2 ? 0 : 0.005), Math.min(spb * 0.9, 0.6), 'triangle', 0.07)
  }
  private tone(ctx: AudioContext, hz: number, t: number, dur: number, type: OscillatorType, gain: number) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = hz
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + dur + 0.05)
  }
}
