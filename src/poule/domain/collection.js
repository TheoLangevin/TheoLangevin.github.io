import { BOX_PRICE, RARITIES, SETS } from '../config/collection.js'
import { UPGRADES } from '../config/upgrades.js'

/** Cosmetics that count in the collection: anything worn, perks aside. */
export const COLLECTIBLES = UPGRADES.filter((item) => item.slot !== 'perk')

export const rarityOf = (item) => RARITIES.find((rarity) => (item.cost ?? Infinity) < rarity.below) ?? RARITIES.at(-1)

/** Completion: overall and by set. */
export function collectionStatus(owned, claimedSets = []) {
  const have = new Set(owned)
  return {
    owned: COLLECTIBLES.filter((item) => have.has(item.id)).length,
    total: COLLECTIBLES.length,
    sets: SETS.map((set) => ({
      ...set,
      have: set.items.filter((id) => have.has(id)).length,
      claimed: claimedSets.includes(set.id),
    })),
  }
}

/** What the box can give: buyable cosmetics not owned (no exclusive, no secret, no limited). */
export const boxPool = (owned) =>
  COLLECTIBLES.filter((item) => !item.exclusive && !item.secret && !item.limited && !owned.includes(item.id))

/**
 * Draws a box: first a rarity by its chance (among rarities left in the pool,
 * chances scaled up), then an item of it. `rng` returns [0, 1).
 */
export function drawBox(owned, rng) {
  const pool = boxPool(owned)
  if (pool.length === 0) return null
  const left = RARITIES.filter((rarity) => pool.some((item) => rarityOf(item).id === rarity.id))
  const total = left.reduce((sum, rarity) => sum + rarity.chance, 0)
  let pick = rng() * total
  let rarity = left.at(-1)
  for (const entry of left) {
    pick -= entry.chance
    if (pick < 0) {
      rarity = entry
      break
    }
  }
  const items = pool.filter((item) => rarityOf(item).id === rarity.id)
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]
}

export { BOX_PRICE }
