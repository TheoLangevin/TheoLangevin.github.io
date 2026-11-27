/**
 * The worlds beyond the farm. Each one opens through a portal paid in eggs,
 * has its own currency, its own buildings and a factory that boosts them.
 * What a world produces in all (its lifetime) boosts the farm's eggs:
 * WORLD_FARM_BONUS per power of ten. Worlds stay through moves.
 */

export const WORLD_COST_GROWTH = 1.17
/** Each factory adds this share to its world's production. */
export const FACTORY_BOOST = 0.05
/** Farm production bonus per power of ten a world produced in all. */
export const WORLD_FARM_BONUS = 0.1
/** What a tap lays in a world: 1, plus this share of the world's production per second. */
export const WORLD_TAP_SHARE = 0.02
/** Currency given when a portal opens, to build the first building. */
export const PORTAL_GIFT = 25

/** Buildings of a world, scaled: costs ×`cost`, production ×`pps`. */
const ladder = (names, cost, pps, factory) =>
  names.map(([id, icon, label], index) => {
    const base = [20, 250, 3500, 50000, 800000, 1.5e7][index]
    const rate = [0.2, 2, 22, 260, 3200, 45000][index]
    return id === factory.id
      ? { id, icon, label, cost: base * cost * 2, pps: 0, factory: true }
      : { id, icon, label, cost: base * cost, pps: rate * pps }
  })

export const WORLDS = Object.freeze(
  [
    {
      id: 'island',
      icon: '🏝️',
      label: 'L’Île aux Coquillages',
      currency: { icon: '🐚', label: 'coquillages' },
      portal: 5e8,
      hat: '🤿',
      blurb: 'Des poules en vacances, des coquillages à perte de vue.',
      buildings: ladder(
        [
          ['shell-beach', '🏖️', 'Plage à coquillages'],
          ['crab', '🦀', 'Crabe ramasseur'],
          ['hut', '🛖', 'Paillote'],
          ['shell-factory', '🏭', 'Usine à nacre'],
          ['reef', '🪸', 'Récif de corail'],
          ['pirate', '🏴‍☠️', 'Navire pirate'],
        ],
        1,
        1,
        { id: 'shell-factory' },
      ),
    },
    {
      id: 'pole',
      icon: '🏔️',
      label: 'Le Pôle Plumé',
      currency: { icon: '❄️', label: 'cristaux de givre' },
      portal: 5e10,
      hat: '🧣',
      blurb: 'Il fait −40°, les poules portent des écharpes.',
      buildings: ladder(
        [
          ['igloo', '🛖', 'Igloo douillet'],
          ['penguin', '🐧', 'Pingouin livreur'],
          ['sled', '🛷', 'Traîneau à givre'],
          ['ice-factory', '🏭', 'Usine à glaçons'],
          ['aurora', '🌌', 'Aurore boréale'],
          ['glacier', '🏔️', 'Glacier éternel'],
        ],
        8,
        3,
        { id: 'ice-factory' },
      ),
    },
    {
      id: 'desert',
      icon: '🏜️',
      label: 'Le Désert d’Or',
      currency: { icon: '🪙', label: 'pépites' },
      portal: 5e12,
      hat: '🤠',
      blurb: 'Ruée vers l’or, version poulailler.',
      buildings: ladder(
        [
          ['sieve', '🥘', 'Tamis à pépites'],
          ['camel', '🐪', 'Caravane de chameaux'],
          ['mine', '⛏️', 'Mine d’or'],
          ['gold-factory', '🏭', 'Fonderie'],
          ['oasis', '🌴', 'Oasis secrète'],
          ['sphinx', '🗿', 'Sphinx à œufs'],
        ],
        60,
        9,
        { id: 'gold-factory' },
      ),
    },
    {
      id: 'city',
      icon: '🏙️',
      label: 'La Cité Mécanique',
      currency: { icon: '⚙️', label: 'engrenages' },
      portal: 5e14,
      hat: '🦾',
      blurb: 'Des poules-robots et des usines à perte de vue.',
      buildings: ladder(
        [
          ['gearbox', '🧰', 'Boîte à engrenages'],
          ['robot', '🤖', 'Poule-robot'],
          ['assembly', '🦿', 'Chaîne de montage'],
          ['mega-factory', '🏭', 'Méga-usine'],
          ['reactor', '⚛️', 'Réacteur à œufs'],
          ['ai', '🧠', 'Cerveau central'],
        ],
        500,
        27,
        { id: 'mega-factory' },
      ),
    },
    {
      id: 'nebula',
      icon: '🌌',
      label: 'La Nébuleuse',
      currency: { icon: '✨', label: 'poussières d’étoile' },
      portal: 5e16,
      hat: '🪐',
      blurb: 'Au-delà des étoiles, la poule devient légende.',
      buildings: ladder(
        [
          ['comet', '☄️', 'Comète à œufs'],
          ['ufo', '🛸', 'Soucoupe poulette'],
          ['star', '⭐', 'Étoile couveuse'],
          ['star-factory', '🏭', 'Forge stellaire'],
          ['quasar', '💫', 'Quasar'],
          ['big-egg', '🥚', 'Œuf cosmique'],
        ],
        4000,
        81,
        { id: 'star-factory' },
      ),
    },
  ].map((world) => Object.freeze({ ...world, buildings: Object.freeze(world.buildings.map(Object.freeze)) })),
)

export const worldById = (id) => WORLDS.find((world) => world.id === id) ?? null
