import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CylinderGeometry, TorusGeometry } from 'three'
import portrait from '../../../portfolio/assets/id2.png'
import { profile } from '../../content/profile.js'
import { NODE_BY_ID } from '../../content/world.js'
import { rig } from '../../state/rig.js'
import { useNodeGlow } from '../interaction/useNodeGlow.js'
import { PALETTE } from '../palette.js'
import Hologram from '../primitives/Hologram.jsx'
import Label from '../primitives/Label.jsx'
import { beamMaterial, lightMaterial, lineMaterial, setGlow } from '../primitives/materials.js'
import Solid from '../primitives/Solid.jsx'

const node = NODE_BY_ID.identity
const PORTRAIT_Y = 3

/**
 * The centre of the plaza: Théo's portrait projected above a hexagonal
 * platform, circled by rings of light, his name floating above.
 */
export default function IdentityCore() {
  const glow = useNodeGlow(node)
  const lines = useMemo(() => lineMaterial(PALETTE.greenHot), [])
  const rings = useMemo(() => lightMaterial(PALETTE.greenHot, { additive: true }), [])
  const beam = useMemo(() => beamMaterial(PALETTE.green), [])
  const platform = useMemo(() => new CylinderGeometry(3.4, 3.8, 0.3, 6), [])
  const step = useMemo(() => new CylinderGeometry(2.3, 2.5, 0.5, 6), [])
  const ringGeometries = useMemo(() => [new TorusGeometry(1.95, 0.018, 6, 96), new TorusGeometry(2.25, 0.012, 6, 96)], [])

  const facing = useRef(null)
  const ringA = useRef(null)
  const ringB = useRef(null)
  const hologram = useRef(null)
  const name = useRef(null)
  const role = useRef(null)

  useFrame(({ camera }) => {
    const t = rig.time
    // The portrait always turns to face the visitor.
    facing.current.rotation.y = Math.atan2(camera.position.x - node.at[0], camera.position.z - node.at[1])
    ringA.current.rotation.set(1.2 + Math.sin(t * 0.4) * 0.2, t * 0.6, 0)
    ringB.current.rotation.set(-0.9, -t * 0.45, Math.sin(t * 0.3) * 0.3)

    const g = glow.value
    setGlow(lines, g)
    setGlow(rings, g * 0.8)
    beam.uniforms.uIntensity.value = g
    const uniforms = hologram.current.material.uniforms
    uniforms.uIntensity.value = 0.55 + g * 0.6
    uniforms.uTrue.value = 0.3 + glow.focus * 0.45
    uniforms.uGlitch.value = rig.glitch
    setGlow(name.current.material, 0.6 + g * 0.7)
    setGlow(role.current.material, 0.5 + g * 0.6)
  })

  return (
    <group position={[node.at[0], 0, node.at[1]]}>
      <Solid geometry={platform} lineMaterial={lines} position-y={0.15} />
      <Solid geometry={step} lineMaterial={lines} position-y={0.55} />
      <mesh position-y={1.65} material={beam}>
        <cylinderGeometry args={[1.5, 0.35, 1.9, 32, 1, true]} />
      </mesh>

      <group ref={facing} position-y={PORTRAIT_Y}>
        <Hologram ref={hologram} url={portrait} width={2.05} frame={false} />
      </group>
      <mesh ref={ringA} position-y={PORTRAIT_Y} geometry={ringGeometries[0]} material={rings} />
      <mesh ref={ringB} position-y={PORTRAIT_Y} geometry={ringGeometries[1]} material={rings} />

      <Label
        ref={name}
        billboard
        position-y={5.15}
        height={0.62}
        color={PALETTE.whiteHot}
        lines={[{ text: profile.name.toUpperCase(), size: 96, spacing: 0.12 }]}
      />
      <Label
        ref={role}
        billboard
        position-y={4.62}
        height={0.2}
        lines={[{ text: profile.role.toUpperCase(), size: 48, weight: 500, spacing: 0.18 }]}
      />
    </group>
  )
}
