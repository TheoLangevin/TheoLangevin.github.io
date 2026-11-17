import { useMemo } from 'react'
import { AdditiveBlending, BackSide, ShaderMaterial, Vector2 } from 'three'
import { WORLD_RADIUS } from '../../content/world.js'
import { PALETTE } from '../palette.js'
import { shared } from '../shared.js'
import { firewallFragment, firewallVertex } from '../shaders/firewall.js'

const HEIGHT = 15
const CELL = 0.8

/** The boundary of the world. Invisible from afar; it lights up where the visitor walks into it. */
export default function Firewall() {
  const radius = WORLD_RADIUS + 0.6
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: firewallVertex,
        fragmentShader: firewallFragment,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: BackSide,
        uniforms: {
          uTime: shared.uTime,
          uAtlas: shared.uAtlas,
          uPlayer: shared.uPlayer,
          uColor: { value: PALETTE.cyan },
          uHead: { value: PALETTE.whiteHot },
          uGrid: { value: new Vector2(Math.round((Math.PI * 2 * radius) / CELL), Math.round(HEIGHT / (CELL * 1.12))) },
        },
      }),
    [radius],
  )

  return (
    <mesh position-y={HEIGHT / 2} material={material}>
      <cylinderGeometry args={[radius, radius, HEIGHT, 128, 1, true]} />
    </mesh>
  )
}
