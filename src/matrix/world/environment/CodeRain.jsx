import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'
import { NODES, SPAWN } from '../../content/world.js'
import { PALETTE } from '../palette.js'
import { createRandom, TAU } from '../random.js'
import { shared } from '../shared.js'
import { rainFragment, rainVertex } from '../shaders/rain.js'

const MAX_STRIPS = 460
const BILLBOARD = -100

/** Keeps the rain off the nodes and the landing spot, so content stays readable. */
function crowded(x, z, margin) {
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 4 + margin) return true
  return NODES.some((node) => Math.hypot(x - node.at[0], z - node.at[1]) < node.reach * 0.8 + margin)
}

function buildGeometry() {
  const random = createRandom(1999)
  const plane = new PlaneGeometry(1, 1)
  const geometry = new InstancedBufferGeometry()
  geometry.index = plane.index
  geometry.setAttribute('position', plane.getAttribute('position'))
  geometry.setAttribute('uv', plane.getAttribute('uv'))

  const base = new Float32Array(MAX_STRIPS * 3)
  const shape = new Float32Array(MAX_STRIPS * 4)
  const motion = new Float32Array(MAX_STRIPS * 2)

  let count = 0
  for (let attempt = 0; count < MAX_STRIPS && attempt < MAX_STRIPS * 30; attempt++) {
    // Every ninth strip is a wide curtain. They are interleaved, so drawing
    // fewer instances on slow devices keeps the same mix.
    const curtain = count % 9 === 8
    const angle = random() * TAU
    const distance = curtain ? 24 + random() * 85 : 7 + Math.sqrt(random()) * 105
    const x = Math.cos(angle) * distance
    const z = Math.sin(angle) * distance
    if (crowded(x, z, curtain ? 5 : 1.2)) continue

    base.set([x, random() < 0.62 ? 0 : random() * 16, z], count * 3)
    shape.set(
      [
        curtain ? 5 + Math.floor(random() * 12) : 1,
        16 + Math.floor(random() * 30),
        curtain ? 0.45 + random() * 0.4 : 0.26 + random() * 0.44,
        random() * 100,
      ],
      count * 4,
    )
    motion.set([4.5 + random() * 9, curtain ? random() * Math.PI : BILLBOARD], count * 2)
    count++
  }

  geometry.setAttribute('aBase', new InstancedBufferAttribute(base, 3))
  geometry.setAttribute('aShape', new InstancedBufferAttribute(shape, 4))
  geometry.setAttribute('aMotion', new InstancedBufferAttribute(motion, 2))
  geometry.userData.total = count
  geometry.instanceCount = count
  return geometry
}

/** Strips and curtains of falling glyphs standing in the world: you walk among them. */
export default function CodeRain({ amount = 1 }) {
  const geometry = useMemo(buildGeometry, [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: rainVertex,
        fragmentShader: rainFragment,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        uniforms: {
          uTime: shared.uTime,
          uAtlas: shared.uAtlas,
          uFogDensity: shared.uFogDensity,
          uReveal: shared.uReveal,
          uColor: { value: PALETTE.green },
          uHead: { value: PALETTE.whiteHot },
        },
      }),
    [],
  )

  useEffect(() => {
    geometry.instanceCount = Math.max(1, Math.floor(geometry.userData.total * amount))
  }, [geometry, amount])

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
