import { Raycaster, Sphere, Vector2, Vector3 } from 'three'
import { NODES } from '../../content/world.js'
import { rig } from '../../state/rig.js'

const MAX_DISTANCE = 75
const raycaster = new Raycaster()
const pointer = new Vector2()
const sphere = new Sphere()
const hit = new Vector3()

/** The node under a point of the screen (a click or a tap), or null. */
export function pickNode(clientX, clientY) {
  const { camera, canvas } = rig
  if (!camera || !canvas) return null
  const rect = canvas.getBoundingClientRect()
  pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
  raycaster.setFromCamera(pointer, camera)

  let best = null
  let bestDistance = MAX_DISTANCE
  for (const node of NODES) {
    sphere.center.set(node.at[0], node.height, node.at[1])
    sphere.radius = node.radius * 0.9 + 0.4
    if (!raycaster.ray.intersectSphere(sphere, hit)) continue
    const distance = hit.distanceTo(raycaster.ray.origin)
    if (distance < bestDistance) {
      bestDistance = distance
      best = node
    }
  }
  return best
}
