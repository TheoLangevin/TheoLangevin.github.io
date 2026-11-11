import { CHAIN, COMBO_WINDOW, comboMultiplier } from '../../config/balance.js'
import { DEFAULT_HEART_CHANCE, ENEMIES, MAX_ENEMY_RADIUS } from '../../config/enemies.js'
import { emit } from '../events.js'
import { distanceSq, TAU } from '../math.js'
import { queryGrid } from '../spatialGrid.js'
import { spawnEnemy } from './enemies.js'
import { spawnPickup } from './pickups.js'

function dropLoot(world, enemy, def) {
  // Big enemies burst into several shards instead of one fat one.
  const shards = Math.min(8, Math.max(1, Math.round(def.xp / 3)))
  const value = def.xp / shards
  for (let i = 0; i < shards; i++) spawnPickup(world, 'xp', enemy.x, enemy.y, value)

  if (world.rng() < (def.heartChance ?? DEFAULT_HEART_CHANCE)) {
    spawnPickup(world, 'heart', enemy.x, enemy.y, 1)
  }
}

function killEnemy(world, enemy) {
  const def = ENEMIES[enemy.type]
  const { stats } = world
  enemy.dead = true

  stats.kills += 1
  stats.combo += 1
  stats.comboTimer = COMBO_WINDOW
  stats.bestCombo = Math.max(stats.bestCombo, stats.combo)
  stats.score += Math.round(def.score * comboMultiplier(stats.combo))

  dropLoot(world, enemy, def)

  if (def.splitInto) {
    const { type, count } = def.splitInto
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TAU + world.rng() * 0.5
      spawnEnemy(world, type, enemy.x + Math.cos(angle) * 0.6, enemy.y + Math.sin(angle) * 0.6)
    }
  }

  if (world.wave.boss === enemy) {
    world.wave.boss = null
    emit(world, 'bossDown', enemy.x, enemy.y)
  }
  emit(world, 'kill', enemy.x, enemy.y, { enemy: enemy.type, radius: enemy.radius })
}

export function damageEnemy(world, enemy, amount, crit = false) {
  if (enemy.dead) return
  enemy.hp -= amount
  enemy.flash = 0.12
  emit(world, 'hit', enemy.x, enemy.y, { enemy: enemy.type, crit })
  if (enemy.hp <= 0) killEnemy(world, enemy)
}

/** Damages every enemy within `radius` of a point, except `ignored`. */
export function explode(world, x, y, radius, damage, ignored) {
  queryGrid(world.grid, x, y, radius + MAX_ENEMY_RADIUS, (enemy) => {
    if (enemy === ignored || enemy.dead) return
    const reach = radius + enemy.radius
    if (distanceSq(x, y, enemy.x, enemy.y) <= reach * reach) damageEnemy(world, enemy, damage)
  })
  emit(world, 'explosion', x, y, { radius })
}

/** Lightning that hops from `source` to the closest untouched enemies. */
export function chainLightning(world, source, damage, jumps) {
  const touched = [source.id]
  let from = source

  for (let jump = 0; jump < jumps; jump++) {
    let next = null
    let bestDistance = CHAIN.range * CHAIN.range
    queryGrid(world.grid, from.x, from.y, CHAIN.range, (enemy) => {
      if (enemy.dead || touched.includes(enemy.id)) return
      const d = distanceSq(from.x, from.y, enemy.x, enemy.y)
      if (d < bestDistance) {
        bestDistance = d
        next = enemy
      }
    })
    if (!next) break
    emit(world, 'chain', from.x, from.y, { toX: next.x, toY: next.y })
    touched.push(next.id)
    damageEnemy(world, next, damage)
    from = next
  }
}
