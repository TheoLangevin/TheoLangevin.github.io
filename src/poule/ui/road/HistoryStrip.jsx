import { usePoule } from '../../state/usePoule.js'
import { multiplierLabel } from '../format.js'

/** The last finished rounds, newest first. */
export default function HistoryStrip() {
  const history = usePoule((state) => state.history)
  return (
    <div className="history" aria-label="Dernières parties">
      {history.length === 0 ? (
        <span className="history__empty">Aucune partie pour l’instant</span>
      ) : (
        history.map((entry) => (
          <span key={entry.id} className={`history__chip history__chip--${entry.status}`}>
            {entry.status === 'won' ? multiplierLabel(entry.multiplier) : 'x0'}
          </span>
        ))
      )}
    </div>
  )
}
