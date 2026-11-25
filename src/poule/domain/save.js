import { achievementById } from '../config/achievements.js'
import { MAX_BET, MAX_PAYOUT, MIN_BET, STARTING_BALANCE } from '../config/economy.js'
import { MODES, modeById } from '../config/modes.js'
import { FEATHER_TO_CENTS, MAX_LEVEL } from '../config/progression.js'
import { BETA_SKIN, CURRENT_SEASON } from '../config/seasons.js'
import { AUTOCASH_TARGETS, SLOTS, upgradeById } from '../config/upgrades.js'
import { levelFromXp } from './progression.js'
import { dayId, validDaily, validDailyClaims } from './daily.js'
import { validLedger } from './duels.js'
import { divisionFor, freshLeague, validLeague } from './leagues.js'
import { validMissions, validStreak } from './missions.js'
import { validPass } from './pass.js'
import { validTalents } from './talents.js'
import { isSeasonId, seasonId, weeklyStats } from './seasons.js'

/**
 * A save: everything that makes a player's progress, as one plain object that
 * can travel to the cloud and back. Pure functions only; the account layer
 * decides when to send or apply one.
 */

/**
 * v2 added season claims and the last refill; v3 dropped feathers (tokens are the
 * only currency). Older saves are still read: their unspent feathers become tokens.
 * The `feathers` key stays in the file, always 0, because the cloud rules ask for it.
 * v4 added the big season (`epoch`), the league and the daily challenge; the
 * cloud only accepts v4 writes, so an outdated game can no longer overwrite a save.
 */
export const SAVE_VERSION = 4
/** Finished rounds kept in a save, newest last. Older ones still count in XP. */
export const SAVE_ROUNDS = 1000

const PSEUDO = /^[A-Za-z0-9_-]{3,16}$/

const int = (value, min, max) => (Number.isInteger(value) && value >= min && value <= max ? value : null)
const num = (value, min, max) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null

export const isValidPseudo = (pseudo) => typeof pseudo === 'string' && PSEUDO.test(pseudo)

/** Turns a round row from the store into its save form. */
export const roundToSave = (row) => ({
  mode: row.mode_id,
  bet: row.bet_cents,
  payout: row.payout_cents,
  mult: row.multiplier ?? 0,
  lane: row.lane,
  crossed: row.crossed,
  roadLanes: row.road_lanes,
  xp: row.xp,
  status: row.status,
  endedAt: row.ended_at,
})

function validRound(round) {
  if (!round || typeof round !== 'object') return null
  const mode = MODES.find((entry) => entry.id === round.mode)
  if (!mode || !['won', 'lost'].includes(round.status)) return null
  const lane = int(round.lane, 1, mode.lanes)
  const crossed = int(round.crossed, 0, mode.lanes)
  const bet = int(round.bet, MIN_BET, MAX_BET)
  const payout = int(round.payout, 0, MAX_PAYOUT)
  const mult = num(round.mult, 0, 1e6)
  const xp = int(round.xp ?? round.feathers, 0, 10000)
  if ([lane, crossed, bet, payout, mult, xp].includes(null)) return null
  return {
    mode: mode.id,
    bet,
    payout,
    mult,
    lane,
    crossed,
    roadLanes: int(round.roadLanes, 0, mode.lanes) ?? mode.lanes,
    xp,
    status: round.status,
    endedAt: typeof round.endedAt === 'string' ? round.endedAt.slice(0, 40) : null,
  }
}

/**
 * Checks and normalises a save from outside (the cloud): wrong types or
 * out-of-range values make it invalid (null); unknown upgrades, achievements
 * and rounds are dropped, so an older game can read a newer save.
 */
export function validateSave(raw) {
  if (!raw || typeof raw !== 'object' || ![1, 2, 3, SAVE_VERSION].includes(raw.v)) return null
  const saved = int(raw.balanceCents, 0, 1e12)
  const xp = int(raw.xp, 0, 1e9)
  const feathers = raw.v < 3 ? int(raw.feathers, 0, 1e9) : 0
  if ([saved, xp, feathers].includes(null)) return null
  const balanceCents = Math.min(1e12, saved + feathers * FEATHER_TO_CENTS)

  const upgrades = [...new Set(Array.isArray(raw.upgrades) ? raw.upgrades : [])].filter((id) => upgradeById(id))
  const equipped = {}
  for (const slot of SLOTS) {
    const id = raw.equipped?.[slot.id]
    if (upgrades.includes(id) && upgradeById(id).slot === slot.id && slot.id !== 'perk') equipped[slot.id] = id
  }
  const achievements = [...new Set(Array.isArray(raw.achievements) ? raw.achievements : [])].filter((id) =>
    achievementById(id),
  )
  const prefs = raw.prefs ?? {}
  const rounds = (Array.isArray(raw.rounds) ? raw.rounds : []).slice(-SAVE_ROUNDS).map(validRound).filter(Boolean)
  const seen = new Set()
  const claims = (Array.isArray(raw.claims) ? raw.claims : [])
    .filter((claim) => claim && isSeasonId(claim.season) && !seen.has(claim.season) && seen.add(claim.season))
    .map((claim) => ({
      season: claim.season,
      rank: int(claim.rank, 1, 1e7),
      total: int(claim.total, 1, 1e7),
      score: int(claim.score, 0, 1e9) ?? 0,
    }))

  const save = {
    v: SAVE_VERSION,
    epoch: int(raw.epoch, 0, 1000) ?? 0,
    balanceCents,
    xp,
    feathers: 0,
    upgrades,
    equipped,
    achievements,
    prefs: {
      mode: modeById(prefs.mode).id,
      bet: int(prefs.bet, MIN_BET, MAX_BET),
      autocash: AUTOCASH_TARGETS.includes(prefs.autocash) ? prefs.autocash : null,
      sound: prefs.sound !== false,
    },
    rounds,
    claims,
    lastRefillAt: int(raw.lastRefillAt, 0, 1e14),
    league: validLeague(raw.league),
    daily: validDaily(raw.daily),
    dailyClaims: validDailyClaims(raw.dailyClaims),
    missions: validMissions(raw.missions),
    streak: validStreak(raw.streak),
    duels: validDuels(raw.duels),
    gifts: ids(raw.gifts, 20),
    setsClaimed: ids(raw.setsClaimed, 50),
    team: typeof raw.team === 'string' && /^[A-Za-z0-9]{6,40}$/.test(raw.team) ? raw.team : null,
    talents: validTalents(raw.talents),
    pass: validPass(raw.pass),
  }
  return save.epoch < CURRENT_SEASON.id ? seasonReset(save) : save
}

const ids = (raw, max) => [...new Set(Array.isArray(raw) ? raw.filter((id) => typeof id === 'string' && id.length <= 40) : [])].slice(0, max)

function validDuels(raw) {
  const ledger = validLedger(raw?.ledger)
  const tries = {}
  for (const [id, value] of Object.entries(raw?.tries ?? {})) {
    if (!(id in ledger)) continue
    const count = int(value?.tries, 0, 3)
    const best = num(value?.best, 0, 5000)
    if (count != null && best != null) tries[id] = { tries: count, best }
  }
  return { ledger, tries }
}

/** True for a save from before the big season in play: reading it resets it. */
export const needsSeasonReset = (raw) => !(Number.isInteger(raw?.epoch) && raw.epoch >= CURRENT_SEASON.id)

/** True when a save shows any play: such a player took part in the beta. */
const playedBefore = (save) => save.xp > 0 || save.rounds.length > 0 || save.upgrades.length > 0

/**
 * A new big season: the balance goes back to the start, the league starts
 * over, and players who played before Saison 1 get the beta skin (worn).
 * Level, items, achievements and history stay.
 */
export function seasonReset(save) {
  const beta = CURRENT_SEASON.id === 1 && playedBefore(save) && !save.upgrades.includes(BETA_SKIN)
  return {
    ...save,
    epoch: CURRENT_SEASON.id,
    balanceCents: STARTING_BALANCE,
    lastRefillAt: null,
    upgrades: beta ? [...save.upgrades, BETA_SKIN] : save.upgrades,
    equipped: beta ? { ...save.equipped, skin: BETA_SKIN } : save.equipped,
    league: freshLeague(),
    daily: null,
  }
}

/** True when nothing has been played on this device yet. */
export const isPristine = (save) =>
  save.xp === 0 && save.rounds.length === 0 && save.upgrades.length === 0 && save.balanceCents === STARTING_BALANCE

/** What the conflict dialog shows of a save. */
export function describeSave(save) {
  return {
    level: levelFromXp(save.xp),
    xp: save.xp,
    balanceCents: save.balanceCents,
    played: save.rounds.length,
    upgrades: save.upgrades.length,
    achievements: save.achievements.length,
  }
}

/** Slots shown on a public profile (what the hen wears), never perks. */
export const LOOK_SLOTS = Object.freeze(['hat', 'neck', 'plumage', 'trail', 'road', 'party', 'title', 'skin'])

/** What the hen wears, as public data: slot → item id, known items only. */
export function publicLook(equipped = {}) {
  const look = {}
  for (const slot of LOOK_SLOTS) {
    const item = upgradeById(equipped[slot])
    if (item && item.slot === slot) look[slot] = item.id
  }
  return look
}

/** The public all-time line of a player on the leaderboard (and their public profile). */
export function leaderboardEntry(save, pseudo) {
  const won = save.rounds.filter((round) => round.status === 'won')
  return {
    pseudo,
    look: publicLook(save.equipped),
    title: save.equipped.title ?? null,
    level: Math.min(MAX_LEVEL, levelFromXp(save.xp)),
    xp: save.xp,
    tokens: save.balanceCents,
    lp: save.league.lp,
    division: divisionFor(save.league.lp).id,
    bestMultiplier: won.reduce((best, round) => Math.max(best, round.mult), 0),
    bestLanes: save.rounds.reduce((best, round) => Math.max(best, round.crossed), 0),
    team: save.team ?? null,
  }
}

/** The player's line in this week's season board. */
export function seasonEntry(save, pseudo, date = new Date()) {
  const week = weeklyStats(save.rounds, date)
  return {
    season: seasonId(date),
    pseudo,
    title: save.equipped.title ?? null,
    level: Math.min(MAX_LEVEL, levelFromXp(save.xp)),
    score: week.xp,
    bestMultiplier: week.bestMultiplier,
    league: divisionFor(save.league.lp).id,
  }
}

/** The player's line on today's daily challenge board, or null if they have not tried it. */
export function dailyEntry(save, pseudo, date = new Date()) {
  const today = dayId(date)
  if (save.daily?.date !== today || !save.daily.tries) return null
  return {
    day: today,
    pseudo,
    title: save.equipped.title ?? null,
    best: save.daily.best,
    tries: save.daily.tries,
  }
}

/**
 * What to do when an account and this device meet.
 *
 * - `upload`: this device's progress becomes the account's (or updates it).
 * - `download`: the account's progress replaces this device's.
 * - `ask`: both have progress that the other lacks; the player chooses.
 * - `none`: already in step.
 *
 * @param {object} input
 * @param {string} input.uid        the signed-in account
 * @param {string|null} input.linkedUid  account this device last synced with
 * @param {number} input.syncedRev  revision of the cloud save this device last saw
 * @param {boolean} input.dirty     this device changed since that revision
 * @param {boolean} input.pristine  nothing played on this device at all
 * @param {{ rev: number } | null} input.cloud  the account's save, if any
 */
export function decideSync({ uid, linkedUid, syncedRev, dirty, pristine, cloud }) {
  if (!cloud) return 'upload'
  if (linkedUid !== uid) return pristine ? 'download' : 'ask'
  const cloudMoved = cloud.rev > syncedRev
  if (cloudMoved && dirty) return 'ask'
  if (cloudMoved) return 'download'
  return dirty ? 'upload' : 'none'
}
