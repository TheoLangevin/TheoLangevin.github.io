import { playSfx } from '../audio/sfx.js'
import { ENEMIES } from '../config/enemies.js'
import { PALETTE } from './palette.js'
import { burst } from './particles.js'
import { addShake } from './shake.js'
import { addBeam, addShockwave } from './transients.js'

/** How each engine event looks and sounds. Events without an entry are silent. */
const REACTIONS = {
  shoot: () => playSfx('shoot'),
  enemyShoot: () => playSfx('enemyShoot'),

  hit(event) {
    burst(event.x, event.y, ENEMIES[event.enemy].color, event.crit ? 7 : 3, { speed: 6, size: 0.14, life: 0.3 })
    playSfx('hit')
  },

  kill(event) {
    const color = ENEMIES[event.enemy].color
    burst(event.x, event.y, color, Math.round(8 + event.radius * 10), { speed: 9 + event.radius * 3, size: 0.24 })
    addShockwave(event.x, event.y, 1.5 + event.radius * 2, color)
    addShake(0.06 + event.radius * 0.08)
    playSfx('kill')
  },

  explosion(event) {
    addShockwave(event.x, event.y, event.radius, PALETTE.explosion, 0.3)
    burst(event.x, event.y, PALETTE.explosion, 6, { speed: 7, size: 0.18, life: 0.35 })
    playSfx('explosion')
  },

  chain: (event) => addBeam(event.x, event.y, event.toX, event.toY),

  hurt(event) {
    burst(event.x, event.y, PALETTE.player, 16, { speed: 10 })
    addShockwave(event.x, event.y, 3, PALETTE.enemyBullet)
    addShake(0.55)
    playSfx('hurt')
  },

  shieldBreak(event) {
    burst(event.x, event.y, PALETTE.shield, 18, { speed: 11 })
    addShockwave(event.x, event.y, 4, PALETTE.shield)
    addShake(0.25)
    playSfx('shieldBreak')
  },

  shieldUp: () => playSfx('shieldUp'),

  dash(event) {
    burst(event.x, event.y, PALETTE.player, 10, { speed: 6, lift: 2 })
    addShockwave(event.x, event.y, 2.2, PALETTE.player, 0.25)
    playSfx('dash')
  },

  pickup: (event) => playSfx(event.kind === 'heart' ? 'heal' : 'pickup'),

  levelUp(event) {
    addShockwave(event.x, event.y, 9, PALETTE.levelUp, 0.6)
    burst(event.x, event.y, PALETTE.levelUp, 24, { speed: 12, lift: 9, life: 0.7 })
    playSfx('levelUp')
  },

  upgrade: () => playSfx('upgrade'),
  waveStart: (event) => !event.boss && playSfx('waveStart'),
  waveClear: () => playSfx('waveClear'),

  bossSpawn() {
    addShake(0.7)
    playSfx('bossSpawn')
  },

  bossAttack: () => playSfx('bossAttack'),

  bossDown(event) {
    burst(event.x, event.y, ENEMIES.boss.color, 80, { speed: 18, size: 0.34, life: 1, lift: 12 })
    addShockwave(event.x, event.y, 16, ENEMIES.boss.color, 0.8)
    addShake(1)
    playSfx('bossDown')
  },

  gameOver(event) {
    burst(event.x, event.y, PALETTE.player, 60, { speed: 16, size: 0.3, life: 1, lift: 10 })
    addShockwave(event.x, event.y, 12, PALETTE.player, 0.8)
    addShake(1)
    playSfx('gameOver')
  },
}

export function handleEvents(events) {
  for (const event of events) REACTIONS[event.type]?.(event)
}
