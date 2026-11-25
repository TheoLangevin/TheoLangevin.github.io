import { describe, expect, it } from 'vitest'
import { MISSIONS } from '../../config/missions.js'
import { duelPayout, duelState, validLedger } from '../duels.js'
import { missionProgress, missionsFor, roundsOfDay, streakToday } from '../missions.js'

const round = (extra = {}) => ({ mode: 'easy', crossed: 3, status: 'won', mult: 1.2, endedAt: '2026-11-25T10:00:00Z', ...extra })
const byId = (id) => MISSIONS.find((mission) => mission.id === id)

describe('daily missions', () => {
  it('picks three different missions, the same all day', () => {
    const today = missionsFor('2026-11-25')
    expect(today).toHaveLength(3)
    expect(new Set(today.map((mission) => mission.id)).size).toBe(3)
    expect(missionsFor('2026-11-25')).toEqual(today)
  })

  it("counts progress from the day's rounds", () => {
    const rounds = [round(), round({ status: 'lost', crossed: 9 }), round({ mode: 'hard', mult: 3.5 })]
    expect(missionProgress(byId('play10'), rounds)).toBe(3)
    expect(missionProgress(byId('lanes40'), rounds)).toBe(15)
    expect(missionProgress(byId('x3'), rounds)).toBe(1)
    expect(missionProgress(byId('hard3'), rounds)).toBe(1)
    expect(missionProgress(byId('run8'), rounds)).toBe(1)
    expect(missionProgress(byId('modes3'), rounds)).toBe(2)
    expect(missionProgress(byId('win5'), Array(9).fill(round()))).toBe(5)
    expect(roundsOfDay([round(), round({ endedAt: '2026-11-24T23:00:00Z' })], '2026-11-25')).toHaveLength(1)
  })

  it('grows the streak on consecutive days, and starts over after a gap', () => {
    expect(streakToday(null, '2026-11-25')).toEqual({ days: 1, bonus: 2000 })
    expect(streakToday({ last: '2026-11-24', days: 3 }, '2026-11-25')).toEqual({ days: 4, bonus: 8000 })
    expect(streakToday({ last: '2026-11-22', days: 3 }, '2026-11-25').days).toBe(1)
    expect(streakToday({ last: '2026-11-25', days: 3 }, '2026-11-25')).toBeNull()
    expect(streakToday({ last: '2026-11-24', days: 30 }, '2026-11-25').bonus).toBe(14000)
  })
})

describe('duels', () => {
  const duel = (extra = {}) => ({
    from: { uid: 'a' },
    to: { uid: 'b' },
    stake: 1000,
    status: 'accepted',
    expiresAt: 100,
    scores: {},
    ...extra,
  })

  it('follows a duel from challenge to result', () => {
    expect(duelState(duel({ status: 'open' }), 50)).toBe('open')
    expect(duelState(duel({ status: 'open' }), 150)).toBe('expired')
    expect(duelState(duel({ status: 'declined' }), 50)).toBe('declined')
    expect(duelState(duel(), 50)).toBe('playing')
    expect(duelState(duel({ scores: { a: { tries: 3, best: 2 }, b: { tries: 3, best: 0 } } }), 50)).toBe('done')
    expect(duelState(duel(), 150)).toBe('done')
  })

  it('pays the winner both stakes, a tie its stake back, a refusal to the challenger', () => {
    const done = duel({ scores: { a: { tries: 3, best: 2 }, b: { tries: 3, best: 1.5 } } })
    expect(duelPayout(done, 'a', 50)).toBe(2000)
    expect(duelPayout(done, 'b', 50)).toBe(0)
    expect(duelPayout(duel({ scores: { a: { tries: 3, best: 2 }, b: { tries: 3, best: 2 } } }), 'b', 50)).toBe(1000)
    expect(duelPayout(duel(), 'a', 50)).toBeNull()
    expect(duelPayout(duel({ status: 'declined' }), 'a', 50)).toBe(1000)
    expect(duelPayout(duel({ status: 'open' }), 'b', 150)).toBe(0)
    expect(validLedger({ abcdef1: 'staked', x: 'staked', abcdef2: 'won' })).toEqual({ abcdef1: 'staked' })
  })
})
