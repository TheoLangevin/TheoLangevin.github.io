import { EYE_HEIGHT, SPAWN } from '../content/world.js'

/**
 * The visitor's body and camera, as plain mutable numbers.
 *
 * It changes every frame, so it lives outside React: the 3D scene reads and
 * writes it inside `useFrame`, and the HUD reads it from its own animation loop.
 */
export const rig = {
  x: SPAWN.x,
  y: 0,
  z: SPAWN.z,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: SPAWN.yaw,
  pitch: 0,
  /** Where the mouse asked to look; `yaw` and `pitch` ease towards these. */
  yawTarget: SPAWN.yaw,
  pitchTarget: 0,
  speed: 0,
  stride: 0,

  time: 0,
  fps: 60,
  focusId: null,
  /** 0..1 burst of screen distortion, set on teleports and sector changes. */
  glitch: 0,
  /** Last footstep, for the ripple it leaves on the floor. */
  step: { x: SPAWN.x, z: SPAWN.z, time: -100 },
  /** The arrival: the camera falls from the sky while the world builds itself. */
  intro: { active: false, time: 0 },
  /** 0..1: how much of the world has been drawn (grows during the arrival). */
  reveal: 0,

  canvas: null,
  camera: null,
  /** Set by the 3D world: finds the node under a point of the screen. */
  pick: null,
}

export function beginIntro({ skip = false } = {}) {
  rig.intro.active = !skip
  rig.intro.time = 0
  rig.reveal = skip ? 1 : 0
}

/** Drops the visitor in front of a node, looking at it. */
export function teleportToNode(node) {
  const [x, z] = node.approach
  const dx = node.at[0] - x
  const dz = node.at[1] - z
  rig.x = x
  rig.z = z
  rig.y = 0
  rig.vx = rig.vy = rig.vz = 0
  rig.yaw = rig.yawTarget = Math.atan2(-dx, -dz)
  rig.pitch = rig.pitchTarget = Math.atan2(node.height - EYE_HEIGHT, Math.hypot(dx, dz))
  rig.glitch = 1
}
