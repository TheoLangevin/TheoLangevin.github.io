import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, MeshBasicMaterial } from 'three'
import { createRandom, TAU } from '../random.js'

const BANKS = 12

/** A soft, cloudy texture: a handful of blurred blobs. */
function createMistTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext('2d')
  const random = createRandom(31)
  for (let i = 0; i < 46; i++) {
    const x = 60 + random() * 392
    const y = 70 + random() * 116
    const radius = 30 + random() * 70
    const blob = context.createRadialGradient(x, y, 0, x, y, radius)
    blob.addColorStop(0, `rgba(255, 255, 255, ${0.05 + random() * 0.07})`)
    blob.addColorStop(1, 'rgba(255, 255, 255, 0)')
    context.fillStyle = blob
    context.fillRect(0, 0, 512, 256)
  }
  return new CanvasTexture(canvas)
}

/**
 * Banks of haze drifting near the ground. Layered at different depths, they
 * wash out what stands behind them: cheap "volumetric" fog.
 */
export default function Mist() {
  const group = useRef(null)
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        map: createMistTexture(),
        color: new Color().setRGB(0.0, 0.2, 0.06),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  )
  const banks = useMemo(() => {
    const random = createRandom(53)
    return Array.from({ length: BANKS }, (_, i) => {
      const angle = (i / BANKS) * TAU + random() * 0.4
      const distance = 16 + random() * 42
      return {
        position: [Math.cos(angle) * distance, 2.5 + random() * 3.5, Math.sin(angle) * distance],
        yaw: angle + Math.PI / 2 + (random() - 0.5),
        size: [26 + random() * 22, 7 + random() * 6],
      }
    })
  }, [])

  // The whole ring of haze turns very slowly around the plaza.
  useFrame((_, delta) => {
    group.current.rotation.y += delta * 0.006
  })

  return (
    <group ref={group}>
      {banks.map((bank, i) => (
        <mesh key={i} position={bank.position} rotation-y={bank.yaw} material={material}>
          <planeGeometry args={bank.size} />
        </mesh>
      ))}
    </group>
  )
}
