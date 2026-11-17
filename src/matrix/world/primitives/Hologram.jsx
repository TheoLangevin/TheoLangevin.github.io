import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, DoubleSide, ShaderMaterial, SRGBColorSpace, TextureLoader } from 'three'
import { PALETTE } from '../palette.js'
import { shared } from '../shared.js'
import { hologramFragment, hologramVertex } from '../shaders/hologram.js'

/**
 * An image projected in the air. Its height follows the image's proportions.
 * The mesh goes to `ref`, so a parent can change `uIntensity`, `uTrue` and
 * `uGlitch` on its material each frame. Suspends while the image loads.
 */
export default function Hologram({ ref, url, width, color = PALETTE.green, frame = true, ...props }) {
  const texture = useLoader(TextureLoader, url)
  const material = useMemo(() => {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    return new ShaderMaterial({
      vertexShader: hologramVertex,
      fragmentShader: hologramFragment,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uTime: shared.uTime,
        uFogDensity: shared.uFogDensity,
        uMap: { value: texture },
        uColor: { value: color.clone() },
        uIntensity: { value: 1 },
        uTrue: { value: 0.35 },
        uFrame: { value: frame ? 1 : 0 },
        uGlitch: { value: 0 },
      },
    })
  }, [texture, color, frame])

  const aspect = texture.image.width / texture.image.height
  return (
    <mesh ref={ref} material={material} {...props}>
      <planeGeometry args={[width, width / aspect]} />
    </mesh>
  )
}
