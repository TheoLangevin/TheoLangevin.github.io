const DAY = 86_400_000

/**
 * League periods. A league period is one UTC day ("2026-11-25"): it starts at
 * 00:00 UTC and is settled the next time the player opens the game. The
 * names (season...) are those of the weekly leagues they replaced.
 */

/** Period id of a date, like "2026-11-25". */
export const seasonId = (date = new Date()) => date.toISOString().slice(0, 10)

export const isSeasonId = (id) => typeof id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(id)

/** 00:00 UTC that starts the period of `date`. */
export const seasonStart = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

export const seasonEnd = (date = new Date()) => new Date(seasonStart(date).getTime() + DAY)

export const previousSeasonId = (date = new Date()) => seasonId(new Date(seasonStart(date).getTime() - DAY))

/** The period's score and best multiplier from finished rounds (save form). */
export function weeklyStats(rounds, date = new Date()) {
  const from = seasonStart(date).getTime()
  const to = from + DAY
  let xp = 0
  let bestMultiplier = 0
  let played = 0
  for (const round of rounds) {
    const at = Date.parse(round.endedAt)
    if (!(at >= from && at < to)) continue
    played++
    xp += round.xp
    if (round.status === 'won') bestMultiplier = Math.max(bestMultiplier, round.mult)
  }
  return { xp, bestMultiplier, played }
}
