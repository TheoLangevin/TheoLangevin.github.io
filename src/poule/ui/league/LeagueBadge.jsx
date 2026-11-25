import { divisionById } from '../../domain/leagues.js'

const ROMAN = { 1: 'I', 2: 'II', 3: 'III' }

/** A division's emblem: the league's colour and initial, the division in small. */
export default function LeagueBadge({ division, size = 44 }) {
  const entry = typeof division === 'string' ? divisionById(division) : division
  if (!entry) {
    return (
      <span className="league" style={{ '--league': '#9aa0a8', width: size, height: size }} aria-label="Pas encore classé">
        –
      </span>
    )
  }
  return (
    <span
      className={`league league--${entry.tier.id}`}
      style={{ '--league': entry.tier.color, width: size, height: size, fontSize: Math.round(size * 0.45) }}
      aria-label={`Ligue ${entry.label}`}
      title={entry.label}
    >
      {entry.tier.label.charAt(0)}
      {entry.division && <small className="league__div">{ROMAN[entry.division]}</small>}
    </span>
  )
}
