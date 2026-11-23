import { useShallow } from 'zustand/react/shallow'
import { modeById } from '../../config/modes.js'
import { multiplierAt, payoutCents } from '../../domain/multiplier.js'
import { usePoule } from '../../state/usePoule.js'
import { multiplierLabel, tokens } from '../format.js'

/** Play / step forward, and cash out with the amount it would pay. */
export default function ActionButtons() {
  const { round, busy, ready, play, cashOut, autocash } = usePoule(
    useShallow((state) => ({
      round: state.round,
      busy: state.busy,
      ready: state.phase === 'ready',
      play: state.play,
      cashOut: state.cashOut,
      autocash: state.progression?.owned.includes('autocash') ? state.autocashTarget : null,
    })),
  )

  let cashLabel = '—'
  if (round?.canCashOut) {
    const mode = modeById(round.modeId)
    cashLabel = `${tokens(payoutCents(round.betCents, mode, round.lane))} jetons · ${multiplierLabel(multiplierAt(mode, round.lane))}`
  } else if (round) {
    cashLabel = 'après la 1re voie'
  }
  if (round && autocash) cashLabel += ` · auto à ${multiplierLabel(autocash)}`

  return (
    <div className="box actions">
      <button type="button" className="big big--play" onClick={play} disabled={busy || !ready}>
        {round ? 'Avancer' : 'Jouer'}
      </button>
      <button type="button" className="big big--cash" onClick={cashOut} disabled={busy || !round?.canCashOut}>
        Encaisser
        <small>{cashLabel}</small>
      </button>
      <p className="box__note">Clavier : Espace pour avancer, C pour encaisser.</p>
    </div>
  )
}
