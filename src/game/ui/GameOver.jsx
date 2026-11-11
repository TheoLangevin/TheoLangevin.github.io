import { useGame } from '../state/useGame.js'
import BuildList from './BuildList.jsx'
import { formatNumber, formatTime } from './format.js'
import Overlay from './Overlay.jsx'

export default function GameOver() {
  const result = useGame((state) => state.result)
  const best = useGame((state) => state.best)
  const start = useGame((state) => state.start)
  const quit = useGame((state) => state.quit)

  const stats = [
    { label: 'Wave reached', value: result.wave },
    { label: 'Level', value: result.level },
    { label: 'Enemies destroyed', value: formatNumber(result.kills) },
    { label: 'Best combo', value: result.bestCombo },
    { label: 'Time survived', value: formatTime(result.time) },
    { label: 'Best score', value: formatNumber(best) },
  ]

  return (
    <Overlay label="Game over">
      <span className="card__tag">{result.record ? 'New record!' : 'Game over'}</span>
      <h1 className="card__title">{formatNumber(result.score)}</h1>
      <dl className="stats">
        {stats.map(({ label, value }) => (
          <div key={label} className="stat">
            <dd className="stat__value">{value}</dd>
            <dt className="stat__label">{label}</dt>
          </div>
        ))}
      </dl>
      <BuildList upgrades={result.upgrades} />
      <div className="card__actions">
        <button type="button" className="button button--accent" onClick={start}>
          Play again
        </button>
        <button type="button" className="button button--soft" onClick={quit}>
          Menu
        </button>
      </div>
    </Overlay>
  )
}
