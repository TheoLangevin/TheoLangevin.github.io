import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { PALETTE } from '../feedback/palette.js'
import { runtime } from '../state/runtime.js'

const HOVER = 0.8
const SCALE = 1.25

export default function PlayerShip() {
  const ship = useRef(null)
  const shield = useRef(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const world = runtime.world

    if (!world) {
      // Menu: the ship idles in the middle of the arena.
      ship.current.visible = true
      ship.current.position.set(0, HOVER + Math.sin(time * 2) * 0.12, 0)
      ship.current.rotation.set(0, time * 0.5, 0)
      ship.current.scale.setScalar(SCALE)
      shield.current.visible = false
      return
    }

    const player = world.player
    const blinking = player.invulnerable > 0 && player.dashTime <= 0 && Math.floor(time * 18) % 2 === 0
    ship.current.visible = !world.over && !blinking
    ship.current.position.set(player.x, HOVER, player.y)
    ship.current.rotation.set(0, -player.angle, 0)
    ship.current.scale.setScalar(player.dashTime > 0 ? SCALE * 1.25 : SCALE)

    shield.current.visible = player.shield
    shield.current.rotation.y = time * 1.5
  })

  return (
    <group ref={ship}>
      {/* Hull: a flattened four-sided cone pointing along +x. */}
      <mesh rotation-z={-Math.PI / 2} scale={[0.45, 1, 1]}>
        <coneGeometry args={[0.62, 1.7, 4]} />
        <meshStandardMaterial
          color={PALETTE.player}
          emissive={PALETTE.playerGlow}
          emissiveIntensity={0.45}
          flatShading
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[-0.35, 0, side * 0.55]} rotation-y={side * 0.5}>
          <boxGeometry args={[0.8, 0.12, 0.34]} />
          <meshStandardMaterial color={0xb9b0ff} emissive={PALETTE.playerGlow} emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Engine glow */}
      <mesh position={[-0.85, 0, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshBasicMaterial color={[0.6, 1.4, 1.8]} toneMapped={false} />
      </mesh>
      <pointLight color={PALETTE.player} intensity={30} distance={16} position={[0, 3, 0]} />

      <mesh ref={shield} visible={false}>
        <icosahedronGeometry args={[1.25, 1]} />
        <meshBasicMaterial color={PALETTE.shield} wireframe transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  )
}
