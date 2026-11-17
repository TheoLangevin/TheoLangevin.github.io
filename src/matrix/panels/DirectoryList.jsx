import { NODES, SECTORS } from '../content/world.js'
import { useMatrix } from '../state/useMatrix.js'

const GROUPS = SECTORS.map((sector) => ({
  sector,
  nodes: NODES.filter((node) => node.sector === sector.id),
})).filter((group) => group.nodes.length > 0)

/**
 * Every node of the world, grouped by sector. Choosing one travels to it, or
 * opens it directly where there is no world to travel through (text mode).
 */
export default function DirectoryList({ action }) {
  const visit = useMatrix((state) => state.visit)
  const sectorId = useMatrix((state) => state.sectorId)

  return (
    <div className="directory">
      {GROUPS.map(({ sector, nodes }) => (
        <section key={sector.id} className="directory__group" aria-labelledby={`directory-${sector.id}`}>
          <h2
            id={`directory-${sector.id}`}
            className={`directory__sector directory__sector--${sector.accent}${
              sector.id === sectorId && action === 'TRAVEL' ? ' directory__sector--here' : ''
            }`}
          >
            {sector.name} <span>{sector.label}</span>
          </h2>
          <ul>
            {nodes.map((node) => (
              <li key={node.id}>
                <button type="button" className="directory__row" onClick={() => visit(node.id)} data-row="">
                  <span className="directory__code">{node.code}</span>
                  <span className="directory__title">{node.title}</span>
                  <span className="directory__subtitle">{node.subtitle}</span>
                  <span className="directory__action">{action} &gt;</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
