import { href } from '../lib/router'

export function NotFound() {
  return (
    <div className="screen">
      <div className="empty">
        <h2>Nothing here</h2>
        <p>That page doesn't exist.</p>
        <a className="btn primary" href={href('/')}>
          Go to Today
        </a>
      </div>
    </div>
  )
}
