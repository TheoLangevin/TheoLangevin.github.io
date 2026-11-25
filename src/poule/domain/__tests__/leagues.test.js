import { describe, expect, it } from 'vitest'
import { TIERS } from '../../config/seasons.js'
import {
  DIVISIONS,
  divisionFor,
  divisionReward,
  freshLeague,
  leagueProgress,
  rankBonus,
  settleWeek,
  validLeague,
  weekDelta,
  weeksBetween,
  weekStart,
} from '../leagues.js'

const at = (lp, gates = {}) => ({ ...freshLeague('2026-11-24'), lp, peak: lp, gates: { top10: false, first: false, ...gates } })

describe('divisions', () => {
  it('goes from Bronze III to Légende, each league harder to climb', () => {
    expect(DIVISIONS[0].label).toBe('Bronze III')
    expect(DIVISIONS.at(-1).label).toBe('Légende')
    expect(DIVISIONS).toHaveLength(17)
    expect(divisionFor(0).id).toBe('bronze-3')
    expect(divisionFor(250).id).toBe('bronze-1')
    expect(divisionFor(300).id).toBe('silver-3')
    expect(divisionFor(3450).id).toBe('master')
    expect(divisionFor(99999).id).toBe('legend')
    for (let i = 1; i < TIERS.length; i++) expect(TIERS[i].upkeep).toBeGreaterThan(TIERS[i - 1].upkeep)
  })

  it('shows progress and what blocks the gated leagues', () => {
    const progress = leagueProgress(at(350))
    expect(progress.current.id).toBe('silver-3')
    expect(progress.next.id).toBe('silver-2')
    expect(progress.missing).toBe(100)
    expect(leagueProgress(at(3300)).blocked).toBeTruthy()
    expect(leagueProgress(at(3300, { top10: true })).blocked).toBeNull()
  })

  it('pays more in higher divisions', () => {
    expect(divisionReward(divisionFor(0))).toBe(3000)
    expect(divisionReward(divisionFor(250))).toBe(4500)
    expect(divisionReward(divisionFor(5000))).toBeGreaterThan(divisionReward(divisionFor(3450)))
  })
})

describe('a day settled', () => {
  it('turns score and rank into points, minus the upkeep', () => {
    expect(weekDelta({ lp: 0, score: 100 })).toEqual({ delta: 60, perf: 60, bonus: 0, upkeep: 0 })
    expect(weekDelta({ lp: 800, score: 100, rank: 1, total: 20 })).toEqual({ delta: 120, perf: 60, bonus: 80, upkeep: 20 })
    expect(weekDelta({ lp: 0, score: 1e9 }).perf).toBe(150)
    expect(rankBonus(5, 100)).toBe(30)
    expect(rankBonus(40, 100)).toBe(8)
    expect(rankBonus(80, 100)).toBe(0)
  })

  it('costs points to skip a day, more in high leagues', () => {
    expect(weekDelta({ lp: 0, score: 0 }).delta).toBe(-10)
    expect(weekDelta({ lp: 2300, score: 0 }).delta).toBe(-50)
    expect(settleWeek(at(10), { season: '2026-11-25', score: 0 }).league.lp).toBe(0)
  })

  it('pays the division and the rank, and records the week', () => {
    const { league, result } = settleWeek(at(280), { season: '2026-11-25', score: 100, rank: 2, total: 9 })
    expect(league.lp).toBe(280 + 60 + 50)
    expect(result.before).toBe('bronze-1')
    expect(result.after).toBe('silver-3')
    expect(result.reward.tier).toBe('podium')
    expect(result.reward.tokens).toBe(divisionReward(divisionFor(390)) + 100000)
    expect(result.reward.items).toContain('medal')
    expect(league.settled).toBe('2026-11-25')
    expect(league.history.at(-1)).toEqual({ season: '2026-11-25', score: 100, rank: 2, total: 9, delta: 110, lp: 390 })
    expect(league.gates.top10).toBe(true)
    expect(settleWeek(at(10), { season: '2026-11-25', score: 0 }).result.reward.tokens).toBe(0)
  })

  it('keeps players out of Maître and Légende until they earn the result', () => {
    const blocked = settleWeek(at(3400), { season: '2026-11-25', score: 400, rank: 15, total: 100 })
    expect(blocked.league.lp).toBe(3449)
    const opened = settleWeek(at(3400), { season: '2026-11-25', score: 400, rank: 4, total: 100 })
    expect(opened.league.lp).toBeGreaterThanOrEqual(3450)
    const notFirst = settleWeek(at(4450, { top10: true }), { season: '2026-11-25', score: 2500, rank: 2, total: 50 })
    expect(notFirst.league.lp).toBe(4499)
    const first = settleWeek(at(4450, { top10: true }), { season: '2026-11-25', score: 2500, rank: 1, total: 50 })
    expect(divisionFor(first.league.lp).id).toBe('legend')
  })
})

describe('day arithmetic', () => {
  it('finds the days in between', () => {
    expect(weekStart('2026-11-25').toISOString()).toBe('2026-11-25T00:00:00.000Z')
    expect(weeksBetween('2026-11-23', '2026-11-25')).toEqual(['2026-11-24', '2026-11-25'])
    expect(weeksBetween('2026-12-31', '2027-01-01')).toEqual(['2027-01-01'])
    expect(weeksBetween('2026-11-25', '2026-11-25')).toEqual([])
    expect(weeksBetween(null, '2026-11-25')).toEqual([])
  })

  it('repairs a league from a save', () => {
    expect(validLeague(null)).toEqual(freshLeague())
    expect(validLeague({ lp: -4 })).toEqual(freshLeague())
    const league = validLeague({ lp: 500, peak: 20, settled: '2026-11-24', gates: { top10: true }, history: [{ season: 'x' }] })
    expect(league).toEqual({ lp: 500, peak: 500, settled: '2026-11-24', gates: { top10: true, first: false }, history: [] })
  })
})
