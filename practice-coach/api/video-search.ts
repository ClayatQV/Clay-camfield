import { searchVideos } from './_lib/video-search.js'
import { json, readBody, route } from './_lib/http.js'
import { VideoSearchRequestSchema } from './_lib/schemas.js'

export const maxDuration = 60

export const POST = route(async (req) => {
  const body = await readBody(req, VideoSearchRequestSchema)
  if (!body.ok) return body.res
  try {
    return json(await searchVideos(body.data.q, body.data.exclude ?? []))
  } catch (e) {
    return json({ error: `Video search failed (${e instanceof Error ? e.message : 'unknown'}). Paste a link instead.`, retryable: true }, 502)
  }
})
