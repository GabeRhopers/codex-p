import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './ui/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Production only — registering it under `vite dev` would let the service
// worker's cache-first strategy serve stale unbundled modules during local
// development, which is confusing to debug and buys nothing there anyway.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Installability/offline support is a progressive enhancement, not
      // a requirement — a failed registration (unsupported browser,
      // blocked storage, etc.) shouldn't be treated as an app error.
    })
  })
}
