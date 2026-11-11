import { useGame } from '../state/useGame.js'
import { formatNumber } from './format.js'
import './hud.css'
import { PauseIcon } from './icons.jsx'

function Bar({ kind, label, value, max = 100, children }) {
  return (
    <div
      className={`bar bar--${kind}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="bar__fill" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
      <span className="bar__text">{children}</span>
    </div>
  )
}

/** Big announcement at the start of each wave; remounted (via `key`) to replay. */
function WaveBanner({ wave, boss }) {
  if (wave === 0) return null
  return (
    <div className={`banner${boss ? ' banner--boss' : ''}`} aria-live="polite">
      {boss ? 'The Overseer approaches' : `Wave ${wave}`}
    </div>
  )
}

export default function Hud() {
  const hud = useGame((state) => state.hud)
  const pause = useGame((state) => state.pause)
  if (!hud) return null

  return (
    <div className="hud">
      <div className="hud__corner hud__corner--left">
        <Bar kind="hp" label="Health" value={hud.hp} max={hud.maxHp}>
          {hud.hp} / {hud.maxHp}
          {hud.shield && <span className="hud__shield">Shield</span>}
        </Bar>
        <Bar kind="xp" label="Experience" value={hud.xp}>
          Level {hud.level}
        </Bar>
        <Bar kind="dash" label="Dash" value={Math.round(hud.dash * 100)}>
          {hud.dash >= 1 ? 'Dash ready' : 'Dash'}
        </Bar>
      </div>

      <div className="hud__centre">
        <div className="hud__wave">Wave {Math.max(1, hud.wave)}</div>
        <div className="hud__enemies">
          {hud.enemies > 0 ? `${hud.enemies} ${hud.enemies === 1 ? 'enemy' : 'enemies'} left` : 'Wave cleared'}
        </div>
        {hud.bossWave && (
          <Bar kind="boss" label="Overseer health" value={hud.bossHp}>
            Overseer
          </Bar>
        )}
      </div>

      <div className="hud__corner hud__corner--right">
        <div className="hud__score">{formatNumber(hud.score)}</div>
        <div className={`hud__combo${hud.combo > 1 ? ' hud__combo--active' : ''}`}>
          ×{hud.multiplier.toFixed(2)} · combo {hud.combo}
        </div>
        <button type="button" className="hud__button" onClick={pause} aria-label="Pause">
          <PauseIcon />
        </button>
      </div>

      <WaveBanner key={hud.wave} wave={hud.wave} boss={hud.bossWave} />
    </div>
  )
}
