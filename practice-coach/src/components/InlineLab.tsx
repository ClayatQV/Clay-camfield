import { useState } from 'react'
import { labFileUrl } from '../lib/lab'
import { effectiveTheme } from '../lib/theme'
import { useData } from '../store/store'
import { Icon } from './Icon'

/**
 * Fretboard Lab opened inside the practice page, so a drill doesn't take you
 * off your routine. `labUrl` is the app route form ("/lab?mode=…").
 */
export function InlineLab({ labUrl, label, onClose }: { labUrl: string; label: string; onClose: () => void }) {
  const { settings } = useData()
  const theme = effectiveTheme(settings.theme)
  const query = new URLSearchParams(labUrl.split('?')[1] ?? '')
  const src = labFileUrl(query, { theme, embed: '1' })
  const [tall, setTall] = useState(false)
  return (
    <div className="inline-lab">
      <div className="row-between inline-lab-bar">
        <strong className="small">{label}</strong>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn sm ghost" onClick={() => setTall((t) => !t)} aria-label={tall ? 'Shorter' : 'Taller'}>
            {tall ? 'Shorter' : 'Taller'}
          </button>
          <button className="btn sm ghost" onClick={onClose} aria-label="Close drill">
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>
      <iframe className={`inline-lab-frame${tall ? ' tall' : ''}`} src={src} title={`Fretboard Lab: ${label}`} />
    </div>
  )
}
