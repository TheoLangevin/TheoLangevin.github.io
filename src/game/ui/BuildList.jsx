import { UPGRADES_BY_ID } from '../config/upgrades.js'

/** The upgrades picked so far, as small chips. */
export default function BuildList({ upgrades }) {
  const owned = Object.entries(upgrades)
  if (owned.length === 0) return null

  return (
    <div className="card__section">
      <h2 className="card__heading">Your build</h2>
      <ul className="build">
        {owned.map(([id, level]) => (
          <li key={id} className="build__item">
            {UPGRADES_BY_ID[id].name} <b>×{level}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
