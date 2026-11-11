import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color } from 'three'
import { ARENA_RADIUS } from '../config/balance.js'
import { createRng } from '../engine/rng.js'
import { PALETTE } from '../feedback/palette.js'
import { commitInstances, writeInstance } from './instancing.js'
import { fragmentShader, vertexShader } from './shaders/arenaFloor.js'

const PILLAR_COUNT = 44

function Floor() {
  const uniforms = useMemo(
    () => ({
      uRadius: { value: ARENA_RADIUS },
      uTime: { value: 0 },
      uGrid: { value: new Color(PALETTE.grid) },
      uRim: { value: new Color(PALETTE.rim) },
      uBase: { value: new Color(0x0b0d22) },
    }),
    [],
  )

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[260, 260]} />
      <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  )
}

/** Monoliths standing around the arena: scenery that gives the camera depth cues. */
function Pillars() {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const rng = createRng(7)
    for (let i = 0; i < PILLAR_COUNT; i++) {
      const angle = (i / PILLAR_COUNT) * Math.PI * 2 + rng() * 0.1
      const distance = ARENA_RADIUS + 7 + rng() * 16
      const height = 3 + rng() * 12
      const width = 1.2 + rng() * 1.8
      writeInstance(
        ref.current,
        i,
        Math.cos(angle) * distance,
        height / 2,
        Math.sin(angle) * distance,
        0,
        rng() * Math.PI,
        0,
        width,
        height,
        width,
      )
    }
    commitInstances(ref.current, PILLAR_COUNT)
  }, [])

  return (
    <instancedMesh ref={ref} args={[null, null, PILLAR_COUNT]} frustumCulled={false}>
      <boxGeometry />
      <meshStandardMaterial color={0x14173a} emissive={0x2a1f8a} emissiveIntensity={0.3} />
    </instancedMesh>
  )
}

export default function Arena() {
  return (
    <>
      <Floor />
      <Pillars />
    </>
  )
}
