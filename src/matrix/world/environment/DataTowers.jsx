import { useLayoutEffect, useMemo, useRef } from 'react'
import { Euler, Matrix4, Quaternion, ShaderMaterial, Vector3 } from 'three'
import { PALETTE } from '../palette.js'
import { createRandom, TAU } from '../random.js'
import { shared } from '../shared.js'
import { towerFragment, towerVertex } from '../shaders/tower.js'

const TOWERS = 44
const SLABS = 9
const COUNT = TOWERS + SLABS

/** The skyline: towers beyond the edge of the world and slabs hanging overhead, all streaming code. */
export default function DataTowers() {
  const mesh = useRef(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: towerVertex,
        fragmentShader: towerFragment,
        uniforms: {
          uTime: shared.uTime,
          uAtlas: shared.uAtlas,
          uFogDensity: shared.uFogDensity,
          uReveal: shared.uReveal,
          uColor: { value: PALETTE.green },
          uHead: { value: PALETTE.white },
          uBase: { value: PALETTE.dark },
        },
      }),
    [],
  )

  useLayoutEffect(() => {
    const random = createRandom(404)
    const matrix = new Matrix4()
    const position = new Vector3()
    const rotation = new Quaternion()
    const scale = new Vector3()
    const euler = new Euler()

    for (let i = 0; i < COUNT; i++) {
      const tower = i < TOWERS
      const angle = tower ? (i / TOWERS) * TAU + (random() - 0.5) * 0.12 : random() * TAU
      const distance = tower ? 84 + random() * 78 : 55 + random() * 70
      const height = tower ? 22 + random() * random() * 125 : 1.6 + random() * 2.6
      const width = tower ? 7 + random() * 13 : 12 + random() * 16
      const depth = tower ? 7 + random() * 13 : 12 + random() * 16
      // Slabs hang above the arrival's starting point, so the dive never crosses them.
      const y = tower ? height / 2 : 78 + random() * 34
      position.set(Math.cos(angle) * distance, y, Math.sin(angle) * distance)
      rotation.setFromEuler(euler.set(0, random() * Math.PI, 0))
      scale.set(width, height, depth)
      mesh.current.setMatrixAt(i, matrix.compose(position, rotation, scale))
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={mesh} args={[null, null, COUNT]} material={material} frustumCulled={false}>
      <boxGeometry />
    </instancedMesh>
  )
}
