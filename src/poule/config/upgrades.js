/**
 * The upgrade shop. Upgrades change how the hen looks and how the game
 * handles, never the chance of crossing a lane: the odds stay the ones the
 * mode shows. One item per slot can be worn at a time; `perk` slots are
 * always on once bought.
 */
export const SLOTS = Object.freeze([
  { id: 'hat', label: 'Chapeau' },
  { id: 'plumage', label: 'Plumage' },
  { id: 'trail', label: 'Traînée' },
  { id: 'perk', label: 'Atouts' },
])

export const UPGRADES = Object.freeze([
  { id: 'cap', slot: 'hat', label: 'Casquette', cost: 40, level: 1 },
  { id: 'shades', slot: 'hat', label: 'Lunettes de soleil', cost: 90, level: 2 },
  { id: 'helmet', slot: 'hat', label: 'Casque de chantier', cost: 160, level: 4 },
  { id: 'crown', slot: 'hat', label: 'Couronne', cost: 400, level: 8 },

  { id: 'russet', slot: 'plumage', label: 'Plumage roux', cost: 60, level: 1, color: '#d9793b', shade: '#b85f27' },
  { id: 'ink', slot: 'plumage', label: 'Plumage noir', cost: 140, level: 3, color: '#2e2f36', shade: '#1d1e24' },
  { id: 'gold', slot: 'plumage', label: 'Plumage doré', cost: 500, level: 10, color: '#ffcf33', shade: '#e0a400' },

  { id: 'dust', slot: 'trail', label: 'Nuage de poussière', cost: 80, level: 2 },
  { id: 'sparkles', slot: 'trail', label: 'Étincelles', cost: 260, level: 6 },

  {
    id: 'turbo',
    slot: 'perk',
    label: 'Pas rapide',
    description: 'La poule saute deux fois plus vite.',
    cost: 70,
    level: 1,
  },
  {
    id: 'autocash',
    slot: 'perk',
    label: 'Encaissement auto',
    description: 'Encaisse tout seul au multiplicateur que vous fixez.',
    cost: 150,
    level: 3,
  },
])

const BY_ID = Object.freeze(Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade])))

export const upgradeById = (id) => BY_ID[id] ?? null

/** Default plumage when none is worn. */
export const WHITE_PLUMAGE = Object.freeze({ color: '#ffffff', shade: '#e4e1d6' })

/** Choices offered for the auto cash-out target. */
export const AUTOCASH_TARGETS = [1.5, 2, 3, 5, 10]
