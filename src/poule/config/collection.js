/**
 * The collection: every cosmetic of the shop counts towards completion.
 * Sets pay tokens once when all their items are owned. The surprise box
 * gives one cosmetic not owned yet, at a fixed price, with the odds shown:
 * rarity comes from the shop price.
 */

const t = (tokens) => tokens * 100

export const SETS = Object.freeze([
  { id: 'farm', label: 'À la ferme', items: ['cap', 'scarf', 'russet', 'dust'], reward: t(400) },
  { id: 'party', label: 'Soirée', items: ['party-hat', 'bow-tie', 'confetti-gold', 'notes'], reward: t(600) },
  { id: 'adventure', label: 'Aventure', items: ['pirate', 'cowboy', 'desert', 'forest'], reward: t(1200) },
  { id: 'royal', label: 'Majesté', items: ['crown', 'gold-chain', 'gold', 'coins'], reward: t(2500) },
  { id: 'cosmos', label: 'Cosmos', items: ['wizard', 'galaxy', 'stars', 'moon'], reward: t(4000) },
  { id: 'christmas', label: 'Noël', items: ['santa', 'xmas-scarf', 'snowflakes', 'snow'], reward: t(1500) },
])

export const BOX_PRICE = t(1500)

/** Rarities by shop price (cents), with their chance in the box. */
export const RARITIES = Object.freeze([
  { id: 'common', label: 'Commun', below: t(2000), chance: 0.7 },
  { id: 'rare', label: 'Rare', below: t(6000), chance: 0.25 },
  { id: 'epic', label: 'Épique', below: Infinity, chance: 0.05 },
])
