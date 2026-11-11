import { comboMultiplier } from '../config/balance.js'

/** Flat, rounded view of the world for the HUD (cheap to compare and render). */
export function hudSnapshot(world) {
  const { player, wave, stats } = world
  const boss = wave.boss
  return {
    hp: Math.ceil(player.hp),
    maxHp: player.stats.maxHp,
    level: player.level,
    xp: Math.round((player.xp / player.xpToNext) * 100),
    wave: wave.number,
    bossWave: boss !== null,
    bossHp: boss ? Math.ceil((boss.hp / boss.maxHp) * 100) : 0,
    enemies: world.enemies.length + wave.queue.length,
    score: stats.score,
    combo: stats.combo,
    multiplier: comboMultiplier(stats.combo),
    dash: Math.round((1 - player.dashCooldown / player.stats.dashCooldown) * 20) / 20,
    shield: player.shield,
  }
}

/** Summary shown on the game over screen. */
export function runSummary(world) {
  const { player, wave, stats } = world
  return {
    score: stats.score,
    wave: wave.number,
    level: player.level,
    kills: stats.kills,
    bestCombo: stats.bestCombo,
    time: Math.floor(stats.time),
    upgrades: { ...world.upgrades },
  }
}
