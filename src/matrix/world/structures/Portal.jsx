import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BoxGeometry, ShaderMaterial, TorusGeometry } from 'three'
import { PORTAL_RADIUS, SECTOR_BY_ID, yawTowards } from '../../content/world.js'
import { rig } from '../../state/rig.js'
import { useNodeGlow } from '../interaction/useNodeGlow.js'
import { ACCENT, PALETTE } from '../palette.js'
import Label from '../primitives/Label.jsx'
import { lightMaterial, lineMaterial, setGlow } from '../primitives/materials.js'
import Solid from '../primitives/Solid.jsx'
import { shared } from '../shared.js'
import { portalFragment, portalVertex } from '../shaders/portal.js'

const CENTRE_Y = PORTAL_RADIUS + 0.25

/** A link of the site, as a ring of light you can walk through. */
export default function Portal({ node }) {
  const sector = SECTOR_BY_ID[node.sector]
  const [color, hot] = ACCENT[sector.accent]
  const glow = useNodeGlow(node)
  const lines = useMemo(() => lineMaterial(hot), [hot])
  const ringMaterial = useMemo(() => lightMaterial(hot), [hot])
  const dashMaterial = useMemo(() => lightMaterial(hot, { additive: true }), [hot])
  const disc = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: portalVertex,
        fragmentShader: portalFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: shared.uTime,
          uAtlas: shared.uAtlas,
          uColor: { value: color.clone() },
          uHead: { value: PALETTE.whiteHot.clone() },
          uIntensity: { value: 1 },
          uSeed: { value: node.code.length + node.title.length },
        },
      }),
    [color, node],
  )
  const ring = useMemo(() => new TorusGeometry(PORTAL_RADIUS, 0.09, 10, 96), [])
  const dashes = useMemo(() => new TorusGeometry(PORTAL_RADIUS + 0.3, 0.025, 6, 64, Math.PI * 1.3), [])
  const foot = useMemo(() => new BoxGeometry(0.55, 0.55, 0.9), [])

  const outer = useRef(null)
  const title = useRef(null)
  const subtitle = useRef(null)

  useFrame(() => {
    const g = glow.value
    outer.current.rotation.z = rig.time * 0.8
    setGlow(lines, g)
    setGlow(ringMaterial, 0.5 + g * 0.9)
    setGlow(dashMaterial, g * 0.8)
    disc.uniforms.uIntensity.value = 0.3 + g * 0.45
    setGlow(title.current.material, 0.5 + g * 0.8)
    setGlow(subtitle.current.material, 0.4 + g * 0.6)
  })

  return (
    <group position={[node.at[0], 0, node.at[1]]} rotation-y={yawTowards(sector.facing)}>
      {[-1, 1].map((side) => (
        <Solid key={side} geometry={foot} lineMaterial={lines} position={[side * PORTAL_RADIUS, 0.275, 0]} />
      ))}
      <mesh geometry={ring} material={ringMaterial} position-y={CENTRE_Y} />
      <mesh ref={outer} geometry={dashes} material={dashMaterial} position-y={CENTRE_Y} />
      <mesh material={disc} position-y={CENTRE_Y}>
        <circleGeometry args={[PORTAL_RADIUS - 0.06, 72]} />
      </mesh>

      <Label
        ref={subtitle}
        position-y={CENTRE_Y + PORTAL_RADIUS + 0.62}
        height={0.18}
        color={hot}
        lines={[{ text: `${sector.name} // ${node.code}`, size: 44, weight: 500, spacing: 0.2 }]}
      />
      <Label
        ref={title}
        position-y={CENTRE_Y + PORTAL_RADIUS + 1.0}
        height={0.44}
        color={PALETTE.whiteHot}
        lines={[{ text: node.title.toUpperCase(), size: 88, spacing: 0.12 }]}
      />
    </group>
  )
}
