import { json, route } from './_lib/http'

/** POST /api/auth with x-passcode → 200 if it matches. Lets the app verify a passcode once. */
export default route(async () => json({ ok: true }))
