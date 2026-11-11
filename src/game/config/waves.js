import { BOSS_EVERY, ENEMIES, ENEMY_TYPES } from './enemies.js'

export const isBossWave = (wave) => wave % BOSS_EVERY === 0

/** Total enemy "cost" a wave may spend. */
export function waveBudget(wave) {
  const budget = 8 + wave * 5 + Math.floor(wave ** 1.5)
  return isBossWave(wave) ? Math.floor(budget / 2) : budget
}

/** Seconds between two spawn groups, and how many enemies a group holds. */
export const spawnInterval = (wave) => Math.max(0.3, 1.2 - wave * 0.06)
export const spawnGroupSize = (wave) => Math.min(6, 1 + Math.floor(wave / 2))

/**
 * Builds the ordered list of enemy types for a wave by spending its budget on
 * the archetypes unlocked so far, picked at random by weight.
 */
export function generateWave(wave, rng) {
  const unlocked = ENEMY_TYPES.filter((type) => ENEMIES[type].minWave <= wave)
  const queue = []
  let budget = waveBudget(wave)

  while (budget > 0) {
    const affordable = unlocked.filter((type) => ENEMIES[type].cost <= budget)
    if (affordable.length === 0) break
    const total = affordable.reduce((sum, type) => sum + ENEMIES[type].weight, 0)
    let roll = rng() * total
    let picked = affordable[affordable.length - 1]
    for (const type of affordable) {
      roll -= ENEMIES[type].weight
      if (roll <= 0) {
        picked = type
        break
      }
    }
    queue.push(picked)
    budget -= ENEMIES[picked].cost
  }

  if (isBossWave(wave)) queue.unshift('boss')
  return queue
}
