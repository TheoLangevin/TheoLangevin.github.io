import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '../../config/achievements.js'
import { modeById } from '../../config/modes.js'
import { xpForLevel } from '../../config/progression.js'
import { UPGRADES } from '../../config/upgrades.js'
import {
  feathersFor,
  lanesCrossed,
  levelFromXp,
  levelProgress,
  newAchievements,
  purchaseCheck,
} from '../progression.js'

const finished = (status, lane, modeId = 'easy') => ({ status, lane, mode: modeById(modeId) })

const noStats = {
  lanesCrossed: 0,
  won: 0,
  bestLanes: 0,
  modesWon: 0,
  hardcoreWins: 0,
  bestMultiplier: 0,
  finished: 0,
  owned: 0,
  level: 1,
}

describe('progression', () => {
  it('counts the lanes really crossed', () => {
    expect(lanesCrossed(finished('won', 4))).toBe(4)
    expect(lanesCrossed(finished('lost', 4))).toBe(3)
    expect(lanesCrossed(finished('lost', 1))).toBe(0)
  })

  it('pays feathers per lane crossed, more in harder modes, whatever the bet', () => {
    expect(feathersFor(finished('won', 3))).toBe(6)
    expect(feathersFor(finished('lost', 3, 'hardcore'))).toBe(16)
    expect(feathersFor(finished('lost', 1))).toBe(0)
  })

  it('derives the level from experience', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(xpForLevel(2) - 1)).toBe(1)
    expect(levelFromXp(xpForLevel(2))).toBe(2)
    expect(levelFromXp(xpForLevel(7) + 5)).toBe(7)
    const progress = levelProgress(xpForLevel(3) + 10)
    expect(progress.level).toBe(3)
    expect(progress.into).toBe(10)
    expect(progress.ratio).toBeGreaterThan(0)
    expect(progress.ratio).toBeLessThan(1)
  })

  it('checks a purchase: level, feathers, already owned', () => {
    const profile = { owned: [], level: 1, feathers: 1000 }
    expect(purchaseCheck('cap', profile)).toBe('ok')
    expect(purchaseCheck('crown', profile)).toBe('level')
    expect(purchaseCheck('cap', { ...profile, feathers: 10 })).toBe('feathers')
    expect(purchaseCheck('cap', { ...profile, owned: ['cap'] })).toBe('owned')
    expect(purchaseCheck('nope', profile)).toBe('unknown')
  })

  it('has unique ids and sane prices', () => {
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    for (const upgrade of UPGRADES) expect(upgrade.cost).toBeGreaterThan(0)
  })

  it('unlocks each achievement once', () => {
    expect(newAchievements(noStats, [])).toEqual([])
    const stats = { ...noStats, lanesCrossed: 3, won: 1 }
    expect(newAchievements(stats, []).map((a) => a.id)).toEqual(['first-steps', 'first-win'])
    expect(newAchievements(stats, ['first-steps', 'first-win'])).toEqual([])
  })
})
