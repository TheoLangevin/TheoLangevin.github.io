import { describe, expect, it } from 'vitest'
import { PLAYER_BASE, xpForLevel } from '../../config/balance.js'
import { ENEMIES } from '../../config/enemies.js'
import { computeStats, UPGRADES } from '../../config/upgrades.js'
import { generateWave, isBossWave, waveBudget } from '../../config/waves.js'
import { createWorld } from '../createWorld.js'
import { removeDead } from '../math.js'
import { createRng } from '../rng.js'
import { hudSnapshot, runSummary } from '../snapshot.js'
import { step } from '../step.js'
import { damageEnemy } from '../systems/combat.js'
import { spawnEnemy } from '../systems/enemies.js'
import { hurtPlayer } from '../systems/player.js'
import { addXp, applyUpgrade, rollUpgradeChoices } from '../systems/progression.js'
import { rebuildGrid } from '../spatialGrid.js'

const idle = { moveX: 0, moveY: 0, dash: false, hasAim: false, aimX: 0, aimY: 0 }
const FRAME = 1 / 60

function run(world, seconds, input = idle) {
  for (let t = 0; t < seconds && !world.over; t += FRAME) {
    step(world, FRAME, typeof input === 'function' ? input(world) : input)
    while (world.pendingLevelUps > 0) applyUpgrade(world, rollUpgradeChoices(world)[0].id)
    world.events.length = 0
  }
}

describe('config', () => {
  it('derives stats from upgrade levels without touching the base', () => {
    const stats = computeStats({ rapid: 2, multishot: 3, hull: 1 })
    expect(stats.fireRate).toBeCloseTo(PLAYER_BASE.fireRate * 1.4)
    expect(stats.projectiles).toBe(4)
    expect(stats.maxHp).toBe(125)
    expect(computeStats()).toEqual({ ...PLAYER_BASE })
  })

  it('needs more XP at every level', () => {
    for (let level = 1; level < 40; level++) {
      expect(xpForLevel(level + 1)).toBeGreaterThan(xpForLevel(level))
    }
  })

  it('builds waves within budget from unlocked enemies only', () => {
    const rng = createRng(7)
    for (let wave = 1; wave <= 30; wave++) {
      const queue = generateWave(wave, rng)
      const regular = queue.filter((type) => type !== 'boss')
      const cost = regular.reduce((sum, type) => sum + ENEMIES[type].cost, 0)
      expect(regular.length).toBeGreaterThan(0)
      expect(cost).toBeLessThanOrEqual(waveBudget(wave))
      expect(regular.every((type) => ENEMIES[type].minWave <= wave)).toBe(true)
      expect(queue.includes('boss')).toBe(isBossWave(wave))
    }
  })
})

describe('engine', () => {
  it('is deterministic for a given seed', () => {
    const a = createWorld({ seed: 42 })
    const b = createWorld({ seed: 42 })
    run(a, 20)
    run(b, 20)
    expect(runSummary(a)).toEqual(runSummary(b))
    expect(a.player.hp).toBe(b.player.hp)
  })

  it('starts the first wave and spawns enemies', () => {
    const world = createWorld({ seed: 1 })
    run(world, 4)
    expect(world.wave.number).toBe(1)
    expect(world.enemies.length).toBeGreaterThan(0)
  })

  it('moves the player and keeps it inside the arena', () => {
    const world = createWorld({ seed: 1 })
    run(world, 10, { ...idle, moveX: 1 })
    const distance = Math.hypot(world.player.x, world.player.y)
    expect(world.player.x).toBeGreaterThan(20)
    expect(distance).toBeLessThanOrEqual(world.arena.radius)
  })

  it('auto-aims, shoots and kills an enemy, which drops XP', () => {
    const world = createWorld({ seed: 3 })
    world.wave.timer = 999 // no waves: one hand-placed target
    spawnEnemy(world, 'chaser', 8, 0)
    run(world, 3)
    expect(world.stats.kills).toBe(1)
    expect(world.stats.score).toBeGreaterThan(0)
    expect(world.pickups.length + world.player.xp).toBeGreaterThan(0)
  })

  it('splitters break into mites', () => {
    const world = createWorld({ seed: 3 })
    const splitter = spawnEnemy(world, 'splitter', 5, 5)
    rebuildGrid(world.grid, world.enemies)
    damageEnemy(world, splitter, 9999)
    removeDead(world.enemies)
    expect(world.enemies.map((enemy) => enemy.type)).toEqual(['mite', 'mite', 'mite'])
  })

  it('levels up and applies the chosen upgrade', () => {
    const world = createWorld({ seed: 5 })
    addXp(world, xpForLevel(1))
    expect(world.player.level).toBe(2)
    expect(world.pendingLevelUps).toBe(1)

    const choices = rollUpgradeChoices(world)
    expect(choices).toHaveLength(3)
    expect(new Set(choices.map((choice) => choice.id)).size).toBe(3)

    expect(applyUpgrade(world, 'multishot')).toBe(true)
    expect(world.player.stats.projectiles).toBe(2)
    expect(world.pendingLevelUps).toBe(0)
    expect(applyUpgrade(world, 'multishot')).toBe(false) // nothing left to spend
  })

  it('never offers a maxed upgrade and falls back to consumables', () => {
    const world = createWorld({ seed: 5 })
    for (const upgrade of UPGRADES) world.upgrades[upgrade.id] = upgrade.max
    const ids = rollUpgradeChoices(world).map((choice) => choice.id)
    expect(ids).toEqual(['repair', 'bounty'])
  })

  it('shield blocks one hit, then the player takes damage and can die', () => {
    const world = createWorld({ seed: 9 })
    world.pendingLevelUps = 1
    applyUpgrade(world, 'shield')
    world.player.invulnerable = 0
    expect(hurtPlayer(world, 30)).toBe('blocked')
    expect(world.player.hp).toBe(100)

    world.player.invulnerable = 0
    expect(hurtPlayer(world, 30)).toBe('hurt')
    expect(world.player.hp).toBe(70)
    expect(hurtPlayer(world, 30)).toBe(null) // invulnerable right after a hit

    world.player.invulnerable = 0
    hurtPlayer(world, 500)
    expect(world.over).toBe(true)
    expect(world.player.hp).toBe(0)
  })

  it('an idle player eventually dies', () => {
    const world = createWorld({ seed: 11 })
    // No upgrades picked: stand still and let the swarm win.
    for (let t = 0; t < 600 && !world.over; t += FRAME) {
      step(world, FRAME, idle)
      world.pendingLevelUps = 0
      world.events.length = 0
    }
    expect(world.over).toBe(true)
  })

  it('survives a long bot run with every system active and stays finite', () => {
    const world = createWorld({ seed: 2024 })
    const bot = (w) => {
      const t = w.stats.time
      return { ...idle, moveX: Math.cos(t * 0.9), moveY: Math.sin(t * 0.9), dash: Math.floor(t * 60) % 150 === 0 }
    }
    // Start with a strong build so the run reaches bosses and late waves.
    for (const id of ['rapid', 'power', 'multishot', 'pierce', 'blast', 'chain', 'orbitals', 'shield', 'regen', 'hull']) {
      world.pendingLevelUps = 3
      for (let i = 0; i < 3; i++) applyUpgrade(world, id)
    }
    run(world, 240, bot)

    expect(world.wave.number).toBeGreaterThanOrEqual(6)
    expect(world.stats.kills).toBeGreaterThan(100)
    const numbers = [world.player.x, world.player.y, world.player.hp, world.stats.score]
    for (const e of world.enemies) numbers.push(e.x, e.y, e.hp)
    for (const b of world.bullets) numbers.push(b.x, b.y)
    for (const p of world.pickups) numbers.push(p.x, p.y, p.value)
    expect(numbers.every(Number.isFinite)).toBe(true)

    const hud = hudSnapshot(world)
    expect(hud.hp).toBeLessThanOrEqual(hud.maxHp)
    expect(hud.xp).toBeGreaterThanOrEqual(0)
    expect(hud.xp).toBeLessThanOrEqual(100)
  })
})
