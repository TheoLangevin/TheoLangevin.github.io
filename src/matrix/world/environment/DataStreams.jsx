import { useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three'
import { SECTORS } from '../../content/world.js'
import { PALETTE } from '../palette.js'
import { shared } from '../shared.js'
import { streamFragment, streamVertex } from '../shaders/stream.js'

const HALF_WIDTH = 0.6
const START = 5.2 // the paths begin at the edge of the plaza
const END_MARGIN = 3.4

/** One flat ribbon per sector, from the plaza to the sector, merged into a single mesh. */
function buildGeometry() {
  const positions = []
  const path = []
  const indices = []

  for (const sector of SECTORS) {
    const length = Math.hypot(sector.at[0], sector.at[1])
    if (length < START + END_MARGIN) continue
    const dx = sector.at[0] / length
    const dz = sector.at[1] / length
    const first = positions.length / 3

    for (const along of [START, length - END_MARGIN]) {
      for (const side of [-1, 1]) {
        positions.push(dx * along - dz * side * HALF_WIDTH, 0.04, dz * along + dx * side * HALF_WIDTH)
        path.push(along - START, side)
      }
    }
    indices.push(first, first + 1, first + 2, first + 2, first + 1, first + 3)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('aPath', new BufferAttribute(new Float32Array(path), 2))
  geometry.setIndex(indices)
  return geometry
}

/** Glowing paths on the ground that lead from the plaza to every sector. */
export default function DataStreams() {
  const geometry = useMemo(buildGeometry, [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: streamVertex,
        fragmentShader: streamFragment,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        uniforms: {
          uTime: shared.uTime,
          uPlayer: shared.uPlayer,
          uFogDensity: shared.uFogDensity,
          uReveal: shared.uReveal,
          uColor: { value: PALETTE.green },
        },
      }),
    [],
  )

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
