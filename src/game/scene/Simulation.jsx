import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import { step } from '../engine/step.js'
import { handleEvents } from '../feedback/handleEvents.js'
import { updateFeedback } from '../feedback/index.js'
import { controls, readMovement } from '../input/controls.js'
import { runtime } from '../state/runtime.js'
import { useGame } from '../state/useGame.js'

const HUD_INTERVAL = 0.1
const MAX_FRAME = 1 / 15

/**
 * The game loop. Runs before every other `useFrame` (priority -1): reads the
 * input, advances the engine, plays the resulting events and reports to the
 * store when the UI has to react (level up, game over, HUD numbers).
 */
export default function Simulation() {
  const tools = useMemo(
    () => ({
      input: { moveX: 0, moveY: 0, dash: false, hasAim: false, aimX: 0, aimY: 0 },
      raycaster: new Raycaster(),
      pointer: new Vector2(),
      ground: new Plane(new Vector3(0, 1, 0), 0),
      hit: new Vector3(),
      hudTimer: 0,
    }),
    [],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, MAX_FRAME)
    const game = useGame.getState()
    const world = runtime.world

    if (game.phase === 'playing' && world) {
      const { input } = tools
      readMovement(input)
      input.dash = controls.dashQueued
      controls.dashQueued = false

      // Mouse aim: project the cursor onto the arena floor.
      input.hasAim = false
      if (controls.pointerAim) {
        tools.raycaster.setFromCamera(tools.pointer.set(controls.pointerX, controls.pointerY), state.camera)
        if (tools.raycaster.ray.intersectPlane(tools.ground, tools.hit)) {
          input.hasAim = true
          input.aimX = tools.hit.x
          input.aimY = tools.hit.z
        }
      }

      step(world, dt, input)
      handleEvents(world.events)
      world.events.length = 0

      if (world.over) {
        game.finish()
      } else if (world.pendingLevelUps > 0) {
        game.offerUpgrades()
      } else if ((tools.hudTimer -= dt) <= 0) {
        tools.hudTimer = HUD_INTERVAL
        game.syncHud()
      }
    }

    // Effects keep animating on the game over screen, but freeze when paused.
    if (game.phase === 'playing' || game.phase === 'gameover') updateFeedback(dt)
  }, -1)

  return null
}
