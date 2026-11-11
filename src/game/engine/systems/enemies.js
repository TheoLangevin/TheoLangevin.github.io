import { MAX_ENEMY_BULLETS } from '../../config/balance.js'
import { bossHpScale, damageScale, ENEMIES, hpScale, MAX_ENEMY_RADIUS, speedScale } from '../../config/enemies.js'
import { emit } from '../events.js'
import { TAU } from '../math.js'
import { queryGrid } from '../spatialGrid.js'
import { hurtPlayer } from './player.js'

const STEERING = 6
const ENEMY_BULLET_LIFE = 6

export function spawnEnemy(world, type, x, y) {
  const def = ENEMIES[type]
  const wave = Math.max(1, world.wave.number)
  const hp = def.hp * (type === 'boss' ? bossHpScale(wave) : hpScale(wave))
  const enemy = {
    id: world.nextId++,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    radius: def.radius,
    speed: def.speed * speedScale(wave),
    damage: def.damage * damageScale(wave),
    bulletDamage: (def.bulletDamage ?? 0) * damageScale(wave),
    age: 0,
    flash: 0,
    orbitCooldown: 0,
    phase: world.rng() * TAU,
    attackTimer: (def.fireInterval ?? def.attackInterval ?? 0) * (0.5 + world.rng() * 0.5),
    summonTimer: def.summonInterval ?? 0,
    pattern: 0,
    dead: false,
  }
  world.enemies.push(enemy)
  return enemy
}

function shoot(world, enemy, angle, speed, damage) {
  if (world.enemyBullets.length >= MAX_ENEMY_BULLETS) return
  world.enemyBullets.push({
    x: enemy.x + Math.cos(angle) * enemy.radius,
    y: enemy.y + Math.sin(angle) * enemy.radius,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    life: ENEMY_BULLET_LIFE,
    dead: false,
  })
}

/* ---------- Behaviours: each one writes the desired heading into `dir` ---------- */

const dir = { x: 0, y: 0 }

function chase(enemy, toPlayerX, toPlayerY) {
  dir.x = toPlayerX
  dir.y = toPlayerY
}

function zigzag(enemy, toPlayerX, toPlayerY, world) {
  const sway = Math.sin(world.stats.time * 6 + enemy.phase) * 0.8
  dir.x = toPlayerX - toPlayerY * sway
  dir.y = toPlayerY + toPlayerX * sway
  const length = Math.hypot(dir.x, dir.y) || 1
  dir.x /= length
  dir.y /= length
}

function ranged(enemy, toPlayerX, toPlayerY, world, dt, distance) {
  const def = ENEMIES[enemy.type]
  if (distance > def.range.max) {
    chase(enemy, toPlayerX, toPlayerY)
  } else if (distance < def.range.min) {
    dir.x = -toPlayerX
    dir.y = -toPlayerY
  } else {
    // In range: circle the player, half of them clockwise.
    const side = enemy.id % 2 === 0 ? 1 : -1
    dir.x = -toPlayerY * side * 0.6
    dir.y = toPlayerX * side * 0.6
  }

  enemy.attackTimer -= dt
  const insideArena = Math.hypot(enemy.x, enemy.y) < world.arena.radius + 1
  if (enemy.attackTimer <= 0 && insideArena) {
    enemy.attackTimer = def.fireInterval
    shoot(world, enemy, Math.atan2(toPlayerY, toPlayerX), def.bulletSpeed, enemy.bulletDamage)
    emit(world, 'enemyShoot', enemy.x, enemy.y)
  }
}

function boss(enemy, toPlayerX, toPlayerY, world, dt, distance) {
  const def = ENEMIES.boss
  const enraged = enemy.hp < enemy.maxHp / 2
  const slow = distance < 6 ? 0.3 : 1
  dir.x = toPlayerX * slow
  dir.y = toPlayerY * slow

  enemy.attackTimer -= dt
  if (enemy.attackTimer <= 0) {
    enemy.attackTimer = def.attackInterval * (enraged ? 0.65 : 1)
    enemy.pattern += 1
    if (enemy.pattern % 2 === 0) {
      // Ring of bullets, rotated each time so the gaps move.
      const count = enraged ? 20 : 14
      for (let i = 0; i < count; i++) {
        shoot(world, enemy, (i / count) * TAU + enemy.pattern * 0.35, def.bulletSpeed, enemy.bulletDamage)
      }
    } else {
      // Fan aimed at the player.
      const aim = Math.atan2(toPlayerY, toPlayerX)
      for (let i = -2; i <= 2; i++) {
        shoot(world, enemy, aim + i * 0.16, def.bulletSpeed * 1.3, enemy.bulletDamage)
      }
    }
    emit(world, 'bossAttack', enemy.x, enemy.y)
  }

  enemy.summonTimer -= dt
  if (enemy.summonTimer <= 0) {
    enemy.summonTimer = def.summonInterval
    for (let i = 0; i < def.summon.count; i++) {
      const angle = world.rng() * TAU
      spawnEnemy(world, def.summon.type, enemy.x + Math.cos(angle) * 3, enemy.y + Math.sin(angle) * 3)
    }
  }
}

const BEHAVIOURS = { chase, zigzag, ranged, boss }

/* ---------- Update ---------- */

const push = { x: 0, y: 0 }

/** Soft collisions: overlapping enemies slide apart instead of stacking. */
function separation(world, enemy) {
  push.x = 0
  push.y = 0
  queryGrid(world.grid, enemy.x, enemy.y, enemy.radius + MAX_ENEMY_RADIUS, (other) => {
    if (other === enemy || other.dead) return
    const dx = enemy.x - other.x
    const dy = enemy.y - other.y
    const reach = enemy.radius + other.radius
    const distanceSq = dx * dx + dy * dy
    if (distanceSq >= reach * reach || distanceSq === 0) return
    const distance = Math.sqrt(distanceSq)
    // Heavier (bigger) enemies are pushed less.
    const share = other.radius / reach
    push.x += (dx / distance) * (reach - distance) * share
    push.y += (dy / distance) * (reach - distance) * share
  })
}

export function updateEnemies(world, dt) {
  const player = world.player
  const leash = world.arena.radius + 6

  for (const enemy of world.enemies) {
    if (enemy.dead) continue
    enemy.age += dt
    enemy.flash = Math.max(0, enemy.flash - dt)
    enemy.orbitCooldown = Math.max(0, enemy.orbitCooldown - dt)

    const dx = player.x - enemy.x
    const dy = player.y - enemy.y
    const distance = Math.hypot(dx, dy) || 0.0001
    const toPlayerX = dx / distance
    const toPlayerY = dy / distance

    BEHAVIOURS[ENEMIES[enemy.type].behaviour](enemy, toPlayerX, toPlayerY, world, dt, distance)

    const blend = Math.min(1, dt * STEERING)
    enemy.vx += (dir.x * enemy.speed - enemy.vx) * blend
    enemy.vy += (dir.y * enemy.speed - enemy.vy) * blend

    separation(world, enemy)
    enemy.x += enemy.vx * dt + push.x * 0.5
    enemy.y += enemy.vy * dt + push.y * 0.5

    // Keep retreating enemies from wandering off into the void.
    const fromCentre = Math.hypot(enemy.x, enemy.y)
    if (fromCentre > leash) {
      enemy.x *= leash / fromCentre
      enemy.y *= leash / fromCentre
    }

    if (distance < enemy.radius + player.stats.radius && hurtPlayer(world, enemy.damage)) {
      // Bounce back so the player gets a moment to escape.
      enemy.vx = -toPlayerX * 8
      enemy.vy = -toPlayerY * 8
    }
  }
}
