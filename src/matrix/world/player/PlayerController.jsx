import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { sfx } from '../../audio/audio.js'
import { EYE_HEIGHT, sectorAt, SPAWN } from '../../content/world.js'
import { input, readMove } from '../../input/controls.js'
import { rig } from '../../state/rig.js'
import { useMatrix } from '../../state/useMatrix.js'
import { shared } from '../shared.js'
import { stepBody } from './physics.js'

const LOOK_SENSITIVITY = 0.0022
const LOOK_SMOOTHING = 22
const MAX_PITCH = 1.35
const BASE_FOV = 72
const PORTRAIT_FOV = 80

/* The arrival: a hold high above the plaza, then a long dive down to the spawn. */
const HOLD = 1.1
const FALL = 4.4
const START = { x: 0, y: 62, z: 52, yaw: -0.5, pitch: -0.82 }

const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (a, b, t) => a + (b - a) * t

function runIntro(dt) {
  const intro = rig.intro
  intro.time += dt
  const t = Math.min(1, Math.max(0, (intro.time - HOLD) / FALL))
  const e = smootherstep(t)
  // A slight spiral on the way down.
  const swing = Math.sin(e * Math.PI) * 9
  rig.x = lerp(START.x, SPAWN.x, e) + swing
  rig.z = lerp(START.z, SPAWN.z, e)
  rig.y = lerp(START.y, 0, e)
  rig.yaw = rig.yawTarget = lerp(START.yaw, SPAWN.yaw, e)
  rig.pitch = rig.pitchTarget = lerp(START.pitch, 0, e)
  rig.reveal = Math.min(1, intro.time / (HOLD + FALL * 0.85))
  if (t >= 1) {
    intro.active = false
    rig.x = SPAWN.x
    rig.z = SPAWN.z
    rig.y = 0
    rig.reveal = 1
    rig.glitch = 0.8
  }
  return t
}

/**
 * Moves the visitor and the camera every frame: the arrival first, then free
 * movement (keys or stick) and look (mouse or thumb), with a little inertia.
 */
export default function PlayerController() {
  const scratch = useMemo(() => ({ move: { x: 0, z: 0, sprint: false, jump: false }, events: [], bob: 0, fov: BASE_FOV }), [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const { camera, size } = state
    const game = useMatrix.getState()
    rig.time += dt
    shared.uTime.value = rig.time

    let falling = 0
    const free = game.phase === 'world' && !game.overlay
    if (rig.intro.active) {
      falling = runIntro(dt)
      input.lookX = input.lookY = 0
    } else {
      if (game.phase === 'entering') game.arrive()

      // Look: the input moves a target, the view eases towards it.
      if (free) {
        rig.yawTarget -= Math.max(-250, Math.min(250, input.lookX)) * LOOK_SENSITIVITY
        rig.pitchTarget -= Math.max(-250, Math.min(250, input.lookY)) * LOOK_SENSITIVITY
        rig.pitchTarget = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, rig.pitchTarget))
      }
      input.lookX = input.lookY = 0
      const ease = 1 - Math.exp(-dt * LOOK_SMOOTHING)
      rig.yaw += (rig.yawTarget - rig.yaw) * ease
      rig.pitch += (rig.pitchTarget - rig.pitch) * ease

      // Move: with no input (a window is open) the body glides to a stop.
      const move = scratch.move
      if (free) readMove(move)
      else move.x = move.z = 0
      move.jump = free && input.jump
      input.jump = false

      scratch.events.length = 0
      stepBody(rig, move, dt, scratch.events)
      for (const event of scratch.events) {
        if (event === 'step') {
          rig.step.x = rig.x
          rig.step.z = rig.z
          rig.step.time = rig.time
          sfx.step()
        } else if (event === 'land') {
          rig.step.x = rig.x
          rig.step.z = rig.z
          rig.step.time = rig.time
          sfx.land()
        }
      }
    }

    // Camera: eye height, a gentle head bob while walking, a wider view when running.
    const walking = rig.y === 0 ? Math.min(1.4, rig.speed / 5) : 0
    scratch.bob += dt * rig.speed * 1.9
    const bob = game.reducedMotion ? 0 : Math.sin(scratch.bob * 2) * 0.04 * walking
    const roll = game.reducedMotion ? 0 : Math.sin(scratch.bob) * 0.005 * walking
    camera.position.set(rig.x, EYE_HEIGHT + rig.y + bob, rig.z)
    camera.rotation.set(rig.pitch, rig.yaw, roll, 'YXZ')

    const baseFov = size.width / size.height < 0.9 ? PORTRAIT_FOV : BASE_FOV
    const targetFov = baseFov + Math.max(0, rig.speed - 6) * 0.9 + Math.sin(falling * Math.PI) * 16
    scratch.fov += (targetFov - scratch.fov) * (1 - Math.exp(-dt * 5))
    if (Math.abs(camera.fov - scratch.fov) > 0.01) {
      camera.fov = scratch.fov
      camera.updateProjectionMatrix()
    }

    shared.uPlayer.value.set(rig.x, rig.y, rig.z)
    shared.uReveal.value = rig.reveal
    rig.glitch = Math.max(0, rig.glitch - dt * 1.5)

    if (game.phase === 'world') {
      const sector = sectorAt(rig.x, rig.z)
      if (sector !== game.sectorId) game.setSector(sector)
    }
  }, -2)

  return null
}
