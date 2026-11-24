/**
 * Achievements, checked after every round against totals from the database
 * (`stats`) and the profile. Each pays its reward in tokens once. They
 * reward variety and skill moments, not the amount of tokens bet.
 */
const t = (tokens) => tokens * 100

export const ACHIEVEMENTS = Object.freeze([
  {
    id: 'first-steps',
    label: 'Premiers pas',
    hint: 'Traverser une voie',
    reward: t(100),
    test: (s) => s.lanesCrossed >= 1,
  },
  { id: 'first-win', label: 'Bec et ongles', hint: 'Gagner une partie', reward: t(150), test: (s) => s.won >= 1 },
  {
    id: 'ten-lanes',
    label: 'Marathonienne',
    hint: 'Franchir 10 voies d’un coup',
    reward: t(400),
    test: (s) => s.bestLanes >= 10,
  },
  {
    id: 'all-modes',
    label: 'Touche-à-tout',
    hint: 'Gagner dans les 4 modes',
    reward: t(600),
    test: (s) => s.modesWon >= 4,
  },
  { id: 'hardcore', label: 'Sang-froid', hint: 'Gagner en Hardcore', reward: t(500), test: (s) => s.hardcoreWins >= 1 },
  {
    id: 'x10',
    label: 'Dix fois la mise',
    hint: 'Encaisser à x10 ou plus',
    reward: t(600),
    test: (s) => s.bestMultiplier >= 10,
  },
  { id: 'finish', label: 'De l’autre côté', hint: 'Atteindre l’arrivée', reward: t(1200), test: (s) => s.finished >= 1 },
  {
    id: 'hundred-lanes',
    label: 'Cent voies',
    hint: 'Traverser 100 voies au total',
    reward: t(500),
    test: (s) => s.lanesCrossed >= 100,
  },
  { id: 'dressed', label: 'Coquette', hint: 'Posséder 3 améliorations', reward: t(300), test: (s) => s.owned >= 3 },
  { id: 'level-5', label: 'Poule confirmée', hint: 'Atteindre le niveau 5', reward: t(500), test: (s) => s.level >= 5 },
  {
    id: 'level-10',
    label: 'Poule légendaire',
    hint: 'Atteindre le niveau 10',
    reward: t(1500),
    test: (s) => s.level >= 10,
  },
])

const BY_ID = Object.freeze(Object.fromEntries(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement])))

export const achievementById = (id) => BY_ID[id] ?? null
