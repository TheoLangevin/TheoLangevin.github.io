import { xpForLevel } from '../../config/balance.js'
import { computeStats, CONSUMABLES, UPGRADES, UPGRADES_BY_ID } from '../../config/upgrades.js'
import { emit } from '../events.js'

const CHOICE_COUNT = 3

export function addXp(world, amount) {
  const player = world.player
  player.xp += amount
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext
    player.level += 1
    player.xpToNext = xpForLevel(player.level)
    world.pendingLevelUps += 1
    emit(world, 'levelUp', player.x, player.y)
  }
}

/** Picks the upgrades offered for one level up: random, never maxed out. */
export function rollUpgradeChoices(world) {
  const pool = UPGRADES.filter((upgrade) => (world.upgrades[upgrade.id] ?? 0) < upgrade.max)
  // Fisher–Yates with the world's RNG keeps runs reproducible.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(world.rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const picked = pool.slice(0, CHOICE_COUNT)
  for (const consumable of CONSUMABLES) {
    if (picked.length >= CHOICE_COUNT) break
    picked.push(consumable)
  }
  return picked.map(({ id, name, category, description, max }) => ({
    id,
    name,
    category,
    description,
    level: world.upgrades[id] ?? 0,
    max: max ?? null,
  }))
}

const CONSUMABLE_EFFECTS = {
  repair: (world) => {
    world.player.hp = Math.min(world.player.stats.maxHp, world.player.hp + 40)
  },
  bounty: (world) => {
    world.stats.score += 500
  },
}

/** Spends one pending level up on the chosen upgrade. */
export function applyUpgrade(world, id) {
  const upgrade = UPGRADES_BY_ID[id]
  if (!upgrade || world.pendingLevelUps <= 0) return false
  const player = world.player

  if (CONSUMABLE_EFFECTS[id]) {
    CONSUMABLE_EFFECTS[id](world)
  } else {
    const level = world.upgrades[id] ?? 0
    if (level >= upgrade.max) return false
    world.upgrades[id] = level + 1
    player.stats = computeStats(world.upgrades)
    if (id === 'hull') player.hp = Math.min(player.stats.maxHp, player.hp + 25)
    if (id === 'shield') player.shield = true
  }

  // A short grace period so the player is not hit while reading the choices.
  player.invulnerable = Math.max(player.invulnerable, 0.6)
  world.pendingLevelUps -= 1
  emit(world, 'upgrade', player.x, player.y, { id })
  return true
}
