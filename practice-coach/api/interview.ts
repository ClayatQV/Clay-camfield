import { interview } from './_lib/handlers.js'
import { json, readBody, route } from './_lib/http.js'
import { InterviewRequestSchema } from './_lib/schemas.js'

export const maxDuration = 60

export const POST = route(async (req) => {
  const body = await readBody(req, InterviewRequestSchema)
  if (!body.ok) return body.res
  return json(await interview(body.data))
})
