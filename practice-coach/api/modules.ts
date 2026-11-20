import { modules } from './_lib/handlers.js'
import { json, readBody, route } from './_lib/http.js'
import { ModulesRequestSchema } from './_lib/schemas.js'

export const maxDuration = 300

export const POST = route(async (req) => {
  const body = await readBody(req, ModulesRequestSchema)
  if (!body.ok) return body.res
  return json({ modules: await modules(body.data) })
})
