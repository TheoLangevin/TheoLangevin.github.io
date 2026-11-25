import { useShallow } from 'zustand/react/shallow'
import { TALENTS } from '../../config/talents.js'
import { nextTalentCost } from '../../domain/talents.js'
import { usePoule } from '../../state/usePoule.js'
import { tokens } from '../format.js'
import './progress.css'

/** Permanent upgrades of the hen, level by level (config/talents.js). */
export default function Talents() {
  const s = usePoule(
    useShallow((state) => ({
      talents: state.talents,
      balance: state.balanceCents,
      inRound: Boolean(state.round),
      buy: state.buyTalent,
    })),
  )
  return (
    <section className="talents card">
      <h2 className="talents__title">Talents de la poule</h2>
      <p className="muted talents__intro">
        Des améliorations permanentes. Elles ne changent jamais vos chances de traverser, seulement ce que rapporte une
        partie. Sans effet en défi, tournoi et duel.
      </p>
      <ul className="talents__list">
        {TALENTS.map((talent) => {
          const level = s.talents?.[talent.id] ?? 0
          const cost = nextTalentCost(s.talents ?? {}, talent.id)
          return (
            <li key={talent.id} className="talent">
              <span className="talent__icon" aria-hidden="true">
                {talent.icon}
              </span>
              <div className="talent__body">
                <b>
                  {talent.label} <small className="muted">niv. {level}/{talent.max}</small>
                </b>
                <small>{level ? talent.effect(level) : `Niveau 1 : ${talent.effect(1)}`}</small>
                <span className="talent__pips" aria-hidden="true">
                  {Array.from({ length: talent.max }, (_, index) => (
                    <i key={index} className={index < level ? 'on' : ''} />
                  ))}
                </span>
              </div>
              <button
                type="button"
                className="talent__buy"
                disabled={cost == null || s.balance < cost || s.inRound}
                onClick={() => s.buy(talent.id)}
                aria-label={cost == null ? `${talent.label} au maximum` : `Améliorer ${talent.label} pour ${tokens(cost)} jetons`}
              >
                {cost == null ? 'Max' : `${tokens(cost)}`}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
