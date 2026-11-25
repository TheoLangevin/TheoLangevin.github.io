/**
 * Daily missions: three a day, the same for everyone (picked from the date),
 * counted on the day's rounds (UTC). Each pays tokens once. A streak bonus
 * pays every day the player comes back, more for each day in a row (up to 7).
 */

const t = (tokens) => tokens * 100

export const MISSIONS = Object.freeze([
  { id: 'play10', label: 'Jouer 10 parties', goal: 10, metric: 'played', reward: t(60) },
  { id: 'lanes40', label: 'Traverser 40 voies', goal: 40, metric: 'lanes', reward: t(80) },
  { id: 'win5', label: 'Gagner 5 parties', goal: 5, metric: 'won', reward: t(70) },
  { id: 'x3', label: 'Encaisser à ×3 ou plus', goal: 1, metric: 'cashAt', at: 3, reward: t(120) },
  { id: 'x2medium', label: 'Encaisser à ×2 en Moyen', goal: 1, metric: 'cashAt', at: 2, mode: 'medium', reward: t(100) },
  { id: 'hard3', label: 'Gagner 3 parties en Difficile', goal: 3, metric: 'won', mode: 'hard', reward: t(120) },
  { id: 'hardcore1', label: 'Gagner une partie en Hardcore', goal: 1, metric: 'won', mode: 'hardcore', reward: t(150) },
  { id: 'run8', label: 'Traverser 8 voies d’un coup', goal: 1, metric: 'run', at: 8, reward: t(100) },
  { id: 'modes3', label: 'Gagner dans 3 modes', goal: 3, metric: 'modes', reward: t(90) },
])

export const MISSIONS_PER_DAY = 3

/** Tokens (cents) of the daily comeback bonus for a streak of `days`. */
export const streakBonus = (days) => t(20) * Math.min(7, Math.max(1, days))
