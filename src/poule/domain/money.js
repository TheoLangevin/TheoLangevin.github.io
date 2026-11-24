import { CENTS, MAX_BET, MIN_BET, REFILL_BELOW, REFILL_COOLDOWN_MINUTES } from '../config/economy.js'

export const tokensToCents = (tokens) => Math.round(tokens * CENTS)
export const centsToTokens = (cents) => cents / CENTS

/** A bet in whole tokens, clamped to the allowed range, in cents. */
export function clampBet(tokens) {
  const whole = Math.round(Number(tokens))
  const cents = Number.isFinite(whole) ? whole * CENTS : MIN_BET
  return Math.min(MAX_BET, Math.max(MIN_BET, cents))
}

/**
 * Whether the player may get a refill now: `ok`, `not-broke`, or `wait`
 * with how long, in ms.
 */
export function refillCheck({ balanceCents, lastRefillAt, now = Date.now() }) {
  if (balanceCents >= REFILL_BELOW) return { verdict: 'not-broke', waitMs: 0 }
  const ready = (lastRefillAt ?? 0) + REFILL_COOLDOWN_MINUTES * 60_000
  return now >= ready ? { verdict: 'ok', waitMs: 0 } : { verdict: 'wait', waitMs: ready - now }
}
