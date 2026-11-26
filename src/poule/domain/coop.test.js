import test from 'node:test'
import assert from 'node:assert/strict'
import { MARKET_DAILY_CAP } from '../config/coop.js'
import * as c from './coop.js'

const NOW = Date.UTC(2026, 10, 26, 12)

test('une partie neuve est valide', () => assert.equal(c.validCoop(c.freshCoop(NOW)), true))

test('toucher pond des œufs, les bâtiments coûtent de plus en plus', () => {
  let s = c.tap(c.freshCoop(NOW), 15, NOW)
  assert.equal(s.eggs, 15)
  s = c.buyBuilding(s, 'nest')
  assert.equal(s.eggs, 0)
  assert.ok(c.buildingCost('nest', 1) > c.buildingCost('nest', 0))
})

test('les poules équipées sont limitées à 3 et doivent être possédées', () => {
  let s = { ...c.freshCoop(NOW), hens: { cocotte: 1, grisette: 1, rousse: 1, fermiere: 1 } }
  for (const id of Object.keys(s.hens)) s = c.equipHen(s, id)
  assert.equal(s.equipped.length, 3)
  assert.equal(c.validCoop(s), true)
  assert.equal(c.equipHen(c.freshCoop(NOW), 'cocotte').equipped.length, 0)
})

test('le marché plafonne à 800 jetons par jour, quelle que soit la fortune', () => {
  const s = { ...c.freshCoop(NOW), eggs: 1e18, buildings: { rocket: 500 } }
  const a = c.sellEggs(s, NOW)
  assert.equal(a.cents, MARKET_DAILY_CAP)
  assert.equal(c.sellEggs(a.coop, NOW).cents, 0)
  assert.equal(c.sellEggs(a.coop, NOW + 86400000).cents, MARKET_DAILY_CAP)
})

test('les poules ne touchent pas au plafond du marché', () => {
  const s = { ...c.freshCoop(NOW), eggs: 1e18, hens: { marchande: 5 }, equipped: ['marchande'] }
  assert.equal(c.sellEggs(s, NOW).cents, MARKET_DAILY_CAP)
})

test('hors ligne : plafonné à 8 h', () => {
  const s = { ...c.freshCoop(NOW), buildings: { perch: 10 } }
  assert.equal(c.offlineGain(s, 99 * 3600), c.offlineGain(s, 8 * 3600))
})

test('la frénésie multiplie par 7 pendant sa durée', () => {
  const s = { ...c.freshCoop(NOW), buildings: { perch: 1 }, frenzyUntil: NOW }
  assert.equal(c.tick(s, 10, NOW).eggs, 70)
})

test('tirage de poule et doublon', () => {
  const hen = c.drawHen(0.99, 0)
  assert.equal(hen.rarity, 'legendary')
  const once = c.receiveHen(c.freshCoop(NOW), hen)
  assert.equal(once.fresh, true)
  const twice = c.receiveHen(once.coop, hen)
  assert.equal(twice.fresh, false)
  assert.equal(twice.coop.hens[hen.id], 2)
})

test('le niveau d’une poule augmente son bonus', () => {
  const base = { ...c.freshCoop(NOW), buildings: { perch: 10 }, equipped: ['grisette'] }
  const p1 = c.production({ ...base, hens: { grisette: 1 } })
  const p5 = c.production({ ...base, hens: { grisette: 5 } })
  assert.ok(p5 > p1)
})

test('début simple : tout est caché au départ', () => {
  const s = c.freshCoop(NOW)
  for (const part of ['upgrades', 'golden', 'hens', 'market', 'skins', 'prestige']) assert.equal(c.unlocked(s, part), false)
  const { shown, next } = c.visibleBuildings(s)
  assert.equal(shown.length, 0)
  assert.equal(next.id, 'nest')
})

test('les bâtiments se révèlent et les trophées tombent', () => {
  const s = c.refresh({ ...c.tap(c.freshCoop(NOW), 1000, NOW) })
  assert.ok(s.coop.revealed.includes('nest'))
  assert.ok(s.trophies.some((t) => t.id === 'taps-1000'))
  assert.ok(c.production({ ...s.coop, buildings: { nest: 1 } }) > c.production({ ...s.coop, trophies: [], buildings: { nest: 1 } }))
})

test('paliers : 50 bâtiments doublent leur production', () => {
  const s = c.freshCoop(NOW)
  assert.equal(c.buildingPps({ ...s, buildings: { perch: 50 } }, 'perch'), 100)
})

test('déménager donne des plumes, garde les poules et remet à zéro', () => {
  const rich = { ...c.freshCoop(NOW), eggs: 5, lifetime: 4e9, total: 4e9, buildings: { rocket: 3 }, hens: { cocotte: 2 } }
  const { coop, gained } = c.moveHouse(rich)
  assert.equal(gained, 2)
  assert.equal(coop.eggs, 0)
  assert.deepEqual(coop.buildings, {})
  assert.equal(coop.hens.cocotte, 2)
  assert.equal(c.validCoop(coop), true)
  assert.equal(c.moveHouse(coop), null)
  const perked = c.buyPerk(coop, 'nest-memory')
  assert.equal(c.freeFeathers(perked), 1)
  assert.equal(perked.buildings.nest, 10)
  assert.equal(c.validCoop(perked), true)
})

test('éclosion : coûte des œufs, refus sinon', () => {
  assert.equal(c.hatch(c.freshCoop(NOW), 0.5, 0.5), null)
  assert.ok(c.hatch({ ...c.freshCoop(NOW), eggs: 5000 }, 0.5, 0.5).hen)
})

test('équilibre : le ticket quotidien reste borné même avec tout acheté', () => {
  let s = { ...c.freshCoop(NOW), eggs: 1e30 }
  assert.equal(c.sellEggs(s, NOW).cents <= MARKET_DAILY_CAP, true)
})
