import { TALENTS, talentById } from '../config/talents.js'

/** Pure rules of the talents (config/talents.js). A player's talents: { id: level }. */

/** Checks talents from a save: known ids, whole levels within bounds. */
export function validTalents(raw) {
  const talents = {}
  for (const talent of TALENTS) {
    const level = raw?.[talent.id]
    if (Number.isInteger(level) && level >= 1) talents[talent.id] = Math.min(level, talent.max)
  }
  return talents
}

/** Price of the next level of a talent (cents), or null at the top. */
export function nextTalentCost(talents, id) {
  const talent = talentById(id)
  if (!talent) return null
  return talent.costs[talents[id] ?? 0] ?? null
}

/** What the talents change, as numbers. */
export function talentEffects(talents) {
  const level = (id) => talents[id] ?? 0
  return {
    xp: 1 + 0.05 * level('instinct'),
    payout: 0.01 * level('golden-beak'),
    refund: 0.08 * level('insurance'),
    refill: 1 + 0.5 * level('second-wind'),
  }
}
