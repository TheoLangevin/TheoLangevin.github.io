import { useGame } from '../state/useGame.js'
import { formatNumber } from './format.js'
import Overlay from './Overlay.jsx'
import SettingsToggles from './SettingsToggles.jsx'

export default function MainMenu() {
  const start = useGame((state) => state.start)
  const best = useGame((state) => state.best)

  return (
    <Overlay label="Shardstorm">
      <span className="card__tag">3D arena survival</span>
      <h1 className="card__title">Shardstorm</h1>
      <p className="card__lead">
        Hold the arena against endless waves. Collect shards to level up, pick upgrades and build a ship
        that can face the Overseer.
      </p>

      <ul className="keys">
        <li>
          <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or arrows: move
        </li>
        <li>Mouse: aim (the ship fires by itself)</li>
        <li>
          <kbd>Space</kbd> or <kbd>Shift</kbd>: dash through danger · <kbd>Esc</kbd>: pause
        </li>
        <li>On a phone: drag to move, the ship aims for you</li>
      </ul>

      {best > 0 && (
        <p className="card__lead">
          Best score: <strong>{formatNumber(best)}</strong>
        </p>
      )}

      <div className="card__actions">
        <button type="button" className="button button--accent" onClick={start} autoFocus>
          Play
        </button>
        <a className="button button--soft" href="/">
          Back to portfolio
        </a>
      </div>
      <SettingsToggles />
    </Overlay>
  )
}
