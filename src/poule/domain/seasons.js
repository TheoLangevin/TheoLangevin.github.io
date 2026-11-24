import { LEAGUES, RANK_REWARDS } from '../config/seasons.js'

const DAY = 86_400_000

/** ISO 8601 week of a date, in UTC: { year, week }. */
export function isoWeek(date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const weekday = day.getUTCDay() || 7
  day.setUTCDate(day.getUTCDate() + 4 - weekday) // Thursday of this week decides the year
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1)
  return { year: day.getUTCFullYear(), week: Math.ceil(((day - yearStart) / DAY + 1) / 7) }
}

/** Season id of a date, like "2026-W48". */
export function seasonId(date = new Date()) {
  const { year, week } = isoWeek(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export const isSeasonId = (id) => typeof id === 'string' && /^\d{4}-W\d{2}$/.test(id)

/** Monday 00:00 UTC that starts the season of `date`. */
export function seasonStart(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() || 7) - 1))
  return start
}

export const seasonEnd = (date = new Date()) => new Date(seasonStart(date).getTime() + 7 * DAY)

export const previousSeasonId = (date = new Date()) => seasonId(new Date(seasonStart(date).getTime() - DAY))

/** Weekly score and best multiplier from finished rounds (save form). */
export function weeklyStats(rounds, date = new Date()) {
  const from = seasonStart(date).getTime()
  const to = from + 7 * DAY
  let xp = 0
  let bestMultiplier = 0
  let played = 0
  for (const round of rounds) {
    const at = Date.parse(round.endedAt)
    if (!(at >= from && at < to)) continue
    played++
    xp += round.feathers
    if (round.status === 'won') bestMultiplier = Math.max(bestMultiplier, round.mult)
  }
  return { xp, bestMultiplier, played }
}

/** The league of a weekly score, or null below the first one. */
export function leagueFor(score) {
  let league = null
  for (const entry of LEAGUES) if (score >= entry.min) league = entry
  return league
}

/** The next league to reach and how far along the player is. */
export function leagueProgress(score) {
  const current = leagueFor(score)
  const next = LEAGUES.find((entry) => entry.min > score) ?? null
  const floor = current?.min ?? 0
  return {
    current,
    next,
    ratio: next ? Math.min(1, (score - floor) / (next.min - floor)) : 1,
    missing: next ? next.min - score : 0,
  }
}

/** The rank tier of a final position among `total` players who scored, or null. */
export function rankTier(rank, total) {
  if (!rank || !total) return null
  return RANK_REWARDS.find((tier) => (tier.top ? rank <= tier.top : rank <= Math.ceil(total * tier.share))) ?? null
}

/**
 * What a season pays: the league's reward plus the rank tier's.
 * Nothing for a player who did not score.
 */
export function seasonReward({ score, rank, total }) {
  const league = leagueFor(score)
  if (!league) return null
  const tier = rankTier(rank, total)
  return {
    league: league.id,
    tier: tier?.id ?? null,
    tokens: league.reward.tokens + (tier?.reward.tokens ?? 0),
    feathers: league.reward.feathers + (tier?.reward.feathers ?? 0),
    items: tier?.reward.items ?? [],
  }
}
