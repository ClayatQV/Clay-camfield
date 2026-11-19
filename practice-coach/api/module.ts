import { module as writeModule } from './_lib/handlers.ts'
import { json, readBody, route } from './_lib/http.ts'
import { ModuleRequestSchema } from './_lib/schemas.ts'

export const maxDuration = 60

export default route(async (req) => {
  const body = await readBody(req, ModuleRequestSchema)
  if (!body.ok) return body.res
  return json(await writeModule(body.data))
})
