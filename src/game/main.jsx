import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../shared/styles/tokens.css'
import '../shared/styles/reset.css'
import '../shared/styles/button.css'
import './styles/game.css'
import GameApp from './GameApp.jsx'
import { runtime } from './state/runtime.js'
import { useGame } from './state/useGame.js'

// Handy when developing: inspect or tweak the running game from the console.
if (import.meta.env.DEV) window.__shardstorm = { runtime, useGame }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameApp />
  </StrictMode>,
)
