import { expect, it as test } from 'vitest'
import { MARKET_DAILY_CAP } from '../config/coop.js'
import * as c from './coop.js'

const NOW = Date.UTC(2026, 10, 26, 12)

test('une partie neuve est valide', () => expect(c.validCoop(c.freshCoop(NOW))).toBe(true))

test('toucher pond des œufs, les bâtiments coûtent de plus en plus', () => {
  let s = c.tap(c.freshCoop(NOW), 15, NOW)
  expect(s.eggs).toBe(15)
  s = c.buyBuilding(s, 'nest')
  expect(s.eggs).toBe(0)
  expect(c.buildingCost('nest', 1) > c.buildingCost('nest', 0)).toBeTruthy()
})

test('les poules équipées sont limitées à 3 et doivent être possédées', () => {
  let s = { ...c.freshCoop(NOW), hens: { cocotte: 1, grisette: 1, rousse: 1, fermiere: 1 } }
  for (const id of Object.keys(s.hens)) s = c.equipHen(s, id)
  expect(s.equipped.length).toBe(3)
  expect(c.validCoop(s)).toBe(true)
  expect(c.equipHen(c.freshCoop(NOW), 'cocotte').equipped.length).toBe(0)
})

test('le marché plafonne à 800 jetons par jour, quelle que soit la fortune', () => {
  const s = { ...c.freshCoop(NOW), eggs: 1e18, buildings: { rocket: 500 } }
  const a = c.sellEggs(s, NOW)
  expect(a.cents).toBe(MARKET_DAILY_CAP)
  expect(c.sellEggs(a.coop, NOW).cents).toBe(0)
  expect(c.sellEggs(a.coop, NOW + 86400000).cents).toBe(MARKET_DAILY_CAP)
})

test('les poules ne touchent pas au plafond du marché', () => {
  const s = { ...c.freshCoop(NOW), eggs: 1e18, hens: { marchande: 5 }, equipped: ['marchande'] }
  expect(c.sellEggs(s, NOW).cents).toBe(MARKET_DAILY_CAP)
})

test('hors ligne : plafonné à 8 h', () => {
  const s = { ...c.freshCoop(NOW), buildings: { perch: 10 } }
  expect(c.offlineGain(s, 99 * 3600)).toBe(c.offlineGain(s, 8 * 3600))
})

test('la frénésie multiplie par 7 pendant sa durée', () => {
  const s = { ...c.freshCoop(NOW), buildings: { perch: 1 }, frenzyUntil: NOW }
  expect(c.tick(s, 10, NOW).eggs).toBe(70)
})

test('tirage de poule et doublon', () => {
  const hen = c.drawHen(0.99, 0)
  expect(hen.rarity).toBe('legendary')
  const once = c.receiveHen(c.freshCoop(NOW), hen)
  expect(once.fresh).toBe(true)
  const twice = c.receiveHen(once.coop, hen)
  expect(twice.fresh).toBe(false)
  expect(twice.coop.hens[hen.id]).toBe(2)
})

test('le niveau d’une poule augmente son bonus', () => {
  const base = { ...c.freshCoop(NOW), buildings: { perch: 10 }, equipped: ['grisette'] }
  const p1 = c.production({ ...base, hens: { grisette: 1 } })
  const p5 = c.production({ ...base, hens: { grisette: 5 } })
  expect(p5 > p1).toBeTruthy()
})

test('début simple : tout est caché au départ', () => {
  const s = c.freshCoop(NOW)
  for (const part of ['upgrades', 'golden', 'hens', 'market', 'skins', 'prestige']) expect(c.unlocked(s, part)).toBe(false)
  const { shown, next } = c.visibleBuildings(s)
  expect(shown.length).toBe(0)
  expect(next.id).toBe('nest')
})

test('les bâtiments se révèlent et les trophées tombent', () => {
  const s = c.refresh({ ...c.tap(c.freshCoop(NOW), 1000, NOW) })
  expect(s.coop.revealed.includes('nest')).toBeTruthy()
  expect(s.trophies.some((t) => t.id === 'taps-1000')).toBeTruthy()
  expect(c.production({ ...s.coop, buildings: { nest: 1 } }) > c.production({ ...s.coop, trophies: [], buildings: { nest: 1 } })).toBeTruthy()
})

test('paliers : 50 bâtiments doublent leur production', () => {
  const s = c.freshCoop(NOW)
  expect(c.buildingPps({ ...s, buildings: { perch: 50 } }, 'perch')).toBe(100)
})

test('déménager donne des plumes, garde les poules et remet à zéro', () => {
  const rich = { ...c.freshCoop(NOW), eggs: 5, lifetime: 8e9, total: 8e9, buildings: { rocket: 3 }, hens: { cocotte: 2 } }
  const { coop, gained } = c.moveHouse(rich)
  expect(gained).toBe(2)
  expect(coop.eggs).toBe(0)
  expect(coop.buildings).toEqual({})
  expect(coop.hens.cocotte).toBe(2)
  expect(c.validCoop(coop)).toBe(true)
  expect(c.moveHouse(coop)).toBe(null)
  const perked = c.buyPerk(coop, 'nest-memory')
  expect(c.freeFeathers(perked)).toBe(1)
  expect(perked.buildings.nest).toBe(10)
  expect(c.validCoop(perked)).toBe(true)
})

test('éclosion : coûte des œufs, refus sinon', () => {
  expect(c.hatch(c.freshCoop(NOW), 0.5, 0.5)).toBe(null)
  expect(c.hatch({ ...c.freshCoop(NOW), eggs: 5000 }, 0.5, 0.5).hen).toBeTruthy()
})

test('équilibre : le ticket quotidien reste borné même avec tout acheté', () => {
  let s = { ...c.freshCoop(NOW), eggs: 1e30 }
  expect(c.sellEggs(s, NOW).cents <= MARKET_DAILY_CAP).toBe(true)
})
