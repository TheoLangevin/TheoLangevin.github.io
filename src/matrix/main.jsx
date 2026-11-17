import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import MatrixApp from './MatrixApp.jsx'
import { rig } from './state/rig.js'
import { useMatrix } from './state/useMatrix.js'

// Handy when developing: inspect or move the visitor from the console.
if (import.meta.env.DEV) window.__matrix = { rig, useMatrix }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MatrixApp />
  </StrictMode>,
)
