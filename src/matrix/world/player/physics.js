import { COLLIDERS, PLAYER_RADIUS, WORLD_RADIUS } from '../../content/world.js'

/**
 * How the visitor's body moves: walking, running, jumping and bumping into
 * things. Plain numbers only (no three.js), so it can be tested on its own.
 *
 * Conventions: yaw 0 looks towards -z (north); move.x goes right, move.z forward.
 */
export const WALK_SPEED = 5
export const RUN_SPEED = 9.5
const ACCELERATION = 9
const BRAKING = 12
const AIR_CONTROL = 0.25
const JUMP_SPEED = 6.4
const GRAVITY = 19
const STRIDE = 2.3

export function createBody(x = 0, z = 0, yaw = 0) {
  return { x, y: 0, z, vx: 0, vy: 0, vz: 0, yaw, speed: 0, stride: 0 }
}

/** Pushes the body out of every collider and inside the edge of the world. */
export function resolveCollisions(body, events) {
  for (const collider of COLLIDERS) {
    const dx = body.x - collider.x
    const dz = body.z - collider.z
    const reach = collider.r + PLAYER_RADIUS
    const distanceSq = dx * dx + dz * dz
    if (distanceSq >= reach * reach) continue
    const distance = Math.sqrt(distanceSq) || 0.0001
    const nx = distance > 0.0001 ? dx / distance : 1
    const nz = distance > 0.0001 ? dz / distance : 0
    body.x = collider.x + nx * reach
    body.z = collider.z + nz * reach
    // Slide along the obstacle: drop only the part of the velocity that goes into it.
    const into = body.vx * nx + body.vz * nz
    if (into < 0) {
      body.vx -= into * nx
      body.vz -= into * nz
    }
  }

  const limit = WORLD_RADIUS - PLAYER_RADIUS
  const fromCentre = Math.hypot(body.x, body.z)
  if (fromCentre > limit) {
    const nx = body.x / fromCentre
    const nz = body.z / fromCentre
    body.x = nx * limit
    body.z = nz * limit
    const out = body.vx * nx + body.vz * nz
    if (out > 0) {
      body.vx -= out * nx
      body.vz -= out * nz
    }
    events?.push('edge')
  }
}

/**
 * Advances the body by `dt` seconds. `move` is `{ x, z, sprint, jump }`; the
 * events of the step ('step', 'jump', 'land', 'edge') are pushed into `events`.
 */
export function stepBody(body, move, dt, events = []) {
  let mx = move.x
  let mz = move.z
  const amount = Math.hypot(mx, mz)
  if (amount > 1) {
    mx /= amount
    mz /= amount
  }

  const speed = move.sprint ? RUN_SPEED : WALK_SPEED
  const sin = Math.sin(body.yaw)
  const cos = Math.cos(body.yaw)
  // forward = (-sin, -cos), right = (cos, -sin)
  const wishX = (-sin * mz + cos * mx) * speed
  const wishZ = (-cos * mz - sin * mx) * speed

  const grounded = body.y <= 0 && body.vy <= 0
  const rate = amount > 0.01 ? ACCELERATION : BRAKING
  const blend = (1 - Math.exp(-dt * rate)) * (grounded ? 1 : AIR_CONTROL)
  body.vx += (wishX - body.vx) * blend
  body.vz += (wishZ - body.vz) * blend

  if (move.jump && grounded) {
    body.vy = JUMP_SPEED
    events.push('jump')
  }
  if (body.y > 0 || body.vy > 0) {
    body.vy -= GRAVITY * dt
    body.y += body.vy * dt
    if (body.y <= 0) {
      if (body.vy < -4) events.push('land')
      body.y = 0
      body.vy = 0
    }
  }

  body.x += body.vx * dt
  body.z += body.vz * dt
  resolveCollisions(body, events)

  body.speed = Math.hypot(body.vx, body.vz)
  if (body.y === 0 && body.speed > 0.5) {
    body.stride += body.speed * dt
    if (body.stride >= STRIDE) {
      body.stride = 0
      events.push('step')
    }
  }
  return events
}
