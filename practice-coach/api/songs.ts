import { songs } from './_lib/handlers.js'
import { json, readBody, route } from './_lib/http.js'
import { SongsRequestSchema } from './_lib/schemas.js'

export const maxDuration = 300

export const POST = route(async (req) => {
  const body = await readBody(req, SongsRequestSchema)
  if (!body.ok) return body.res
  return json(await songs(body.data))
})
