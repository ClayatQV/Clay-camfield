import { recheck } from './_lib/handlers.js'
import { json, readBody, route } from './_lib/http.js'
import { RecheckRequestSchema } from './_lib/schemas.js'

export const maxDuration = 120

export const POST = route(async (req) => {
  const body = await readBody(req, RecheckRequestSchema)
  if (!body.ok) return body.res
  return json(await recheck(body.data))
})
