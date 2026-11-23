import { MAX_PAYOUT } from '../../config/economy.js'
import { MODES, modeById } from '../../config/modes.js'
import { multiplierAt } from '../../domain/multiplier.js'
import { usePoule } from '../../state/usePoule.js'
import { multiplierLabel, tokens } from '../format.js'

/** The four difficulty modes, and what the chosen one means. */
export default function ModePicker() {
  const modeId = usePoule((state) => state.round?.modeId ?? state.modeId)
  const locked = usePoule((state) => Boolean(state.round) || state.busy || state.phase !== 'ready')
  const setMode = usePoule((state) => state.setMode)
  const mode = modeById(modeId)

  return (
    <div className="box">
      <p className="box__label" id="mode-label">
        Difficulté
      </p>
      <div className="modes" role="group" aria-labelledby="mode-label">
        {MODES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === mode.id}
            disabled={locked}
            onClick={() => setMode(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <p className="box__note">
        {Math.round(mode.survival * 100)} % de chance par voie · {mode.lanes} voies · jusqu’à{' '}
        {multiplierLabel(multiplierAt(mode, mode.lanes))} · gain plafonné à {tokens(MAX_PAYOUT)}
      </p>
    </div>
  )
}
