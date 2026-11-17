import { Icon } from '../components/Icon'
import { labFileUrl } from '../lib/lab'
import { effectiveTheme } from '../lib/theme'
import { useData } from '../store/store'

const MODE_NAMES: Record<string, string> = { chords: 'Chords', arpeggios: 'Arpeggios', scales: 'Scales', technique: 'Technique' }

/** Fretboard Lab (public/fretboard-lab.html) in a full-height frame; route query = preset. */
export function Lab({ query }: { query: URLSearchParams }) {
  const { settings } = useData()
  const theme = effectiveTheme(settings.theme)
  const src = labFileUrl(query, { theme, embed: '1' })
  const fullSrc = labFileUrl(query, { theme })
  const hasPreset = query.has('mode')
  const summary = hasPreset
    ? [MODE_NAMES[query.get('mode') ?? ''] ?? query.get('mode'), query.get('root'), query.get('type') ?? query.get('scale'), query.get('voicing')]
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
      <iframe key={src} className="lab-frame" src={src} title="Fretboard Lab" />
    </div>
  )
}
