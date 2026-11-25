import { MISSIONS, MISSIONS_PER_DAY, streakBonus } from '../config/missions.js'
import { isDayId } from './daily.js'

/** Daily missions and comeback streak: pure rules (config/missions.js). */

const DAY = 86_400_000

/** The day's missions: the same for everyone, from the date. */
export function missionsFor(day) {
  let seed = [...day].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
  const pool = [...MISSIONS]
  const picked = []
  while (picked.length < MISSIONS_PER_DAY && pool.length) {
    seed = (seed * 1103515245 + 12345) >>> 0
    picked.push(pool.splice(seed % pool.length, 1)[0])
  }
  return picked
}

/** How far a mission is, from the day's finished rounds (save form). */
export function missionProgress(mission, rounds) {
  const list = mission.mode ? rounds.filter((round) => round.mode === mission.mode) : rounds
  const won = list.filter((round) => round.status === 'won')
  const value = {
    played: list.length,
    lanes: list.reduce((sum, round) => sum + round.crossed, 0),
    won: won.length,
    cashAt: won.some((round) => round.mult >= mission.at) ? 1 : 0,
    run: list.some((round) => round.crossed >= mission.at) ? 1 : 0,
    modes: new Set(won.map((round) => round.mode)).size,
  }[mission.metric]
  return Math.min(mission.goal, value ?? 0)
}

/** Rounds finished on a UTC day. */
export const roundsOfDay = (rounds, day) => rounds.filter((round) => round.endedAt?.slice(0, 10) === day)

/** The streak if the player collects today: { days, bonus } or null if already collected. */
export function streakToday(streak, today) {
  if (streak?.last === today) return null
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - DAY).toISOString().slice(0, 10)
  const days = streak?.last === yesterday ? streak.days + 1 : 1
  return { days, bonus: streakBonus(days) }
}

export function validMissions(raw) {
  if (!raw || !isDayId(raw.date)) return null
  const ids = new Set(MISSIONS.map((mission) => mission.id))
  return { date: raw.date, claimed: [...new Set(Array.isArray(raw.claimed) ? raw.claimed : [])].filter((id) => ids.has(id)) }
}

export function validStreak(raw) {
  if (!raw || !isDayId(raw.last) || !Number.isInteger(raw.days) || raw.days < 1) return null
  return { last: raw.last, days: Math.min(raw.days, 10_000) }
}
