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

describe('season calendar', () => {
  it('names weeks the ISO way, across year ends', () => {
    expect(seasonId(new Date('2026-11-24T10:00:00Z'))).toBe('2026-W48')
    expect(seasonId(new Date('2027-01-01T10:00:00Z'))).toBe('2026-W53')
    expect(seasonId(new Date('2027-01-04T00:00:00Z'))).toBe('2027-W01')
    expect(isSeasonId('2026-W48')).toBe(true)
    expect(isSeasonId('2026-48')).toBe(false)
  })

  it('runs from Monday 00:00 UTC to the next Monday', () => {
    const now = new Date('2026-11-26T18:30:00Z')
    expect(seasonStart(now).toISOString()).toBe('2026-11-23T00:00:00.000Z')
    expect(seasonEnd(now).toISOString()).toBe('2026-11-30T00:00:00.000Z')
    expect(previousSeasonId(now)).toBe('2026-W47')
    expect(seasonStart(new Date('2026-11-29T23:59:00Z')).toISOString()).toBe('2026-11-23T00:00:00.000Z')
  })

  it('scores the rounds of the week only', () => {
    const rounds = [
      { endedAt: '2026-11-22T23:00:00Z', xp: 50, status: 'won', mult: 9 },
      { endedAt: '2026-11-23T08:00:00Z', xp: 6, status: 'won', mult: 1.22 },
      { endedAt: '2026-11-25T08:00:00Z', xp: 4, status: 'lost', mult: 0 },
    ]
    expect(weeklyStats(rounds, new Date('2026-11-26T00:00:00Z'))).toEqual({ xp: 10, bestMultiplier: 1.22, played: 2 })
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
