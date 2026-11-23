import { isPayoutCapped, multiplierAt, payoutCents } from './multiplier.js'

/**
 * Rules of one round, as pure functions over a plain object. A round is
 * `active` until the hen is hit (`lost`) or the player cashes out (`won`).
 * Nothing here touches storage, timers or the screen.
 */

export const ROUND_STATUS = Object.freeze({ active: 'active', won: 'won', lost: 'lost' })

export function createRound({ id = null, mode, betCents, seed, seedHash, outcomes, lane = 0, startedAt }) {
  if (outcomes.length !== mode.lanes) throw new Error('One outcome per lane is required')
  return Object.freeze({
    id,
    mode,
    betCents,
    seed,
    seedHash,
    outcomes,
    lane,
    status: ROUND_STATUS.active,
    payoutCents: 0,
    multiplier: null,
    startedAt,
    endedAt: null,
  })
}

const assertActive = (round) => {
  if (round.status !== ROUND_STATUS.active) throw new Error(`Round is ${round.status}`)
}

export const canCashOut = (round) => round.status === ROUND_STATUS.active && round.lane > 0

/** Cash out at the current lane. */
export function cashOut(round, endedAt) {
  assertActive(round)
  if (round.lane === 0) throw new Error('Cross at least one lane before cashing out')
  return Object.freeze({
    ...round,
    status: ROUND_STATUS.won,
    multiplier: multiplierAt(round.mode, round.lane),
    payoutCents: payoutCents(round.betCents, round.mode, round.lane),
    endedAt,
  })
}

/**
 * One step forward. Returns the next round and what happened:
 * `crossed` (keep going), `hit` (lost) or `finished` (paid out automatically
 * on the last lane or when the payout cap is reached).
 */
export function advance(round, endedAt) {
  assertActive(round)
  const lane = round.lane + 1
  if (!round.outcomes[lane - 1]) {
    return {
      event: 'hit',
      lane,
      round: Object.freeze({ ...round, lane, status: ROUND_STATUS.lost, multiplier: 0, payoutCents: 0, endedAt }),
    }
  }
  const crossed = Object.freeze({ ...round, lane })
  if (lane === round.mode.lanes || isPayoutCapped(round.betCents, round.mode, lane)) {
    return { event: 'finished', lane, round: cashOut(crossed, endedAt) }
  }
  return { event: 'crossed', lane, round: crossed }
}
