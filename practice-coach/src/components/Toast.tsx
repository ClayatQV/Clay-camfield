import { useEffect, useSyncExternalStore } from 'react'

let msg: { text: string; id: number } | null = null
const ls = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined

export function toast(text: string, ms = 2400) {
  msg = { text, id: Date.now() }
  ls.forEach((l) => l())
  clearTimeout(timer)
  timer = setTimeout(() => {
    msg = null
    ls.forEach((l) => l())
  }, ms)
}

export function ToastHost() {
  const m = useSyncExternalStore(
    (l) => {
      ls.add(l)
      return () => ls.delete(l)
    },
    () => msg,
  )
  useEffect(() => () => clearTimeout(timer), [])
  if (!m) return null
  return (
    <div className="toast" role="status" aria-live="polite" key={m.id}>
      {m.text}
    </div>
  )
}
