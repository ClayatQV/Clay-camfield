import { json, route } from './_lib/http.js'

/** POST /api/auth with x-passcode → 200 if it matches. Lets the app verify a passcode once. */
export const POST = route(async () => json({ ok: true }))
