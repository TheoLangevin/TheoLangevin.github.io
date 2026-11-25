/**
 * Seasons and leagues.
 *
 * A big season (Saison 1, 2...) starts with every player back at the starting
 * balance (domain/save.js applies it to any save from an earlier one). Inside
 * it, every day (00:00 UTC) is scored: the day's score is the experience (XP)
 * earned in it. When a day ends, it is settled: the player's league points
 * (PL) move with how they did (score and rank), minus the upkeep of their
 * league; inactive days cost points. PL place the player in a division, from
 * Bronze III to Légende. The top leagues also ask for a result, not only
 * points: Maître for a day finished in the top 10, Légende for a day finished
 * first. (Leagues were weekly before; the names below still say "week".)
 */

const t = (tokens) => tokens * 100

/** The big season in play. Saves from an earlier one are reset to it. */
export const CURRENT_SEASON = Object.freeze({ id: 1, label: 'Saison 1' })

/** Exclusive game skin given to the players of the beta (before Saison 1). */
export const BETA_SKIN = 'skin-roadworks'

/**
 * Leagues, lowest first. `divisions` (III, II, I) each need `step` more PL;
 * `upkeep` is taken from every active day's gain; `reward` is paid each day
 * the player scored, by the division they end it in (more in division I).
 * `gate` is a result needed to enter the league, whatever the points.
 */
export const TIERS = Object.freeze([
  { id: 'bronze', label: 'Bronze', color: '#c97a3d', divisions: 3, step: 100, upkeep: 0, reward: t(30) },
  { id: 'silver', label: 'Argent', color: '#aab4c3', divisions: 3, step: 150, upkeep: 10, reward: t(80) },
  { id: 'gold', label: 'Or', color: '#ffc21a', divisions: 3, step: 200, upkeep: 20, reward: t(180) },
  { id: 'platinum', label: 'Platine', color: '#6fe0d6', divisions: 3, step: 300, upkeep: 35, reward: t(360) },
  { id: 'diamond', label: 'Diamant', color: '#9aa8ff', divisions: 3, step: 400, upkeep: 50, reward: t(700) },
  {
    id: 'master',
    label: 'Maître',
    color: '#c56bff',
    divisions: 1,
    step: 1050,
    upkeep: 70,
    reward: t(1200),
    gate: 'top10',
  },
  { id: 'legend', label: 'Légende', color: '#ff4d6d', divisions: 1, step: 0, upkeep: 90, reward: t(2000), gate: 'first' },
])

/** What opens a gated league, in words. */
export const GATES = Object.freeze({
  top10: 'Finir une journée dans le top 10',
  first: 'Finir une journée à la 1re place',
})

/** Daily gain: PL for the score (6 × √XP, at most PERF_CAP)... */
export const PERF_FACTOR = 6
export const PERF_CAP = 150

/** ...plus a bonus for the final rank (`top` rank or `share` of the players who scored). */
export const RANK_BONUS = Object.freeze([
  { top: 1, lp: 80 },
  { top: 3, lp: 50 },
  { top: 10, lp: 30 },
  { share: 0.25, lp: 20 },
  { share: 0.5, lp: 8 },
])

/** A day without any XP costs the upkeep, and at least this. */
export const INACTIVE_PENALTY = 10

/** Days settled when a player comes back; older ones are skipped (neither paid nor penalised). */
export const MAX_WEEKS_TO_FETCH = 7

/** Days kept in a player's league history. */
export const LEAGUE_HISTORY = 10

/**
 * Rank rewards, on top of the division's. `top` is a rank (1, 3, 10) or a share
 * of the players who scored (0.25 = top 25 %). The first tier that matches wins.
 */
export const RANK_REWARDS = Object.freeze([
  {
    id: 'first',
    label: '1re place',
    top: 1,
    reward: { tokens: t(2000), items: ['title-champion', 'laurel', 'medal'] },
  },
  {
    id: 'podium',
    label: 'Podium',
    top: 3,
    reward: { tokens: t(1000), items: ['title-podium', 'medal'] },
  },
  { id: 'top10', label: 'Top 10', top: 10, reward: { tokens: t(500), items: ['laurel'] } },
  { id: 'top25', label: 'Top 25 %', share: 0.25, reward: { tokens: t(200), items: [] } },
])

/** Players shown on a board. */
export const BOARD_SIZE = 50
