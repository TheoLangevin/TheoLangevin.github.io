import { useShallow } from 'zustand/react/shallow'
import { usePoule } from '../../state/usePoule.js'
import { count, tokens } from '../format.js'
import AccountButton from '../account/AccountButton.jsx'
import { FeatherIcon, SoundIcon } from '../icons.jsx'

/** Title, balance, level with its progress, feathers, the sound switch and the account. */
export default function Header() {
  const { balance, ready, progression, sound, toggleSound } = usePoule(
    useShallow((state) => ({
      balance: state.balanceCents,
      ready: state.phase === 'ready',
      progression: state.progression,
      sound: state.sound,
      toggleSound: state.toggleSound,
    })),
  )

  return (
    <header className="header">
      <div className="header__title">
        <a className="header__back" href="/">
          ← Retour au portfolio
        </a>
        <h1>La Poule Traverse</h1>
        <p className="header__sub">Jeu de démonstration : jetons fictifs, aucun argent réel</p>
      </div>
      <div className="header__status">
        <div className="balance" aria-live="polite">
          <small>Solde</small>
          <b>{ready ? `${tokens(balance)} jetons` : '…'}</b>
        </div>
        {progression && (
          <div className="level">
            <div className="level__row">
              <span className="level__badge">Niv. {progression.level}</span>
              <span className="level__feathers" title="Plumes">
                <FeatherIcon /> {count(progression.feathers)}
              </span>
            </div>
            <div
              className="level__bar"
              role="progressbar"
              aria-label="Progression vers le niveau suivant"
              aria-valuemin={0}
              aria-valuemax={progression.needed || 1}
              aria-valuenow={progression.into}
            >
              <span style={{ width: `${Math.round(progression.ratio * 100)}%` }} />
            </div>
            <small className="level__next">
              {progression.needed ? `${count(progression.into)} / ${count(progression.needed)} XP` : 'Niveau maximum'}
            </small>
          </div>
        )}
        <button
          type="button"
          className="sound"
          onClick={toggleSound}
          aria-pressed={sound}
          aria-label={sound ? 'Couper le son' : 'Activer le son'}
        >
          <SoundIcon on={sound} />
        </button>
        <AccountButton />
      </div>
    </header>
  )
}
