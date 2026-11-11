import { PLAYER_BASE } from './balance.js'

/**
 * Upgrades offered on level up. `apply(stats, level)` mutates a fresh copy of
 * the base stats, so the final stats are always derived from the levels alone.
 */
export const UPGRADES = Object.freeze([
  {
    id: 'rapid',
    name: 'Rapid Fire',
    category: 'weapon',
    description: '+20% fire rate',
    max: 6,
    apply: (s, n) => (s.fireRate *= 1 + 0.2 * n),
  },
  {
    id: 'power',
    name: 'Heavy Rounds',
    category: 'weapon',
    description: '+25% damage',
    max: 6,
    apply: (s, n) => (s.damage *= 1 + 0.25 * n),
  },
  {
    id: 'multishot',
    name: 'Split Shot',
    category: 'weapon',
    description: '+1 projectile per shot',
    max: 4,
    apply: (s, n) => (s.projectiles += n),
  },
  {
    id: 'pierce',
    name: 'Piercing Rounds',
    category: 'weapon',
    description: 'Shots pass through +1 enemy',
    max: 3,
    apply: (s, n) => (s.pierce += n),
  },
  {
    id: 'velocity',
    name: 'Accelerator',
    category: 'weapon',
    description: '+20% shot speed and range',
    max: 3,
    apply: (s, n) => {
      s.bulletSpeed *= 1 + 0.2 * n
      s.bulletLife *= 1 + 0.08 * n
    },
  },
  {
    id: 'crit',
    name: 'Critical Core',
    category: 'weapon',
    description: '+10% chance to deal double damage',
    max: 5,
    apply: (s, n) => (s.critChance += 0.1 * n),
  },
  {
    id: 'blast',
    name: 'Explosive Rounds',
    category: 'weapon',
    description: 'Shots explode and damage nearby enemies',
    max: 3,
    apply: (s, n) => (s.blastRadius = 1.4 + 0.8 * n),
  },
  {
    id: 'chain',
    name: 'Arc Lightning',
    category: 'weapon',
    description: 'Hits jump to +1 nearby enemy',
    max: 3,
    apply: (s, n) => (s.chain += n),
  },
  {
    id: 'orbitals',
    name: 'Orbit Blades',
    category: 'weapon',
    description: '+1 blade circling your ship',
    max: 4,
    apply: (s, n) => (s.orbitals += n),
  },
  {
    id: 'hull',
    name: 'Reinforced Hull',
    category: 'defense',
    description: '+25 max health, and repairs 25',
    max: 5,
    apply: (s, n) => (s.maxHp += 25 * n),
  },
  {
    id: 'regen',
    name: 'Nanobots',
    category: 'defense',
    description: 'Regenerate +1 health per second',
    max: 4,
    apply: (s, n) => (s.regen += n),
  },
  {
    id: 'shield',
    name: 'Energy Shield',
    category: 'defense',
    description: 'Blocks one hit, then recharges',
    max: 3,
    apply: (s, n) => (s.shieldCooldown = 14 - 2 * n),
  },
  {
    id: 'thrusters',
    name: 'Thrusters',
    category: 'utility',
    description: '+10% move speed',
    max: 5,
    apply: (s, n) => (s.speed *= 1 + 0.1 * n),
  },
  {
    id: 'dash',
    name: 'Quick Dash',
    category: 'utility',
    description: 'Dash recharges 18% faster',
    max: 4,
    apply: (s, n) => (s.dashCooldown *= 0.82 ** n),
  },
  {
    id: 'magnet',
    name: 'Magnet',
    category: 'utility',
    description: '+40% pickup range',
    max: 4,
    apply: (s, n) => (s.magnet *= 1 + 0.4 * n),
  },
])

/** Offered instead of upgrades once everything is maxed out. */
export const CONSUMABLES = Object.freeze([
  { id: 'repair', name: 'Field Repair', category: 'defense', description: 'Restore 40 health' },
  { id: 'bounty', name: 'Bounty', category: 'utility', description: '+500 score' },
])

export const UPGRADES_BY_ID = Object.freeze(
  Object.fromEntries([...UPGRADES, ...CONSUMABLES].map((upgrade) => [upgrade.id, upgrade])),
)

/** Derives the player's stats from the upgrade levels they own. */
export function computeStats(levels = {}) {
  const stats = { ...PLAYER_BASE }
  for (const upgrade of UPGRADES) {
    const level = levels[upgrade.id] ?? 0
    if (level > 0) upgrade.apply(stats, level)
  }
  return stats
}
