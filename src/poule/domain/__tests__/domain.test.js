import { describe, expect, it } from 'vitest'
import { MAX_BET, MAX_PAYOUT, MIN_BET, RTP } from '../../config/economy.js'
import { MODES, modeById } from '../../config/modes.js'
import { drawOutcomes, firstFatalLane, rollFromHash, sha256Hex, verifyRound } from '../fairness.js'
import { allInBet, clampBet, refillCheck } from '../money.js'
import { laneMultipliers, multiplierAt, payoutCents } from '../multiplier.js'
import { advance, canCashOut, cashOut, createRound, ROUND_STATUS } from '../round.js'

const easy = modeById('easy')
const safeRoad = (mode, fatal = null) => Array.from({ length: mode.lanes }, (_, index) => index + 1 !== fatal)
const roundOn = (mode, outcomes, betCents = 1000) =>
  createRound({ mode, betCents, seed: 'seed', seedHash: 'hash', outcomes, startedAt: 't0' })

describe('modes and multipliers', () => {
  it('falls back to the default mode for an unknown id', () => {
    expect(modeById('nope').id).toBe('easy')
  })

  it('raises the multiplier at every lane, faster in harder modes', () => {
    for (const mode of MODES) {
      const multipliers = laneMultipliers(mode)
      expect(multipliers).toHaveLength(mode.lanes)
      for (let i = 1; i < multipliers.length; i++) expect(multipliers[i]).toBeGreaterThan(multipliers[i - 1])
    }
    expect(multiplierAt(modeById('hardcore'), 3)).toBeGreaterThan(multiplierAt(easy, 3))
  })

  it('never shows more than the fair price times the RTP', () => {
    for (const mode of MODES) {
      for (let lane = 1; lane <= mode.lanes; lane++) {
        const expectedReturn = multiplierAt(mode, lane) * mode.survival ** lane
        expect(expectedReturn).toBeLessThanOrEqual(RTP + 1e-9)
        expect(expectedReturn).toBeGreaterThan(RTP - 0.01 * mode.survival ** lane - 1e-9)
      }
    }
  })

  it('pays in whole cents and caps the payout', () => {
    expect(payoutCents(1000, easy, 0)).toBe(0)
    expect(Number.isInteger(payoutCents(1234, easy, 5))).toBe(true)
    expect(payoutCents(MAX_BET, modeById('hardcore'), 15)).toBe(MAX_PAYOUT)
  })

  it('clamps bets to whole tokens in the allowed range', () => {
    expect(clampBet(0)).toBe(MIN_BET)
    expect(clampBet(12.6)).toBe(1300)
    expect(clampBet(9999)).toBe(999900)
    expect(clampBet(1e12)).toBe(MAX_BET)
    expect(clampBet(500, 12345)).toBe(12345)
    expect(clampBet(50, 12345)).toBe(5000)
    expect(clampBet(5, 0)).toBe(MIN_BET)
    expect(allInBet(12345)).toBe(12345)
    expect(allInBet(10)).toBe(MIN_BET)
    expect(clampBet('abc')).toBe(MIN_BET)
  })

  it('refills a broke player, once per cooldown', () => {
    expect(refillCheck({ balanceCents: 20000, lastRefillAt: null }).verdict).toBe('not-broke')
    expect(refillCheck({ balanceCents: 19999, lastRefillAt: null }).verdict).toBe('ok')
    expect(refillCheck({ balanceCents: 100, lastRefillAt: null }).verdict).toBe('ok')
    const now = 10_000_000
    const wait = refillCheck({ balanceCents: 100, lastRefillAt: now - 60_000, now })
    expect(wait.verdict).toBe('wait')
    expect(wait.waitMs).toBe(9 * 60_000)
  })
})

describe('provably fair draws', () => {
  it('hashes like any SHA-256 tool', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('reads a roll in [0, 1) from a hash', () => {
    expect(rollFromHash('00000000ff')).toBe(0)
    expect(rollFromHash('ffffffff00')).toBeLessThan(1)
  })

  it('draws the same road for the same seed', async () => {
    const a = await drawOutcomes('graine', easy)
    const b = await drawOutcomes('graine', easy)
    expect(a).toEqual(b)
    expect(a).toHaveLength(easy.lanes)
  })

  it('lets a player check a round from its seed', async () => {
    const seedHash = await sha256Hex('graine')
    const outcomes = await drawOutcomes('graine', easy)
    const check = await verifyRound({ seed: 'graine', seedHash, mode: easy })
    expect(check.hashMatches).toBe(true)
    expect(check.fatalLane).toBe(firstFatalLane(outcomes))
    expect((await verifyRound({ seed: 'autre', seedHash, mode: easy })).hashMatches).toBe(false)
  })

  it('survives about as often as the mode says', async () => {
    const mode = modeById('medium')
    let crossed = 0
    let total = 0
    for (let i = 0; i < 60; i++) {
      const outcomes = await drawOutcomes(`s${i}`, mode)
      crossed += outcomes.filter(Boolean).length
      total += outcomes.length
    }
    expect(crossed / total).toBeGreaterThan(mode.survival - 0.05)
    expect(crossed / total).toBeLessThan(mode.survival + 0.05)
  })
})

describe('round rules', () => {
  it('needs one outcome per lane', () => {
    expect(() => roundOn(easy, [true])).toThrow()
  })

  it('cannot cash out on the pavement', () => {
    const round = roundOn(easy, safeRoad(easy))
    expect(canCashOut(round)).toBe(false)
    expect(() => cashOut(round, 't1')).toThrow()
  })

  it('crosses, then pays the multiplier of the last lane crossed', () => {
    let round = roundOn(easy, safeRoad(easy))
    for (let i = 0; i < 3; i++) {
      const result = advance(round, 't1')
      expect(result.event).toBe('crossed')
      round = result.round
    }
    const won = cashOut(round, 't2')
    expect(won.status).toBe(ROUND_STATUS.won)
    expect(won.multiplier).toBe(multiplierAt(easy, 3))
    expect(won.payoutCents).toBe(payoutCents(1000, easy, 3))
    expect(() => advance(won, 't3')).toThrow()
  })

  it('loses the bet on a fatal lane', () => {
    const round = advance(roundOn(easy, safeRoad(easy, 2)), 't1').round
    const result = advance(round, 't2')
    expect(result.event).toBe('hit')
    expect(result.round.status).toBe(ROUND_STATUS.lost)
    expect(result.round.payoutCents).toBe(0)
  })

  it('pays out by itself on the last lane', () => {
    const mode = modeById('hardcore')
    let result = { round: roundOn(mode, safeRoad(mode), 100) }
    do result = advance(result.round, 't1')
    while (result.event === 'crossed')
    expect(result.event).toBe('finished')
    expect(result.round.status).toBe(ROUND_STATUS.won)
  })

  it('stops at the payout cap', () => {
    const mode = modeById('hardcore')
    let result = { round: roundOn(mode, safeRoad(mode), MAX_BET) }
    do result = advance(result.round, 't1')
    while (result.event === 'crossed')
    expect(result.round.payoutCents).toBe(MAX_PAYOUT)
    expect(result.lane).toBeLessThan(mode.lanes)
  })
})
