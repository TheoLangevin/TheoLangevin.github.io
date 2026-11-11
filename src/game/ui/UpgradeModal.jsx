import { useGame } from '../state/useGame.js'
import Overlay from './Overlay.jsx'
import './upgrades.css'

const CATEGORY_LABELS = { weapon: 'Weapon', defense: 'Defense', utility: 'Utility' }

export default function UpgradeModal() {
  const choices = useGame((state) => state.choices)
  const level = useGame((state) => state.hud.level)
  const choose = useGame((state) => state.choose)

  return (
    <Overlay label="Choose an upgrade" wide>
      <span className="card__tag">Level {level}</span>
      <h1 className="card__title">Choose an upgrade</h1>
      <div className="upgrades">
        {choices.map((choice, index) => (
          <button
            key={choice.id}
            type="button"
            className={`upgrade upgrade--${choice.category}`}
            onClick={() => choose(choice.id)}
          >
            <span className="upgrade__category">{CATEGORY_LABELS[choice.category]}</span>
            <span className="upgrade__name">{choice.name}</span>
            <span className="upgrade__text">{choice.description}</span>
            <span className="upgrade__footer">
              {choice.max !== null && (
                <span className="upgrade__level">
                  Level {choice.level + 1} of {choice.max}
                </span>
              )}
              <kbd className="upgrade__key">{index + 1}</kbd>
            </span>
          </button>
        ))}
      </div>
    </Overlay>
  )
}
