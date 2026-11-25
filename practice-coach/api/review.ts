import { review } from './_lib/handlers.js'
import { json, readBody, route } from './_lib/http.js'
import { ReviewRequestSchema } from './_lib/schemas.js'

export const maxDuration = 300

export const POST = route(async (req) => {
  const body = await readBody(req, ReviewRequestSchema)
  if (!body.ok) return body.res
  return json(await review(body.data))
})
