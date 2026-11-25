import { CENTS, MAX_BET, MIN_BET, REFILL_BELOW, REFILL_COOLDOWN_MINUTES } from '../config/economy.js'

export const tokensToCents = (tokens) => Math.round(tokens * CENTS)
export const centsToTokens = (cents) => cents / CENTS

/**
 * A bet in whole tokens, in cents, between the minimum and what the player
 * has (`balanceCents`, when given). Asking for more than the balance gives
 * the whole balance, cents included: that is all-in.
 */
export function clampBet(tokens, balanceCents = MAX_BET) {
  const whole = Math.round(Number(tokens))
  const cents = Number.isFinite(whole) ? whole * CENTS : MIN_BET
  const ceiling = Math.max(MIN_BET, Math.min(MAX_BET, balanceCents))
  return Math.min(ceiling, Math.max(MIN_BET, cents))
}

/** The whole balance as a bet (all-in), or the minimum bet when broke. */
export const allInBet = (balanceCents) => Math.max(MIN_BET, Math.min(MAX_BET, balanceCents))

/**
 * Whether the player may get a refill now: `ok`, `not-broke`, or `wait`
 * with how long, in ms.
 */
export function refillCheck({ balanceCents, lastRefillAt, now = Date.now() }) {
  if (balanceCents >= REFILL_BELOW) return { verdict: 'not-broke', waitMs: 0 }
  const ready = (lastRefillAt ?? 0) + REFILL_COOLDOWN_MINUTES * 60_000
  return now >= ready ? { verdict: 'ok', waitMs: 0 } : { verdict: 'wait', waitMs: ready - now }
}
