import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BoxGeometry, CylinderGeometry, EdgesGeometry } from 'three'
import { yawTowards } from '../../content/world.js'
import { rig } from '../../state/rig.js'
import { useNodeGlow } from '../interaction/useNodeGlow.js'
import { PALETTE } from '../palette.js'
import Label, { wrapText } from '../primitives/Label.jsx'
import { beamMaterial, lineMaterial, setGlow } from '../primitives/materials.js'
import Solid from '../primitives/Solid.jsx'

/** The motto, written in the air inside a frame of light, above a small projector. */
export default function MottoPanel({ node }) {
  const glow = useNodeGlow(node)
  const lines = useMemo(() => lineMaterial(PALETTE.greenHot), [])
  const beam = useMemo(() => beamMaterial(PALETTE.green), [])
  const base = useMemo(() => new CylinderGeometry(0.4, 0.55, 0.3, 8), [])
  const frame = useMemo(() => new EdgesGeometry(new BoxGeometry(2.9, 2.2, 0.02)), [])
  const text = useMemo(
    () => [
      { text: '// MOTTO', size: 30, weight: 500, color: '#5cf6ff', spacing: 0.24 },
      ...wrapText(node.data.toUpperCase(), 16).map((line) => ({ text: line, size: 56, color: '#ffffff', spacing: 0.04 })),
    ],
    [node.data],
  )

  const panel = useRef(null)
  const label = useRef(null)

  useFrame(() => {
    const g = glow.value
    panel.current.position.y = 2.25 + Math.sin(rig.time * 0.9) * 0.08
    setGlow(lines, g)
    setGlow(label.current.material, 0.5 + g * 0.75)
    beam.uniforms.uIntensity.value = g * 0.9
  })

  return (
    <group position={[node.at[0], 0, node.at[1]]} rotation-y={yawTowards(node.front)}>
      <Solid geometry={base} lineMaterial={lines} position-y={0.15} />
      <mesh position-y={0.72} material={beam}>
        <cylinderGeometry args={[1.3, 0.3, 0.85, 24, 1, true]} />
      </mesh>
      <group ref={panel}>
        <lineSegments geometry={frame} material={lines} />
        <Label ref={label} width={2.45} lines={text} color={PALETTE.white} />
      </group>
    </group>
  )
}
