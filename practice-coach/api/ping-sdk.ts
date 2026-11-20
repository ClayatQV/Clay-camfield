/** Diagnostic: does importing the Anthropic SDK load? */
import Anthropic from '@anthropic-ai/sdk'
export default function handler() {
  return new Response(JSON.stringify({ ok: 2, sdk: typeof Anthropic }), { headers: { 'content-type': 'application/json' } })
}
