/**
 * Le Poulailler: a clicker next to the road. Tapping the big hen lays eggs;
 * buildings lay eggs on their own; special hens and upgrades multiply them.
 *
 * Eggs are their own currency. They reach tokens only through the egg market,
 * capped per day (MARKET_DAILY_CAP), so the clicker can never flood the game's
 * economy: balances, leagues, talents and the pass keep their meaning.
 * Special hens act on the coop only, never on tokens or on the road's odds.
 */

const t = (tokens) => tokens * 100

/** Buildings: each one lays `pps` eggs per second; the price grows ×COST_GROWTH per one owned. */
export const COST_GROWTH = 1.15
export const BUILDINGS = Object.freeze(
  [
    { id: 'nest', icon: '🪺', label: 'Nid douillet', cost: 15, pps: 0.1 },
    { id: 'straw', icon: '🌾', label: 'Botte de paille', cost: 50, pps: 0.4 },
    { id: 'perch', icon: '🪵', label: 'Perchoir', cost: 100, pps: 1 },
    { id: 'waterer', icon: '🚰', label: 'Abreuvoir', cost: 400, pps: 3 },
    { id: 'feeder', icon: '🥣', label: 'Mangeoire automatique', cost: 1100, pps: 8 },
    { id: 'shed', icon: '🛖', label: 'Cabane de jardin', cost: 4000, pps: 22 },
    { id: 'incubator', icon: '🔆', label: 'Couveuse', cost: 12000, pps: 47 },
    { id: 'orchard', icon: '🍎', label: 'Verger picoreur', cost: 40000, pps: 120 },
    { id: 'silo', icon: '🏭', label: 'Silo à grain', cost: 130000, pps: 260 },
    { id: 'mill', icon: '🌬️', label: 'Moulin à vent', cost: 450000, pps: 650 },
    { id: 'farm', icon: '🚜', label: 'Élevage industriel', cost: 1400000, pps: 1400 },
    { id: 'greenhouse', icon: '🌴', label: 'Serre tropicale', cost: 5000000, pps: 3500 },
    { id: 'rocket', icon: '🚀', label: 'Fusée à œufs', cost: 20000000, pps: 7800 },
    { id: 'lab', icon: '🧪', label: 'Labo à omelettes', cost: 75000000, pps: 20000 },
    { id: 'chocolate', icon: '🍫', label: 'Usine à œufs en chocolat', cost: 330000000, pps: 60000 },
    { id: 'cloud', icon: '☁️', label: 'Perchoir dans les nuages', cost: 1.5e9, pps: 180000 },
    { id: 'moon', icon: '🌕', label: 'Base lunaire', cost: 7e9, pps: 500000 },
    { id: 'pyramid', icon: '🔺', label: 'Pyramide de l’œuf', cost: 3.5e10, pps: 1.4e6 },
    { id: 'portal', icon: '🌀', label: 'Portail temporel', cost: 1.8e11, pps: 4e6 },
    { id: 'volcano', icon: '🌋', label: 'Volcan à œufs durs', cost: 1e12, pps: 1.2e7 },
    { id: 'dragon', icon: '🐉', label: 'Nid de dragon', cost: 6e12, pps: 3.5e7 },
    { id: 'galaxy', icon: '🌌', label: 'Galaxie poulette', cost: 4e13, pps: 1.1e8 },
    { id: 'blackhole', icon: '🕳️', label: 'Trou noir cocotte', cost: 3e14, pps: 3.5e8 },
    { id: 'multiverse', icon: '🪐', label: 'Multivers du poulet', cost: 2.5e15, pps: 1.2e9 },
    { id: 'origin', icon: '🐓', label: 'Poule originelle', cost: 2.5e16, pps: 4.5e9 },
].map((building) => Object.freeze(building)),
)

/**
 * Upgrades, bought once with eggs. `building` doubles one building's eggs
 * (needs `owned` of it); `tap` multiplies each tap; `tapPps` adds a share of
 * the production per second to each tap.
 */
export const COOP_UPGRADES = Object.freeze(
  [
    { id: 'tap-1', label: 'Doigts de fée', detail: 'Chaque toucher pond 2 fois plus', cost: 100, tap: 2 },
    { id: 'tap-2', label: 'Gants de fermier', detail: 'Chaque toucher pond 2 fois plus', cost: 5000, tap: 2 },
    { id: 'tap-3', label: 'Main verte', detail: 'Chaque toucher pond aussi 1 % de la production/s', cost: 50000, tapPps: 0.01 },
    { id: 'tap-4', label: 'Toucher magique', detail: 'Chaque toucher pond aussi 3 % de la production/s', cost: 5000000, tapPps: 0.03 },
    ...BUILDINGS.flatMap((building) => [
      { id: `${building.id}-1`, label: `${building.label} ×2`, detail: `Production des « ${building.label} » doublée`, cost: building.cost * 10, building: building.id, owned: 1 },
      { id: `${building.id}-2`, label: `${building.label} ×2 (bis)`, detail: `Encore doublée`, cost: building.cost * 50, building: building.id, owned: 10 },
      { id: `${building.id}-3`, label: `${building.label} ×2 (ter)`, detail: `Encore doublée`, cost: building.cost * 500, building: building.id, owned: 25 },
    ]),
  ].map((upgrade) => Object.freeze(upgrade)),
)

/** Rarities of special hens, with their chance when an egg hatches. */
export const HEN_RARITIES = Object.freeze([
  { id: 'common', label: 'Commune', chance: 0.6, color: '#9aa4b2' },
  { id: 'rare', label: 'Rare', chance: 0.28, color: '#3b82f6' },
  { id: 'epic', label: 'Épique', chance: 0.1, color: '#a855f7' },
  { id: 'legendary', label: 'Légendaire', chance: 0.02, color: '#f59e0b' },
])

/**
 * Special hens: three can be placed in the coop at a time. Bonuses:
 * tap / production / buildings ({ id: share }) / golden (golden egg more
 * often) / frenzy (seconds added) / offline (share kept while away) /
 * market (fewer eggs per token) / goldenTap (chance a tap is worth ×50).
 */
export const SPECIAL_HENS = Object.freeze(
  [
    { id: 'cocotte', icon: '🐔', label: 'Cocotte', rarity: 'common', bonus: { tap: 0.25 }, detail: '+25 % par toucher' },
    { id: 'poulette', icon: '🐣', label: 'Poulette', rarity: 'common', bonus: { buildings: { nest: 0.5, perch: 0.5 } }, detail: 'Nids et perchoirs +50 %' },
    { id: 'grisette', icon: '🪶', label: 'Grisette', rarity: 'common', bonus: { production: 0.05 }, detail: '+5 % de production' },
    { id: 'rousse', icon: '🦊', label: 'La Rousse', rarity: 'common', bonus: { golden: 0.15 }, detail: 'Œuf doré 15 % plus fréquent' },
    { id: 'mecanique', icon: '🤖', label: 'Poule Mécanique', rarity: 'rare', bonus: { buildings: { feeder: 0.3, incubator: 0.3 } }, detail: 'Mangeoires et couveuses +30 %' },
    { id: 'fermiere', icon: '👩‍🌾', label: 'Poule Fermière', rarity: 'rare', bonus: { production: 0.12 }, detail: '+12 % de production' },
    { id: 'pressee', icon: '⚡', label: 'Poule Pressée', rarity: 'rare', bonus: { frenzy: 10 }, detail: 'Frénésie +10 s' },
    { id: 'marchande', icon: '💼', label: 'Poule Marchande', rarity: 'rare', bonus: { market: 0.2 }, detail: 'Marché : 20 % d’œufs en moins par jeton' },
    { id: 'fantome', icon: '👻', label: 'Poule Fantôme', rarity: 'epic', bonus: { offline: 0.15 }, detail: 'Hors ligne : +15 % de la production' },
    { id: 'disco', icon: '🪩', label: 'Poule Disco', rarity: 'epic', bonus: { tap: 1 }, detail: '+100 % par toucher' },
    { id: 'savante', icon: '🎓', label: 'Poule Savante', rarity: 'epic', bonus: { production: 0.25 }, detail: '+25 % de production' },
    { id: 'doree', icon: '👑', label: 'Poule Dorée', rarity: 'legendary', bonus: { goldenTap: 0.01, production: 0.3 }, detail: '+30 % de production, 1 % de touchers en or (×50)' },
    { id: 'neige', icon: '☃️', label: 'Poule des Neiges', rarity: 'epic', event: 'noel', bonus: { production: 0.15, golden: 0.25 }, detail: '+15 % de production, œuf doré 25 % plus fréquent' },
  ].map((hen) => Object.freeze(hen)),
)

export const HEN_SLOTS = 3
/** A duplicate hen levels up the one owned (up to HEN_MAX_LEVEL); each level adds half the base bonus. */
export const HEN_MAX_LEVEL = 5
export const HEN_LEVEL_STEP = 0.5

/**
 * The coop starts bare: only the hen to tap. Each part shows up once the
 * eggs laid in all moves reach its threshold, so a new player learns one
 * thing at a time. Buildings show up one by one (see BUILDING_REVEAL).
 */
export const UNLOCKS = Object.freeze({
  upgrades: 50,
  trophies: 500,
  golden: 3000,
  hens: 25000,
  market: 200000,
  skins: 2e6,
  prestige: 2e8,
})
/** A building shows up once the eggs in hand reach this share of its price (and stays). */
export const BUILDING_REVEAL = 0.5

/** Owning this many of one building doubles its eggs, for each step reached. */
export const MILESTONES = Object.freeze([50, 100, 200, 400])
/** A building's level: one more per milestone reached, each with its look. */
export const BUILDING_TIERS = Object.freeze([
  { label: 'Bois', color: '#a0703c' },
  { label: 'Bronze', color: '#cd7f32' },
  { label: 'Argent', color: '#c0c7d0' },
  { label: 'Or', color: '#ffc21a' },
  { label: 'Diamant', color: '#7fe3ff' },
])

/** Each trophy adds this share to production; trophies stay through moves. */
export const TROPHY_BONUS = 0.02
const fmt = (n) => (n >= 1e9 ? `${n / 1e9} Md` : n >= 1e6 ? `${n / 1e6} M` : n.toLocaleString('fr-FR'))
export const TROPHIES = Object.freeze(
  [
    ...[
      [1e3, 'Premier panier'],
      [1e5, 'Omelette géante'],
      [1e7, 'Marché de gros'],
      [1e9, 'Empire de l’œuf'],
      [1e11, 'Œuf cosmique'],
      [1e13, 'Big Bang de l’œuf'],
    ].map(([n, label]) => ({ id: `eggs-${n}`, icon: '🥚', label, detail: `${fmt(n)} œufs pondus en tout`, stat: 'lifetime', at: n })),
    ...[
      [100, 'Doigt agile'],
      [1000, 'Tendinite'],
      [10000, 'Pianiste'],
      [50000, 'Marteau-piqueur'],
    ].map(([n, label]) => ({ id: `taps-${n}`, icon: '👆', label, detail: `${fmt(n)} touchers`, stat: 'taps', at: n })),
    ...BUILDINGS.flatMap((b) =>
      [10, 50, 100].map((n) => ({ id: `${b.id}-${n}`, icon: b.icon, label: `${b.label} ×${n}`, detail: `Posséder ${n} « ${b.label} »`, stat: `building:${b.id}`, at: n })),
    ),
    ...[
      [3, 'Basse-cour'],
      [6, 'Collectionneur'],
      [12, 'Toutes les poules !'],
    ].map(([n, label]) => ({ id: `hens-${n}`, icon: '🐔', label, detail: `${n} poules spéciales`, stat: 'hens', at: n })),
    { id: 'hen-max', icon: '⭐', label: 'Poule étoilée', detail: `Une poule au niveau ${5}`, stat: 'henMax', at: 1 },
    ...[
      [1, 'Ruée vers l’or'],
      [10, 'Chasseur d’or'],
      [50, 'Midas'],
    ].map(([n, label]) => ({ id: `golden-${n}`, icon: '🌟', label, detail: `${n} œufs dorés attrapés`, stat: 'golden', at: n })),
    ...[
      [1, 'Passe-muraille'],
      [2, 'Globe-trotteuse'],
      [3, 'Exploratrice'],
      [4, 'Cosmopoule'],
      [5, 'Maîtresse des mondes'],
    ].map(([n, label]) => ({ id: `worlds-${n}`, icon: '🌀', label, detail: `${n} monde${n > 1 ? 's' : ''} ouvert${n > 1 ? 's' : ''}`, stat: 'worlds', at: n })),
    ...[
      [1, 'Nouveau départ'],
      [5, 'Nomade'],
      [20, 'Éternel retour'],
    ].map(([n, label]) => ({ id: `moves-${n}`, icon: '🚚', label, detail: `${n} déménagement${n > 1 ? 's' : ''}`, stat: 'moves', at: n })),
  ].map((trophy) => Object.freeze(trophy)),
)

/**
 * Prestige: « Déménager » resets eggs, buildings and upgrades for golden
 * feathers (hens, skins and trophies stay). Feathers earned in all are
 * floor(sqrt(lifetime / FEATHER_BASE)); each one adds FEATHER_BONUS to
 * production, and they are also spent on permanent perks (spending keeps the bonus).
 * Feathers never change the egg market's daily cap.
 */
/**
 * After a move the special hens settle in: their bonuses (and the hen
 * collections') start at 0 and come back as the new coop lays eggs, in full
 * once it has laid SETTLE_SHARE of what the last coop laid.
 */
export const SETTLE_SHARE = 0.1

export const FEATHER_BASE = 1e9
export const FEATHER_BONUS = 0.03
export const PERKS = Object.freeze(
  [
    { id: 'nest-memory', icon: '🧠', label: 'Mémoire du nid', detail: 'Chaque déménagement commence avec 10 nids et 5 perchoirs', cost: 1 },
    { id: 'golden-eye', icon: '👁️', label: 'Œil de lynx', detail: 'Œuf doré 50 % plus fréquent', cost: 3 },
    { id: 'gold-fingers', icon: '🫳', label: 'Doigts d’or', detail: 'Chaque toucher pond 3 fois plus', cost: 5 },
    { id: 'light-sleep', icon: '😴', label: 'Sommeil léger', detail: 'Hors ligne : jusqu’à 12 h et +10 % de production', cost: 8 },
    { id: 'cheap-hatch', icon: '🐣', label: 'Couveuse bénie', detail: 'Éclosions 30 % moins chères', cost: 12 },
    { id: 'fourth-slot', icon: '🏠', label: 'Grand perchoir', detail: 'Une 4ᵉ place pour une poule spéciale', cost: 20 },
    { id: 'haggler', icon: '🤝', label: 'Marchandeur', detail: 'Marché : 25 % d’œufs en moins par jeton', cost: 30 },
    { id: 'long-frenzy', icon: '🔥', label: 'Frénésie durable', detail: 'Frénésie +15 s', cost: 50 },
  ].map((perk) => Object.freeze(perk)),
)

/** Skins of the big hen (CSS look) and backdrops of the coop, bought with eggs. */
export const COOP_SKINS = Object.freeze(
  [
    { id: 'classic', kind: 'hen', label: 'Classique', cost: 0 },
    { id: 'ninja', kind: 'hen', label: 'Poule ninja', cost: 50000, accessory: '🥷' },
    { id: 'zombie', kind: 'hen', label: 'Poule zombie', cost: 500000, accessory: '🧟' },
    { id: 'space', kind: 'hen', label: 'Poule de l’espace', cost: 5000000, accessory: '👨‍🚀' },
    { id: 'gold', kind: 'hen', label: 'Poule en or massif', cost: 100000000, accessory: '✨' },
    { id: 'farm', kind: 'decor', label: 'La ferme', cost: 0 },
    { id: 'barn-night', kind: 'decor', label: 'Grange de nuit', cost: 200000 },
    { id: 'station', kind: 'decor', label: 'Station spatiale', cost: 20000000 },
    { id: 'snow', kind: 'decor', label: 'Ferme enneigée', cost: 1000, event: 'noel' },
  ].map((skin) => Object.freeze(skin)),
)

/** A rare egg drops on a tap with this chance; it hatches a special hen. */
export const RARE_EGG_CHANCE = 1 / 500
/** The incubator sells an egg to hatch for this many seconds of production (at least the floor). */
export const HATCH_SECONDS = 600
export const HATCH_FLOOR = 2000
/** A hen already at its top level gives this many seconds of production instead. */
export const DUPLICATE_SECONDS = 600

/** The golden egg: crosses the screen every so often; caught, it gives one of these. */
export const GOLDEN_EVERY = Object.freeze({ min: 60, max: 180 })
export const GOLDEN_STAYS = 8
export const FRENZY_MULTIPLIER = 7
export const FRENZY_SECONDS = 30
export const RAIN_SECONDS = 900
export const GOLDEN_REWARDS = Object.freeze([
  { id: 'frenzy', weight: 0.5 },
  { id: 'rain', weight: 0.42 },
  { id: 'hen', weight: 0.08 },
])

/** While the game is closed the coop lays this share of its production, for at most OFFLINE_CAP seconds. */
export const OFFLINE_SHARE = 0.25
export const OFFLINE_CAP = 8 * 3600
/** Gaps shorter than this count as played (the game ticks while open). */
export const ONLINE_GAP = 90

/** The egg market: eggs to tokens, at most this many tokens a day (UTC). */
export const MARKET_DAILY_CAP = t(800)
/** A token costs this many seconds of production (at least the floor), so the market scales with the coop. */
export const MARKET_SECONDS_PER_TOKEN = 36
export const MARKET_FLOOR = 100

/** Most taps one call may count (the screen sends taps in small batches). */
export const MAX_TAPS_PER_CALL = 200

/* ---------- Coming back every day ---------- */

/**
 * Orders of the farmer: three a day (UTC), the same kinds for everyone that
 * day. Goals scale with the coop. Each pays eggs; all three add an
 * incubator ticket (a free hatch).
 */
export const ORDERS_PER_DAY = 3
export const ORDER_KINDS = Object.freeze([
  { id: 'eggs', label: (goal) => `Pondre ${goal} œufs`, stat: 'lifetime', seconds: 1800, floor: 1000 },
  { id: 'taps', label: (goal) => `Toucher la poule ${goal} fois`, stat: 'taps', goal: 400 },
  { id: 'golden', label: (goal) => `Attraper ${goal} œufs dorés`, stat: 'golden', goal: 2, needs: 'golden' },
  { id: 'hatch', label: (goal) => `Faire éclore ${goal} œufs`, stat: 'hatched', goal: 2, needs: 'hens' },
  { id: 'buy', label: (goal) => `Acheter ${goal} bâtiments`, stat: 'bought', goal: 30 },
])
/** An order pays this many seconds of production (at least the floor). */
export const ORDER_REWARD_SECONDS = 900
export const ORDER_REWARD_FLOOR = 500

/** The farm calendar: come back each day; day 7 is the big one, then it starts over. */
export const CALENDAR = Object.freeze([
  { day: 1, seconds: 300 },
  { day: 2, seconds: 600 },
  { day: 3, seconds: 900, tickets: 1 },
  { day: 4, seconds: 1200 },
  { day: 5, seconds: 1500 },
  { day: 6, seconds: 1800 },
  { day: 7, seconds: 3600, tickets: 2 },
])
export const CALENDAR_FLOOR = 300

/** Every hen of a rarity collected adds this share to production (event hens aside). */
export const COLLECTION_BONUS = Object.freeze({ common: 0.05, rare: 0.1, epic: 0.15, legendary: 0.2 })

/** Family goal: the eggs laid this week by the family's members; each step pays tickets once a week. */
export const FAMILY_TIERS = Object.freeze([
  { label: 'Bronze', eggs: 1e6, tickets: 1 },
  { label: 'Argent', eggs: 1e8, tickets: 1 },
  { label: 'Or', eggs: 1e10, tickets: 2 },
  { label: 'Platine', eggs: 1e12, tickets: 2 },
  { label: 'Diamant', eggs: 1e14, tickets: 3 },
])

/** Winning a road round at this multiplier or more charges the coop's frenzy (outside challenge, tournament, duel). */
export const BOOST_MULTIPLIER = 3
export const BOOST_SECONDS = 20
export const BOOST_CAP = 120

/** Limited events: their hen and decor can only be won (or bought) between these days (UTC, inclusive). */
export const COOP_EVENTS = Object.freeze([
  { id: 'noel', label: 'Noël à la ferme', from: '2026-12-01', to: '2026-12-31', hen: 'neige', decor: 'snow' },
])
