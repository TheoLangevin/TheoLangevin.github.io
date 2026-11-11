import { removeDead } from './math.js'
import { rebuildGrid } from './spatialGrid.js'
import { updateEnemies } from './systems/enemies.js'
import { updatePickups } from './systems/pickups.js'
import { updatePlayer } from './systems/player.js'
import { updateBullets, updateEnemyBullets } from './systems/projectiles.js'
import { updateSpawner } from './systems/spawner.js'
import { updateWeapons } from './systems/weapons.js'

/** Longest slice of time simulated at once; longer frames are split. */
const MAX_STEP = 1 / 30

function tick(world, dt, input) {
  const { stats } = world
  stats.time += dt
  if (stats.comboTimer > 0) {
    stats.comboTimer -= dt
    if (stats.comboTimer <= 0) stats.combo = 0
  }

  rebuildGrid(world.grid, world.enemies)
  updatePlayer(world, dt, input)
  updateEnemies(world, dt)
  updateWeapons(world, dt)
  updateBullets(world, dt)
  updateEnemyBullets(world, dt)
  updatePickups(world, dt)

  removeDead(world.enemies)
  removeDead(world.bullets)
  removeDead(world.enemyBullets)
  removeDead(world.pickups)

  updateSpawner(world, dt)
}

/**
 * Advances the simulation by `dt` seconds.
 *
 * `input` is `{ moveX, moveY, dash, hasAim, aimX, aimY }`. The step stops early
 * when the run ends or a level up is waiting for the player's choice.
 */
export function step(world, dt, input) {
  let remaining = dt
  let dash = input.dash
  while (remaining > 0 && !world.over && world.pendingLevelUps === 0) {
    const slice = Math.min(remaining, MAX_STEP)
    tick(world, slice, dash === input.dash ? input : { ...input, dash })
    dash = false // a dash press only counts once per frame
    remaining -= slice
  }
}
