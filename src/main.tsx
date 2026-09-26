import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// canvas labels use the display face too — warm it up so the first frames aren't wrong
if (typeof document !== 'undefined' && 'fonts' in document) {
  document.fonts.load('16px "Youre Gone"').catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
