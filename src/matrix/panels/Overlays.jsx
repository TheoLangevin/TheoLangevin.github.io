import { useMatrix } from '../state/useMatrix.js'
import Directory from './Directory.jsx'
import NodePanel from './NodePanel.jsx'
import PauseMenu from './PauseMenu.jsx'

/** The one window that can be open over the world at a time. */
export default function Overlays() {
  const overlay = useMatrix((state) => state.overlay)
  if (!overlay) return null
  if (overlay.type === 'panel') return <NodePanel id={overlay.id} />
  if (overlay.type === 'directory') return <Directory />
  return <PauseMenu />
}
