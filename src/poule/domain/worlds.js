import { FEATHER_BONUS, MILESTONES } from '../config/coop.js'
import {
  FACTORY_BOOST,
  PORTAL_GIFT,
  WORLD_COST_GROWTH,
  WORLD_FARM_BONUS,
  WORLD_TAP_SHARE,
  WORLDS,
  worldById,
} from '../config/worlds.js'
import { worldHenBonus } from './coop.js'

/** Pure rules of the worlds beyond the farm. `coop.worlds` maps an opened world to { amount, lifetime, buildings }. */

const freshWorld = () => ({ amount: PORTAL_GIFT, lifetime: PORTAL_GIFT, buildings: {} })

export const isOpen = (coop, id) => Boolean(coop.worlds?.[id])

/** The next world to open (in order), or null. */
export const nextWorld = (coop) => WORLDS.find((world) => !isOpen(coop, world.id)) ?? null

export function validWorlds(worlds) {
  if (!worlds || typeof worlds !== 'object' || Array.isArray(worlds)) return false
  return Object.entries(worlds).every(([id, w]) => {
    const world = worldById(id)
    if (!world || !w || typeof w !== 'object') return false
    if (![w.amount, w.lifetime].every((n) => Number.isFinite(n) && n >= 0) || w.amount > w.lifetime * (1 + 1e-9) + 1) return false
    if (!w.buildings || typeof w.buildings !== 'object') return false
    return Object.entries(w.buildings).every(
      ([bid, n]) => world.buildings.some((b) => b.id === bid) && Number.isInteger(n) && n >= 0 && n <= 10000,
    )
  })
}

/** Opens a world's portal: needs the one before it opened, costs eggs. */
export function openPortal(coop, id) {
  const index = WORLDS.findIndex((world) => world.id === id)
  if (index < 0 || isOpen(coop, id) || (index > 0 && !isOpen(coop, WORLDS[index - 1].id))) return null
  const cost = WORLDS[index].portal
  if (coop.eggs < cost) return null
  return { ...coop, eggs: coop.eggs - cost, worlds: { ...coop.worlds, [id]: freshWorld() } }
}

export const worldOwned = (coop, id, bid) => coop.worlds[id]?.buildings[bid] ?? 0

export const worldCost = (world, building, count, n = 1) => {
  const base = building.cost * WORLD_COST_GROWTH ** count
  return Math.ceil((base * (WORLD_COST_GROWTH ** n - 1)) / (WORLD_COST_GROWTH - 1))
}

/** Share the world's factories add to its production. */
export const factoryBoost = (coop, id) =>
  worldById(id).buildings.filter((b) => b.factory).reduce((acc, b) => acc + worldOwned(coop, id, b.id) * FACTORY_BOOST, 0)

/** Production per second of one building of a world (milestones, factories, feathers). */
export function worldBuildingPps(coop, id, building) {
  const count = worldOwned(coop, id, building.id)
  if (!count || building.factory) return 0
  const milestones = MILESTONES.filter((m) => count >= m).length
  return building.pps * count * 2 ** milestones * (1 + factoryBoost(coop, id) + worldHenBonus(coop, id)) * (1 + FEATHER_BONUS * coop.feathers)
}

export const worldPps = (coop, id) =>
  isOpen(coop, id) ? worldById(id).buildings.reduce((acc, b) => acc + worldBuildingPps(coop, id, b), 0) : 0

export const worldTapValue = (coop, id) => 1 + worldPps(coop, id) * WORLD_TAP_SHARE

const add = (coop, id, amount) => {
  const w = coop.worlds[id]
  return { ...coop, worlds: { ...coop.worlds, [id]: { ...w, amount: w.amount + amount, lifetime: w.lifetime + amount } } }
}

export const tapWorld = (coop, id, n, share = 1) =>
  isOpen(coop, id) ? add(coop, id, worldTapValue(coop, id) * Math.max(0, Math.floor(n)) * share) : coop

/** Every opened world produces for `seconds` (times `share`, for the time away). */
export function advanceWorlds(coop, seconds, share = 1) {
  let next = coop
  for (const id of Object.keys(coop.worlds ?? {})) {
    const pps = worldPps(coop, id)
    if (pps > 0) next = add(next, id, pps * seconds * share)
  }
  return next
}

/** Buys `n` buildings of a world ('max': as many as affordable). */
export function buyWorldBuildings(coop, id, bid, n) {
  const world = worldById(id)
  const building = world?.buildings.find((b) => b.id === bid)
  if (!building || !isOpen(coop, id)) return coop
  const owned = worldOwned(coop, id, bid)
  const amount = coop.worlds[id].amount
  let count = n
  if (n === 'max') {
    count = 0
    while (count < 10000 && worldCost(world, building, owned, count + 1) <= amount) count++
  }
  if (!(count >= 1)) return coop
  const cost = worldCost(world, building, owned, count)
  if (cost > amount) return coop
  const w = coop.worlds[id]
  return {
    ...coop,
    bought: coop.bought + count,
    worlds: { ...coop.worlds, [id]: { ...w, amount: w.amount - cost, buildings: { ...w.buildings, [bid]: owned + count } } },
  }
}

/** What one world adds to the farm's production. */
export const worldFarmBonus = (coop, id) => (isOpen(coop, id) ? WORLD_FARM_BONUS * Math.log10(1 + coop.worlds[id].lifetime) : 0)
export const worldsFarmBonus = (coop) => WORLDS.reduce((acc, world) => acc + worldFarmBonus(coop, world.id), 0)

/** A building of a world shows once its world holds half its price (or owns it); plus the next as a mystery. */
export function visibleWorldBuildings(coop, id) {
  const world = worldById(id)
  const w = coop.worlds[id]
  const shown = world.buildings.filter((b, i) => i === 0 || worldOwned(coop, id, b.id) > 0 || w.lifetime >= b.cost / 2)
  return { shown, next: world.buildings.find((b) => !shown.includes(b)) ?? null }
}
