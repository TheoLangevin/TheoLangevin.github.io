import { useFrame } from '@react-three/fiber'
import { MAX_BULLETS, MAX_ENEMY_BULLETS } from '../config/balance.js'
import { PALETTE } from '../feedback/palette.js'
import { runtime } from '../state/runtime.js'
import { commitInstances, useInstances, writeHexColor, writeInstance } from './instancing.js'

const HEIGHT = 0.8

function PlayerBullets() {
  const ref = useInstances({ colors: true })

  useFrame(() => {
    const world = runtime.world
    const mesh = ref.current
    let count = 0
    if (world) {
      for (const bullet of world.bullets) {
        const heading = -Math.atan2(bullet.vy, bullet.vx)
        const size = bullet.crit ? 1.5 : 1
        // Stretched along its heading so it reads as a streak.
        writeInstance(mesh, count, bullet.x, HEIGHT, bullet.y, 0, heading, 0, 0.75 * size, 0.17 * size, 0.17 * size)
        writeHexColor(mesh, count, bullet.crit ? PALETTE.critBullet : PALETTE.bullet, 1.25)
        count++
      }
    }
    commitInstances(mesh, count)
  })

  return (
    <instancedMesh ref={ref} args={[null, null, MAX_BULLETS]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

function EnemyBullets() {
  const ref = useInstances()

  useFrame((state) => {
    const world = runtime.world
    const mesh = ref.current
    const pulse = 0.32 + Math.sin(state.clock.elapsedTime * 14) * 0.04
    let count = 0
    if (world) {
      for (const bullet of world.enemyBullets) {
        writeInstance(mesh, count++, bullet.x, HEIGHT, bullet.y, 0, 0, 0, pulse)
      }
    }
    commitInstances(mesh, count)
  })

  return (
    <instancedMesh ref={ref} args={[null, null, MAX_ENEMY_BULLETS]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshBasicMaterial color={[1.8, 0.35, 0.7]} toneMapped={false} />
    </instancedMesh>
  )
}

export default function Projectiles() {
  return (
    <>
      <PlayerBullets />
      <EnemyBullets />
    </>
  )
}
