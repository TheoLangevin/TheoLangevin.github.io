/**
 * Economy of the game. Every amount is stored in cents of a token (integers),
 * so that a 10-token bet at x1.04 pays exactly 1 040 cents, never 10.399999.
 */

/** Share of the bets the game gives back on average, whatever the mode. */
export const RTP = 0.955

export const CENTS = 100

export const STARTING_BALANCE = 1000 * CENTS

export const MIN_BET = 1 * CENTS
export const MAX_BET = 200 * CENTS
export const DEFAULT_BET = 10 * CENTS

/** No round can pay more than this, whatever the multiplier. */
export const MAX_PAYOUT = 20000 * CENTS

/** Quick bet buttons, in tokens. */
export const BET_PRESETS = [1, 10, 50, 200]

/** A player with less than this can ask for a refill... */
export const REFILL_BELOW = 200 * CENTS
/** ...of this much... */
export const REFILL_AMOUNT = 50 * CENTS
/** ...once in this many minutes. */
export const REFILL_COOLDOWN_MINUTES = 10
