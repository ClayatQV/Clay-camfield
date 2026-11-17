import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker: production only (Vite's dev server serves modules that shouldn't be cached).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // First install also "activates" a worker; only an update replaces an existing controller.
    const hadController = !!navigator.serviceWorker.controller
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // A new version installed while the app is open → tell the UI.
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'activated' && hadController) {
              window.dispatchEvent(new Event('pc:update-ready'))
            }
          })
        })
      })
      .catch(() => {})
  })
}
