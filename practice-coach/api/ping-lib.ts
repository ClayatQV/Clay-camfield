/** Diagnostic: does a relative import of _lib load? */
import { json } from './_lib/http'
export default function handler() {
  return json({ ok: 4 })
}
