import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PouleApp from './PouleApp.jsx'
import { usePoule } from './state/usePoule.js'
import './styles/poule.css'

// Handy when developing: inspect the game's state from the console.
if (import.meta.env.DEV) window.__poule = { usePoule }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PouleApp />
  </StrictMode>,
)
