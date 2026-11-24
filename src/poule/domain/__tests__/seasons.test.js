import { describe, expect, it } from 'vitest'
import { LEAGUES } from '../../config/seasons.js'
import { UPGRADES, upgradeById } from '../../config/upgrades.js'
import {
  isSeasonId,
  leagueFor,
  leagueProgress,
  previousSeasonId,
  rankTier,
  seasonEnd,
  seasonId,
  seasonReward,
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
      { endedAt: '2026-11-22T23:00:00Z', feathers: 50, status: 'won', mult: 9 },
      { endedAt: '2026-11-23T08:00:00Z', feathers: 6, status: 'won', mult: 1.22 },
      { endedAt: '2026-11-25T08:00:00Z', feathers: 4, status: 'lost', mult: 0 },
    ]
    expect(weeklyStats(rounds, new Date('2026-11-26T00:00:00Z'))).toEqual({ xp: 10, bestMultiplier: 1.22, played: 2 })
  })
})

describe('leagues and rewards', () => {
  it('places scores in leagues', () => {
    expect(leagueFor(0)).toBeNull()
    expect(leagueFor(1).id).toBe('bronze')
    expect(leagueFor(250).id).toBe('gold')
    expect(leagueFor(99999).id).toBe('diamond')
    const progress = leagueProgress(130)
    expect(progress.current.id).toBe('silver')
    expect(progress.next.id).toBe('gold')
    expect(progress.missing).toBe(70)
  })

  it('pays more for better ranks', () => {
    expect(rankTier(1, 40).id).toBe('first')
    expect(rankTier(3, 40).id).toBe('podium')
    expect(rankTier(7, 40).id).toBe('top10')
    expect(rankTier(10, 100).id).toBe('top10')
    expect(rankTier(25, 100).id).toBe('top25')
    expect(rankTier(26, 100)).toBeNull()
  })

  it('adds the league and rank rewards, and nothing without a score', () => {
    expect(seasonReward({ score: 0, rank: 1, total: 1 })).toBeNull()
    const reward = seasonReward({ score: 250, rank: 1, total: 12 })
    expect(reward.league).toBe('gold')
    expect(reward.tier).toBe('first')
    expect(reward.tokens).toBe(200000 + 1000000)
    expect(reward.items).toContain('title-champion')
  })

  it('rewards only items that exist and are exclusive', () => {
    for (const league of LEAGUES) expect(league.reward.tokens).toBeGreaterThan(0)
    const reward = seasonReward({ score: 2000, rank: 1, total: 2 })
    for (const id of reward.items) expect(upgradeById(id).exclusive).toBe(true)
  })

  it('offers at least 30 goodies for tokens', () => {
    expect(UPGRADES.filter((item) => item.currency === 'tokens').length).toBeGreaterThanOrEqual(30)
    for (const item of UPGRADES) expect(item.exclusive || item.cost > 0).toBe(true)
  })
})
