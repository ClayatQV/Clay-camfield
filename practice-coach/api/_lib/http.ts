/**
 * Tiny request helpers for the Web-standard handlers (Vercel functions and
 * the local dev mount share them). The site is public, so every AI route is
 * behind a passcode set on the server (APP_PASSCODE).
 */
import type { z } from 'zod'
import { AiError } from './claude.js'

export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } })

/** Constant-time-ish compare so the passcode can't be guessed letter by letter from timing. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function checkPasscode(req: Request): Response | null {
  const expected = process.env.APP_PASSCODE ?? ''
  if (!expected) return json({ error: 'The server has no APP_PASSCODE set, so the AI coach is off.' }, 503)
  const got = req.headers.get('x-passcode') ?? ''
  if (!got || !same(got, expected)) return json({ error: 'Wrong passcode.' }, 401)
  return null
}

export async function readBody<S extends z.ZodType>(req: Request, schema: S): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: Response }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { ok: false, res: json({ error: 'Bad JSON.' }, 400) }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, res: json({ error: 'Bad request.', detail: parsed.error.issues.slice(0, 3) }, 400) }
  return { ok: true, data: parsed.data }
}

/** Wraps a handler: method check, passcode, error mapping. */
export function route(fn: (req: Request) => Promise<Response>, opts: { auth?: boolean } = { auth: true }) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
    if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405)
    if (opts.auth !== false) {
      const denied = checkPasscode(req)
      if (denied) return denied
    }
    try {
      return await fn(req)
    } catch (e) {
      if (e instanceof AiError) return json({ error: e.message, retryable: e.retryable }, e.status)
      console.error(e)
      return json({ error: 'Server error.' }, 500)
    }
  }
}
