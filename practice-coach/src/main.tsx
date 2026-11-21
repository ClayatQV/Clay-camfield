import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { App } from './App'
import { registerServiceWorker } from './lib/sw'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker: production only (Vite's dev server serves modules that shouldn't be cached).
if (import.meta.env.PROD) registerServiceWorker()
