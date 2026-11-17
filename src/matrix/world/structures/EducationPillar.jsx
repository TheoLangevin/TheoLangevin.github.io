import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CylinderGeometry, TorusGeometry } from 'three'
import { yawTowards } from '../../content/world.js'
import { rig } from '../../state/rig.js'
import { useNodeGlow } from '../interaction/useNodeGlow.js'
import { PALETTE } from '../palette.js'
import Label from '../primitives/Label.jsx'
import { lightMaterial, lineMaterial, setGlow } from '../primitives/materials.js'
import Solid from '../primitives/Solid.jsx'

/** Education: an obelisk with the school's name on a plate of light. */
export default function EducationPillar({ node }) {
  const education = node.data
  const glow = useNodeGlow(node)
  const lines = useMemo(() => lineMaterial(PALETTE.greenHot), [])
  const ringMaterial = useMemo(() => lightMaterial(PALETTE.greenHot, { additive: true }), [])
  const obelisk = useMemo(() => new CylinderGeometry(0.35, 0.75, 5.4, 4), [])
  const ringGeometry = useMemo(() => new TorusGeometry(1.05, 0.02, 6, 64), [])

  const ring = useRef(null)
  const plate = useRef(null)

  useFrame(() => {
    const g = glow.value
    ring.current.position.y = 1 + ((rig.time * 0.5) % 1) * 4
    ring.current.rotation.set(Math.PI / 2, 0, rig.time)
    setGlow(lines, g)
    setGlow(ringMaterial, g * 0.7)
    setGlow(plate.current.material, 0.5 + g * 0.8)
  })

  return (
    <group position={[node.at[0], 0, node.at[1]]} rotation-y={yawTowards(node.front)}>
      <Solid geometry={obelisk} lineMaterial={lines} position-y={2.7} rotation-y={Math.PI / 4} />
      <mesh ref={ring} geometry={ringGeometry} material={ringMaterial} />
      <Label
        ref={plate}
        position={[0, 3, 1.05]}
        width={2.3}
        color={PALETTE.whiteHot}
        lines={[
          { text: 'EDUCATION', size: 30, weight: 500, color: '#6dffa0', spacing: 0.24 },
          { text: education.school, size: 96, spacing: 0.1 },
          { text: education.detail.toUpperCase(), size: 30, weight: 500, color: '#b8ffc8', spacing: 0.1 },
        ]}
      />
    </group>
  )
}
