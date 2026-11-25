import { DAILY_CLAIMS_KEPT, DAILY_MODES, DAILY_REWARDS, DAILY_TRIES } from '../config/daily.js'
import { modeById } from '../config/modes.js'

/** Pure rules of the daily challenge (config/daily.js). */

const DAY = 86_400_000

/** The day of a date, in UTC: "2026-11-25". */
export const dayId = (date = new Date()) => date.toISOString().slice(0, 10)

export const isDayId = (id) => typeof id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(id)

export const previousDayId = (date = new Date()) => dayId(new Date(date.getTime() - DAY))

/** The mode of a day's challenge. */
export const dailyMode = (id) => modeById(DAILY_MODES[new Date(`${id}T12:00:00Z`).getUTCDay()])

/** A player's challenge of `today`: tries used, tries left, best multiplier. */
export function dailyStatus(daily, today) {
  const mine = daily?.date === today ? daily : { date: today, tries: 0, best: 0 }
  return { ...mine, left: Math.max(0, DAILY_TRIES - mine.tries), mode: dailyMode(today) }
}

/** What a final position pays (tokens in cents), or null when nothing was cashed out. */
export function dailyReward({ best, rank, total }) {
  if (!best || !rank || !total) return null
  return DAILY_REWARDS.find((tier) => !tier.top || rank <= tier.top) ?? null
}

/** Checks the daily state from a save. */
export function validDaily(raw) {
  if (!raw || !isDayId(raw.date)) return null
  const tries = Number.isInteger(raw.tries) ? Math.min(DAILY_TRIES, Math.max(0, raw.tries)) : 0
  const best = typeof raw.best === 'number' && Number.isFinite(raw.best) ? Math.min(5000, Math.max(0, raw.best)) : 0
  return { date: raw.date, tries, best }
}

export const validDailyClaims = (raw) =>
  [...new Set(Array.isArray(raw) ? raw.filter(isDayId) : [])].sort().slice(-DAILY_CLAIMS_KEPT)
