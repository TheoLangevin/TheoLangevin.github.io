/**
 * Duels: a player challenges another from their profile. Both put the same
 * stake in; once accepted, each has DUEL_TRIES tries (DUEL_TRY_BET each, in
 * the duel's mode) within DUEL_HOURS; the best multiplier cashed out takes
 * both stakes. A tie gives each their stake back, and so does a refusal or a
 * challenge left unanswered (to the challenger).
 */

const t = (tokens) => tokens * 100

export const DUEL_STAKES = Object.freeze([t(25), t(100), t(500)])
export const DUEL_TRIES = 3
export const DUEL_TRY_BET = t(10)
export const DUEL_HOURS = 24
/** Duels remembered in a save (to pay each once). */
export const DUEL_LEDGER_KEPT = 60
