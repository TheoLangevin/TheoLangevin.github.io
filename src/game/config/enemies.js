/**
 * Enemy archetypes. `behaviour` selects the AI routine in the enemies system,
 * `shape` selects the mesh in the scene, `cost` is the price in wave budget.
 */
export const ENEMIES = Object.freeze({
  chaser: {
    name: 'Chaser',
    behaviour: 'chase',
    shape: 'octahedron',
    color: 0xff4d6d,
    hp: 20,
    speed: 4.2,
    radius: 0.6,
    damage: 10,
    xp: 1,
    score: 10,
    cost: 1,
    minWave: 1,
    weight: 10,
  },
  sprinter: {
    name: 'Sprinter',
    behaviour: 'zigzag',
    shape: 'tetrahedron',
    color: 0xffc53d,
    hp: 10,
    speed: 8,
    radius: 0.45,
    damage: 8,
    xp: 1,
    score: 15,
    cost: 1.5,
    minWave: 2,
    weight: 6,
  },
  shooter: {
    name: 'Shooter',
    behaviour: 'ranged',
    shape: 'cone',
    color: 0x4dd2ff,
    hp: 30,
    speed: 3.4,
    radius: 0.65,
    damage: 8,
    xp: 3,
    score: 30,
    cost: 3,
    minWave: 3,
    weight: 4,
    range: { min: 8, max: 13 },
    fireInterval: 2.4,
    bulletSpeed: 11,
    bulletDamage: 10,
  },
  tank: {
    name: 'Tank',
    behaviour: 'chase',
    shape: 'dodecahedron',
    color: 0xff8a3d,
    hp: 130,
    speed: 2.3,
    radius: 1.25,
    damage: 25,
    xp: 6,
    score: 60,
    cost: 5,
    minWave: 4,
    weight: 3,
    heartChance: 0.12,
  },
  splitter: {
    name: 'Splitter',
    behaviour: 'chase',
    shape: 'icosahedron',
    color: 0x5cf08a,
    hp: 45,
    speed: 3.6,
    radius: 0.85,
    damage: 12,
    xp: 2,
    score: 25,
    cost: 3,
    minWave: 5,
    weight: 4,
    splitInto: { type: 'mite', count: 3 },
  },
  mite: {
    name: 'Mite',
    behaviour: 'zigzag',
    shape: 'tetrahedron',
    color: 0x9dffb8,
    hp: 8,
    speed: 6.5,
    radius: 0.35,
    damage: 6,
    xp: 1,
    score: 5,
    cost: 0,
    minWave: Infinity,
    weight: 0,
  },
  boss: {
    name: 'Overseer',
    behaviour: 'boss',
    shape: 'boss',
    color: 0xc04dff,
    hp: 900,
    speed: 2.1,
    radius: 2.4,
    damage: 30,
    xp: 40,
    score: 1000,
    cost: 0,
    minWave: Infinity,
    weight: 0,
    heartChance: 1,
    bulletSpeed: 10,
    bulletDamage: 12,
    attackInterval: 2.6,
    summonInterval: 7,
    summon: { type: 'sprinter', count: 3 },
  },
})

export const ENEMY_TYPES = Object.freeze(Object.keys(ENEMIES))

export const MAX_ENEMY_RADIUS = Math.max(...ENEMY_TYPES.map((type) => ENEMIES[type].radius))

export const DEFAULT_HEART_CHANCE = 0.02

/** A boss replaces part of every fifth wave. */
export const BOSS_EVERY = 5

/** Enemies get tougher, hit harder and move slightly faster as waves go by. */
export const hpScale = (wave) => 1 + 0.14 * (wave - 1)
export const damageScale = (wave) => 1 + 0.05 * (wave - 1)
export const speedScale = (wave) => Math.min(1.35, 1 + 0.012 * (wave - 1))
export const bossHpScale = (wave) => 1 + 0.9 * (Math.max(1, wave / BOSS_EVERY) - 1)
