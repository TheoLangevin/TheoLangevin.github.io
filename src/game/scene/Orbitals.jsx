import { useFrame } from '@react-three/fiber'
import { orbitalPosition } from '../engine/systems/weapons.js'
import { PALETTE } from '../feedback/palette.js'
import { runtime } from '../state/runtime.js'
import { commitInstances, useInstances, writeInstance } from './instancing.js'

const MAX_ORBITALS = 8
const blade = { x: 0, y: 0 }

/** The "Orbit Blades" upgrade: blades circling the ship. */
export default function Orbitals() {
  const ref = useInstances()

  useFrame((state) => {
    const world = runtime.world
    const count = world && !world.over ? Math.min(MAX_ORBITALS, world.player.stats.orbitals) : 0
    for (let i = 0; i < count; i++) {
      orbitalPosition(world.player, i, blade)
      writeInstance(ref.current, i, blade.x, 0.8, blade.y, 0, state.clock.elapsedTime * 9, 0, 0.6, 0.16, 0.6)
    }
    commitInstances(ref.current, count)
  })

  return (
    <instancedMesh ref={ref} args={[null, null, MAX_ORBITALS]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={[1.7, 1.3, 0.3]} toneMapped={false} />
    </instancedMesh>
  )
}
