import { useMatrix } from '../state/useMatrix.js'
import HoloPanel from './HoloPanel.jsx'
import PortalLink from './PortalLink.jsx'

const QUALITY_LABEL = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' }

/** Opened when the mouse is released (Esc): settings, controls and the way out. */
export default function PauseMenu() {
  const closeOverlay = useMatrix((state) => state.closeOverlay)
  const openDirectory = useMatrix((state) => state.openDirectory)
  const toggleSound = useMatrix((state) => state.toggleSound)
  const cycleQuality = useMatrix((state) => state.cycleQuality)
  const sound = useMatrix((state) => state.sound)
  const quality = useMatrix((state) => state.quality)
  const qualityMode = useMatrix((state) => state.qualityMode)
  const moveKeys = useMatrix((state) => state.moveKeys)
  const touch = useMatrix((state) => state.touch)

  const controls = touch
    ? [
        ['LEFT THUMB', 'Move'],
        ['RIGHT THUMB', 'Look around'],
        ['TAP / ACCESS', 'Interact'],
      ]
    : [
        [`${moveKeys} / ARROWS`, 'Move'],
        ['MOUSE', 'Look around'],
        ['E / CLICK', 'Interact'],
        ['SHIFT', 'Run'],
        ['SPACE', 'Jump'],
        ['TAB', 'Directory'],
        ['M', 'Sound'],
        ['ESC', 'This menu'],
      ]

  return (
    <HoloPanel
      path="// SYSTEM / MENU"
      title="Link suspended"
      onClose={closeOverlay}
      actions={
        <>
          <button type="button" className="holo__button holo__button--primary" onClick={closeOverlay} data-autofocus="">
            Resume
          </button>
          <button type="button" className="holo__button" onClick={openDirectory}>
            Directory
          </button>
          <PortalLink href="/">Classic site</PortalLink>
        </>
      }
    >
      <div className="holo__settings">
        <button type="button" className="holo__setting" onClick={toggleSound} aria-pressed={sound}>
          <span>SOUND</span>
          <b>{sound ? 'ON' : 'OFF'}</b>
        </button>
        <button type="button" className="holo__setting" onClick={cycleQuality}>
          <span>GRAPHICS</span>
          <b>{qualityMode === 'auto' ? `AUTO (${QUALITY_LABEL[quality]})` : QUALITY_LABEL[quality]}</b>
        </button>
      </div>

      <dl className="holo__keys">
        {controls.map(([keys, action]) => (
          <div key={keys}>
            <dt>{keys}</dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>

      <p className="holo__footnote">&copy; {new Date().getFullYear()} Théo Langevin</p>
    </HoloPanel>
  )
}
