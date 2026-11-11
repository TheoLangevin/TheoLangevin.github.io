import { BULLET_SPREAD, MAX_BULLETS, ORBITAL } from '../../config/balance.js'
import { MAX_ENEMY_RADIUS } from '../../config/enemies.js'
import { emit } from '../events.js'
import { distanceSq, TAU } from '../math.js'
import { queryGrid } from '../spatialGrid.js'
import { damageEnemy } from './combat.js'

/** Writes the position of the player's orbiting blade number `index` into `out`. */
export function orbitalPosition(player, index, out) {
  const angle = player.orbitAngle + (index / player.stats.orbitals) * TAU
  out.x = player.x + Math.cos(angle) * ORBITAL.distance
  out.y = player.y + Math.sin(angle) * ORBITAL.distance
  return out
}

function fire(world) {
  const player = world.player
  const { stats } = player
  const count = stats.projectiles

  for (let i = 0; i < count; i++) {
    if (world.bullets.length >= MAX_BULLETS) break
    const angle = player.angle + (i - (count - 1) / 2) * BULLET_SPREAD
    const crit = world.rng() < stats.critChance
    const dirX = Math.cos(angle)
    const dirY = Math.sin(angle)
    world.bullets.push({
      x: player.x + dirX * 0.9,
      y: player.y + dirY * 0.9,
      vx: dirX * stats.bulletSpeed,
      vy: dirY * stats.bulletSpeed,
      life: stats.bulletLife,
      damage: stats.damage * (crit ? stats.critMultiplier : 1),
      crit,
      pierce: stats.pierce,
      hit: [],
      dead: false,
    })
  }
  emit(world, 'shoot', player.x, player.y)
}

const blade = { x: 0, y: 0 }

function updateOrbitals(world, dt) {
  const player = world.player
  const { stats } = player
  player.orbitAngle = (player.orbitAngle + ORBITAL.angularSpeed * dt) % TAU

  for (let i = 0; i < stats.orbitals; i++) {
    orbitalPosition(player, i, blade)
    queryGrid(world.grid, blade.x, blade.y, ORBITAL.radius + MAX_ENEMY_RADIUS, (enemy) => {
      if (enemy.dead || enemy.orbitCooldown > 0) return
      const reach = ORBITAL.radius + enemy.radius
      if (distanceSq(blade.x, blade.y, enemy.x, enemy.y) > reach * reach) return
      enemy.orbitCooldown = ORBITAL.hitCooldown
      damageEnemy(world, enemy, stats.damage * ORBITAL.damageRatio)
    })
  }
}

export function updateWeapons(world, dt) {
  const player = world.player
  player.fireCooldown -= dt
  if (player.canFire && player.fireCooldown <= 0) {
    player.fireCooldown = 1 / player.stats.fireRate
    fire(world)
  }
  updateOrbitals(world, dt)
}
