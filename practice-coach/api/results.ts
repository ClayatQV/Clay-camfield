import { results } from './_lib/handlers.js'
import { json, readBody, route } from './_lib/http.js'
import { ResultsRequestSchema } from './_lib/schemas.js'

export const maxDuration = 60

export const POST = route(async (req) => {
  const body = await readBody(req, ResultsRequestSchema)
  if (!body.ok) return body.res
  return json(await results(body.data))
})
