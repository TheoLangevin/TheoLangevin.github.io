/**
 * The daily challenge ("Défi du jour"): the same rules for everyone, every
 * day. A fixed mode (by weekday) and a fixed bet, a few tries; the score is
 * the best multiplier cashed out that day (a crash scores nothing). The day
 * runs on UTC. The best of the day are paid the next time they open the game.
 */

const t = (tokens) => tokens * 100

export const DAILY_TRIES = 3
export const DAILY_BET = t(10)

/** Mode of the day, by UTC weekday (0 = Sunday). */
export const DAILY_MODES = Object.freeze(['hard', 'medium', 'hard', 'easy', 'hard', 'medium', 'hardcore'])

/** Rewards by final rank; `played` is for anyone who cashed out at least once. */
export const DAILY_REWARDS = Object.freeze([
  { id: 'first', label: '1re place', top: 1, tokens: t(1500) },
  { id: 'podium', label: 'Podium', top: 3, tokens: t(700) },
  { id: 'top10', label: 'Top 10', top: 10, tokens: t(300) },
  { id: 'played', label: 'Participation', tokens: t(50) },
])

/** Days of daily rewards remembered as collected. */
export const DAILY_CLAIMS_KEPT = 14
