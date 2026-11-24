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
 * @property {(uid: string, pseudo: string, entry: object) => Promise<void>} claimPseudo
 *   throws PseudoTakenError if someone else has it
 * @property {(uid: string, entry: object) => Promise<void>} publishEntry
 * @property {(uid: string, pseudo: string) => Promise<void>} removeEntry
 * @property {(by: 'xp' | 'bestMultiplier', size?: number) => Promise<object[]>} leaderboard
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
  const copy = (value) => structuredClone(value)

  return {
    users,
    entries,
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
    async claimPseudo(uid, pseudo, entry) {
      const key = pseudo.toLowerCase()
      if (pseudos.has(key) && pseudos.get(key) !== uid) throw new PseudoTakenError(pseudo)
      const previous = entries.get(uid)?.pseudo
      if (previous && previous.toLowerCase() !== key) pseudos.delete(previous.toLowerCase())
      pseudos.set(key, uid)
      entries.set(uid, { ...entry, pseudo })
    },
    async publishEntry(uid, entry) {
      entries.set(uid, { ...entry })
    },
    async removeEntry(uid, pseudo) {
      entries.delete(uid)
      pseudos.delete(pseudo.toLowerCase())
    },
    async leaderboard(by, size = 20) {
      return [...entries.entries()]
        .map(([uid, entry]) => ({ uid, ...entry }))
        .sort((a, b) => b[by] - a[by])
        .slice(0, size)
    },
  }
}
