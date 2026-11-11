import { ARENA_RADIUS, WAVE, xpForLevel } from '../config/balance.js'
import { computeStats } from '../config/upgrades.js'
import { createRng } from './rng.js'
import { createGrid } from './spatialGrid.js'

function createPlayer() {
  const stats = computeStats()
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hp: stats.maxHp,
    stats,
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    canFire: false,
    fireCooldown: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashX: 0,
    dashY: 0,
    invulnerable: 0,
    shield: false,
    shieldTimer: 0,
    orbitAngle: 0,
  }
}

/** Creates the whole mutable state of one run. */
export function createWorld({ seed } = {}) {
  return {
    rng: createRng(seed),
    arena: { radius: ARENA_RADIUS },
    player: createPlayer(),
    upgrades: {},
    enemies: [],
    bullets: [],
    enemyBullets: [],
    pickups: [],
    grid: createGrid(4),
    wave: { number: 0, state: 'intermission', timer: WAVE.firstDelay, queue: [], spawnTimer: 0, boss: null },
    stats: { time: 0, score: 0, kills: 0, combo: 0, comboTimer: 0, bestCombo: 0 },
    pendingLevelUps: 0,
    events: [],
    nextId: 1,
    over: false,
  }
}
