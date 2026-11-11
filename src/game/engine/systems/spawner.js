import { MAX_ENEMIES, WAVE } from '../../config/balance.js'
import { generateWave, isBossWave, spawnGroupSize, spawnInterval } from '../../config/waves.js'
import { emit } from '../events.js'
import { TAU } from '../math.js'
import { spawnEnemy } from './enemies.js'
import { pullAllPickups } from './pickups.js'

function startWave(world) {
  const wave = world.wave
  wave.number += 1
  wave.queue = generateWave(wave.number, world.rng)
  wave.state = 'spawning'
  wave.spawnTimer = 0
  emit(world, 'waveStart', 0, 0, { wave: wave.number, boss: isBossWave(wave.number) })
}

/** Spawns the next few enemies together, just outside the arena. */
function spawnGroup(world) {
  const wave = world.wave
  const angle = world.rng() * TAU
  const size = wave.queue[0] === 'boss' ? 1 : spawnGroupSize(wave.number)

  for (let i = 0; i < size && wave.queue.length > 0; i++) {
    const type = wave.queue.shift()
    const a = angle + (world.rng() - 0.5) * 0.5
    const distance = world.arena.radius + 2 + world.rng() * 3
    const enemy = spawnEnemy(world, type, Math.cos(a) * distance, Math.sin(a) * distance)
    if (type === 'boss') {
      wave.boss = enemy
      emit(world, 'bossSpawn', enemy.x, enemy.y)
    }
  }
}

function clearWave(world) {
  const wave = world.wave
  world.stats.score += WAVE.clearBonus * wave.number
  wave.state = 'intermission'
  wave.timer = WAVE.intermission
  pullAllPickups(world)
  emit(world, 'waveClear', world.player.x, world.player.y, { wave: wave.number })
}

export function updateSpawner(world, dt) {
  const wave = world.wave

  if (wave.state === 'intermission') {
    wave.timer -= dt
    if (wave.timer <= 0) startWave(world)
  } else if (wave.state === 'spawning') {
    wave.spawnTimer -= dt
    if (wave.spawnTimer <= 0 && world.enemies.length < MAX_ENEMIES) {
      spawnGroup(world)
      wave.spawnTimer = spawnInterval(wave.number)
    }
    if (wave.queue.length === 0) wave.state = 'clearing'
  } else if (world.enemies.length === 0) {
    clearWave(world)
  }
}
