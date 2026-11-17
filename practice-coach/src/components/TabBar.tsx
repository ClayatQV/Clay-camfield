import { href } from '../lib/router'
import { Icon } from './Icon'

const TABS = [
  { to: '/', label: 'Today', icon: 'today', match: (p: string) => p === '/' },
  { to: '/progress', label: 'Progress', icon: 'progress', match: (p: string) => p.startsWith('/progress') },
  { to: '/plan', label: 'Plan', icon: 'plan', match: (p: string) => p.startsWith('/plan') },
  { to: '/lessons', label: 'Lessons', icon: 'lessons', match: (p: string) => p.startsWith('/lessons') },
  { to: '/lab', label: 'Lab', icon: 'lab', match: (p: string) => p.startsWith('/lab') },
  { to: '/settings', label: 'Settings', icon: 'settings', match: (p: string) => p.startsWith('/settings') },
]

export function TabBar({ path }: { path: string }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => {
        const active = t.match(path)
        return (
          <a key={t.to} href={href(t.to)} className={active ? 'tab active' : 'tab'} aria-current={active ? 'page' : undefined}>
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
