import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3 } from 'three'
import { shake } from '../feedback/shake.js'
import { runtime } from '../state/runtime.js'

const LANDSCAPE = { height: 34, back: 19, fov: 50 }
const PORTRAIT = { height: 44, back: 20, fov: 58 }

/** Follows the ship from above; slowly orbits the arena on the menu. */
export default function CameraRig() {
  const focus = useRef(new Vector3())

  useFrame((state, delta) => {
    const { camera, size, clock } = state
    const view = size.width / size.height < 0.9 ? PORTRAIT : LANDSCAPE
    if (camera.fov !== view.fov) {
      camera.fov = view.fov
      camera.updateProjectionMatrix()
    }

    const world = runtime.world
    const targetX = world ? world.player.x : 0
    const targetZ = world ? world.player.y : 0
    const follow = 1 - Math.exp(-delta * 6)
    focus.current.x += (targetX - focus.current.x) * follow
    focus.current.z += (targetZ - focus.current.z) * follow

    if (world) {
      camera.position.set(focus.current.x + shake.x, view.height, focus.current.z + view.back + shake.z)
    } else {
      const angle = clock.elapsedTime * 0.12
      camera.position.set(Math.sin(angle) * view.back * 1.6, view.height * 0.6, Math.cos(angle) * view.back * 1.6)
    }
    camera.lookAt(focus.current.x, 0, focus.current.z)
  })

  return null
}
