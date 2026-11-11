import { useFrame } from '@react-three/fiber'
import { PICKUP } from '../config/balance.js'
import { runtime } from '../state/runtime.js'
import { commitInstances, useInstances, writeInstance } from './instancing.js'

const MAX_HEARTS = 32

/** XP shards and health orbs lying on the arena floor. */
export default function Pickups() {
  const shards = useInstances()
  const hearts = useInstances()

  useFrame((state) => {
    const world = runtime.world
    const time = state.clock.elapsedTime
    let shardCount = 0
    let heartCount = 0

    if (world) {
      for (const pickup of world.pickups) {
        const bob = 0.55 + Math.sin(time * 4 + pickup.x * 3) * 0.12
        if (pickup.kind === 'heart') {
          if (heartCount >= MAX_HEARTS) continue
          const beat = 0.42 + Math.sin(time * 6) * 0.06
          writeInstance(hearts.current, heartCount++, pickup.x, bob + 0.2, pickup.y, 0, 0, 0, beat)
        } else if (shardCount < PICKUP.max) {
          // Fatter shards are worth more XP.
          const size = 0.24 + Math.min(0.3, pickup.value * 0.03)
          writeInstance(shards.current, shardCount++, pickup.x, bob, pickup.y, 0, time * 3 + pickup.y, 0, size, size * 1.5, size)
        }
      }
    }
    commitInstances(shards.current, shardCount)
    commitInstances(hearts.current, heartCount)
  })

  return (
    <>
      <instancedMesh ref={shards} args={[null, null, PICKUP.max]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={[0.3, 1.3, 1.5]} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={hearts} args={[null, null, MAX_HEARTS]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial color={[1.8, 0.4, 0.8]} toneMapped={false} />
      </instancedMesh>
    </>
  )
}
