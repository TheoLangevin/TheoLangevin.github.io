import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Color, ShaderMaterial, Vector3, Vector4 } from 'three'
import { NODES, SECTOR_BY_ID, WORLD_RADIUS } from '../../content/world.js'
import { rig } from '../../state/rig.js'
import { ACCENT, PALETTE } from '../palette.js'
import { smoothstep } from '../random.js'
import { shared } from '../shared.js'
import { floorFragment, floorVertex, SPOT_COUNT } from '../shaders/floor.js'

const LIT_NODES = NODES.slice(0, SPOT_COUNT)

/** The ground grid. Each node casts a pool of light on it, brighter as the visitor comes near. */
export default function Floor() {
  const material = useMemo(() => {
    const spots = Array.from({ length: SPOT_COUNT }, () => new Vector4(0, 0, 1, 0))
    const colors = Array.from({ length: SPOT_COUNT }, () => new Color(0, 0, 0))
    LIT_NODES.forEach((node, i) => {
      spots[i].set(node.at[0], node.at[1], 2.2 + node.radius * 1.3, 0)
      colors[i].copy(ACCENT[SECTOR_BY_ID[node.sector].accent][0])
    })
    return new ShaderMaterial({
      vertexShader: floorVertex,
      fragmentShader: floorFragment,
      uniforms: {
        uTime: shared.uTime,
        uPlayer: shared.uPlayer,
        uFogDensity: shared.uFogDensity,
        uReveal: shared.uReveal,
        uStep: { value: new Vector3(0, 0, -100) },
        uRadius: { value: WORLD_RADIUS },
        uColor: { value: PALETTE.green },
        uSpots: { value: spots },
        uSpotColors: { value: colors },
      },
    })
  }, [])

  useFrame(() => {
    const { uStep, uSpots } = material.uniforms
    uStep.value.set(rig.step.x, rig.step.z, rig.step.time)
    for (let i = 0; i < LIT_NODES.length; i++) {
      const node = LIT_NODES[i]
      const distance = Math.hypot(rig.x - node.at[0], rig.z - node.at[1])
      const near = 1 - smoothstep(node.reach, node.reach * 2.6, distance)
      const breath = 0.5 + 0.5 * Math.sin(rig.time * 1.4 + i * 1.7)
      uSpots.value[i].w = 0.22 + 0.1 * breath + 0.4 * near + (rig.focusId === node.id ? 0.55 : 0)
    }
  })

  return (
    <mesh rotation-x={-Math.PI / 2} material={material}>
      <planeGeometry args={[520, 520]} />
    </mesh>
  )
}
