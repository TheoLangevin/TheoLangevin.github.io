import {
  DAILY_CLAIMS_KEPT,
  DAILY_MODES,
  DAILY_REWARDS,
  DAILY_TRIES,
  TOURNAMENT_MODE,
  TOURNAMENT_REWARD_FACTOR,
  TOURNAMENT_TITLE,
  TOURNAMENT_TRIES,
} from '../config/daily.js'
import { modeById } from '../config/modes.js'

/** Pure rules of the daily challenge (config/daily.js). */

const DAY = 86_400_000

/** The day of a date, in UTC: "2026-11-25". */
export const dayId = (date = new Date()) => date.toISOString().slice(0, 10)

export const isDayId = (id) => typeof id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(id)

export const previousDayId = (date = new Date()) => dayId(new Date(date.getTime() - DAY))

/** Saturdays and Sundays (UTC): the challenge is the weekend tournament. */
export const isTournament = (id) => [0, 6].includes(new Date(`${id}T12:00:00Z`).getUTCDay())

/** Tries of a day's challenge. */
export const triesFor = (id) => (isTournament(id) ? TOURNAMENT_TRIES : DAILY_TRIES)

/** The mode of a day's challenge. */
export const dailyMode = (id) =>
  modeById(isTournament(id) ? TOURNAMENT_MODE : DAILY_MODES[new Date(`${id}T12:00:00Z`).getUTCDay()])

/** Seed of try `n` (1-based) of a tournament day: the same road for every player. */
export const tournamentSeed = (id, n) => `poule-tournoi:${id}:${n}`

/** A player's challenge of `today`: tries used, tries left, best multiplier. */
export function dailyStatus(daily, today) {
  const mine = daily?.date === today ? daily : { date: today, tries: 0, best: 0 }
  const tries = triesFor(today)
  return { ...mine, max: tries, left: Math.max(0, tries - mine.tries), mode: dailyMode(today), tournament: isTournament(today) }
}

/** What a final position pays (tokens in cents), or null when nothing was cashed out. */
export function dailyReward({ date, best, rank, total }) {
  if (!best || !rank || !total) return null
  const tier = DAILY_REWARDS.find((entry) => !entry.top || rank <= entry.top) ?? null
  if (!tier || !isDayId(date) || !isTournament(date)) return tier
  return { ...tier, tokens: tier.tokens * TOURNAMENT_REWARD_FACTOR, item: rank === 1 ? TOURNAMENT_TITLE : null }
}

/** Checks the daily state from a save. */
export function validDaily(raw) {
  if (!raw || !isDayId(raw.date)) return null
  const tries = Number.isInteger(raw.tries) ? Math.min(triesFor(raw.date), Math.max(0, raw.tries)) : 0
  const best = typeof raw.best === 'number' && Number.isFinite(raw.best) ? Math.min(5000, Math.max(0, raw.best)) : 0
  return { date: raw.date, tries, best }
}

export const validDailyClaims = (raw) =>
  [...new Set(Array.isArray(raw) ? raw.filter(isDayId) : [])].sort().slice(-DAILY_CLAIMS_KEPT)
