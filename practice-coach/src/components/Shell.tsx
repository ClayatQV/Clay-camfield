import { useEffect, useState } from 'react'
import { PART_IDS } from '../content/types'
import { formatClock } from '../lib/dates'
import { useNow } from '../lib/hooks'
import { href } from '../lib/router'
import { elapsedOf } from '../store/actions'
import { useData } from '../store/store'
import { Icon } from './Icon'

type NavItem = { to: string; label: string; icon: string; match: (p: string) => boolean }

export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', match: (p) => p === '/' },
  { to: '/practice', label: 'Practice', icon: 'today', match: (p) => p.startsWith('/practice') },
  { to: '/plan', label: 'Plan', icon: 'plan', match: (p) => p.startsWith('/plan') },
  { to: '/lessons', label: 'Lessons', icon: 'lessons', match: (p) => p.startsWith('/lessons') },
  { to: '/lab', label: 'Fretboard Lab', icon: 'lab', match: (p) => p.startsWith('/lab') },
  { to: '/progress', label: 'Progress', icon: 'progress', match: (p) => p.startsWith('/progress') },
  { to: '/assessment/results', label: 'Assessment', icon: 'vision', match: (p) => p.startsWith('/assessment') },
  { to: '/settings', label: 'Settings', icon: 'settings', match: (p) => p.startsWith('/settings') },
]

const PART_NAMES: Record<string, string> = { triads: 'Chords', arps: 'Arpeggios', concept: 'Concept', application: 'Application' }

/** The running practice timer, visible from every page. */
export function RunningTimer({ compact }: { compact?: boolean }) {
  const { draft } = useData()
  const running = draft?.running ?? null
  const now = useNow(!!running, 1000)
  if (!draft || !running) return null
  const total = PART_IDS.reduce((s, p) => s + elapsedOf(draft, p, now), 0)
  return (
    <a className={`run-pill${compact ? ' compact' : ''}`} href={href('/practice')} aria-label={`Timer running: ${PART_NAMES[running]}`}>
      <span className="run-dot" aria-hidden />
      <span>{PART_NAMES[running]}</span>
      <span className="mono">{formatClock(elapsedOf(draft, running, now))}</span>
      {!compact && <span className="muted small mono">· {formatClock(total)} total</span>}
    </a>
  )
}

function NavList({ path, onPick }: { path: string; onPick?: () => void }) {
  return (
    <nav className="nav-list" aria-label="Main">
      {NAV.map((n) => {
        const active = n.match(path)
        return (
          <a key={n.to} href={href(n.to)} className={active ? 'nav-item active' : 'nav-item'} aria-current={active ? 'page' : undefined} onClick={onPick}>
            <Icon name={n.icon} size={20} />
            <span>{n.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

/** Desktop: fixed left sidebar. Phone: a top bar with a menu that slides in from the left. */
export function Shell({ path }: { path: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const current = NAV.find((n) => n.match(path))

  return (
    <>
      <aside className="sidebar">
        <a className="brand" href={href('/')}>
          <img src="./icons/icon.svg" alt="" width={28} height={28} />
          <span>Practice Coach</span>
        </a>
        <NavList path={path} />
        <div className="sidebar-foot">
          <RunningTimer />
        </div>
      </aside>

      <header className="topbar">
        <button className="btn icon ghost" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          <Icon name="menu" />
        </button>
        <span className="topbar-title">{current?.label ?? 'Practice Coach'}</span>
        <RunningTimer compact />
      </header>

      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)}>
          <div className="drawer" role="dialog" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <div className="row-between">
              <a className="brand" href={href('/')} onClick={() => setOpen(false)}>
                <img src="./icons/icon.svg" alt="" width={28} height={28} />
                <span>Practice Coach</span>
              </a>
              <button className="btn icon ghost" onClick={() => setOpen(false)} aria-label="Close menu">
                <Icon name="close" />
              </button>
            </div>
            <NavList path={path} onPick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
