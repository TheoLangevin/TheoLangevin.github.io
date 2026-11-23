import { MAX_PAYOUT, RTP } from '../config/economy.js'

/**
 * Multiplier paid after crossing `lane` lanes (0 = still on the pavement).
 * It is the fair price of surviving that far, `1 / survival^lane`, times the
 * RTP, rounded down to the cent so the house never pays more than it shows.
 */
export function multiplierAt(mode, lane) {
  if (lane <= 0) return 1
  const fair = RTP / mode.survival ** Math.min(lane, mode.lanes)
  return Math.floor(fair * 100 + 1e-9) / 100
}

/** Multipliers of every lane of the mode, lane 1 first. */
export const laneMultipliers = (mode) => Array.from({ length: mode.lanes }, (_, index) => multiplierAt(mode, index + 1))

/** What a bet returns after `lane` lanes, in cents, capped by MAX_PAYOUT. */
export function payoutCents(betCents, mode, lane) {
  if (lane <= 0) return 0
  return Math.min(Math.floor(betCents * multiplierAt(mode, lane)), MAX_PAYOUT)
}

/** True once one more lane would not raise the payout: the round ends there. */
export const isPayoutCapped = (betCents, mode, lane) => payoutCents(betCents, mode, lane) >= MAX_PAYOUT

/** Chance of surviving `lane` lanes in a row, from the pavement. */
export const survivalChance = (mode, lane) => mode.survival ** lane
