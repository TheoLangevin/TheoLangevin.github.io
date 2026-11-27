import { ACHIEVEMENTS } from '../config/achievements.js'
import { CENTS, REFILL_BELOW, RTP } from '../config/economy.js'
import { MODES } from '../config/modes.js'
import { UPGRADES } from '../config/upgrades.js'
import { TIERS } from '../config/seasons.js'
import { divisionFor } from './leagues.js'
import { levelFromXp } from './progression.js'
import { validateSave } from './save.js'
import { BUILDINGS, COOP_SKINS, SPECIAL_HENS, TROPHIES, UNLOCKS } from '../config/coop.js'
import { production, unlocked } from './coop.js'
import { WORLDS } from '../config/worlds.js'

/**
 * The numbers of the admin screen, computed from every player's save (the
 * admin is the only one allowed to read them, see firestore.rules). Pure: the
 * account layer fetches, this only counts. Rounds are the last 1000 of each
 * player (what a save keeps), so totals cover recent play, not all history.
 */

const DAY = 86_400_000
export const STATS_DAYS = 14

const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10)
const sum = (values) => values.reduce((total, value) => total + value, 0)
const ratio = (part, whole) => (whole > 0 ? part / whole : null)

function median(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

/** Counts of `values` falling in each bucket: [{ label, count }], `edges` being upper bounds. */
function histogram(values, edges, labels) {
  const counts = labels.map((label) => ({ label, count: 0 }))
  for (const value of values) {
    let index = edges.findIndex((edge) => value < edge)
    if (index === -1) index = edges.length
    counts[index].count++
  }
  return counts
}

/** The last `days` UTC days ending at `now`, oldest first. */
function lastDays(now, days = STATS_DAYS) {
  return Array.from({ length: days }, (_, i) => dayKey(now - (days - 1 - i) * DAY))
}

/**
 * @param {object} input
 * @param {{ uid: string, createdAt: number | null, updatedAt: number | null, rev: number, save: object }[]} input.users
 * @param {{ uid: string, pseudo: string }[]} [input.profiles]  leaderboard lines (pseudos)
 * @param {number} input.now  ms
 */
export function computeAdminStats({ users, profiles = [], now }) {
  const pseudos = new Map(profiles.map((line) => [line.uid, line.pseudo]))
  const players = []
  let unreadable = 0
  for (const user of users) {
    const save = validateSave(user.save)
    if (!save) {
      unreadable++
      continue
    }
    players.push({ ...user, save, level: levelFromXp(save.xp), pseudo: pseudos.get(user.uid) ?? null })
  }

  const days = lastDays(now)
  const lastRound = (player) => {
    let at = 0
    for (const round of player.save.rounds) at = Math.max(at, Date.parse(round.endedAt) || 0)
    return at
  }
  const lastSeen = (player) => Math.max(player.updatedAt ?? 0, lastRound(player))
  const activeSince = (ms) => players.filter((player) => lastSeen(player) >= now - ms).length

  // Players

  const signups = Object.fromEntries(days.map((day) => [day, 0]))
  for (const player of players) {
    const day = player.createdAt ? dayKey(player.createdAt) : null
    if (day in signups) signups[day]++
  }
  const playersByDay = Object.fromEntries(days.map((day) => [day, new Set()]))
  const levels = players.map((player) => player.level)
  const balances = players.map((player) => player.save.balanceCents)

  // Rounds

  const rounds = players.flatMap((player) => player.save.rounds.map((round) => ({ ...round, uid: player.uid })))
  const won = rounds.filter((round) => round.status === 'won')
  const wagered = sum(rounds.map((round) => round.bet))
  const returned = sum(rounds.map((round) => round.payout))

  const perDay = Object.fromEntries(days.map((day) => [day, { played: 0, wagered: 0, returned: 0 }]))
  for (const round of rounds) {
    const day = round.endedAt ? dayKey(Date.parse(round.endedAt)) : null
    if (!(day in perDay)) continue
    perDay[day].played++
    perDay[day].wagered += round.bet
    perDay[day].returned += round.payout
    playersByDay[day].add(round.uid)
  }

  const byMode = MODES.map((mode) => {
    const list = rounds.filter((round) => round.mode === mode.id)
    const modeWon = list.filter((round) => round.status === 'won')
    const modeWagered = sum(list.map((round) => round.bet))
    return {
      id: mode.id,
      label: mode.label,
      played: list.length,
      winRate: ratio(modeWon.length, list.length),
      wagered: modeWagered,
      returned: sum(list.map((round) => round.payout)),
      rtp: ratio(sum(list.map((round) => round.payout)), modeWagered),
      avgLanes: list.length ? sum(list.map((round) => round.crossed)) / list.length : 0,
    }
  })

  const edges = [1.5, 3, 10, 50]
  const multipliers = histogram(
    won.map((round) => round.mult),
    edges,
    ['x1 à 1,5', 'x1,5 à 3', 'x3 à 10', 'x10 à 50', 'x50 et +'],
  )
  const bets = histogram(
    rounds.map((round) => round.bet / CENTS),
    [6, 21, 51, 101],
    ['1 à 5', '6 à 20', '21 à 50', '51 à 100', '101 et +'],
  )

  // Economy

  const broke = players.filter((player) => player.save.balanceCents < REFILL_BELOW).length

  // Shop and achievements

  const bought = UPGRADES.map((item) => {
    const owners = players.filter((player) => player.save.upgrades.includes(item.id)).length
    return { id: item.id, label: item.label, slot: item.slot, cost: item.cost ?? 0, exclusive: Boolean(item.exclusive), owners }
  })
  const spent = sum(bought.map((item) => item.owners * item.cost))
  const bySlot = {}
  for (const item of bought) bySlot[item.slot] = (bySlot[item.slot] ?? 0) + item.owners

  const unlocked = ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    label: achievement.label,
    count: players.filter((player) => player.save.achievements.includes(achievement.id)).length,
  }))

  // Seasons

  const claimsBySeason = {}
  for (const player of players) {
    for (const claim of player.save.claims) claimsBySeason[claim.season] = (claimsBySeason[claim.season] ?? 0) + 1
  }

  // Players worth a look: a return far above the game's RTP over enough rounds,
  // or a wallet far above what play could reasonably give. Scores are computed
  // in the browser, so this is where cheating would show.
  const flagged = players
    .map((player) => {
      const list = player.save.rounds
      const bet = sum(list.map((round) => round.bet))
      const back = sum(list.map((round) => round.payout))
      return { uid: player.uid, pseudo: player.pseudo, played: list.length, rtp: ratio(back, bet), balanceCents: player.save.balanceCents }
    })
    .filter((line) => (line.played >= 30 && line.rtp > RTP * 1.5) || line.balanceCents > 5_000_000 * CENTS)
    .sort((a, b) => (b.rtp ?? 0) - (a.rtp ?? 0))
    .slice(0, 10)

  const named = (player) => ({
    uid: player.uid,
    pseudo: player.pseudo ?? 'Sans pseudo',
    level: player.level,
    balanceCents: player.save.balanceCents,
    played: player.save.rounds.length,
    lastSeen: lastSeen(player) || null,
  })

  return {
    generatedAt: now,
    coop: coopStats(players, named, now),
    unreadable,
    players: {
      total: players.length,
      withPseudo: players.filter((player) => player.pseudo).length,
      active24h: activeSince(DAY),
      active7d: activeSince(7 * DAY),
      active30d: activeSince(30 * DAY),
      signupsByDay: days.map((day) => ({ day, count: signups[day] })),
      activeByDay: days.map((day) => ({ day, count: playersByDay[day].size })),
      levels: histogram(levels, [2, 4, 7, 11, 16, 26], ['1', '2-3', '4-6', '7-10', '11-15', '16-25', '26+']),
      avgLevel: levels.length ? sum(levels) / levels.length : 0,
      top: [...players].sort((a, b) => b.save.balanceCents - a.save.balanceCents).slice(0, 5).map(named),
      recent: [...players].sort((a, b) => lastSeen(b) - lastSeen(a)).slice(0, 8).map(named),
    },
    rounds: {
      total: rounds.length,
      won: won.length,
      winRate: ratio(won.length, rounds.length),
      wagered,
      returned,
      rtp: ratio(returned, wagered),
      targetRtp: RTP,
      avgBet: rounds.length ? wagered / rounds.length : 0,
      avgLanes: rounds.length ? sum(rounds.map((round) => round.crossed)) / rounds.length : 0,
      bestMultiplier: won.reduce((best, round) => Math.max(best, round.mult), 0),
      finished: rounds.filter((round) => round.status === 'won' && round.roadLanes > 0 && round.crossed === round.roadLanes).length,
      byDay: days.map((day) => ({ day, ...perDay[day] })),
      byMode,
      multipliers,
      bets,
    },
    economy: {
      circulating: sum(balances),
      average: balances.length ? Math.round(sum(balances) / balances.length) : 0,
      median: median(balances),
      richest: balances.reduce((best, value) => Math.max(best, value), 0),
      broke,
    },
    shop: {
      items: [...bought].sort((a, b) => b.owners - a.owners),
      spentCents: spent,
      bySlot,
      purchases: sum(bought.filter((item) => !item.exclusive).map((item) => item.owners)),
    },
    achievements: unlocked.sort((a, b) => b.count - a.count),
    leagues: TIERS.map((tier) => ({
      id: tier.id,
      label: tier.label,
      count: players.filter((player) => divisionFor(player.save.league.lp).tier.id === tier.id).length,
    })),
    beta: players.filter((player) => player.save.upgrades.includes('skin-roadworks')).length,
    seasons: Object.entries(claimsBySeason)
      .map(([season, count]) => ({ season, count }))
      .sort((a, b) => (a.season < b.season ? 1 : -1))
      .slice(0, 8),
    flagged,
  }
}

const UNLOCK_LABELS = {
  upgrades: 'Améliorations',
  trophies: 'Trophées',
  golden: 'Œuf doré',
  hens: 'Poules spéciales',
  market: 'Marché',
  skins: 'Looks',
  prestige: 'Déménagement',
}

/** The coop (clicker): who plays it, how far they got, what they own. */
function coopStats(players, named, now) {
  const coops = players.filter((player) => player.save.coop?.lifetime > 0)
  const list = coops.map((player) => player.save.coop)
  const today = dayKey(now)
  const kinds = (coop) => BUILDINGS.filter((b) => (coop.buildings[b.id] ?? 0) > 0).length
  return {
    players: coops.length,
    share: ratio(coops.length, players.length),
    eggs: sum(list.map((coop) => coop.lifetime)),
    taps: sum(list.map((coop) => coop.taps)),
    golden: sum(list.map((coop) => coop.golden)),
    moved: list.filter((coop) => coop.moves > 0).length,
    moves: sum(list.map((coop) => coop.moves)),
    feathers: sum(list.map((coop) => coop.feathers)),
    trophiesAvg: list.length ? sum(list.map((coop) => coop.trophies.length)) / list.length : 0,
    trophiesTotal: TROPHIES.length,
    soldToday: sum(list.filter((coop) => coop.market.day === today).map((coop) => coop.market.sold)),
    sellersToday: list.filter((coop) => coop.market.day === today && coop.market.sold > 0).length,
    funnel: Object.keys(UNLOCKS).map((id) => ({ label: UNLOCK_LABELS[id], count: list.filter((coop) => unlocked(coop, id)).length })),
    kinds: histogram(list.map(kinds), [2, 5, 9, 14, 20, 25], ['0-1', '2-4', '5-8', '9-13', '14-19', '20-24', '25 (tous)']),
    buildings: BUILDINGS.map((b) => ({
      label: `${b.icon} ${b.label}`,
      owners: list.filter((coop) => (coop.buildings[b.id] ?? 0) > 0).length,
      total: sum(list.map((coop) => coop.buildings[b.id] ?? 0)),
    })),
    hens: SPECIAL_HENS.map((hen) => ({
      label: `${hen.icon} ${hen.label}`,
      owners: list.filter((coop) => coop.hens[hen.id]).length,
      equipped: list.filter((coop) => coop.equipped.includes(hen.id)).length,
    })),
    worlds: WORLDS.map((world) => ({
      label: `${world.icon} ${world.label}`,
      count: list.filter((coop) => coop.worlds?.[world.id]).length,
    })),
    skins: COOP_SKINS.filter((skin) => skin.cost > 0).map((skin) => ({
      label: skin.label,
      owners: list.filter((coop) => coop.skins.includes(skin.id)).length,
    })),
    top: [...coops]
      .sort((a, b) => b.save.coop.lifetime - a.save.coop.lifetime)
      .slice(0, 5)
      .map((player) => ({
        ...named(player),
        eggs: player.save.coop.lifetime,
        pps: production(player.save.coop),
        kinds: kinds(player.save.coop),
        moves: player.save.coop.moves,
      })),
  }
}
