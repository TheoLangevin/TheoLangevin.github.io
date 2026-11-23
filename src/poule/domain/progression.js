import { ACHIEVEMENTS } from '../config/achievements.js'
import { FEATHERS_PER_LANE, MAX_LEVEL, xpForLevel } from '../config/progression.js'
import { upgradeById } from '../config/upgrades.js'
import { ROUND_STATUS } from './round.js'

/** Lanes the hen actually got across in a finished round. */
export const lanesCrossed = (round) => (round.status === ROUND_STATUS.lost ? round.lane - 1 : round.lane)

/** Feathers earned by a finished round: per lane crossed, by mode. */
export const feathersFor = (round) => lanesCrossed(round) * (FEATHERS_PER_LANE[round.mode.id] ?? 1)

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
 * Whether an upgrade can be bought: `ok`, or the reason it cannot
 * (`unknown`, `owned`, `level`, `feathers`).
 */
export function purchaseCheck(upgradeId, { owned, level, feathers }) {
  const upgrade = upgradeById(upgradeId)
  if (!upgrade) return 'unknown'
  if (owned.includes(upgradeId)) return 'owned'
  if (level < upgrade.level) return 'level'
  if (feathers < upgrade.cost) return 'feathers'
  return 'ok'
}

/** Achievements newly met by `stats`, among those not yet unlocked. */
export const newAchievements = (stats, unlocked) =>
  ACHIEVEMENTS.filter((achievement) => !unlocked.includes(achievement.id) && achievement.test(stats))
