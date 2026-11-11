import { PICKUP } from '../../config/balance.js'
import { emit } from '../events.js'
import { TAU } from '../math.js'
import { addXp } from './progression.js'

export function spawnPickup(world, kind, x, y, value) {
  if (kind === 'xp' && world.pickups.length >= PICKUP.max) {
    // Too many shards on the floor: fold the value into an existing one.
    const existing = world.pickups[Math.floor(world.rng() * world.pickups.length)]
    if (existing.kind === 'xp') existing.value += value
    else addXp(world, value)
    return
  }
  const angle = world.rng() * TAU
  const speed = 2 + world.rng() * 4
  world.pickups.push({
    kind,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    value,
    age: 0,
    pulled: false,
    dead: false,
  })
}

/** Sends every pickup on the floor flying to the player (end of a wave). */
export function pullAllPickups(world) {
  for (const pickup of world.pickups) pickup.pulled = true
}

function collect(world, pickup) {
  const player = world.player
  pickup.dead = true
  if (pickup.kind === 'heart') {
    player.hp = Math.min(player.stats.maxHp, player.hp + PICKUP.heal)
  } else {
    addXp(world, pickup.value)
  }
  emit(world, 'pickup', player.x, player.y, { kind: pickup.kind })
}

export function updatePickups(world, dt) {
  const player = world.player
  const magnet = player.stats.magnet
  const limit = world.arena.radius - 0.5

  for (const pickup of world.pickups) {
    pickup.age += dt
    const dx = player.x - pickup.x
    const dy = player.y - pickup.y
    const distance = Math.hypot(dx, dy) || 0.0001

    if (distance < magnet) pickup.pulled = true

    if (pickup.pulled) {
      const speed = PICKUP.pullSpeed + pickup.age * 8
      pickup.vx = (dx / distance) * speed
      pickup.vy = (dy / distance) * speed
    } else {
      const drag = Math.max(0, 1 - dt * 4)
      pickup.vx *= drag
      pickup.vy *= drag
    }

    pickup.x += pickup.vx * dt
    pickup.y += pickup.vy * dt

    const fromCentre = Math.hypot(pickup.x, pickup.y)
    if (fromCentre > limit) {
      pickup.x *= limit / fromCentre
      pickup.y *= limit / fromCentre
    }

    if (distance < player.stats.radius + PICKUP.radius + (pickup.pulled ? 0.4 : 0)) {
      collect(world, pickup)
    }
  }
}
