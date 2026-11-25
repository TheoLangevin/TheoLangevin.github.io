/**
 * The cloud contract the sync service talks to. Implemented on Firestore by
 * firebase/createFirestoreCloud.js, and in memory by createMemoryCloud below
 * (tests).
 *
 * @typedef {object} Cloud
 * @property {(uid: string) => Promise<{ rev: number, save: object } | null>} loadSave
 * @property {(uid: string, save: object, expectedRev: number) => Promise<number>} pushSave
 *   new revision; throws CloudConflictError if the cloud is no longer at expectedRev
 * @property {(uid: string) => Promise<string | null>} myPseudo
 * @property {(uid: string, pseudo: string, entry: object, seasonEntry: object) => Promise<void>} claimPseudo
 *   throws PseudoTakenError if someone else has it; writes both board lines
 * @property {(uid: string, entry: object, seasonEntry: object, dailyEntry?: object | null) => Promise<void>} publishEntry
 *   the all-time line, this week's line (seasonEntry.season says which week) and today's daily challenge line
 * @property {(season: string, score: number) => Promise<object | null>} seasonAbove  the player just above a score
 * @property {(day: string, size?: number) => Promise<object[]>} dailyBoard  by best multiplier
 * @property {(day: string, uid: string) => Promise<object | null>} dailyEntryOf
 * @property {(day: string, best: number) => Promise<{ rank: number, total: number }>} dailyRank
 * @property {(uid: string, pseudo: string, season: string) => Promise<void>} removeEntry
 * @property {(by: 'xp' | 'tokens' | 'bestMultiplier', size?: number) => Promise<object[]>} leaderboard
 * @property {(season: string, size?: number) => Promise<object[]>} seasonBoard  by weekly score
 * @property {(uid: string) => Promise<object | null>} profileOf  a player's public profile (their all-time line)
 * @property {(season: string, uid: string) => Promise<object | null>} seasonEntryOf
 * @property {(max?: number) => Promise<{ users: object[], profiles: object[] }>} adminOverview
 *   admin only: every save ({ uid, rev, createdAt, updatedAt, save }) and the pseudos
 * @property {(season: string, score: number) => Promise<{ rank: number, total: number }>} seasonRank
 *   rank = players with a higher score + 1; total = players who scored
 */

export class CloudConflictError extends Error {
  constructor(rev) {
    super('The account was updated from another device')
    this.rev = rev
  }
}

export class PseudoTakenError extends Error {
  constructor(pseudo) {
    super(`Pseudo ${pseudo} is taken`)
    this.pseudo = pseudo
  }
}

export function createMemoryCloud() {
  const users = new Map()
  const pseudos = new Map()
  const entries = new Map()
  const seasons = new Map()
  const days = new Map()
  const copy = (value) => structuredClone(value)
  const season = (id) => {
    if (!seasons.has(id)) seasons.set(id, new Map())
    return seasons.get(id)
  }
  const putSeason = (uid, { season: id, ...line }) => season(id).set(uid, line)
  const day = (id) => {
    if (!days.has(id)) days.set(id, new Map())
    return days.get(id)
  }
  const putDaily = (uid, line) => {
    if (!line) return
    const { day: id, ...rest } = line
    day(id).set(uid, rest)
  }

  return {
    users,
    entries,
    seasons,
    days,
    async loadSave(uid) {
      return users.has(uid) ? copy(users.get(uid)) : null
    },
    async pushSave(uid, save, expectedRev) {
      const currentRev = users.get(uid)?.rev ?? 0
      if (currentRev !== expectedRev) throw new CloudConflictError(currentRev)
      users.set(uid, { rev: currentRev + 1, save: copy(save) })
      return currentRev + 1
    },
    async myPseudo(uid) {
      return entries.get(uid)?.pseudo ?? null
    },
    async claimPseudo(uid, pseudo, entry, seasonEntry, dailyEntry = null) {
      const key = pseudo.toLowerCase()
      if (pseudos.has(key) && pseudos.get(key) !== uid) throw new PseudoTakenError(pseudo)
      const previous = entries.get(uid)?.pseudo
      if (previous && previous.toLowerCase() !== key) pseudos.delete(previous.toLowerCase())
      pseudos.set(key, uid)
      entries.set(uid, { ...entry, pseudo })
      putSeason(uid, { ...seasonEntry, pseudo })
      if (dailyEntry) putDaily(uid, { ...dailyEntry, pseudo })
    },
    async publishEntry(uid, entry, seasonEntry, dailyEntry = null) {
      entries.set(uid, { ...entry })
      putSeason(uid, seasonEntry)
      putDaily(uid, dailyEntry)
    },
    async seasonAbove(id, score) {
      const above = [...season(id).entries()]
        .map(([uid, line]) => ({ uid, ...line }))
        .filter((line) => line.score > score)
        .sort((a, b) => a.score - b.score)
      return above[0] ?? null
    },
    async dailyBoard(id, size = 20) {
      return [...day(id).entries()]
        .map(([uid, line]) => ({ uid, ...line }))
        .sort((a, b) => b.best - a.best)
        .slice(0, size)
    },
    async dailyEntryOf(id, uid) {
      const line = day(id).get(uid)
      return line ? { uid, ...line } : null
    },
    async dailyRank(id, best) {
      const values = [...day(id).values()].map((line) => line.best)
      return { rank: values.filter((value) => value > best).length + 1, total: values.length }
    },
    async removeEntry(uid, pseudo, seasonId) {
      entries.delete(uid)
      pseudos.delete(pseudo.toLowerCase())
      season(seasonId).delete(uid)
    },
    async leaderboard(by, size = 20) {
      return [...entries.entries()]
        .map(([uid, entry]) => ({ uid, ...entry }))
        .sort((a, b) => b[by] - a[by])
        .slice(0, size)
    },
    async seasonBoard(id, size = 20) {
      return [...season(id).entries()]
        .map(([uid, line]) => ({ uid, ...line }))
        .filter((line) => line.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, size)
    },
    async profileOf(uid) {
      return entries.has(uid) ? { uid, ...entries.get(uid) } : null
    },
    async seasonEntryOf(id, uid) {
      const line = season(id).get(uid)
      return line ? { uid, ...line } : null
    },
    async adminOverview() {
      return {
        users: [...users.entries()].map(([uid, entry]) => ({
          uid,
          rev: entry.rev,
          createdAt: entry.createdAt ?? null,
          updatedAt: entry.updatedAt ?? null,
          save: copy(entry.save),
        })),
        profiles: [...entries.entries()].map(([uid, entry]) => ({ uid, pseudo: entry.pseudo })),
      }
    },
    async seasonRank(id, score) {
      const scores = [...season(id).values()].map((line) => line.score)
      return {
        rank: scores.filter((value) => value > score).length + 1,
        total: scores.filter((value) => value > 0).length,
      }
    },
  }
}
