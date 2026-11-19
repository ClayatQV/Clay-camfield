import { interview } from './_lib/handlers.ts'
import { json, readBody, route } from './_lib/http.ts'
import { InterviewRequestSchema } from './_lib/schemas.ts'

export const maxDuration = 60

export default route(async (req) => {
  const body = await readBody(req, InterviewRequestSchema)
  if (!body.ok) return body.res
  return json(await interview(body.data))
})
