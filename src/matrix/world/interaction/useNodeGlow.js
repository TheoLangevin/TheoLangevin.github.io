import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { rig } from '../../state/rig.js'
import { smoothstep } from '../random.js'

/**
 * How brightly a node shines this frame: dim from afar, brighter as the
 * visitor approaches, brightest when it is the one they are looking at. It
 * also fades in as the world is drawn during the arrival.
 *
 * Returns a mutable object, updated before the scene components run.
 */
export function useNodeGlow(node) {
  const glow = useRef({ value: 0, near: 0, focus: 0 })

  useFrame((_, delta) => {
    const g = glow.current
    const distance = Math.hypot(rig.x - node.at[0], rig.z - node.at[1])
    const near = 1 - smoothstep(node.reach * 0.6, node.reach * 2.6, distance)
    const focus = rig.focusId === node.id ? 1 : 0
    const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 7)
    g.near += (near - g.near) * ease
    g.focus += (focus - g.focus) * ease
    const appear = smoothstep(0, 0.22, rig.reveal - Math.hypot(node.at[0], node.at[1]) / 190)
    g.value = (0.5 + 0.35 * g.near + 0.65 * g.focus) * appear
  }, -1)

  return glow.current
}
