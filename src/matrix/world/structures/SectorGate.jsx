import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BoxGeometry } from 'three'
import { gateOf } from '../../content/world.js'
import { rig } from '../../state/rig.js'
import { PALETTE } from '../palette.js'
import { smoothstep } from '../random.js'
import Label from '../primitives/Label.jsx'
import { lineMaterial, scannerMaterial, setGlow } from '../primitives/materials.js'
import Solid from '../primitives/Solid.jsx'

const PILLAR_HEIGHT = 6.4

/** The arch at the entrance of a sector, with its name, and a scanner field to walk through. */
export default function SectorGate({ sector }) {
  const gate = useMemo(() => gateOf(sector), [sector])
  const lines = useMemo(() => lineMaterial(PALETTE.greenHot), [])
  const scanner = useMemo(() => scannerMaterial(PALETTE.green), [])
  const pillar = useMemo(() => new BoxGeometry(0.7, PILLAR_HEIGHT, 0.7), [])
  const beam = useMemo(() => new BoxGeometry(8.2, 0.5, 0.5), [])
  const signs = useRef([])

  useFrame(() => {
    const distance = Math.hypot(rig.x - gate.centre[0], rig.z - gate.centre[1])
    const near = 1 - smoothstep(4, 22, distance)
    const appear = smoothstep(0, 0.22, rig.reveal - Math.hypot(gate.centre[0], gate.centre[1]) / 190)
    const g = (0.5 + near * 0.6) * appear
    setGlow(lines, g)
    scanner.uniforms.uIntensity.value = g * (0.6 + near)
    for (const sign of signs.current) if (sign) setGlow(sign.material, 0.55 + g * 0.7)
  })

  const sign = [
    { text: sector.name, size: 96, spacing: 0.24 },
    { text: `// ${sector.label} · ${sector.summary}`.toUpperCase(), size: 30, weight: 500, spacing: 0.16, color: '#6dffa0' },
  ]

  return (
    <>
      {[gate.left, gate.right].map(([x, z], i) => (
        <Solid key={i} geometry={pillar} lineMaterial={lines} position={[x, PILLAR_HEIGHT / 2, z]} rotation-y={gate.yaw} />
      ))}
      <group position={[gate.centre[0], 0, gate.centre[1]]} rotation-y={gate.yaw}>
        <Solid geometry={beam} lineMaterial={lines} position-y={PILLAR_HEIGHT + 0.25} />
        <mesh position-y={PILLAR_HEIGHT / 2} material={scanner}>
          <planeGeometry args={[6.5, PILLAR_HEIGHT]} />
        </mesh>
        {/* Readable from both sides: towards the plaza, and when leaving the sector. */}
        {[0, Math.PI].map((turn, i) => (
          <Label
            key={turn}
            ref={(value) => (signs.current[i] = value)}
            position={[0, PILLAR_HEIGHT + 1.35, i === 0 ? 0.3 : -0.3]}
            rotation-y={turn}
            height={1.15}
            color={PALETTE.whiteHot}
            lines={sign}
          />
        ))}
      </group>
    </>
  )
}
