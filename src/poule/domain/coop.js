import {
  BUILDING_REVEAL,
  BUILDINGS,
  CALENDAR,
  CALENDAR_FLOOR,
  COLLECTION_BONUS,
  COOP_EVENTS,
  FAMILY_TIERS,
  ORDER_KINDS,
  ORDER_REWARD_FLOOR,
  ORDER_REWARD_SECONDS,
  ORDERS_PER_DAY,
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
    ...LATER_FIELDS(),
  }
}

/** Fields added after the first version of the coop, with their defaults. */
const LATER_FIELDS = () => ({
  hatched: 0,
  bought: 0,
  bestPps: 0,
  played: 0,
  tickets: 0,
  orders: null,
  calendar: { last: null, streak: 0 },
  week: { id: '', start: 0 },
  family: { week: '', claimed: [] },
})

/** A saved coop from an older version, with the fields added since. */
export function upgradeCoop(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
  return { ...LATER_FIELDS(), ...raw }
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
  const day = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
  if (!(isMap(m) && day(m.day) && int(m.sold, MARKET_DAILY_CAP))) return false
  if (![value.hatched, value.bought, value.played, value.tickets].every((n) => int(n, 1e12)) || !num(value.bestPps)) return false
  const cal = value.calendar
  if (!isMap(cal) || !(cal.last === null || day(cal.last)) || !int(cal.streak, 1e6)) return false
  const week = value.week
  if (!isMap(week) || typeof week.id !== 'string' || week.id.length > 10 || !num(week.start) || week.start > value.lifetime) return false
  const fam = value.family
  if (!isMap(fam) || typeof fam.week !== 'string' || !Array.isArray(fam.claimed) || fam.claimed.length > FAMILY_TIERS.length) return false
  if (!fam.claimed.every((i) => int(i, FAMILY_TIERS.length - 1))) return false
  const o = value.orders
  if (o === null) return true
  return (
    isMap(o) && day(o.day) && Array.isArray(o.list) && o.list.length <= ORDERS_PER_DAY &&
    o.list.every((order) => isMap(order) && ORDER_KINDS.some((k) => k.id === order.kind) && num(order.goal)) &&
    isMap(o.base) && Object.values(o.base).every(num) &&
    Array.isArray(o.claimed) && o.claimed.every((i) => int(i, ORDERS_PER_DAY - 1))
  )
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
  return (
    (1 + sum(henBonuses(coop), 'production')) *
    (1 + TROPHY_BONUS * coop.trophies.length) *
    (1 + FEATHER_BONUS * coop.feathers) *
    (1 + collectionBonus(coop))
  )
}

/** Hen collections, by rarity: done when every hen of it (event hens aside) is owned. */
export function collections(coop) {
  return HEN_RARITIES.map((rarity) => {
    const hens = SPECIAL_HENS.filter((hen) => hen.rarity === rarity.id && !hen.event)
    const got = hens.filter((hen) => coop.hens[hen.id]).length
    return { ...rarity, got, total: hens.length, done: got === hens.length, bonus: COLLECTION_BONUS[rarity.id] }
  })
}
export const collectionBonus = (coop) => collections(coop).reduce((acc, c) => acc + (c.done ? c.bonus : 0), 0)

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
  const rate = production(coop)
  const grown = gain(coop, rate * (seconds + boosted * (FRENZY_MULTIPLIER - 1)))
  return { ...grown, played: coop.played + seconds, bestPps: Math.max(coop.bestPps, rate * eventMultiplier(coop, now)) }
}

export function offlineGain(coop, seconds) {
  return production(coop) * Math.min(Math.max(0, seconds), offlineCap(coop)) * offlineShare(coop)
}

/* ---------- Spending ---------- */

export const canBuyBuilding = (coop, id) => BUILDING.has(id) && coop.eggs >= buildingCost(id, owned(coop, id))

export function buyBuilding(coop, id) {
  return buyBuildings(coop, id, 1)
}

/** Price of the next `n` copies of a building. */
export function buildingCostN(id, count, n) {
  const base = BUILDING.get(id).cost * COST_GROWTH ** count
  return Math.ceil((base * (COST_GROWTH ** n - 1)) / (COST_GROWTH - 1))
}

/** How many copies the eggs in hand can buy (at most `cap`). */
export function affordable(coop, id, cap = 10000) {
  const base = BUILDING.get(id).cost * COST_GROWTH ** owned(coop, id)
  const n = Math.floor(Math.log((coop.eggs * (COST_GROWTH - 1)) / base + 1) / Math.log(COST_GROWTH))
  let fit = Math.max(0, Math.min(cap, n))
  while (fit > 0 && buildingCostN(id, owned(coop, id), fit) > coop.eggs) fit--
  return fit
}

/** Buys `n` copies at once ('max': as many as affordable); nothing when the eggs fall short. */
export function buyBuildings(coop, id, n) {
  if (!BUILDING.has(id)) return coop
  const count = n === 'max' ? affordable(coop, id) : n
  if (!(count >= 1)) return coop
  const cost = buildingCostN(id, owned(coop, id), count)
  if (cost > coop.eggs) return coop
  return {
    ...coop,
    eggs: coop.eggs - cost,
    bought: coop.bought + count,
    buildings: { ...coop.buildings, [id]: owned(coop, id) + count },
  }
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

export function buySkin(coop, id, now = Date.now()) {
  const skin = SKIN.get(id)
  if (!skin || coop.skins.includes(id) || coop.eggs < skin.cost) return coop
  if (skin.event && activeEvent(now)?.id !== skin.event) return coop
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
  const pool = SPECIAL_HENS.filter((hen) => hen.rarity === rarity.id && !hen.event)
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

/** Hatches an egg: with a ticket when there is one, else for eggs. */
export function hatch(coop, rollRarity, rollHen) {
  const cost = hatchCost(coop)
  const ticket = coop.tickets > 0
  if (!ticket && coop.eggs < cost) return null
  const hen = drawHen(rollRarity, rollHen)
  const paid = ticket ? { ...coop, tickets: coop.tickets - 1 } : { ...coop, eggs: coop.eggs - cost }
  return { ...receiveHen({ ...paid, hatched: coop.hatched + 1 }, hen), hen, ticket }
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
  const event = activeEvent(now)
  const hen = event && rollHen < 0.3 ? SPECIAL_HENS.find((h) => h.id === event.hen) : drawHen(rollRarity, rollHen)
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

/* ---------- Events ---------- */

export const activeEvent = (now) => {
  const day = dayOf(now)
  return COOP_EVENTS.find((event) => day >= event.from && day <= event.to) ?? null
}

/* ---------- Days and weeks ---------- */

/** Monday (UTC) of the week of `now`, as "YYYY-MM-DD". */
export function weekOf(now) {
  const date = new Date(now)
  const back = (date.getUTCDay() + 6) % 7
  return dayOf(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - back))
}

const hash = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

const statsOf = (coop) => ({ lifetime: coop.lifetime, taps: coop.taps, golden: coop.golden, hatched: coop.hatched, bought: coop.bought })

/** The day's orders: picked from the date among the kinds the coop has opened, goals set from its production. */
export function makeOrders(coop, now) {
  const day = dayOf(now)
  const kinds = ORDER_KINDS.filter((kind) => !kind.needs || unlocked(coop, kind.needs))
  const pool = [...kinds]
  const list = []
  let seed = hash(day)
  while (list.length < ORDERS_PER_DAY && pool.length) {
    const kind = pool.splice(seed % pool.length, 1)[0]
    seed = hash(`${seed}`)
    const goal = kind.seconds ? Math.max(kind.floor, Math.round(production(coop) * kind.seconds)) : kind.goal
    list.push({ kind: kind.id, goal })
  }
  return { day, list, base: statsOf(coop), claimed: [] }
}

/** New day: new orders. New week: the week's egg count starts over. */
export function rollDay(coop, now) {
  let next = coop
  if (next.orders?.day !== dayOf(now)) next = { ...next, orders: makeOrders(next, now) }
  if (next.week.id !== weekOf(now)) next = { ...next, week: { id: weekOf(now), start: next.lifetime } }
  if (next.family.week !== weekOf(now)) next = { ...next, family: { week: weekOf(now), claimed: [] } }
  return next
}

export const weekEggs = (coop) => Math.max(0, coop.lifetime - coop.week.start)

export function orderProgress(coop, order) {
  const kind = ORDER_KINDS.find((k) => k.id === order.kind)
  const done = statsOf(coop)[kind.stat] - (coop.orders.base[kind.stat] ?? 0)
  return { label: kind.label(order.goal), done: Math.min(order.goal, Math.max(0, done)), goal: order.goal }
}

export const orderReward = (coop) => Math.max(ORDER_REWARD_FLOOR, production(coop) * ORDER_REWARD_SECONDS)

/** Collects a finished order. The third one adds a ticket (and, during an event, its hen). */
export function claimOrder(coop, index, now) {
  const order = coop.orders?.list[index]
  if (!order || coop.orders.claimed.includes(index)) return null
  const progress = orderProgress(coop, order)
  if (progress.done < progress.goal) return null
  const eggs = orderReward(coop)
  let next = gain({ ...coop, orders: { ...coop.orders, claimed: [...coop.orders.claimed, index] } }, eggs)
  const all = next.orders.claimed.length === next.orders.list.length
  let hen = null
  if (all) {
    next = { ...next, tickets: next.tickets + 1 }
    const event = activeEvent(now)
    if (event) {
      hen = SPECIAL_HENS.find((h) => h.id === event.hen)
      next = receiveHen(next, hen).coop
    }
  }
  return { coop: next, eggs, ticket: all, hen }
}

/** The calendar of the day: which day of the 7 it would pay, or null once collected today. */
export function calendarToday(coop, now) {
  const today = dayOf(now)
  if (coop.calendar.last === today) return null
  const yesterday = dayOf(now - 86_400_000)
  const streak = coop.calendar.last === yesterday ? coop.calendar.streak + 1 : 1
  return { streak, ...CALENDAR[(streak - 1) % CALENDAR.length] }
}

export function claimCalendar(coop, now) {
  const step = calendarToday(coop, now)
  if (!step) return null
  const eggs = Math.max(CALENDAR_FLOOR * step.day, production(coop) * step.seconds)
  const next = gain({ ...coop, calendar: { last: dayOf(now), streak: step.streak }, tickets: coop.tickets + (step.tickets ?? 0) }, eggs)
  return { coop: next, eggs, day: step.day, tickets: step.tickets ?? 0 }
}

/** Family goal steps for `familyEggs` laid this week by the family: reached, and collected by this player. */
export function familySteps(coop, familyEggs) {
  return FAMILY_TIERS.map((tier, index) => ({
    ...tier,
    index,
    reached: familyEggs >= tier.eggs,
    claimed: coop.family.claimed.includes(index),
  }))
}

/** Collects a reached step of the family goal, once a week; needs eggs laid this week. */
export function claimFamily(coop, index, familyEggs) {
  const step = familySteps(coop, familyEggs)[index]
  if (!step || !step.reached || step.claimed || weekEggs(coop) <= 0) return null
  return {
    coop: { ...coop, tickets: coop.tickets + step.tickets, family: { ...coop.family, claimed: [...coop.family.claimed, index] } },
    tickets: step.tickets,
  }
}
