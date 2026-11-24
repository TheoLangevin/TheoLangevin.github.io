import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Base styles first: every screen's own stylesheet builds on them.
import './styles/poule.css'
import PouleApp from './PouleApp.jsx'
import { useAccount } from './state/useAccount.js'
import { usePoule } from './state/usePoule.js'

// Handy when developing: inspect the game's state from the console.
if (import.meta.env.DEV) window.__poule = { usePoule, useAccount }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PouleApp />
  </StrictMode>,
)
