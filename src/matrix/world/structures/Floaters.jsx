import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Euler, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three'
import { rig } from '../../state/rig.js'
import { PALETTE } from '../palette.js'
import { createRandom, TAU } from '../random.js'

const COUNT = 30

/** Wireframe polyhedra drifting high above the grid: the architecture of the sky. */
export default function Floaters() {
  const mesh = useRef(null)
  const material = useMemo(
    () => new MeshBasicMaterial({ color: PALETTE.green.clone().multiplyScalar(0.8), wireframe: true, toneMapped: false }),
    [],
  )
  const floaters = useMemo(() => {
    const random = createRandom(88)
    return Array.from({ length: COUNT }, () => {
      const angle = random() * TAU
      const distance = 14 + random() * 52
      return {
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
        y: 9 + random() * 22,
        size: 0.8 + random() * random() * 4.5,
        spin: (random() - 0.5) * 0.6,
        phase: random() * TAU,
      }
    })
  }, [])
  const tools = useMemo(() => ({ matrix: new Matrix4(), position: new Vector3(), rotation: new Quaternion(), scale: new Vector3(), euler: new Euler() }), [])

  useFrame(() => {
    const { matrix, position, rotation, scale, euler } = tools
    floaters.forEach((f, i) => {
      const t = rig.time
      position.set(f.x, f.y + Math.sin(t * 0.3 + f.phase) * 0.8, f.z)
      rotation.setFromEuler(euler.set(t * f.spin + f.phase, t * f.spin * 0.7, f.phase))
      scale.setScalar(f.size * Math.min(1, rig.reveal * 1.4))
      mesh.current.setMatrixAt(i, matrix.compose(position, rotation, scale))
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[null, material, COUNT]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
    </instancedMesh>
  )
}
