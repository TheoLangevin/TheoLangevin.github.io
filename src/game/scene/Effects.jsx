import { useFrame } from '@react-three/fiber'
import { AdditiveBlending } from 'three'
import { PALETTE } from '../feedback/palette.js'
import { MAX_PARTICLES, particles } from '../feedback/particles.js'
import { beams, shockwaves } from '../feedback/transients.js'
import { commitInstances, useInstances, writeHexColor, writeInstance, writeRgbColor } from './instancing.js'

const MAX_TRANSIENTS = 48
const GLOW = 1.4

function Particles() {
  const ref = useInstances({ colors: true })

  useFrame(() => {
    const mesh = ref.current
    const p = particles
    for (let i = 0; i < p.count; i++) {
      const fade = p.life[i] / p.maxLife[i]
      const spin = p.life[i] * 9
      writeInstance(mesh, i, p.x[i], p.y[i], p.z[i], spin, spin * 0.7, 0, p.size[i] * fade)
      writeRgbColor(mesh, i, p.r[i] * GLOW, p.g[i] * GLOW, p.b[i] * GLOW)
    }
    commitInstances(mesh, p.count)
  })

  return (
    <instancedMesh ref={ref} args={[null, null, MAX_PARTICLES]} frustumCulled={false}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

/** Rings that expand on the ground and fade out (additive, so black = invisible). */
function Shockwaves() {
  const ref = useInstances({ colors: true })

  useFrame(() => {
    const mesh = ref.current
    shockwaves.forEach((wave, i) => {
      const fade = wave.life / wave.maxLife
      const progress = 1 - fade
      const radius = wave.radius * (0.25 + 0.75 * (1 - (1 - progress) ** 2))
      writeInstance(mesh, i, wave.x, 0.08, wave.z, -Math.PI / 2, 0, 0, radius)
      writeHexColor(mesh, i, wave.color, fade * 1.6)
    })
    commitInstances(mesh, shockwaves.length)
  })

  return (
    <instancedMesh ref={ref} args={[null, null, MAX_TRANSIENTS]} frustumCulled={false}>
      <ringGeometry args={[0.86, 1, 48]} />
      <meshBasicMaterial transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}

/** Chain lightning: thin boxes stretched between two enemies. */
function Beams() {
  const ref = useInstances({ colors: true })

  useFrame(() => {
    const mesh = ref.current
    beams.forEach((beam, i) => {
      const dx = beam.x2 - beam.x1
      const dz = beam.z2 - beam.z1
      const fade = beam.life / beam.maxLife
      writeInstance(
        mesh,
        i,
        (beam.x1 + beam.x2) / 2,
        0.9,
        (beam.z1 + beam.z2) / 2,
        0,
        -Math.atan2(dz, dx),
        0,
        Math.hypot(dx, dz),
        0.14 * fade,
        0.14 * fade,
      )
      writeHexColor(mesh, i, PALETTE.lightning, fade * 3)
    })
    commitInstances(mesh, beams.length)
  })

  return (
    <instancedMesh ref={ref} args={[null, null, MAX_TRANSIENTS]} frustumCulled={false}>
      <boxGeometry />
      <meshBasicMaterial transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}

export default function Effects() {
  return (
    <>
      <Particles />
      <Shockwaves />
      <Beams />
    </>
  )
}
