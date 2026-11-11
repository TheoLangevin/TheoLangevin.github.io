/** Global tuning values. Distances are in world units, durations in seconds. */

export const ARENA_RADIUS = 28

export const PLAYER_BASE = Object.freeze({
  radius: 0.6,
  maxHp: 100,
  speed: 9,
  fireRate: 4,
  damage: 10,
  bulletSpeed: 30,
  bulletLife: 1.1,
  projectiles: 1,
  pierce: 0,
  critChance: 0.05,
  critMultiplier: 2,
  magnet: 4.5,
  regen: 0,
  dashCooldown: 2.4,
  orbitals: 0,
  blastRadius: 0,
  chain: 0,
  shieldCooldown: 0,
})

export const DASH = Object.freeze({ speed: 32, duration: 0.18, graceTime: 0.12 })

export const BULLET_RADIUS = 0.25
export const BULLET_SPREAD = 0.14
export const AUTO_AIM_RANGE = 22
export const HIT_INVULNERABILITY = 0.7

export const ORBITAL = Object.freeze({
  distance: 2.7,
  radius: 0.55,
  angularSpeed: 3.2,
  damageRatio: 0.6,
  hitCooldown: 0.4,
})

export const BLAST_DAMAGE_RATIO = 0.5
export const CHAIN = Object.freeze({ range: 7, damageRatio: 0.6 })

export const PICKUP = Object.freeze({ radius: 0.5, heal: 25, pullSpeed: 16, max: 400 })

export const COMBO_WINDOW = 3
export const MAX_ENEMIES = 220
export const MAX_BULLETS = 400
export const MAX_ENEMY_BULLETS = 300

export const WAVE = Object.freeze({ firstDelay: 1.5, intermission: 3, clearBonus: 50 })

/** XP needed to go from `level` to `level + 1`. */
export const xpForLevel = (level) => Math.round(5 + level * 4 + level ** 1.5)

/** Score multiplier earned by chaining kills. */
export const comboMultiplier = (combo) => 1 + Math.min(combo, 40) * 0.05
