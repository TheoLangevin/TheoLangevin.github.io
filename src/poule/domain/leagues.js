import {
  GATES,
  INACTIVE_PENALTY,
  LEAGUE_HISTORY,
  PERF_CAP,
  PERF_FACTOR,
  RANK_BONUS,
  RANK_REWARDS,
  TIERS,
} from '../config/seasons.js'
import { isSeasonId, seasonId } from './seasons.js'

/**
 * League points (PL) and divisions. Pure functions: the game service stores a
 * player's league ({ lp, peak, settled, gates, history }) in the save and
 * calls these when a week is settled.
 */

const ROMAN = ['', 'I', 'II', 'III']
const DAY = 86_400_000

/** Every division, lowest first: { id, tier, division, label, min }. */
export const DIVISIONS = Object.freeze(
  (() => {
    const list = []
    let min = 0
    for (const tier of TIERS) {
      for (let division = tier.divisions; division >= 1; division--) {
        list.push(
          Object.freeze({
            id: tier.divisions > 1 ? `${tier.id}-${division}` : tier.id,
            tier,
            division: tier.divisions > 1 ? division : null,
            label: tier.divisions > 1 ? `${tier.label} ${ROMAN[division]}` : tier.label,
            min,
          }),
        )
        min += tier.step
      }
    }
    return list
  })(),
)

export const divisionById = (id) => DIVISIONS.find((entry) => entry.id === id) ?? null

/** A brand new league, for a new player or a new big season. */
export const freshLeague = (settled = null) => ({
  lp: 0,
  peak: 0,
  settled,
  gates: { top10: false, first: false },
  history: [],
})

/** The division of a number of PL. */
export function divisionFor(lp) {
  let current = DIVISIONS[0]
  for (const entry of DIVISIONS) if (lp >= entry.min) current = entry
  return current
}

/** Where the player stands: division, next one, progress, and what holds them back. */
export function leagueProgress(league) {
  const current = divisionFor(league.lp)
  const index = DIVISIONS.indexOf(current)
  const next = DIVISIONS[index + 1] ?? null
  const blocked = next?.tier.gate && !league.gates?.[next.tier.gate] ? GATES[next.tier.gate] : null
  return {
    current,
    next,
    ratio: next ? Math.min(1, (league.lp - current.min) / (next.min - current.min)) : 1,
    missing: next ? Math.max(0, next.min - league.lp) : 0,
    blocked,
  }
}

/** Bonus PL for a final rank among `total` players who scored. */
export function rankBonus(rank, total) {
  if (!rank || !total) return 0
  return RANK_BONUS.find((tier) => (tier.top ? rank <= tier.top : rank <= Math.ceil(total * tier.share)))?.lp ?? 0
}

/** The rank reward tier (tokens, items) of a final position, or null. */
export function rankTier(rank, total) {
  if (!rank || !total) return null
  return RANK_REWARDS.find((tier) => (tier.top ? rank <= tier.top : rank <= Math.ceil(total * tier.share))) ?? null
}

/** PL a week brings to a player at `lp`: { delta, perf, bonus, upkeep }. */
export function weekDelta({ lp, score, rank = null, total = null }) {
  const { upkeep } = divisionFor(lp).tier
  if (!score) return { delta: -Math.max(INACTIVE_PENALTY, upkeep * 2), perf: 0, bonus: 0, upkeep }
  const perf = Math.min(PERF_CAP, Math.round(PERF_FACTOR * Math.sqrt(score)))
  const bonus = rankBonus(rank, total)
  return { delta: perf + bonus - upkeep, perf, bonus, upkeep }
}

/** Highest PL the gates allow: just under the first league whose gate is not met. */
function gateCap(gates) {
  const locked = DIVISIONS.find((entry) => entry.tier.gate && !gates[entry.tier.gate])
  return locked ? locked.min - 1 : Infinity
}

/** Tokens a division pays for an active week: its league's reward, +25 % per division climbed. */
export function divisionReward(division) {
  const climbed = division.division ? division.tier.divisions - division.division : 0
  return Math.round((division.tier.reward * (1 + 0.25 * climbed)) / 100) * 100
}

/**
 * Settles one week: new league, and what the week pays. `week` is
 * { season, score, rank, total }. Nothing is paid for an inactive week.
 */
export function settleWeek(league, week) {
  const { delta, perf, bonus, upkeep } = weekDelta({ lp: league.lp, ...week })
  const gates = {
    top10: league.gates.top10 || Boolean(week.score && week.rank && week.rank <= 10),
    first: league.gates.first || Boolean(week.score && week.rank === 1),
  }
  const before = divisionFor(league.lp)
  const lp = Math.max(0, Math.min(gateCap(gates), league.lp + delta))
  const after = divisionFor(lp)
  const tier = week.score ? rankTier(week.rank, week.total) : null
  const reward = week.score
    ? { tokens: divisionReward(after) + (tier?.reward.tokens ?? 0), items: tier?.reward.items ?? [], tier: tier?.id ?? null }
    : { tokens: 0, items: [], tier: null }
  const line = {
    season: week.season,
    score: week.score ?? 0,
    rank: week.rank ?? null,
    total: week.total ?? null,
    delta: lp - league.lp,
    lp,
  }
  return {
    league: {
      lp,
      peak: Math.max(league.peak, lp),
      settled: week.season,
      gates,
      history: [...league.history, line].slice(-LEAGUE_HISTORY),
    },
    result: { ...line, perf, bonus, upkeep, before: before.id, after: after.id, reward },
  }
}

/** Monday 00:00 UTC of a season id ("2026-W48"). */
export function weekStart(id) {
  const [year, week] = id.split('-W').map(Number)
  const jan4 = Date.UTC(year, 0, 4)
  const monday1 = jan4 - ((new Date(jan4).getUTCDay() || 7) - 1) * DAY
  return new Date(monday1 + (week - 1) * 7 * DAY)
}

/** Season ids after `settled`, up to `last` included, oldest first. */
export function weeksBetween(settled, last) {
  if (!isSeasonId(settled) || !isSeasonId(last)) return []
  const ids = []
  for (let at = weekStart(settled).getTime() + 7 * DAY; at <= weekStart(last).getTime(); at += 7 * DAY) {
    ids.push(seasonId(new Date(at)))
    if (ids.length > 520) break
  }
  return ids
}

/** Checks a league from a save; anything wrong gives a fresh one. */
export function validLeague(raw) {
  if (!raw || typeof raw !== 'object') return freshLeague()
  const int = (value, max) => (Number.isInteger(value) && value >= 0 && value <= max ? value : null)
  const lp = int(raw.lp, 1e6)
  if (lp == null) return freshLeague()
  const history = (Array.isArray(raw.history) ? raw.history : [])
    .filter((line) => line && isSeasonId(line.season) && Number.isInteger(line.lp))
    .slice(-LEAGUE_HISTORY)
    .map((line) => ({
      season: line.season,
      score: int(line.score, 1e9) ?? 0,
      rank: int(line.rank, 1e7),
      total: int(line.total, 1e7),
      delta: Number.isInteger(line.delta) ? line.delta : 0,
      lp: line.lp,
    }))
  return {
    lp,
    peak: Math.max(lp, int(raw.peak, 1e6) ?? 0),
    settled: isSeasonId(raw.settled) ? raw.settled : null,
    gates: { top10: raw.gates?.top10 === true, first: raw.gates?.first === true },
    history,
  }
}
