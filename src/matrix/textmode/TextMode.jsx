import RainCanvas from '../boot/RainCanvas.jsx'
import { profile } from '../content/profile.js'
import DirectoryList from '../panels/DirectoryList.jsx'
import NodePanel from '../panels/NodePanel.jsx'
import '../panels/panels.css'
import { useMatrix } from '../state/useMatrix.js'
import './textmode.css'

/**
 * The whole site without 3D, for devices that cannot run it: the same nodes,
 * listed, opening the same holographic windows.
 */
export default function TextMode() {
  const overlay = useMatrix((state) => state.overlay)
  const sound = useMatrix((state) => state.sound)
  const toggleSound = useMatrix((state) => state.toggleSound)

  return (
    <div className="textmode">
      <RainCanvas className="textmode__rain" />
      <main className="textmode__main" inert={Boolean(overlay)}>
        <p className="textmode__status">// TEXT MODE · 3D LINK UNAVAILABLE ON THIS DEVICE</p>
        <h1 className="textmode__title">{profile.name}</h1>
        <p className="textmode__role">{profile.role}</p>
        <DirectoryList action="OPEN" />
        <p className="textmode__foot">
          <button type="button" className="textmode__tool" onClick={toggleSound} aria-pressed={sound}>
            [M] SOUND: {sound ? 'ON' : 'OFF'}
          </button>
          <a className="textmode__tool" href="/">
            OPEN THE CLASSIC SITE
          </a>
        </p>
      </main>
      {overlay?.type === 'panel' && <NodePanel id={overlay.id} />}
    </div>
  )
}
