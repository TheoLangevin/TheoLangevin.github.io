import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BoxGeometry } from 'three'
import { yawTowards } from '../../content/world.js'
import { rig } from '../../state/rig.js'
import { useNodeGlow } from '../interaction/useNodeGlow.js'
import { PALETTE } from '../palette.js'
import Label, { wrapText } from '../primitives/Label.jsx'
import { lightMaterial, lineMaterial, setGlow } from '../primitives/materials.js'
import Solid from '../primitives/Solid.jsx'

const WIDTH = 2.4
const HEIGHT = 4.5

/** An entry of the log: a tall slab carved with the job, the place and what was done. */
export default function ExperienceStele({ node }) {
  const experience = node.data
  const glow = useNodeGlow(node)
  const lines = useMemo(() => lineMaterial(PALETTE.greenHot), [])
  const scanner = useMemo(() => lightMaterial(PALETTE.greenHot, { additive: true }), [])
  const slab = useMemo(() => new BoxGeometry(WIDTH, HEIGHT, 0.26), [])
  const text = useMemo(
    () => [
      { text: node.code, size: 34, weight: 500, color: '#5cf6ff', spacing: 0.2 },
      ...wrapText(experience.title.toUpperCase(), 13).map((line) => ({ text: line, size: 64, color: '#ffffff' })),
      { text: experience.place.toUpperCase(), size: 30, weight: 500, color: '#6dffa0', spacing: 0.1 },
      { text: '', size: 18 },
      ...wrapText(experience.description, 26).map((line) => ({ text: line, size: 30, weight: 400, color: '#b8ffc8', spacing: 0 })),
    ],
    [experience, node.code],
  )

  const label = useRef(null)
  const scan = useRef(null)

  useFrame(() => {
    const g = glow.value
    setGlow(lines, g)
    setGlow(label.current.material, 0.45 + g * 0.7)
    // A line of light keeps scanning down the face.
    const progress = (rig.time * 0.22 + node.index * 0.37) % 1
    scan.current.position.y = 0.35 + (1 - progress) * (HEIGHT - 0.3)
    setGlow(scanner, g * 0.9 * Math.sin(progress * Math.PI))
  })

  return (
    <group position={[node.at[0], 0, node.at[1]]} rotation-y={yawTowards(node.front)}>
      <Solid geometry={slab} lineMaterial={lines} position-y={HEIGHT / 2 + 0.1} />
      <Label ref={label} width={WIDTH - 0.4} position={[0, 2.75, 0.14]} align="left" lines={text} color={PALETTE.white} />
      <mesh ref={scan} position-z={0.15} material={scanner}>
        <planeGeometry args={[WIDTH - 0.1, 0.025]} />
      </mesh>
    </group>
  )
}
