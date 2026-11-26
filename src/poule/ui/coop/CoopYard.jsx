import { BUILDINGS, BUILDING_TIERS, SPECIAL_HENS } from '../../config/coop.js'
import { buildingLevel, owned } from '../../domain/coop.js'

/** Where each building stands in the yard (percent of the scene). */
const SPOTS = {
  nest: { left: '5%', bottom: '5%' },
  perch: { right: '5%', bottom: '5%' },
  feeder: { left: '3%', bottom: '27%' },
  incubator: { right: '3%', bottom: '27%' },
  silo: { left: '7%', bottom: '47%' },
  farm: { right: '6%', bottom: '47%' },
  rocket: { right: '4%', bottom: '66%' },
}
const HEN = new Map(SPECIAL_HENS.map((hen) => [hen.id, hen]))

/** The henhouse at the back of the yard. */
function House() {
  return (
    <svg className="coop-house" viewBox="0 0 120 92" aria-hidden="true">
      <path d="M6 42 L60 6 L114 42 Z" fill="#7a2418" />
      <path d="M14 42 L60 12 L106 42" fill="none" stroke="#a83a26" strokeWidth="3" />
      <rect x="16" y="40" width="88" height="50" rx="2" fill="#c0392b" />
      <path d="M16 52h88M16 64h88M16 76h88" stroke="#a83226" strokeWidth="1.5" />
      <path d="M47 90V66a13 13 0 0 1 26 0v24z" fill="#4a1810" />
      <circle cx="60" cy="27" r="6" fill="#ffe7a3" stroke="#4a1810" strokeWidth="2" />
      <rect x="30" y="46" width="60" height="11" rx="3" fill="#f6e1b0" />
      <text x="60" y="54.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#4a1810">
        POULAILLER
      </text>
    </svg>
  )
}

/**
 * The yard: the henhouse, every building bought (more copies, bigger and
 * shinier with its level) and the special hens on the perch walking around.
 */
export default function CoopYard({ coop }) {
  return (
    <div className="coop-yard" aria-hidden="true">
      <House />
      {BUILDINGS.map((building) => {
        const count = owned(coop, building.id)
        if (!count) return null
        const level = buildingLevel(count)
        const tier = BUILDING_TIERS[level - 1]
        return (
          <div
            key={building.id}
            className={`coop-spot coop-spot--lv${level}`}
            style={{ ...SPOTS[building.id], '--tier': tier.color, '--size': `${20 + level * 5}px` }}
          >
            <span key={count} className="coop-spot__icons">
              {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                <span key={i}>{building.icon}</span>
              ))}
            </span>
            <i className="coop-spot__base" />
            <span className="coop-spot__badge">
              ×{count} · niv. {level}
            </span>
          </div>
        )
      })}
      {coop.equipped.map((id, index) => (
        <span
          key={id}
          className="coop-walker"
          style={{ '--speed': `${11 + index * 4}s`, '--delay': `${-index * 3}s`, bottom: `${2 + index * 6}%` }}
        >
          <span>{HEN.get(id).icon}</span>
        </span>
      ))}
    </div>
  )
}
