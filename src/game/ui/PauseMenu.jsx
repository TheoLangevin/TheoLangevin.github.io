import { runtime } from '../state/runtime.js'
import { useGame } from '../state/useGame.js'
import BuildList from './BuildList.jsx'
import Overlay from './Overlay.jsx'
import SettingsToggles from './SettingsToggles.jsx'

export default function PauseMenu() {
  const resume = useGame((state) => state.resume)
  const start = useGame((state) => state.start)
  const quit = useGame((state) => state.quit)

  return (
    <Overlay label="Paused">
      <span className="card__tag">Paused</span>
      <h1 className="card__title">Take a breath</h1>
      <BuildList upgrades={runtime.world?.upgrades ?? {}} />
      <div className="card__actions">
        <button type="button" className="button button--accent" onClick={resume} autoFocus>
          Resume
        </button>
        <button type="button" className="button button--soft" onClick={start}>
          Restart
        </button>
        <button type="button" className="button button--soft" onClick={quit}>
          Quit
        </button>
      </div>
      <SettingsToggles />
    </Overlay>
  )
}
