import { module as writeModule } from './_lib/handlers'
import { json, readBody, route } from './_lib/http'
import { ModuleRequestSchema } from './_lib/schemas'

export const maxDuration = 60

export default route(async (req) => {
  const body = await readBody(req, ModuleRequestSchema)
  if (!body.ok) return body.res
  return json(await writeModule(body.data))
})
