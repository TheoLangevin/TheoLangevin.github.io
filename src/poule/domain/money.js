import { CENTS, MAX_BET, MIN_BET } from '../config/economy.js'

export const tokensToCents = (tokens) => Math.round(tokens * CENTS)
export const centsToTokens = (cents) => cents / CENTS

/** A bet in whole tokens, clamped to the allowed range, in cents. */
export function clampBet(tokens) {
  const whole = Math.round(Number(tokens))
  const cents = Number.isFinite(whole) ? whole * CENTS : MIN_BET
  return Math.min(MAX_BET, Math.max(MIN_BET, cents))
}
