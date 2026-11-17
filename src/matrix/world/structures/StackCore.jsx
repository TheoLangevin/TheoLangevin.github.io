import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CylinderGeometry, IcosahedronGeometry, TorusGeometry } from 'three'
import { rig } from '../../state/rig.js'
import { useNodeGlow } from '../interaction/useNodeGlow.js'
import { PALETTE } from '../palette.js'
import Label from '../primitives/Label.jsx'
import { beamMaterial, lightMaterial, lineMaterial, setGlow } from '../primitives/materials.js'
import Solid from '../primitives/Solid.jsx'

const CORE_Y = 3
const ORBIT = 3.3

/** The skills: a reactor core, with every language and tool orbiting around it. */
export default function StackCore({ node }) {
  const skills = node.data
  const glow = useNodeGlow(node)
  const lines = useMemo(() => lineMaterial(PALETTE.greenHot), [])
  const heart = useMemo(() => lightMaterial(PALETTE.whiteHot), [])
  const rings = useMemo(() => lightMaterial(PALETTE.cyanHot, { additive: true }), [])
  const beam = useMemo(() => beamMaterial(PALETTE.green), [])
  const platform = useMemo(() => new CylinderGeometry(2.4, 2.8, 0.3, 8), [])
  const shell = useMemo(() => new IcosahedronGeometry(1.05, 0), [])
  const ringGeometries = useMemo(
    () => [new TorusGeometry(1.6, 0.015, 6, 96), new TorusGeometry(1.85, 0.015, 6, 96), new TorusGeometry(2.1, 0.01, 6, 96)],
    [],
  )

  const shellRef = useRef(null)
  const heartRef = useRef(null)
  const ringRefs = useRef([])
  const labelRefs = useRef([])
  const title = useRef(null)

  useFrame(({ camera }) => {
    const t = rig.time
    const g = glow.value
    shellRef.current.rotation.set(t * 0.3, t * 0.5, 0)
    heartRef.current.scale.setScalar(0.42 + Math.sin(t * 3) * 0.04 + glow.focus * 0.08)
    ringRefs.current.forEach((ring, i) => ring.rotation.set(0.6 + i * 0.7 + t * 0.2, t * (0.5 - i * 0.3), i))
    setGlow(lines, g)
    setGlow(heart, 0.5 + g)
    setGlow(rings, g * 0.7)
    beam.uniforms.uIntensity.value = g

    // The skills orbit the core and always face the visitor.
    labelRefs.current.forEach((label, i) => {
      const angle = (i / skills.length) * Math.PI * 2 + t * 0.18
      const x = node.at[0] + Math.cos(angle) * ORBIT
      const z = node.at[1] + Math.sin(angle) * ORBIT
      label.position.set(x, CORE_Y + Math.sin(t * 1.1 + i * 1.9) * 0.35, z)
      label.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z)
      setGlow(label.material, 0.5 + g * 0.8)
    })
    setGlow(title.current.material, 0.5 + g * 0.7)
  })

  return (
    <>
      <group position={[node.at[0], 0, node.at[1]]}>
        <Solid geometry={platform} lineMaterial={lines} position-y={0.15} />
        <mesh position-y={1.2} material={beam}>
          <cylinderGeometry args={[1.2, 0.5, 2, 32, 1, true]} />
        </mesh>
        <group ref={shellRef} position-y={CORE_Y}>
          <Solid geometry={shell} lineMaterial={lines} />
        </group>
        <mesh ref={heartRef} position-y={CORE_Y} material={heart}>
          <icosahedronGeometry args={[1, 2]} />
        </mesh>
        {ringGeometries.map((geometry, i) => (
          <mesh
            key={i}
            ref={(value) => (ringRefs.current[i] = value)}
            position-y={CORE_Y}
            geometry={geometry}
            material={rings}
          />
        ))}
        <Label
          ref={title}
          billboard
          position-y={5.7}
          height={0.5}
          color={PALETTE.whiteHot}
          lines={[
            { text: 'STACK', size: 96, spacing: 0.2 },
            { text: `${skills.length} MODULES LOADED`, size: 36, weight: 500, spacing: 0.16 },
          ]}
        />
      </group>
      {skills.map((skill, i) => (
        <Label
          key={skill}
          ref={(value) => (labelRefs.current[i] = value)}
          height={0.3}
          lines={[{ text: skill.toUpperCase(), size: 64, spacing: 0.08 }]}
        />
      ))}
    </>
  )
}
