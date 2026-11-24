/**
 * Weekly seasons. A season runs from Monday 00:00 UTC to the next Monday.
 * Its score is the experience (XP) earned during the week. At the end,
 * every player who scored gets their league's reward, and the best of the
 * week a rank reward on top, claimed the next time they open the game.
 */

const t = (tokens) => tokens * 100

/** Leagues by weekly score, lowest first. */
export const LEAGUES = Object.freeze([
  { id: 'bronze', label: 'Bronze', min: 1, color: '#c97a3d', reward: { tokens: t(300) } },
  { id: 'silver', label: 'Argent', min: 60, color: '#aab4c3', reward: { tokens: t(800) } },
  { id: 'gold', label: 'Or', min: 200, color: '#ffc21a', reward: { tokens: t(2000) } },
  { id: 'platinum', label: 'Platine', min: 500, color: '#6fe0d6', reward: { tokens: t(4000) } },
  { id: 'diamond', label: 'Diamant', min: 1000, color: '#9aa8ff', reward: { tokens: t(8000) } },
])

/**
 * Rank rewards, on top of the league's. `top` is a rank (1, 3, 10) or a share
 * of the players who scored (0.25 = top 25 %). The first tier that matches wins.
 */
export const RANK_REWARDS = Object.freeze([
  {
    id: 'first',
    label: '1re place',
    top: 1,
    reward: { tokens: t(10000), items: ['title-champion', 'laurel', 'medal'] },
  },
  {
    id: 'podium',
    label: 'Podium',
    top: 3,
    reward: { tokens: t(5000), items: ['title-podium', 'medal'] },
  },
  { id: 'top10', label: 'Top 10', top: 10, reward: { tokens: t(2500), items: ['laurel'] } },
  { id: 'top25', label: 'Top 25 %', share: 0.25, reward: { tokens: t(1000), items: [] } },
])

/** Players shown on a board. */
export const BOARD_SIZE = 50
