import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BackSide, ShaderMaterial, Vector2 } from 'three'
import { PALETTE } from '../palette.js'
import { shared } from '../shared.js'
import { skyFragment, skyVertex } from '../shaders/sky.js'

const RADIUS = 180
const HEIGHT = 240
const COLUMNS = 256
const ROWS = 48

/** Distant code rain all around: the backdrop of the world. It follows the visitor, like a sky. */
export default function SkyRain() {
  const mesh = useRef(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: BackSide,
        depthWrite: false,
        uniforms: {
          uTime: shared.uTime,
          uAtlas: shared.uAtlas,
          uColor: { value: PALETTE.green },
          uHead: { value: PALETTE.white },
          uGrid: { value: new Vector2(COLUMNS, ROWS) },
          uIntensity: { value: 0.6 },
        },
      }),
    [],
  )

  useFrame(({ camera }) => {
    mesh.current.position.set(camera.position.x, HEIGHT / 2 - 30, camera.position.z)
  })

  return (
    <mesh ref={mesh} material={material} renderOrder={-10} frustumCulled={false}>
      <cylinderGeometry args={[RADIUS, RADIUS, HEIGHT, 96, 1, true]} />
    </mesh>
  )
}
