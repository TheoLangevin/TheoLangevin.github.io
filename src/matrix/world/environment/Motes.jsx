import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three'
import { PALETTE } from '../palette.js'
import { createRandom } from '../random.js'
import { shared } from '../shared.js'
import { motesFragment, motesVertex } from '../shaders/motes.js'

const MAX_MOTES = 900

/** Floating specks of light: they give the air depth and make every movement readable. */
export default function Motes({ amount = 1 }) {
  const geometry = useMemo(() => {
    const random = createRandom(7)
    const seeds = new Float32Array(MAX_MOTES * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = random()
    const buffer = new BufferGeometry()
    // three.js wants a position attribute; the real positions come from the seeds.
    buffer.setAttribute('position', new BufferAttribute(new Float32Array(MAX_MOTES * 3), 3))
    buffer.setAttribute('aSeed', new BufferAttribute(seeds, 4))
    return buffer
  }, [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: motesVertex,
        fragmentShader: motesFragment,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        uniforms: {
          uTime: shared.uTime,
          uFogDensity: shared.uFogDensity,
          uViewport: { value: 400 },
          uColor: { value: PALETTE.greenHot },
        },
      }),
    [],
  )

  useEffect(() => {
    geometry.setDrawRange(0, Math.floor(MAX_MOTES * amount))
  }, [geometry, amount])

  useFrame(({ gl }) => {
    material.uniforms.uViewport.value = gl.domElement.height * 0.5
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
