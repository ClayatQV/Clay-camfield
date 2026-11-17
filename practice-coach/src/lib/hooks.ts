import { useEffect, useMemo, useState } from 'react'
import type { AppData, Session } from '../store/store'
import { todayKey, type DayKey } from './dates'
import { computeStreaks } from './streaks'

/** Re-renders every `ms` while `active`. Returns Date.now(). */
export function useNow(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return active ? now : Date.now()
}

/** Today's local date; rolls over at midnight and when the app comes back to the foreground. */
export function useToday(): DayKey {
  const [t, setT] = useState(todayKey)
  useEffect(() => {
    const check = () => setT(todayKey())
    const id = setInterval(check, 30000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return t
}

export function sessionsByDay(sessions: Session[]): Map<DayKey, Session[]> {
  const m = new Map<DayKey, Session[]>()
  for (const s of sessions) {
    const l = m.get(s.date)
    if (l) l.push(s)
    else m.set(s.date, [s])
  }
  return m
}

export function useStats(data: AppData, today: DayKey) {
  return useMemo(() => {
    const byDay = sessionsByDay(data.sessions)
    return { byDay, ...computeStreaks(byDay.keys(), today) }
  }, [data.sessions, today])
}
