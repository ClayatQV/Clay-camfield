import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { WeekStrip } from '../components/WeekStrip'
import { addDays, diffDays, formatShort, fromKey, weekStart, weekdayShort, type DayKey } from '../lib/dates'
import { useStats, useToday } from '../lib/hooks'
import { href } from '../lib/router'
import { deleteSession } from '../store/actions'
import { useData, type Session } from '../store/store'

function fmtMinutes(m: number): string {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, '0')}m`
}

export function Progress() {
  const data = useData()
  const today = useToday()
  const stats = useStats(data, today)
  const total = data.sessions.reduce((s, x) => s + x.minutes, 0)
  const wk = weekStart(today)
  const thisWeek = data.sessions.filter((s) => s.date >= wk && s.date <= today).reduce((s, x) => s + x.minutes, 0)
  const days = [...stats.byDay.keys()].sort().reverse()
  const [shown, setShown] = useState(14)

  return (
    <div className="screen">
      <div className="screen-head">
        <span className="eyebrow">Progress</span>
        <h1>Progress</h1>
      </div>

      <div className="stats">
        <Stat label="Current streak" value={`${stats.current}`} unit={stats.current === 1 ? 'day' : 'days'} icon="fire" />
        <Stat label="Longest streak" value={`${stats.longest}`} unit={stats.longest === 1 ? 'day' : 'days'} />
        <Stat label="Total time" value={fmtMinutes(total)} />
        <Stat label="This week" value={fmtMinutes(thisWeek)} />
      </div>

      <section className="card">
        <div className="row-between">
          <h2>This week</h2>
          <span className="small muted">
            <span style={{ color: 'var(--fire)' }}>
              <Icon name="fire" size={14} />
            </span>{' '}
            practiced ·{' '}
            <span style={{ color: 'var(--freeze)' }}>
              <Icon name="snow" size={14} />
            </span>{' '}
            frozen
          </span>
        </div>
        <WeekStrip practiced={(d) => stats.byDay.has(d)} frozen={stats.frozen} today={today} />
      </section>

      <FreezeCard
        used={stats.freezeThisWeek.used}
        day={stats.freezeThisWeek.day}
        pending={stats.pendingFreeze}
        practicedToday={stats.practicedToday}
      />

      <section className="card">
        <div className="row-between">
          <h2>Practice days</h2>
          <span className="small muted">{stats.byDay.size} total</span>
        </div>
        <Heatmap byDay={stats.byDay} frozen={stats.frozen} today={today} />
        <div className="heat-legend small muted">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className={`hc l${l}`} />
          ))}
          <span>More</span>
          <i className="hc frozen" style={{ marginLeft: 10 }} />
          <span>Freeze</span>
        </div>
      </section>

      <section className="stack">
        <h2>History</h2>
        {days.length === 0 ? (
          <div className="card empty">
            <Icon name="progress" size={32} />
            <p>No sessions yet. Finish today's session and it shows up here.</p>
            <a className="btn primary" href={href('/practice')}>
              Start practicing
            </a>
          </div>
        ) : (
          <>
            {days.slice(0, shown).map((d) => (
              <DayRow key={d} date={d} sessions={stats.byDay.get(d)!} frozenBefore={stats.frozen.has(addDays(d, -1))} />
            ))}
            {days.length > shown && (
              <button className="btn block" onClick={() => setShown((n) => n + 30)}>
                Show older ({days.length - shown} more days)
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, unit, icon }: { label: string; value: string; unit?: string; icon?: string }) {
  return (
    <div className="card stat">
      <span className="small muted">{label}</span>
      <span className="stat-value">
        {icon && <Icon name={icon} size={20} />}
        {value}
        {unit && <span className="stat-unit"> {unit}</span>}
      </span>
    </div>
  )
}

function FreezeCard({ used, day, pending, practicedToday }: { used: boolean; day: DayKey | null; pending: DayKey | null; practicedToday: boolean }) {
  let title: string
  let body: string
  if (pending && !practicedToday) {
    title = 'Freeze in use'
    body = `Covering ${weekdayShort(pending)}. Practice today or the streak resets.`
  } else if (used && day) {
    title = 'Freeze used this week'
    body = `Covered ${formatShort(day)}. A fresh one arrives Monday.`
  } else {
    title = 'Freeze ready'
    body = 'Miss a single day this week and it gets covered automatically. Two days in a row breaks the streak.'
  }
  return (
    <section className="card freeze-card" data-used={used || !!pending}>
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <span className="freeze-icon">
          <Icon name="snow" size={22} />
        </span>
        <div className="stack-sm">
          <strong>{title}</strong>
          <span className="small muted">{body}</span>
        </div>
      </div>
    </section>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function level(min: number): number {
  if (min <= 0) return 0
  if (min < 20) return 1
  if (min < 35) return 2
  if (min < 55) return 3
  return 4
}

function Heatmap({ byDay, frozen, today }: { byDay: Map<DayKey, Session[]>; frozen: Set<DayKey>; today: DayKey }) {
  const scroller = useRef<HTMLDivElement>(null)
  const weeks = useMemo(() => {
    const first = [...byDay.keys()].sort()[0]
    const end = weekStart(today)
    // At least 26 weeks, more if history goes back further.
    let start = addDays(end, -25 * 7)
    if (first && first < start) start = weekStart(first)
    const cols: DayKey[][] = []
    for (let w = start; w <= end; w = addDays(w, 7)) cols.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)))
    return cols
  }, [byDay, today])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [weeks.length])

  return (
    <div className="heat">
      <div className="heat-days small muted" aria-hidden>
        <span />
        <span>M</span>
        <span />
        <span>W</span>
        <span />
        <span>F</span>
        <span />
        <span />
      </div>
      <div className="heat-scroll" ref={scroller}>
        <div className="heat-grid" role="grid" aria-label="Practice calendar">
          {weeks.map((col, i) => {
            const m = fromKey(col[0]).getMonth()
            const showMonth = i === 0 || m !== fromKey(weeks[i - 1][0]).getMonth()
            return (
              <div className="heat-col" key={col[0]} role="row">
                <span className="heat-month small muted">{showMonth ? MONTHS[m] : ''}</span>
                {col.map((d) => {
                  const future = diffDays(today, d) > 0
                  const min = (byDay.get(d) ?? []).reduce((s, x) => s + x.minutes, 0)
                  const cls = future ? 'future' : frozen.has(d) ? 'frozen' : `l${level(min)}`
                  const label = `${formatShort(d)}: ${future ? '' : frozen.has(d) ? 'streak freeze' : min ? `${min} min` : 'no practice'}`
                  return <i key={d} role="gridcell" className={`hc ${cls}${d === today ? ' today' : ''}`} title={label} aria-label={label} />
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DayRow({ date, sessions, frozenBefore }: { date: DayKey; sessions: Session[]; frozenBefore: boolean }) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const minutes = sessions.reduce((s, x) => s + x.minutes, 0)
  return (
    <article className="card history">
      <div className="row-between">
        <strong>{formatShort(date)}</strong>
        <span className="pill">{minutes} min</span>
      </div>
      {sessions.map((s) => (
        <div key={s.id} className="stack-sm history-item">
          <div className="small muted">
            {s.block ? `Block ${s.block} · Week ${s.week} · ` : ''}
            {s.lengthMode}-min plan · {Object.values(s.parts).filter(Boolean).length}/4 parts
            {sessions.length > 1 ? ` · ${s.minutes} min` : ''}
          </div>
          {s.partLabels && s.partLabels.length > 0 && <div className="small">{s.partLabels.join(' · ')}</div>}
          {s.note && <div className="history-note">“{s.note}”</div>}
          <div>
            {confirm === s.id ? (
              <span className="row">
                <button className="btn sm danger" onClick={() => deleteSession(s.id)}>
                  Delete session
                </button>
                <button className="btn sm ghost" onClick={() => setConfirm(null)}>
                  Keep
                </button>
              </span>
            ) : (
              <button className="btn sm ghost" style={{ minHeight: 34, padding: '2px 8px', color: 'var(--muted)' }} onClick={() => setConfirm(s.id)}>
                Delete…
              </button>
            )}
          </div>
        </div>
      ))}
      {frozenBefore && (
        <div className="small muted">
          <Icon name="snow" size={14} /> Freeze covered the day before
        </div>
      )}
    </article>
  )
}
