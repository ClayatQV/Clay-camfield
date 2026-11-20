/** Diagnostic: no imports at all. */
export default function handler(req: Request) {
  return new Response(JSON.stringify({ ok: 1, method: req.method, node: process.version }), { headers: { 'content-type': 'application/json' } })
}
