import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { sfx } from '../../audio/audio.js'
import { NODES } from '../../content/world.js'
import { rig } from '../../state/rig.js'
import { useMatrix } from '../../state/useMatrix.js'

const PORTALS = NODES.filter((node) => node.portal)
const PORTAL_TRIGGER = 1.1

/**
 * Decides which node the visitor is looking at (the one E or a click opens),
 * and opens a portal's window when the visitor walks through it.
 */
export default function Focus() {
  const scratch = useMemo(() => ({ forward: new Vector3(), inside: new Set() }), [])

  useFrame(({ camera }) => {
    const game = useMatrix.getState()
    let best = null

    if (game.phase === 'world' && !game.overlay) {
      const forward = camera.getWorldDirection(scratch.forward)
      let bestScore = Infinity
      for (const node of NODES) {
        const dx = node.at[0] - camera.position.x
        const dy = node.height - camera.position.y
        const dz = node.at[1] - camera.position.z
        const across = Math.hypot(dx, dz)
        if (across > node.reach) continue
        const distance = Math.hypot(across, dy)
        const angle = Math.acos(Math.min(1, (dx * forward.x + dy * forward.y + dz * forward.z) / distance))
        // Bigger and closer things are easier to aim at.
        const allowance = Math.max(0.22, Math.atan(node.radius / distance)) + 0.1
        if (angle > allowance) continue
        const score = angle / allowance + (across / node.reach) * 0.35
        if (score < bestScore) {
          bestScore = score
          best = node
        }
      }

      // Walking through a portal opens it.
      for (const portal of PORTALS) {
        const inside = Math.hypot(rig.x - portal.at[0], rig.z - portal.at[1]) < PORTAL_TRIGGER
        if (inside && !scratch.inside.has(portal.id)) {
          scratch.inside.add(portal.id)
          game.openPanel(portal.id)
        } else if (!inside) {
          scratch.inside.delete(portal.id)
        }
      }
    }

    const id = best?.id ?? null
    if (id !== rig.focusId) {
      rig.focusId = id
      game.setFocus(id)
      if (id) sfx.focus()
    }
  })

  return null
}
