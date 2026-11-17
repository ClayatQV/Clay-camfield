import { useEffect, useRef } from 'react'
import { Icon } from '../components/Icon'
import { todayKey } from '../lib/dates'
import { addLabTime } from '../store/actions'
import { LAB_MODES, type LabMode } from '../store/store'
import { labFileUrl } from '../lib/lab'
import { effectiveTheme } from '../lib/theme'
import { useData } from '../store/store'

const MODE_NAMES: Record<string, string> = { chords: 'Chords', arpeggios: 'Arpeggios', scales: 'Scales', technique: 'Technique' }
const NICE: Record<string, string> = {
  close3: 'triads', open3: 'open triads', shell37: 'shells', shell73: 'shells', close4: 'close', drop2: 'drop 2', drop3: 'drop 3', drop24: 'drop 2&4',
  c4: 'cycle of 4ths', c5: 'cycle of 5ths', chrom: 'chromatic', '251': 'ii–V–I', m251: 'minor ii–V–i',
  majpent: 'major pentatonic', minpent: 'minor pentatonic', lyddom: 'Lydian dominant', hwdim: 'half-whole dim', bebdom: 'bebop dominant',
  majblues: 'major blues', maj: 'major', min: 'minor', dim7: '°7', '7b9': '7♭9', '7s9': '7♯9',
}
const nice = (v: string | null) => (v ? NICE[v] ?? v.replace(/b(?=\d|$)/g, '♭') : null)

/** Fretboard Lab (public/fretboard-lab.html) in a full-height frame; route query = preset. */
export function Lab({ query }: { query: URLSearchParams }) {
  const { settings } = useData()
  const theme = effectiveTheme(settings.theme)
  const src = labFileUrl(query, { theme, embed: '1' })
  const fullSrc = labFileUrl(query, { theme })
  const hasPreset = query.has('mode')
  const frameRef = useRef<HTMLIFrameElement>(null)
  useLabTimer(frameRef)
  const summary = hasPreset
    ? [
        MODE_NAMES[query.get('mode') ?? ''] ?? query.get('mode'),
        [query.get('root')?.replace('b', '♭'), nice(query.get('type') ?? query.get('scale'))].filter(Boolean).join(' '),
        nice(query.get('voicing')),
        nice(query.get('move')),
        query.get('pos') ? `fret ${query.get('pos')}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Your last settings'

  return (
    <div className="lab-screen">
      <div className="lab-bar">
        {hasPreset && history.length > 1 ? (
          <button className="btn sm ghost" onClick={() => history.back()} aria-label="Back">
            <Icon name="back" size={18} /> Back
          </button>
        ) : (
          <strong style={{ paddingLeft: 4 }}>Fretboard Lab</strong>
        )}
        <span className="small muted lab-summary">{summary}</span>
        <a className="btn sm ghost" href={fullSrc} target="_blank" rel="noreferrer" aria-label="Open Fretboard Lab full screen">
          <Icon name="external" size={18} />
        </a>
      </div>
      <iframe ref={frameRef} key={src} className="lab-frame" src={src} title="Fretboard Lab" />
    </div>
  )
}

/**
 * Counts active practice time in the Lab, per mode, for the stats page.
 * Time counts while the page is visible and you touched the Lab or ran its
 * click within the last 90 seconds. Saved every 30 s and when you leave.
 */
const IDLE_MS = 90_000

function useLabTimer(frameRef: React.RefObject<HTMLIFrameElement | null>) {
  const st = useRef({ mode: null as LabMode | null, lastActive: 0, pending: 0, lastTick: Date.now() })

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frameRef.current?.contentWindow) return
      const d = e.data as { source?: string; type?: string; mode?: string }
      if (d?.source !== 'fretboard-lab') return
      if (LAB_MODES.includes(d.mode as LabMode)) {
        if (st.current.mode !== d.mode) flush()
        st.current.mode = d.mode as LabMode
      }
      if (d.type === 'active') st.current.lastActive = Date.now()
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
