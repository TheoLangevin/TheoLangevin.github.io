/**
 * Achievements, checked after every round against totals from the database
 * (`stats`) and the profile. Each pays its reward in feathers once. They
 * reward variety and skill moments, not the amount of tokens bet.
 */
export const ACHIEVEMENTS = Object.freeze([
  {
    id: 'first-steps',
    label: 'Premiers pas',
    hint: 'Traverser une voie',
    reward: 10,
    test: (s) => s.lanesCrossed >= 1,
  },
  { id: 'first-win', label: 'Bec et ongles', hint: 'Gagner une partie', reward: 15, test: (s) => s.won >= 1 },
  {
    id: 'ten-lanes',
    label: 'Marathonienne',
    hint: 'Franchir 10 voies d’un coup',
    reward: 40,
    test: (s) => s.bestLanes >= 10,
  },
  {
    id: 'all-modes',
    label: 'Touche-à-tout',
    hint: 'Gagner dans les 4 modes',
    reward: 60,
    test: (s) => s.modesWon >= 4,
  },
  { id: 'hardcore', label: 'Sang-froid', hint: 'Gagner en Hardcore', reward: 50, test: (s) => s.hardcoreWins >= 1 },
  {
    id: 'x10',
    label: 'Dix fois la mise',
    hint: 'Encaisser à x10 ou plus',
    reward: 60,
    test: (s) => s.bestMultiplier >= 10,
  },
  { id: 'finish', label: 'De l’autre côté', hint: 'Atteindre l’arrivée', reward: 120, test: (s) => s.finished >= 1 },
  {
    id: 'hundred-lanes',
    label: 'Cent voies',
    hint: 'Traverser 100 voies au total',
    reward: 50,
    test: (s) => s.lanesCrossed >= 100,
  },
  { id: 'dressed', label: 'Coquette', hint: 'Posséder 3 améliorations', reward: 30, test: (s) => s.owned >= 3 },
  { id: 'level-5', label: 'Poule confirmée', hint: 'Atteindre le niveau 5', reward: 50, test: (s) => s.level >= 5 },
  {
    id: 'level-10',
    label: 'Poule légendaire',
    hint: 'Atteindre le niveau 10',
    reward: 150,
    test: (s) => s.level >= 10,
  },
])

const BY_ID = Object.freeze(Object.fromEntries(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement])))

export const achievementById = (id) => BY_ID[id] ?? null
