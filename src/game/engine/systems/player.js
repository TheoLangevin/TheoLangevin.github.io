import { AUTO_AIM_RANGE, DASH, HIT_INVULNERABILITY } from '../../config/balance.js'
import { emit } from '../events.js'
import { approachAngle, distanceSq } from '../math.js'

const TURN_SPEED = 18
const ACCELERATION = 12

function nearestEnemy(world, x, y, range) {
  let best = null
  let bestDistance = range * range
  for (const enemy of world.enemies) {
    if (enemy.dead) continue
    const d = distanceSq(x, y, enemy.x, enemy.y)
    if (d < bestDistance) {
      bestDistance = d
      best = enemy
    }
  }
  return best
}

function startDash(world, moveX, moveY, moveLength) {
  const player = world.player
  if (moveLength > 0.1) {
    player.dashX = moveX / moveLength
    player.dashY = moveY / moveLength
  } else {
    player.dashX = Math.cos(player.angle)
    player.dashY = Math.sin(player.angle)
  }
  player.dashTime = DASH.duration
  player.dashCooldown = player.stats.dashCooldown
  player.invulnerable = Math.max(player.invulnerable, DASH.duration + DASH.graceTime)
  emit(world, 'dash', player.x, player.y)
}

function move(world, dt, input) {
  const player = world.player
  const { stats } = player
  let moveX = input.moveX
  let moveY = input.moveY
  const moveLength = Math.hypot(moveX, moveY)
  if (moveLength > 1) {
    moveX /= moveLength
    moveY /= moveLength
  }

  if (input.dash && player.dashCooldown <= 0 && player.dashTime <= 0) {
    startDash(world, moveX, moveY, moveLength)
  }

  if (player.dashTime > 0) {
    player.dashTime -= dt
    player.vx = player.dashX * DASH.speed
    player.vy = player.dashY * DASH.speed
  } else {
    const blend = Math.min(1, dt * ACCELERATION)
    player.vx += (moveX * stats.speed - player.vx) * blend
    player.vy += (moveY * stats.speed - player.vy) * blend
  }

  player.x += player.vx * dt
  player.y += player.vy * dt

  const limit = world.arena.radius - stats.radius
  const distance = Math.hypot(player.x, player.y)
  if (distance > limit) {
    player.x *= limit / distance
    player.y *= limit / distance
  }
}

function aim(world, dt, input) {
  const player = world.player
  let targetAngle = null

  if (input.hasAim) {
    targetAngle = Math.atan2(input.aimY - player.y, input.aimX - player.x)
    player.canFire = true
  } else {
    const target = nearestEnemy(world, player.x, player.y, AUTO_AIM_RANGE)
    player.canFire = target !== null
    if (target) targetAngle = Math.atan2(target.y - player.y, target.x - player.x)
    else if (Math.hypot(player.vx, player.vy) > 1) targetAngle = Math.atan2(player.vy, player.vx)
  }

  if (targetAngle !== null) {
    player.angle = approachAngle(player.angle, targetAngle, TURN_SPEED * dt)
  }
}

function recover(world, dt) {
  const player = world.player
  const { stats } = player
  player.invulnerable = Math.max(0, player.invulnerable - dt)
  player.dashCooldown = Math.max(0, player.dashCooldown - dt)

  if (stats.regen > 0 && player.hp < stats.maxHp) {
    player.hp = Math.min(stats.maxHp, player.hp + stats.regen * dt)
  }

  if (stats.shieldCooldown > 0 && !player.shield) {
    player.shieldTimer -= dt
    if (player.shieldTimer <= 0) {
      player.shield = true
      emit(world, 'shieldUp', player.x, player.y)
    }
  }
}

export function updatePlayer(world, dt, input) {
  recover(world, dt)
  move(world, dt, input)
  aim(world, dt, input)
}

/**
 * Applies a hit to the player. Returns 'hurt', 'blocked' (shield) or null when
 * the player was invulnerable and nothing happened.
 */
export function hurtPlayer(world, damage) {
  const player = world.player
  if (world.over || player.invulnerable > 0) return null

  if (player.shield) {
    player.shield = false
    player.shieldTimer = player.stats.shieldCooldown
    player.invulnerable = 0.5
    emit(world, 'shieldBreak', player.x, player.y)
    return 'blocked'
  }

  player.hp -= damage
  player.invulnerable = HIT_INVULNERABILITY
  world.stats.combo = 0
  emit(world, 'hurt', player.x, player.y, { amount: damage })

  if (player.hp <= 0) {
    player.hp = 0
    world.over = true
    emit(world, 'gameOver', player.x, player.y)
  }
  return 'hurt'
}
