import { describe, expect, it } from 'vitest'
import { DAILY_TRIES } from '../../config/daily.js'
import {
  dailyMode,
  dailyReward,
  dailyStatus,
  dayId,
  isTournament,
  previousDayId,
  tournamentSeed,
  validDaily,
  validDailyClaims,
} from '../daily.js'

describe('daily challenge', () => {
  it('names days in UTC and picks the mode by weekday', () => {
    expect(dayId(new Date('2026-11-25T23:30:00Z'))).toBe('2026-11-25')
    expect(previousDayId(new Date('2026-12-01T01:00:00Z'))).toBe('2026-11-30')
    expect(dailyMode('2026-11-28').id).toBe('hard') // a Saturday: tournament
    expect(dailyMode('2026-11-25').id).toBe('easy') // a Wednesday
  })

  it('turns the weekend into a tournament: 5 tries, same roads, bigger rewards', () => {
    expect(isTournament('2026-11-28')).toBe(true)
    expect(isTournament('2026-11-29')).toBe(true)
    expect(isTournament('2026-11-30')).toBe(false)
    expect(dailyStatus(null, '2026-11-28')).toMatchObject({ left: 5, max: 5, tournament: true })
    expect(tournamentSeed('2026-11-28', 2)).toBe(tournamentSeed('2026-11-28', 2))
    expect(tournamentSeed('2026-11-28', 2)).not.toBe(tournamentSeed('2026-11-28', 3))
    const weekday = dailyReward({ date: '2026-11-25', best: 3, rank: 1, total: 10 })
    const weekend = dailyReward({ date: '2026-11-28', best: 3, rank: 1, total: 10 })
    expect(weekend.tokens).toBe(weekday.tokens * 3)
    expect(weekend.item).toBe('title-tournament')
    expect(dailyReward({ date: '2026-11-28', best: 3, rank: 2, total: 10 }).item).toBeNull()
    expect(validDaily({ date: '2026-11-28', tries: 5, best: 2 }).tries).toBe(5)
  })

  it('counts tries per day', () => {
    expect(dailyStatus(null, '2026-11-25').left).toBe(DAILY_TRIES)
    expect(dailyStatus({ date: '2026-11-25', tries: 2, best: 1.5 }, '2026-11-25')).toMatchObject({ left: 1, best: 1.5 })
    expect(dailyStatus({ date: '2026-11-24', tries: 3, best: 4 }, '2026-11-25')).toMatchObject({ left: DAILY_TRIES, best: 0 })
  })

  it('pays by rank, and only players who cashed out', () => {
    expect(dailyReward({ best: 3, rank: 1, total: 8 }).id).toBe('first')
    expect(dailyReward({ best: 3, rank: 3, total: 8 }).id).toBe('podium')
    expect(dailyReward({ best: 3, rank: 30, total: 80 }).id).toBe('played')
    expect(dailyReward({ best: 0, rank: 5, total: 8 })).toBeNull()
  })

  it('repairs what comes from a save', () => {
    expect(validDaily({ date: '2026-11-25', tries: 9, best: -1 })).toEqual({ date: '2026-11-25', tries: DAILY_TRIES, best: 0 })
    expect(validDaily({ date: 'hier' })).toBeNull()
    expect(validDailyClaims(['2026-11-25', 'x', '2026-11-24', '2026-11-25'])).toEqual(['2026-11-24', '2026-11-25'])
  })
})
