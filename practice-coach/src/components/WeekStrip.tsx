import { addDays, diffDays, formatShort, weekStart, type DayKey } from '../lib/dates'
import { Icon } from './Icon'

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** This week Mon–Sun: fire on practiced days, ice on frozen ones. */
export function WeekStrip({ practiced, frozen, today }: { practiced: (d: DayKey) => boolean; frozen: Set<DayKey>; today: DayKey }) {
  const mon = weekStart(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i))
  return (
    <div className="week-strip" role="list" aria-label="This week">
      {days.map((d, i) => {
        const future = diffDays(today, d) > 0
        const kind = practiced(d) ? 'fire' : frozen.has(d) ? 'ice' : future ? 'future' : d === today ? 'open' : 'miss'
        const label =
          kind === 'fire' ? 'practiced' : kind === 'ice' ? 'covered by the streak freeze' : kind === 'open' ? 'not yet' : kind === 'miss' ? 'missed' : ''
        return (
          <div key={d} role="listitem" className={`wd ${kind}${d === today ? ' is-today' : ''}`} aria-label={`${formatShort(d)}${label ? ': ' + label : ''}`}>
            <span className="wd-dot">
              {kind === 'fire' && <Icon name="fire" size={18} />}
              {kind === 'ice' && <Icon name="snow" size={16} />}
            </span>
            <span className="wd-l" aria-hidden>
              {LETTERS[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
