import { BLAST_DAMAGE_RATIO, BULLET_RADIUS, CHAIN } from '../../config/balance.js'
import { MAX_ENEMY_RADIUS } from '../../config/enemies.js'
import { distanceSq } from '../math.js'
import { queryGrid } from '../spatialGrid.js'
import { chainLightning, damageEnemy, explode } from './combat.js'
import { hurtPlayer } from './player.js'

/** Longest distance a bullet may travel between two collision checks. */
const MAX_STEP = 0.5

function hitEnemy(world, bullet, enemy) {
  const { stats } = world.player
  bullet.hit.push(enemy.id)
  damageEnemy(world, enemy, bullet.damage, bullet.crit)

  if (stats.blastRadius > 0) {
    explode(world, bullet.x, bullet.y, stats.blastRadius, bullet.damage * BLAST_DAMAGE_RATIO, enemy)
  }
  if (stats.chain > 0) {
    chainLightning(world, enemy, bullet.damage * CHAIN.damageRatio, stats.chain)
  }

  if (bullet.pierce > 0) bullet.pierce -= 1
  else bullet.dead = true
}

function collide(world, bullet) {
  queryGrid(world.grid, bullet.x, bullet.y, BULLET_RADIUS + MAX_ENEMY_RADIUS, (enemy) => {
    if (bullet.dead || enemy.dead || bullet.hit.includes(enemy.id)) return
    const reach = BULLET_RADIUS + enemy.radius
    if (distanceSq(bullet.x, bullet.y, enemy.x, enemy.y) <= reach * reach) {
      hitEnemy(world, bullet, enemy)
    }
  })
}

export function updateBullets(world, dt) {
  const limit = (world.arena.radius + 6) ** 2

  for (const bullet of world.bullets) {
    bullet.life -= dt
    if (bullet.life <= 0) {
      bullet.dead = true
      continue
    }

    // Sub-step fast bullets so they cannot jump over a small enemy.
    const distance = Math.hypot(bullet.vx, bullet.vy) * dt
    const steps = Math.max(1, Math.ceil(distance / MAX_STEP))
    for (let step = 0; step < steps && !bullet.dead; step++) {
      bullet.x += (bullet.vx * dt) / steps
      bullet.y += (bullet.vy * dt) / steps
      collide(world, bullet)
    }

    if (bullet.x * bullet.x + bullet.y * bullet.y > limit) bullet.dead = true
  }
}

export function updateEnemyBullets(world, dt) {
  const player = world.player
  const limit = (world.arena.radius + 8) ** 2
  const reach = (player.stats.radius + BULLET_RADIUS) ** 2

  for (const bullet of world.enemyBullets) {
    bullet.life -= dt
    bullet.x += bullet.vx * dt
    bullet.y += bullet.vy * dt

    if (bullet.life <= 0 || bullet.x * bullet.x + bullet.y * bullet.y > limit) {
      bullet.dead = true
    } else if (distanceSq(bullet.x, bullet.y, player.x, player.y) <= reach) {
      // A dashing (invulnerable) player lets the bullet fly through.
      if (hurtPlayer(world, bullet.damage)) bullet.dead = true
    }
  }
}
