import {
  BUILDING_REVEAL,
  BUILDINGS,
  COOP_SKINS,
  COOP_UPGRADES,
  COST_GROWTH,
  DUPLICATE_SECONDS,
  FEATHER_BASE,
  FEATHER_BONUS,
  FRENZY_MULTIPLIER,
  FRENZY_SECONDS,
  GOLDEN_REWARDS,
  HATCH_FLOOR,
  HATCH_SECONDS,
  HEN_LEVEL_STEP,
  HEN_MAX_LEVEL,
  HEN_RARITIES,
  HEN_SLOTS,
  MARKET_DAILY_CAP,
  MARKET_FLOOR,
  MARKET_SECONDS_PER_TOKEN,
  MILESTONES,
  OFFLINE_CAP,
  OFFLINE_SHARE,
  PERKS,
  RAIN_SECONDS,
  SPECIAL_HENS,
  TROPHIES,
  TROPHY_BONUS,
  UNLOCKS,
} from '../config/coop.js'

/** Pure rules of the coop. State is plain data; every function returns a new state. */

const byId = (list) => new Map(list.map((item) => [item.id, item]))
const BUILDING = byId(BUILDINGS)
const UPGRADE = byId(COOP_UPGRADES)
const HEN = byId(SPECIAL_HENS)
const SKIN = byId(COOP_SKINS)
const PERK = byId(PERKS)
const TROPHY = byId(TROPHIES)

export const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10)

/** The part of a move that a move resets. */
function freshRun(perks = []) {
  const memory = perks.includes('nest-memory')
  return {
    eggs: 0,
    total: 0,
    buildings: memory ? { nest: 10, perch: 5 } : {},
    upgrades: [],
    frenzyUntil: 0,
    rainUntil: 0,
  }
}

export function freshCoop(now = 0) {
  return {
    ...freshRun(),
    lifetime: 0,
    taps: 0,
    revealed: [],
    hens: {},
    equipped: [],
    skins: ['classic', 'farm'],
    skin: { hen: 'classic', decor: 'farm' },
    trophies: [],
    golden: 0,
    moves: 0,
    feathers: 0,
    perks: [],
    market: { day: dayOf(now), sold: 0 },
    seen: now,
  }
}

const has = (coop, perk) => coop.perks.includes(perk)
export const henSlots = (coop) => HEN_SLOTS + (has(coop, 'fourth-slot') ? 1 : 0)

export function validCoop(value) {
  if (!value || typeof value !== 'object') return false
  const num = (n) => Number.isFinite(n) && n >= 0
  const int = (n, max = 1e9) => Number.isInteger(n) && n >= 0 && n <= max
  if (![value.eggs, value.total, value.lifetime, value.frenzyUntil, value.rainUntil, value.seen].every(num)) return false
  if (value.total > value.lifetime * (1 + 1e-9) + 1) return false
  if (![value.taps, value.golden, value.moves, value.feathers].every((n) => int(n))) return false
  const isMap = (m) => Boolean(m) && typeof m === 'object' && !Array.isArray(m)
  if (!isMap(value.buildings) || !isMap(value.hens)) return false
  for (const [id, n] of Object.entries(value.buildings)) if (!BUILDING.has(id) || !int(n, 10000)) return false
  for (const [id, n] of Object.entries(value.hens)) if (!HEN.has(id) || !int(n, HEN_MAX_LEVEL) || n < 1) return false
  const listOk = (list, known) =>
    Array.isArray(list) && list.length <= known.size && new Set(list).size === list.length && list.every((id) => known.has(id))
  if (!listOk(value.upgrades, UPGRADE) || !listOk(value.revealed, BUILDING) || !listOk(value.skins, SKIN)) return false
  if (!listOk(value.trophies, TROPHY) || !listOk(value.perks, PERK)) return false
  if (value.perks.reduce((acc, id) => acc + PERK.get(id).cost, 0) > value.feathers) return false
  if (!listOk(value.equipped, HEN) || value.equipped.length > henSlots(value) || !value.equipped.every((id) => value.hens[id])) return false
  const { skin } = value
  if (!skin || !value.skins.includes(skin.hen) || !value.skins.includes(skin.decor)) return false
  if (SKIN.get(skin.hen).kind !== 'hen' || SKIN.get(skin.decor).kind !== 'decor') return false
  const m = value.market
  return isMap(m) && typeof m.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.day) && int(m.sold, MARKET_DAILY_CAP)
}

/* ---------- What is shown: the coop opens up step by step ---------- */

export const unlocked = (coop, part) => coop.lifetime >= UNLOCKS[part] || (part === 'prestige' && coop.moves > 0)

export const owned = (coop, id) => coop.buildings[id] ?? 0

export const buildingCost = (id, count) => Math.ceil(BUILDING.get(id).cost * COST_GROWTH ** count)

/** Buildings to show: the ones revealed, plus the next one as a mystery. */
export function visibleBuildings(coop) {
  const shown = BUILDINGS.filter((b) => coop.revealed.includes(b.id) || owned(coop, b.id) > 0)
  const next = BUILDINGS.find((b) => !shown.includes(b))
  return { shown, next: next ?? null }
}

/* ---------- Bonuses ---------- */

/** Bonuses of equipped hens, scaled by their level. */
function henBonuses(coop) {
  return coop.equipped.map((id) => {
    const scale = 1 + HEN_LEVEL_STEP * ((coop.hens[id] ?? 1) - 1)
    const bonus = {}
    for (const [key, value] of Object.entries(HEN.get(id).bonus)) {
      bonus[key] = typeof value === 'number' ? value * scale : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v * scale]))
    }
    return bonus
  })
}
const sum = (bonuses, key) => bonuses.reduce((acc, bonus) => acc + (bonus[key] ?? 0), 0)

/** Effective bonus of one hen at its level, for display. */
export function henScale(coop, id) {
  return 1 + HEN_LEVEL_STEP * ((coop.hens[id] ?? 1) - 1)
}

export const milestoneCount = (count) => MILESTONES.filter((m) => count >= m).length
/** Level of a building (1 to 5): one more per milestone reached. */
export const buildingLevel = (count) => 1 + milestoneCount(count)

export function buildingPps(coop, id) {
  const count = owned(coop, id)
  if (!count) return 0
  let mult = 2 ** milestoneCount(count)
  for (const upgradeId of coop.upgrades) if (UPGRADE.get(upgradeId).building === id) mult *= 2
  mult *= 1 + henBonuses(coop).reduce((acc, bonus) => acc + (bonus.buildings?.[id] ?? 0), 0)
  return BUILDING.get(id).pps * count * mult
}

/** Global multiplier: hens, trophies and golden feathers. */
export function globalMultiplier(coop) {
  return (1 + sum(henBonuses(coop), 'production')) * (1 + TROPHY_BONUS * coop.trophies.length) * (1 + FEATHER_BONUS * coop.feathers)
}

/** Production per second, without the temporary frenzy. */
export function production(coop) {
  return BUILDINGS.reduce((acc, b) => acc + buildingPps(coop, b.id), 0) * globalMultiplier(coop)
}

export const eventMultiplier = (coop, now) => (now < coop.frenzyUntil ? FRENZY_MULTIPLIER : 1)

export function tapValue(coop, now = 0, { lucky = false } = {}) {
  let mult = has(coop, 'gold-fingers') ? 3 : 1
  let share = 0
  for (const id of coop.upgrades) {
    const upgrade = UPGRADE.get(id)
    if (upgrade.tap) mult *= upgrade.tap
    if (upgrade.tapPps) share += upgrade.tapPps
  }
  mult *= 1 + sum(henBonuses(coop), 'tap')
  const value = (mult + production(coop) * share) * eventMultiplier(coop, now)
  return lucky ? value * 50 : value
}

export const goldenTapChance = (coop) => sum(henBonuses(coop), 'goldenTap')
export const goldenSpeed = (coop) => (1 + sum(henBonuses(coop), 'golden')) * (has(coop, 'golden-eye') ? 1.5 : 1)
export const frenzySeconds = (coop) => FRENZY_SECONDS + sum(henBonuses(coop), 'frenzy') + (has(coop, 'long-frenzy') ? 15 : 0)
export const offlineCap = (coop) => (has(coop, 'light-sleep') ? 12 * 3600 : OFFLINE_CAP)
export const offlineShare = (coop) => OFFLINE_SHARE + sum(henBonuses(coop), 'offline') + (has(coop, 'light-sleep') ? 0.1 : 0)

/* ---------- Earning ---------- */

const gain = (coop, eggs) => ({ ...coop, eggs: coop.eggs + eggs, total: coop.total + eggs, lifetime: coop.lifetime + eggs })

/** `n` taps at `now`; `rolls` are random numbers in [0,1) for lucky taps (injectable for tests). */
export function tap(coop, n, now, rolls = []) {
  const count = Math.max(0, Math.floor(n))
  const chance = goldenTapChance(coop)
  let earned = 0
  for (let i = 0; i < count; i += 1) earned += tapValue(coop, now, { lucky: chance > 0 && (rolls[i] ?? 1) < chance })
  return { ...gain(coop, earned), taps: coop.taps + count }
}

/** Production over the `seconds` before `now`, honouring the frenzy window. */
export function tick(coop, seconds, now) {
  if (seconds <= 0) return coop
  const boosted = Math.max(0, Math.min(now, coop.frenzyUntil) - Math.max(now - seconds * 1000, 0)) / 1000
  return gain(coop, production(coop) * (seconds + boosted * (FRENZY_MULTIPLIER - 1)))
}

export function offlineGain(coop, seconds) {
  return production(coop) * Math.min(Math.max(0, seconds), offlineCap(coop)) * offlineShare(coop)
}

/* ---------- Spending ---------- */

export const canBuyBuilding = (coop, id) => BUILDING.has(id) && coop.eggs >= buildingCost(id, owned(coop, id))

export function buyBuilding(coop, id) {
  if (!canBuyBuilding(coop, id)) return coop
  return { ...coop, eggs: coop.eggs - buildingCost(id, owned(coop, id)), buildings: { ...coop.buildings, [id]: owned(coop, id) + 1 } }
}

export function upgradeAvailable(coop, upgrade) {
  if (coop.upgrades.includes(upgrade.id)) return false
  return !upgrade.building || owned(coop, upgrade.building) >= upgrade.owned
}

/** Upgrades worth showing: available ones, cheapest first. */
export const shopUpgrades = (coop) => COOP_UPGRADES.filter((u) => upgradeAvailable(coop, u)).sort((a, b) => a.cost - b.cost)

export function buyUpgrade(coop, id) {
  const upgrade = UPGRADE.get(id)
  if (!upgrade || !upgradeAvailable(coop, upgrade) || coop.eggs < upgrade.cost) return coop
  return { ...coop, eggs: coop.eggs - upgrade.cost, upgrades: [...coop.upgrades, id] }
}

export function buySkin(coop, id) {
  const skin = SKIN.get(id)
  if (!skin || coop.skins.includes(id) || coop.eggs < skin.cost) return coop
  return { ...coop, eggs: coop.eggs - skin.cost, skins: [...coop.skins, id] }
}

export function wearSkin(coop, id) {
  const skin = SKIN.get(id)
  if (!skin || !coop.skins.includes(id)) return coop
  return { ...coop, skin: { ...coop.skin, [skin.kind]: id } }
}

export function equipHen(coop, id) {
  if (!coop.hens[id] || coop.equipped.includes(id) || coop.equipped.length >= henSlots(coop)) return coop
  return { ...coop, equipped: [...coop.equipped, id] }
}

export const unequipHen = (coop, id) => ({ ...coop, equipped: coop.equipped.filter((hen) => hen !== id) })

/* ---------- Hens ---------- */

function pick(items, roll, weightOf) {
  const total = items.reduce((acc, item) => acc + weightOf(item), 0)
  let cursor = roll * total
  for (const item of items) {
    cursor -= weightOf(item)
    if (cursor < 0) return item
  }
  return items[items.length - 1]
}

export function drawHen(rollRarity, rollHen) {
  const rarity = pick(HEN_RARITIES, rollRarity, (r) => r.chance)
  const pool = SPECIAL_HENS.filter((hen) => hen.rarity === rarity.id)
  return pool[Math.min(pool.length - 1, Math.floor(rollHen * pool.length))]
}

/** A hen won: new joins at level 1, a duplicate levels it up, a maxed one turns into eggs. */
export function receiveHen(coop, hen) {
  const level = coop.hens[hen.id] ?? 0
  if (level < HEN_MAX_LEVEL) {
    return { coop: { ...coop, hens: { ...coop.hens, [hen.id]: level + 1 } }, fresh: level === 0, level: level + 1, eggs: 0 }
  }
  const eggs = production(coop) * DUPLICATE_SECONDS
  return { coop: gain(coop, eggs), fresh: false, level, eggs }
}

export const hatchCost = (coop) =>
  Math.ceil(Math.max(HATCH_FLOOR, production(coop) * HATCH_SECONDS) * (has(coop, 'cheap-hatch') ? 0.7 : 1))

export function hatch(coop, rollRarity, rollHen) {
  const cost = hatchCost(coop)
  if (coop.eggs < cost) return null
  const hen = drawHen(rollRarity, rollHen)
  return { ...receiveHen({ ...coop, eggs: coop.eggs - cost }, hen), hen }
}

export function caughtGolden(coop, now, roll, rollRarity, rollHen) {
  const counted = { ...coop, golden: coop.golden + 1 }
  const reward = pick(GOLDEN_REWARDS, roll, (r) => r.weight)
  if (reward.id === 'frenzy') {
    return { coop: { ...counted, frenzyUntil: Math.max(coop.frenzyUntil, now) + frenzySeconds(coop) * 1000 }, reward: 'frenzy' }
  }
  if (reward.id === 'rain') {
    const eggs = production(coop) * RAIN_SECONDS + tapValue(coop) * 100
    return { coop: gain(counted, eggs), reward: 'rain', eggs }
  }
  const hen = drawHen(rollRarity, rollHen)
  return { ...receiveHen(counted, hen), reward: 'hen', hen }
}

/* ---------- Trophies and reveals ---------- */

function statOf(coop, stat) {
  if (stat.startsWith('building:')) return owned(coop, stat.slice(9))
  if (stat === 'hens') return Object.keys(coop.hens).length
  if (stat === 'henMax') return Object.values(coop.hens).some((level) => level >= HEN_MAX_LEVEL) ? 1 : 0
  return coop[stat] ?? 0
}

export const trophyProgress = (coop, trophy) => Math.min(1, statOf(coop, trophy.stat) / trophy.at)

/** Adds newly earned trophies and newly revealed buildings; returns what is new. */
export function refresh(coop) {
  const earned = TROPHIES.filter((t) => !coop.trophies.includes(t.id) && statOf(coop, t.stat) >= t.at)
  const revealed = BUILDINGS.filter(
    (b) => !coop.revealed.includes(b.id) && (owned(coop, b.id) > 0 || coop.eggs >= b.cost * BUILDING_REVEAL),
  )
  if (!earned.length && !revealed.length) return { coop, trophies: [] }
  return {
    coop: {
      ...coop,
      trophies: [...coop.trophies, ...earned.map((t) => t.id)],
      revealed: [...coop.revealed, ...revealed.map((b) => b.id)],
    },
    trophies: earned,
  }
}

/* ---------- Moving house (prestige) ---------- */

export const feathersFor = (lifetime) => Math.floor(Math.cbrt(lifetime / FEATHER_BASE))
export const featherGain = (coop) => Math.max(0, feathersFor(coop.lifetime) - coop.feathers)
export const freeFeathers = (coop) => coop.feathers - coop.perks.reduce((acc, id) => acc + PERK.get(id).cost, 0)

/** Eggs laid in all moves needed for the next feather. */
export const nextFeatherAt = (coop) => (feathersFor(coop.lifetime) + 1) ** 3 * FEATHER_BASE

export function moveHouse(coop) {
  const gained = featherGain(coop)
  if (gained < 1) return null
  const feathers = coop.feathers + gained
  const moved = { ...coop, ...freshRun(coop.perks), feathers, moves: coop.moves + 1 }
  return { coop: refresh(moved).coop, gained }
}

export function buyPerk(coop, id) {
  const perk = PERK.get(id)
  if (!perk || has(coop, id) || freeFeathers(coop) < perk.cost) return coop
  const next = { ...coop, perks: [...coop.perks, id] }
  if (id === 'nest-memory') {
    next.buildings = { ...coop.buildings, nest: Math.max(10, owned(coop, 'nest')), perch: Math.max(5, owned(coop, 'perch')) }
  }
  return next
}

/* ---------- Egg market ---------- */

export function eggsPerToken(coop) {
  const discount = Math.min(0.5, sum(henBonuses(coop), 'market')) + (has(coop, 'haggler') ? 0.25 : 0)
  return Math.ceil(Math.max(MARKET_FLOOR, production(coop) * MARKET_SECONDS_PER_TOKEN) * (1 - Math.min(0.6, discount)))
}

const marketOf = (coop, now) => (coop.market.day === dayOf(now) ? coop.market : { day: dayOf(now), sold: 0 })

export const marketLeft = (coop, now) => MARKET_DAILY_CAP - marketOf(coop, now).sold

/** Sells eggs for tokens (cents): never above the daily cap, always whole cents. */
export function sellEggs(coop, now, wantedCents = Infinity) {
  const market = marketOf(coop, now)
  const perCent = eggsPerToken(coop) / 100
  const cents = Math.max(0, Math.min(wantedCents, Math.floor(coop.eggs / perCent), MARKET_DAILY_CAP - market.sold))
  if (cents <= 0) return { coop: { ...coop, market }, cents: 0 }
  return { coop: { ...coop, eggs: coop.eggs - cents * perCent, market: { day: market.day, sold: market.sold + cents } }, cents }
}
