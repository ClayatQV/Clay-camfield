import { interview } from './_lib/handlers'
import { json, readBody, route } from './_lib/http'
import { InterviewRequestSchema } from './_lib/schemas'

export const maxDuration = 60

export default route(async (req) => {
  const body = await readBody(req, InterviewRequestSchema)
  if (!body.ok) return body.res
  return json(await interview(body.data))
})
