import { module as writeModule } from './_lib/handlers.js'
import { json, readBody, route } from './_lib/http.js'
import { ModuleRequestSchema } from './_lib/schemas.js'

export const maxDuration = 300

export const POST = route(async (req) => {
  const body = await readBody(req, ModuleRequestSchema)
  if (!body.ok) return body.res
  return json(await writeModule(body.data))
})
