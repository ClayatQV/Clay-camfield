/** Diagnostic: does the zod helper import load? */
import { z } from 'zod'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
export default function handler() {
  const f = betaZodOutputFormat(z.object({ a: z.string() }))
  return new Response(JSON.stringify({ ok: 3, type: f.type }), { headers: { 'content-type': 'application/json' } })
}
