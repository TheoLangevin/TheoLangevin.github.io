import { describe, expect, it } from 'vitest'
import { RANK_REWARDS } from '../../config/seasons.js'
import { UPGRADES, upgradeById } from '../../config/upgrades.js'
import {
  isSeasonId,
  previousSeasonId,
  seasonEnd,
  seasonId,
  seasonStart,
  weeklyStats,
} from '../seasons.js'

describe('league calendar', () => {
  it('names days in UTC', () => {
    expect(seasonId(new Date('2026-11-24T10:00:00Z'))).toBe('2026-11-24')
    expect(seasonId(new Date('2027-01-01T23:59:00Z'))).toBe('2027-01-01')
    expect(isSeasonId('2026-11-24')).toBe(true)
    expect(isSeasonId('2026-W48')).toBe(false)
  })

  it('runs from 00:00 UTC to the next day', () => {
    const now = new Date('2026-11-26T18:30:00Z')
    expect(seasonStart(now).toISOString()).toBe('2026-11-26T00:00:00.000Z')
    expect(seasonEnd(now).toISOString()).toBe('2026-11-27T00:00:00.000Z')
    expect(previousSeasonId(now)).toBe('2026-11-25')
  })

  it('scores the rounds of the day only', () => {
    const rounds = [
      { endedAt: '2026-11-25T23:00:00Z', xp: 50, status: 'won', mult: 9 },
      { endedAt: '2026-11-26T08:00:00Z', xp: 6, status: 'won', mult: 1.22 },
      { endedAt: '2026-11-26T20:00:00Z', xp: 4, status: 'lost', mult: 0 },
    ]
    expect(weeklyStats(rounds, new Date('2026-11-26T21:00:00Z'))).toEqual({ xp: 10, bestMultiplier: 1.22, played: 2 })
  })
})

describe('shop', () => {
  it('offers at least 30 goodies for tokens', () => {
    expect(UPGRADES.filter((item) => item.currency === 'tokens').length).toBeGreaterThanOrEqual(30)
    for (const item of UPGRADES) expect(item.exclusive || item.cost > 0).toBe(true)
  })

  it('rewards only items that exist and are exclusive', () => {
    for (const tier of RANK_REWARDS) for (const id of tier.reward.items) expect(upgradeById(id).exclusive).toBe(true)
  })
})
