import { ACHIEVEMENTS } from '../config/achievements.js'
import { MAX_LEVEL, XP_PER_LANE, levelUpBonus, xpForLevel } from '../config/progression.js'
import { upgradeById } from '../config/upgrades.js'
import { isEventActive } from './calendar.js'
import { ROUND_STATUS } from './round.js'

/** Lanes the hen actually got across in a finished round. */
export const lanesCrossed = (round) => (round.status === ROUND_STATUS.lost ? round.lane - 1 : round.lane)

/** XP earned by a finished round: per lane crossed, by mode. */
export const xpFor = (round) => lanesCrossed(round) * (XP_PER_LANE[round.mode.id] ?? 1)

/** Tokens (cents) owed for the levels from `paidLevel` (excluded) up to `level`. */
export function levelUpPay(paidLevel, level) {
  let cents = 0
  for (let next = paidLevel + 1; next <= level; next++) cents += levelUpBonus(next)
  return cents
}

export function levelFromXp(xp) {
  let level = 1
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++
  return level
}

/** Level, and how far into it, for the progress bar. */
export function levelProgress(xp) {
  const level = levelFromXp(xp)
  if (level === MAX_LEVEL) return { level, into: 0, needed: 0, ratio: 1 }
  const floor = xpForLevel(level)
  const needed = xpForLevel(level + 1) - floor
  return { level, into: xp - floor, needed, ratio: (xp - floor) / needed }
}

/**
 * Whether an item can be bought: `ok`, or the reason it cannot (`unknown`,
 * `exclusive`, `owned`, `limited`, `level`, `tokens`).
 */
export function purchaseCheck(upgradeId, { owned, level, balanceCents = 0, date = new Date() }) {
  const upgrade = upgradeById(upgradeId)
  if (!upgrade) return 'unknown'
  if (upgrade.exclusive) return 'exclusive'
  if (owned.includes(upgradeId)) return 'owned'
  if (upgrade.limited && !isEventActive(upgrade.limited, date)) return 'limited'
  if (level < upgrade.level) return 'level'
  return balanceCents >= upgrade.cost ? 'ok' : 'tokens'
}

/** Achievements newly met by `stats`, among those not yet unlocked. */
export const newAchievements = (stats, unlocked) =>
  ACHIEVEMENTS.filter((achievement) => !unlocked.includes(achievement.id) && achievement.test(stats))
