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

test('achat ×10 et max : prix cumulé, compteur d’achats', () => {
  const s = { ...c.freshCoop(NOW), eggs: 1e6 }
  const ten = c.buyBuildings(s, 'nest', 10)
  expect(ten.buildings.nest).toBe(10)
  expect(ten.bought).toBe(10)
  expect(Math.round(s.eggs - ten.eggs)).toBe(c.buildingCostN('nest', 0, 10))
  const max = c.buyBuildings(s, 'nest', 'max')
  expect(max.eggs >= 0).toBe(true)
  expect(max.eggs < c.buildingCost('nest', max.buildings.nest)).toBe(true)
  expect(c.buyBuildings({ ...s, eggs: 10 }, 'nest', 10)).toEqual({ ...s, eggs: 10 })
})

test('commandes du jour : progression, livraison, ticket à la troisième', () => {
  let s = c.rollDay({ ...c.freshCoop(NOW), lifetime: 5000 }, NOW)
  expect(s.orders.list.length).toBe(3)
  expect(c.rollDay(s, NOW).orders).toBe(s.orders)
  expect(c.claimOrder(s, 0, NOW)).toBe(null)
  s = { ...s, lifetime: 1e12, taps: 1e6, golden: 99, hatched: 99, bought: 999 }
  for (const i of [0, 1, 2]) s = c.claimOrder(s, i, NOW).coop
  expect(s.tickets).toBe(1)
  expect(c.claimOrder(s, 0, NOW)).toBe(null)
  expect(c.validCoop(s)).toBe(true)
})

test('calendrier : série, remise à zéro après un jour manqué, tickets au jour 3', () => {
  let s = c.freshCoop(NOW)
  for (let d = 0; d < 3; d++) s = c.claimCalendar(s, NOW + d * 86400000).coop
  expect(s.calendar.streak).toBe(3)
  expect(s.tickets).toBe(1)
  expect(c.claimCalendar(s, NOW + 2 * 86400000)).toBe(null)
  expect(c.calendarToday(s, NOW + 5 * 86400000).streak).toBe(1)
})

test('collections : bonus quand toute une rareté est réunie', () => {
  const s = { ...c.freshCoop(NOW), buildings: { perch: 10 } }
  const all = { ...s, hens: { cocotte: 1, poulette: 1, grisette: 1, rousse: 1 } }
  expect(Math.abs(c.production(all) / c.production(s) - 1.05) < 1e-9).toBe(true)
})

test('objectif de famille : paliers une fois par semaine', () => {
  let s = c.rollDay({ ...c.freshCoop(NOW), lifetime: 10 }, NOW)
  s = { ...s, lifetime: 20 }
  const r = c.claimFamily(s, 0, 2e6)
  expect(r.tickets).toBe(1)
  expect(c.claimFamily(r.coop, 0, 2e6)).toBe(null)
  expect(c.claimFamily(r.coop, 1, 2e6)).toBe(null)
  expect(c.rollDay(r.coop, NOW + 8 * 86400000).family.claimed).toEqual([])
})

test('événement : poule et décor seulement pendant Noël', () => {
  const dec = Date.UTC(2026, 11, 10)
  const s = { ...c.freshCoop(NOW), eggs: 1e6 }
  expect(c.buySkin(s, 'snow', NOW).skins.includes('snow')).toBe(false)
  expect(c.buySkin(s, 'snow', dec).skins.includes('snow')).toBe(true)
  expect(c.drawHen(0.95, 0.99).id === 'neige').toBe(false)
  expect(c.caughtGolden(s, dec, 0.99, 0.5, 0.1).hen.id).toBe('neige')
})

test('une ancienne sauvegarde du poulailler est mise à niveau', () => {
  const old = { ...c.freshCoop(NOW) }
  for (const key of ['hatched', 'bought', 'bestPps', 'played', 'tickets', 'orders', 'calendar', 'week', 'family']) delete old[key]
  expect(c.validCoop(old)).toBe(false)
  expect(c.validCoop(c.upgradeCoop(old))).toBe(true)
})

test('mondes : portail, monnaie, usine, bonus pour la ferme, hors ligne', async () => {
  const w = await import('./worlds.js')
  let s = { ...c.freshCoop(NOW), eggs: 1e9, buildings: { perch: 10 } }
  expect(w.openPortal(s, 'pole')).toBe(null)
  s = w.openPortal(s, 'island')
  expect(s.eggs).toBe(5e8)
  expect(c.validCoop(s)).toBe(true)
  s = w.tapWorld(s, 'island', 10)
  s = w.buyWorldBuildings(s, 'island', 'shell-beach', 1)
  expect(w.worldPps(s, 'island') > 0).toBe(true)
  const before = w.worldPps(s, 'island')
  s = { ...s, worlds: { island: { ...s.worlds.island, amount: 1e9, lifetime: 1e9, buildings: { ...s.worlds.island.buildings, 'shell-factory': 4 } } } }
  expect(Math.abs(w.worldPps(s, 'island') / before - 1.2) < 1e-9).toBe(true)
  const t = c.tick(s, 10, NOW)
  expect(t.worlds.island.amount > s.worlds.island.amount).toBe(true)
  const big = { ...s, worlds: { island: { ...s.worlds.island, lifetime: 2e9 } } }
  expect(c.production(big) > c.production({ ...s, worlds: {} })).toBe(true)
  expect(c.validCoop({ ...s, world: 'island' })).toBe(true)
  expect(c.validCoop({ ...s, world: 'pole' })).toBe(false)
})

test('une vraie session reste toujours sauvegardable (ticks fractionnaires, achats, déménagement)', async () => {
  const w = await import('./worlds.js')
  let s = c.rollDay(c.freshCoop(NOW), NOW)
  let now = NOW
  for (let step = 0; step < 4000; step++) {
    now += 250
    s = c.tick(s, 0.25 + (step % 7) * 0.013, now)
    s = c.tap(s, 1 + (step % 3), now, [0.5])
    if (step % 10 === 0) for (const id of ['nest', 'straw', 'perch', 'waterer']) s = c.buyBuildings(s, id, 'max')
    if (step === 2000) s = { ...s, eggs: s.eggs + 2e9, lifetime: s.lifetime + 9e9, total: s.total + 9e9 }
    if (step === 2001) s = w.openPortal(s, 'island') ?? s
    if (step === 2500) s = c.moveHouse(s).coop
    s = c.refresh(c.rollDay(s, now)).coop
    expect(c.validCoop(s)).toBe(true)
  }
  expect(s.moves).toBe(1)
})

test('déménagement : les poules s’installent, leurs bonus reviennent peu à peu', () => {
  const base = { ...c.freshCoop(NOW), buildings: { perch: 10 }, hens: { fermiere: 5 }, equipped: ['fermiere'] }
  const full = c.production(base)
  const moved = c.moveHouse({ ...base, lifetime: 8e9, total: 8e9 }).coop
  expect(c.settling(moved)).toBe(0)
  const plain = c.production({ ...moved, buildings: { perch: 10 }, equipped: [] })
  expect(c.production({ ...moved, buildings: { perch: 10 } })).toBe(plain)
  expect(c.settling({ ...moved, total: 4e8 })).toBe(0.5)
  expect(c.settling({ ...moved, total: 8e8 })).toBe(1)
  expect(full > 0).toBe(true)
})
