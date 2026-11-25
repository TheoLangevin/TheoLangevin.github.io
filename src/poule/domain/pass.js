import { PASS_REWARDS, PASS_TIERS, PASS_XP_PER_TIER } from '../config/pass.js'

/**
 * Pure rules of the season pass (config/pass.js). A player's pass:
 * { season, startXp, claimed: [tiers] }, where startXp is their total XP when
 * the season's pass started for them.
 */

export const freshPass = (season, xp) => ({ season, startXp: xp, claimed: [] })

/** Checks a pass from a save, or null. */
export function validPass(raw) {
  if (!raw || !Number.isInteger(raw.season) || !Number.isInteger(raw.startXp) || raw.startXp < 0) return null
  const claimed = [...new Set(Array.isArray(raw.claimed) ? raw.claimed : [])]
    .filter((tier) => Number.isInteger(tier) && tier >= 1 && tier <= PASS_TIERS)
    .sort((a, b) => a - b)
  return { season: raw.season, startXp: raw.startXp, claimed }
}

/** Where the player stands: XP in the pass, tier reached, progress to the next, tiers to collect. */
export function passStatus(pass, xp) {
  const earned = Math.max(0, xp - pass.startXp)
  const tier = Math.min(PASS_TIERS, Math.floor(earned / PASS_XP_PER_TIER))
  const ready = PASS_REWARDS.filter((reward) => reward.tier <= tier && !pass.claimed.includes(reward.tier))
  return {
    earned,
    tier,
    ratio: tier === PASS_TIERS ? 1 : (earned % PASS_XP_PER_TIER) / PASS_XP_PER_TIER,
    toNext: tier === PASS_TIERS ? 0 : PASS_XP_PER_TIER - (earned % PASS_XP_PER_TIER),
    ready,
    claimed: pass.claimed,
  }
}
