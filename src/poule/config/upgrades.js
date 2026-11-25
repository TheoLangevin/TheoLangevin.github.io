/**
 * The shop catalog. Goodies change how the hen, the road and the party look,
 * or how the game handles, never the chance of crossing a lane: the odds stay
 * the ones the mode shows.
 *
Every item is paid in tokens (the game's chips, in cents like every amount).
 * `level` is the level needed to buy it. `exclusive` items cannot be bought: they are season
 * rewards (domain/seasons.js). `secret` items are not listed: the shop
 * reveals them to players who look for them. One item per slot can be worn at a time, except
 * perks, which are always on once owned.
 */

const t = (tokens) => tokens * 100

export const SLOTS = Object.freeze([
  { id: 'hat', label: 'Chapeaux' },
  { id: 'neck', label: 'Cou' },
  { id: 'plumage', label: 'Plumages' },
  { id: 'trail', label: 'Traînées' },
  { id: 'road', label: 'Routes' },
  { id: 'party', label: 'Confettis' },
  { id: 'title', label: 'Titres' },
  { id: 'skin', label: 'Skins' },
  { id: 'perk', label: 'Atouts' },
])

export const UPGRADES = Object.freeze(
  [
    // Hats
    { id: 'cap', slot: 'hat', label: 'Casquette', currency: 'tokens', cost: t(400), level: 1 },
    { id: 'shades', slot: 'hat', label: 'Lunettes de soleil', currency: 'tokens', cost: t(900), level: 2 },
    { id: 'helmet', slot: 'hat', label: 'Casque de chantier', currency: 'tokens', cost: t(1600), level: 4 },
    { id: 'crown', slot: 'hat', label: 'Couronne', currency: 'tokens', cost: t(4000), level: 8 },
    { id: 'beanie', slot: 'hat', label: 'Bonnet', currency: 'tokens', cost: t(800), level: 1 },
    { id: 'beret', slot: 'hat', label: 'Béret', currency: 'tokens', cost: t(1200), level: 1 },
    { id: 'party-hat', slot: 'hat', label: 'Chapeau de fête', currency: 'tokens', cost: t(1500), level: 1 },
    { id: 'chef', slot: 'hat', label: 'Toque de chef', currency: 'tokens', cost: t(2000), level: 2 },
    { id: 'cowboy', slot: 'hat', label: 'Chapeau de cowboy', currency: 'tokens', cost: t(2500), level: 2 },
    { id: 'pirate', slot: 'hat', label: 'Bicorne de pirate', currency: 'tokens', cost: t(3000), level: 3 },
    { id: 'top-hat', slot: 'hat', label: 'Haut-de-forme', currency: 'tokens', cost: t(4000), level: 4 },
    { id: 'viking', slot: 'hat', label: 'Casque viking', currency: 'tokens', cost: t(5000), level: 5 },
    { id: 'wizard', slot: 'hat', label: 'Chapeau de mage', currency: 'tokens', cost: t(7000), level: 6 },
    { id: 'halo', slot: 'hat', label: 'Auréole', currency: 'tokens', cost: t(12000), level: 8 },
    { id: 'laurel', slot: 'hat', label: 'Couronne de laurier', exclusive: true, level: 1 },
    // Hidden in the shop (tap the hen in the dressing room a few times).
    {
      id: 'cone',
      slot: 'hat',
      label: 'Ceci n’est pas un chapeau',
      description: 'Un plot de chantier. Clairement pas un chapeau.',
      secret: true,
      currency: 'tokens',
      cost: t(4444),
      level: 1,
    },

    // Around the neck
    { id: 'bow-tie', slot: 'neck', label: 'Nœud papillon', currency: 'tokens', cost: t(600), level: 1 },
    { id: 'scarf', slot: 'neck', label: 'Écharpe', currency: 'tokens', cost: t(1000), level: 1 },
    { id: 'bell', slot: 'neck', label: 'Clochette', currency: 'tokens', cost: t(1800), level: 2 },
    { id: 'gold-chain', slot: 'neck', label: 'Chaîne en or', currency: 'tokens', cost: t(6000), level: 5 },
    { id: 'medal', slot: 'neck', label: 'Médaille du podium', exclusive: true, level: 1 },

    // Plumage
    {
      id: 'russet',
      slot: 'plumage',
      label: 'Roux',
      currency: 'tokens',
      cost: t(600),
      level: 1,
      colors: ['#d9793b', '#b85f27'],
    },
    {
      id: 'ink',
      slot: 'plumage',
      label: 'Noir',
      currency: 'tokens',
      cost: t(1400),
      level: 3,
      colors: ['#2e2f36', '#1d1e24'],
    },
    {
      id: 'gold',
      slot: 'plumage',
      label: 'Doré',
      currency: 'tokens',
      cost: t(5000),
      level: 10,
      colors: ['#ffcf33', '#e0a400'],
    },
    {
      id: 'pink',
      slot: 'plumage',
      label: 'Rose bonbon',
      currency: 'tokens',
      cost: t(1500),
      level: 1,
      colors: ['#ff9ec7', '#e66fa3'],
    },
    {
      id: 'sky',
      slot: 'plumage',
      label: 'Bleu ciel',
      currency: 'tokens',
      cost: t(1500),
      level: 1,
      colors: ['#8fd3ff', '#57aee6'],
    },
    {
      id: 'mint',
      slot: 'plumage',
      label: 'Menthe',
      currency: 'tokens',
      cost: t(2000),
      level: 2,
      colors: ['#9ff0c8', '#5fcf98'],
    },
    {
      id: 'lavender',
      slot: 'plumage',
      label: 'Lavande',
      currency: 'tokens',
      cost: t(2500),
      level: 3,
      colors: ['#c9b3ff', '#9c82e6'],
    },
    {
      id: 'rainbow',
      slot: 'plumage',
      label: 'Arc-en-ciel',
      currency: 'tokens',
      cost: t(8000),
      level: 6,
      colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b06bff'],
    },
    {
      id: 'galaxy',
      slot: 'plumage',
      label: 'Galaxie',
      currency: 'tokens',
      cost: t(10000),
      level: 7,
      colors: ['#2b1055', '#7597de', '#d16ba5'],
    },

    // Trails
    {
      id: 'dust',
      slot: 'trail',
      label: 'Poussière',
      currency: 'tokens',
      cost: t(800),
      level: 2,
      trail: { shape: 'round', colors: ['#c9b9a0'] },
    },
    {
      id: 'sparkles',
      slot: 'trail',
      label: 'Étincelles',
      currency: 'tokens',
      cost: t(2600),
      level: 6,
      trail: { shape: 'diamond', colors: ['#ffc21a'] },
    },
    {
      id: 'hearts',
      slot: 'trail',
      label: 'Cœurs',
      currency: 'tokens',
      cost: t(1000),
      level: 1,
      trail: { shape: 'glyph', glyph: '♥', colors: ['#ff5c8a', '#ff9ec7'] },
    },
    {
      id: 'bubbles',
      slot: 'trail',
      label: 'Bulles',
      currency: 'tokens',
      cost: t(1200),
      level: 1,
      trail: { shape: 'ring', colors: ['#8fd3ff', '#ffffff'] },
    },
    {
      id: 'notes',
      slot: 'trail',
      label: 'Notes de musique',
      currency: 'tokens',
      cost: t(2000),
      level: 2,
      trail: { shape: 'glyph', glyph: '♪', colors: ['#ffffff', '#c9b3ff'] },
    },
    {
      id: 'coins',
      slot: 'trail',
      label: 'Pièces',
      currency: 'tokens',
      cost: t(3500),
      level: 3,
      trail: { shape: 'coin', colors: ['#ffc21a', '#e0a400'] },
    },
    {
      id: 'flames',
      slot: 'trail',
      label: 'Flammes',
      currency: 'tokens',
      cost: t(5000),
      level: 5,
      trail: { shape: 'flame', colors: ['#ff6b2c', '#ffc21a'] },
    },
    {
      id: 'stars',
      slot: 'trail',
      label: 'Étoiles filantes',
      currency: 'tokens',
      cost: t(7500),
      level: 6,
      trail: { shape: 'glyph', glyph: '★', colors: ['#fff3a8', '#ffc21a'] },
    },

    // Road themes
    { id: 'beach', slot: 'road', label: 'Bord de mer', currency: 'tokens', cost: t(2500), level: 1 },
    { id: 'snow', slot: 'road', label: 'Route enneigée', currency: 'tokens', cost: t(3000), level: 2 },
    { id: 'desert', slot: 'road', label: 'Route 66', currency: 'tokens', cost: t(4000), level: 3 },
    { id: 'forest', slot: 'road', label: 'Chemin forestier', currency: 'tokens', cost: t(4000), level: 3 },
    { id: 'neon', slot: 'road', label: 'Néon', currency: 'tokens', cost: t(8000), level: 5 },
    { id: 'moon', slot: 'road', label: 'Base lunaire', currency: 'tokens', cost: t(12000), level: 7 },

    // Confetti palettes
    {
      id: 'confetti-gold',
      slot: 'party',
      label: 'Pluie d’or',
      currency: 'tokens',
      cost: t(1500),
      level: 1,
      colors: ['#ffc21a', '#fff1a8', '#e0a400', '#ffffff'],
    },
    {
      id: 'confetti-candy',
      slot: 'party',
      label: 'Bonbons',
      currency: 'tokens',
      cost: t(1500),
      level: 1,
      colors: ['#ff9ec7', '#8fd3ff', '#9ff0c8', '#c9b3ff'],
    },
    {
      id: 'confetti-tricolore',
      slot: 'party',
      label: 'Tricolore',
      currency: 'tokens',
      cost: t(2500),
      level: 2,
      colors: ['#1f4fbf', '#ffffff', '#e8392c'],
    },

    // Titles, shown next to the pseudo on the leaderboard and the profile
    { id: 'title-chick', slot: 'title', label: 'Poussin', currency: 'tokens', cost: t(500), level: 1 },
    { id: 'title-daredevil', slot: 'title', label: 'Casse-cou', currency: 'tokens', cost: t(3000), level: 3 },
    { id: 'title-road-king', slot: 'title', label: 'Reine de la route', currency: 'tokens', cost: t(9000), level: 6 },
    { id: 'title-legend', slot: 'title', label: 'Légende', currency: 'tokens', cost: t(25000), level: 10 },
    { id: 'title-champion', slot: 'title', label: 'Championne de la semaine', exclusive: true, level: 1 },
    { id: 'title-podium', slot: 'title', label: 'Sur le podium', exclusive: true, level: 1 },

    // Game skins: they change the hen and the traffic together.
    {
      id: 'skin-roadworks',
      slot: 'skin',
      label: 'Chantier',
      description: 'La poule devient un plot, les voitures des bulldozers. Offert aux joueurs de la bêta.',
      exclusive: true,
      beta: true,
      skin: 'roadworks',
      level: 1,
    },

    // Perks
    {
      id: 'turbo',
      slot: 'perk',
      label: 'Pas rapide',
      description: 'La poule saute deux fois plus vite.',
      currency: 'tokens',
      cost: t(700),
      level: 1,
    },
    {
      id: 'autocash',
      slot: 'perk',
      label: 'Encaissement auto',
      description: 'Encaisse tout seul au multiplicateur que vous fixez.',
      currency: 'tokens',
      cost: t(1500),
      level: 3,
    },
  ].map((item) => Object.freeze(item)),
)

const BY_ID = Object.freeze(Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade])))

export const upgradeById = (id) => BY_ID[id] ?? null

/** Default plumage when none is worn. */
export const WHITE_PLUMAGE = Object.freeze({ color: '#ffffff', shade: '#e4e1d6' })

/** Default confetti colours. */
export const DEFAULT_CONFETTI = ['#ffc21a', '#e8392c', '#2f7de1', '#1f9d55', '#ffffff', '#f08a24']

/** Choices offered for the auto cash-out target. */
export const AUTOCASH_TARGETS = [1.5, 2, 3, 5, 10]
