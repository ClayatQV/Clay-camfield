import { json, route } from './_lib/http.ts'

/** GET /api/health → is the AI coach configured? (no passcode needed; reveals nothing secret) */
export default route(
  async () =>
    json({
      ok: true,
      ai: !!process.env.ANTHROPIC_API_KEY,
      passcode: !!process.env.APP_PASSCODE,
    }),
  { auth: false },
)
