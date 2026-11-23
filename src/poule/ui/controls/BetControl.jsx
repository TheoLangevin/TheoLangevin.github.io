import { useEffect, useState } from 'react'
import { BET_PRESETS, CENTS, MAX_BET, MIN_BET } from '../../config/economy.js'
import { clampBet } from '../../domain/money.js'
import { usePoule } from '../../state/usePoule.js'

/** Bet field with −/+ buttons and quick amounts. Locked while a round runs. */
export default function BetControl() {
  const betCents = usePoule((state) => state.betCents)
  const locked = usePoule((state) => Boolean(state.round) || state.busy || state.phase !== 'ready')
  const setBet = usePoule((state) => state.setBet)
  const [draft, setDraft] = useState(String(betCents / CENTS))

  useEffect(() => setDraft(String(betCents / CENTS)), [betCents])

  const commit = (tokens) => {
    const next = clampBet(tokens)
    setDraft(String(next / CENTS))
    if (next !== betCents) setBet(next)
  }
  const tokens = betCents / CENTS

  return (
    <div className="box">
      <label className="box__label" htmlFor="bet">
        Mise ({MIN_BET / CENTS} à {MAX_BET / CENTS} jetons)
      </label>
      <div className="bet">
        <button type="button" onClick={() => commit(tokens - 1)} disabled={locked} aria-label="Diminuer la mise">
          −
        </button>
        <input
          id="bet"
          type="number"
          inputMode="numeric"
          min={MIN_BET / CENTS}
          max={MAX_BET / CENTS}
          step="1"
          value={draft}
          disabled={locked}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => event.key === 'Enter' && commit(draft)}
        />
        <button type="button" onClick={() => commit(tokens + 1)} disabled={locked} aria-label="Augmenter la mise">
          +
        </button>
      </div>
      <div className="chips">
        {BET_PRESETS.map((preset) => (
          <button key={preset} type="button" onClick={() => commit(preset)} disabled={locked}>
            {preset}
          </button>
        ))}
        <button
          type="button"
          onClick={() => commit(tokens / 2)}
          disabled={locked}
          aria-label="Diviser la mise par deux"
        >
          ½
        </button>
        <button type="button" onClick={() => commit(tokens * 2)} disabled={locked} aria-label="Doubler la mise">
          ×2
        </button>
      </div>
    </div>
  )
}
