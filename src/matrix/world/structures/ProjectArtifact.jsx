import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CylinderGeometry, OctahedronGeometry } from 'three'
import { rig } from '../../state/rig.js'
import { yawTowards } from '../../content/world.js'
import { useNodeGlow } from '../interaction/useNodeGlow.js'
import { PALETTE } from '../palette.js'
import Hologram from '../primitives/Hologram.jsx'
import Label from '../primitives/Label.jsx'
import { beamMaterial, lightMaterial, lineMaterial, setGlow } from '../primitives/materials.js'
import Solid from '../primitives/Solid.jsx'

const SCREEN_Y = 2.45

/**
 * A project of the archive: a pedestal holding a spinning data crystal, which
 * projects a screenshot of the project. Looking at it brings out the colours.
 */
export default function ProjectArtifact({ node }) {
  const project = node.data
  const glow = useNodeGlow(node)
  const lines = useMemo(() => lineMaterial(PALETTE.greenHot), [])
  const core = useMemo(() => lightMaterial(PALETTE.whiteHot), [])
  const beam = useMemo(() => beamMaterial(PALETTE.green), [])
  const pedestal = useMemo(() => new CylinderGeometry(0.62, 0.9, 0.9, 6), [])
  const crystal = useMemo(() => new OctahedronGeometry(0.3), [])

  const crystalRef = useRef(null)
  const screen = useRef(null)
  const title = useRef(null)
  const subtitle = useRef(null)

  useFrame(() => {
    const g = glow.value
    const t = rig.time + node.index * 1.3
    crystalRef.current.rotation.set(t * 0.7, t * (1.2 + glow.focus * 2.5), 0)
    crystalRef.current.position.y = 1.28 + Math.sin(t * 1.6) * 0.06
    setGlow(lines, g)
    setGlow(core, 0.4 + g * 0.8)
    beam.uniforms.uIntensity.value = g * 0.8

    const scale = 1 + glow.focus * 0.08
    screen.current.scale.set(scale, scale, 1)
    const uniforms = screen.current.material.uniforms
    uniforms.uIntensity.value = 0.35 + g * 0.65
    uniforms.uTrue.value = 0.25 + glow.focus * 0.6
    uniforms.uGlitch.value = rig.glitch
    setGlow(title.current.material, 0.5 + g * 0.8)
    setGlow(subtitle.current.material, 0.4 + g * 0.6)
  })

  return (
    <group position={[node.at[0], 0, node.at[1]]} rotation-y={yawTowards(node.front)}>
      <Solid geometry={pedestal} lineMaterial={lines} position-y={0.45} />
      <group ref={crystalRef} position-y={1.28}>
        <Solid geometry={crystal} lineMaterial={lines} />
        <mesh material={core} scale={0.45}>
          <octahedronGeometry args={[0.3]} />
        </mesh>
      </group>
      <mesh position-y={1.6} material={beam}>
        <cylinderGeometry args={[0.9, 0.08, 0.5, 24, 1, true]} />
      </mesh>

      <Hologram ref={screen} url={project.image} width={2.3} position-y={SCREEN_Y} />

      <Label
        ref={subtitle}
        position-y={3.43}
        height={0.15}
        lines={[{ text: `${node.code} // ${project.tags}`.toUpperCase(), size: 44, weight: 500, spacing: 0.14 }]}
      />
      <Label
        ref={title}
        position-y={3.74}
        height={0.34}
        color={PALETTE.whiteHot}
        lines={[{ text: project.title.toUpperCase(), size: 80, spacing: 0.1 }]}
      />
    </group>
  )
}
