/**
 * One place that talks to Claude. Structured outputs (zod), prompt caching on
 * the system prompt, server-side refusal fallbacks on by default, and errors
 * mapped to something the app can show.
 */
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'

export const MODEL = 'claude-opus-5-5'

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 2, timeout: 55_000 })
  return client
}

export class AiError extends Error {
  status: number
  retryable: boolean
  constructor(status: number, message: string, retryable = false) {
    super(message)
    this.status = status
    this.retryable = retryable
  }
}

export type Effort = 'low' | 'medium' | 'high'

export async function ask<S extends z.ZodType>(opts: {
  system: string
  user: string
  schema: S
  effort: Effort
  maxTokens?: number
}): Promise<z.infer<S>> {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiError(503, 'The AI coach is not set up on the server yet (no API key).')
  const c = getClient()
  let res
  try {
    res = await c.beta.messages.parse({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: opts.user }],
      output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new AiError(502, 'The AI key on the server is missing or invalid.')
    if (e instanceof Anthropic.RateLimitError) throw new AiError(503, 'The AI is busy right now. Try again in a moment.', true)
    if (e instanceof Anthropic.APIConnectionError) throw new AiError(503, 'Could not reach the AI service.', true)
    if (e instanceof Anthropic.APIError) throw new AiError(502, `AI error (${e.status ?? '?'}).`, (e.status ?? 500) >= 500)
    throw new AiError(500, 'Unexpected AI error.')
  }
  if (res.stop_reason === 'refusal') throw new AiError(422, 'The AI declined this request.')
  if (res.stop_reason === 'max_tokens') throw new AiError(502, 'The AI answer was cut off. Try again.', true)
  const parsed = res.parsed_output
  if (!parsed) throw new AiError(502, 'The AI answer could not be read. Try again.', true)
  const check = opts.schema.safeParse(parsed)
  if (!check.success) throw new AiError(502, 'The AI answer had the wrong shape. Try again.', true)
  return check.data
}
