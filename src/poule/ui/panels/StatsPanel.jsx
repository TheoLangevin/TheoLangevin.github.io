import { useShallow } from 'zustand/react/shallow'
import { STARTING_BALANCE } from '../../config/economy.js'
import { modeById } from '../../config/modes.js'
import { usePoule } from '../../state/usePoule.js'
import { count, multiplierLabel, percent, signedTokens, tokens } from '../format.js'

/** Totals over every finished round kept in the database. */
export default function StatsPanel() {
  const { stats, byMode, canReset, reset } = usePoule(
    useShallow((state) => ({
      stats: state.stats,
      byMode: state.byMode,
      canReset: state.phase === 'ready' && !state.round && !state.busy,
      reset: state.reset,
    })),
  )
  if (!stats) return <div className="box panel" aria-busy="true" />

  const rows = [
    ['Parties jouées', count(stats.played)],
    ['Parties gagnées', stats.played ? `${count(stats.won)} (${percent(stats.won / stats.played)})` : '—'],
    ['Total misé', tokens(stats.wageredCents)],
    ['Total récupéré', tokens(stats.returnedCents)],
    ['Résultat net', signedTokens(stats.returnedCents - stats.wageredCents)],
    ['Taux de retour observé', stats.wageredCents ? percent(stats.returnedCents / stats.wageredCents) : '—'],
    ['Meilleur multiplicateur', stats.bestMultiplier ? multiplierLabel(stats.bestMultiplier) : '—'],
  ]

  return (
    <section className="box panel">
      <h2>Votre bilan</h2>
      <dl className="figures">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {byMode.length > 0 && (
        <p className="box__note">
          Par mode :{' '}
          {byMode
            .map((entry) => `${modeById(entry.mode_id).label} ${count(entry.won)}/${count(entry.played)}`)
            .join(' · ')}
        </p>
      )}
      <button type="button" className="panel__action" onClick={reset} disabled={!canReset}>
        Remettre le solde à {tokens(STARTING_BALANCE)} et effacer le bilan
      </button>
    </section>
  )
}
