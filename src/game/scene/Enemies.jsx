import { useFrame } from '@react-three/fiber'
import { MAX_ENEMIES } from '../config/balance.js'
import { ENEMIES, ENEMY_TYPES } from '../config/enemies.js'
import { runtime } from '../state/runtime.js'
import { commitInstances, useInstances, writeHexColor, writeInstance } from './instancing.js'

/** Unit-sized geometry for each enemy `shape`; instances are scaled by radius. */
function ShapeGeometry({ shape }) {
  switch (shape) {
    case 'tetrahedron':
      return <tetrahedronGeometry args={[1.25, 0]} />
    case 'cone':
      return <coneGeometry args={[0.95, 1.7, 5]} />
    case 'dodecahedron':
      return <dodecahedronGeometry args={[1, 0]} />
    case 'icosahedron':
      return <icosahedronGeometry args={[1, 0]} />
    case 'boss':
      return <torusKnotGeometry args={[0.72, 0.26, 72, 10]} />
    default:
      return <octahedronGeometry args={[1, 0]} />
  }
}

/** One instanced mesh per enemy type: hundreds of enemies, a handful of draw calls. */
function EnemyBatch({ type }) {
  const def = ENEMIES[type]
  const ref = useInstances({ colors: true })

  useFrame((state) => {
    const world = runtime.world
    const mesh = ref.current
    const time = state.clock.elapsedTime
    let count = 0

    if (world) {
      for (const enemy of world.enemies) {
        if (enemy.type !== type) continue
        const grow = Math.min(1, enemy.age * 3) // pop in when spawning
        const size = enemy.radius * grow * (1 + enemy.flash * 2)
        const spin = time * 1.4 + enemy.phase
        const hover = enemy.radius * 0.95 + Math.sin(time * 3 + enemy.phase) * 0.12
        writeInstance(mesh, count, enemy.x, hover, enemy.y, spin * 0.6, spin, 0, size)
        // Flash white for a few frames when hit.
        if (enemy.flash > 0) writeHexColor(mesh, count, 0xffffff, 2.5)
        else writeHexColor(mesh, count, def.color)
        count++
      }
    }
    commitInstances(mesh, count)
  })

  return (
    <instancedMesh ref={ref} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
      <ShapeGeometry shape={def.shape} />
      <meshStandardMaterial color={0xffffff} emissive={def.color} emissiveIntensity={0.55} flatShading />
    </instancedMesh>
  )
}

export default function Enemies() {
  return ENEMY_TYPES.map((type) => <EnemyBatch key={type} type={type} />)
}
