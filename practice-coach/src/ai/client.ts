/**
 * Talks to the app's own server functions (/api/*), which talk to Claude.
 * The passcode lives in the store; every AI request sends it.
 */
import type { AiModule, AiResultCore, EarGuide, EarRequest, InterviewRequest, InterviewResponse, ModuleRequest, ModulesRequest, ResultsRequest, SongsRequest, SongsResponse, VideoHit, VideoSearchRequest, Review, ReviewRequest, RecheckRequest, RecheckResponse } from '../../api/_lib/schemas'
import { getData } from '../store/store'

export class AiClientError extends Error {
  status: number
  retryable: boolean
  constructor(status: number, message: string, retryable = false) {
    super(message)
    this.status = status
    this.retryable = retryable
  }
}

const base = () => (import.meta.env.BASE_URL === './' ? '' : import.meta.env.BASE_URL.replace(/\/$/, ''))

/** One automatic retry on a retryable failure (busy AI, dropped connection, a structured answer that failed to parse). All AI routes are stateless, so a retry is safe. */
async function call<T>(path: string, body: unknown, passcode?: string): Promise<T> {
  try {
    return await once<T>(path, body, passcode)
  } catch (e) {
    if (e instanceof AiClientError && e.retryable && path !== 'auth') {
      await new Promise((r) => setTimeout(r, 1500))
      return once<T>(path, body, passcode)
    }
    throw e
  }
}

async function once<T>(path: string, body: unknown, passcode?: string): Promise<T> {
  const code = passcode ?? getData().ai.passcode
  let res: Response
  try {
    res = await fetch(`${base()}/api/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-passcode': code },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new AiClientError(0, 'No connection. The AI coach needs the internet.', true)
  }
  let data: { error?: string; retryable?: boolean } & Record<string, unknown> = {}
  try {
    data = await res.json()
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) throw new AiClientError(res.status, data.error ?? `Server error (${res.status}).`, data.retryable ?? res.status >= 500)
  return data as T
}

export type Health = { ok: boolean; ai: boolean; passcode: boolean }

/** Is there a server with the AI configured behind this site? Cached per page load. */
let healthPromise: Promise<Health | null> | null = null
export function health(force = false): Promise<Health | null> {
  if (!healthPromise || force) {
    healthPromise = fetch(`${base()}/api/health`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? ((await r.json()) as Health) : null))
      .catch(() => null)
  }
  return healthPromise
}

export const verifyPasscode = (code: string) => call<{ ok: boolean }>('auth', {}, code)
export const nextScreens = (req: InterviewRequest) => call<InterviewResponse>('interview', req)
export const getResults = (req: ResultsRequest) => call<AiResultCore>('results', req)
export const getModules = (req: ModulesRequest) => call<{ modules: AiModule[] }>('modules', req)
export const writeModule = (req: ModuleRequest) => call<AiModule>('module', req)
export const getEarGuide = (req: EarRequest) => call<EarGuide>('ear', req)
export const getSongs = (req: SongsRequest) => call<SongsResponse>('songs', req)
export const getReview = (req: ReviewRequest) => call<Review>('review', req)
export const getRecheck = (req: RecheckRequest) => call<RecheckResponse>('recheck', req)
export const searchVideos = (req: VideoSearchRequest) => call<{ results: VideoHit[]; source: 'api' | 'page' }>('video-search', req)
