import { useEffect, useState } from 'react'
import { health, type Health } from './client'
import { useData } from '../store/store'

export type AiStatus = { loading: boolean; server: boolean; configured: boolean; hasPasscode: boolean; health: Health | null }

/** Is the AI coach available here? (a server behind the site, a key on it, and a passcode saved) */
export function useAiStatus(): AiStatus {
  const { ai } = useData()
  const [h, setH] = useState<Health | null | undefined>(undefined)
  useEffect(() => {
    let on = true
    health().then((x) => on && setH(x))
    return () => {
      on = false
    }
  }, [])
  return {
    loading: h === undefined,
    server: !!h?.ok,
    configured: !!h?.ok && !!h.ai && !!h.passcode,
    hasPasscode: !!ai.passcode,
    health: h ?? null,
  }
}

export const LEVEL_NAMES = ['Not yet', 'Know it', 'Play it slowly', 'At tempo', 'Use it in music', 'Can teach it']
