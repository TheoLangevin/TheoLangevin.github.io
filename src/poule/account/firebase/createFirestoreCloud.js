import { CloudConflictError, PseudoTakenError } from '../cloud.js'

/**
 * Cloud contract (see account/cloud.js) on Cloud Firestore.
 *
 *   users/{uid}          { save, rev, createdAt, updatedAt }       private
 *   pseudos/{lowercase}  { uid, pseudo }                           public, unique names
 *   leaderboard/{uid}    { pseudo, look, title, level, xp, tokens, bestMultiplier, bestLanes, updatedAt }  public,
 *                        also a player's public profile (look = what their hen wears)
 *   seasons/{week}/entries/{uid}  { pseudo, title, level, score, bestMultiplier, league, updatedAt }  public
 *   daily/{day}/entries/{uid}     { pseudo, title, best, tries, updatedAt }  public, the daily challenge
 *
 * firestore.rules enforces who may write what.
 */
export function createFirestoreCloud({ db, firestoreSdk }) {
  const {
    doc,
    getDoc,
    runTransaction,
    serverTimestamp,
    writeBatch,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    where,
    getCountFromServer,
  } = firestoreSdk

  const userRef = (uid) => doc(db, 'users', uid)
  const pseudoRef = (pseudo) => doc(db, 'pseudos', pseudo.toLowerCase())
  const entryRef = (uid) => doc(db, 'leaderboard', uid)
  const seasonRef = (season, uid) => doc(db, 'seasons', season, 'entries', uid)
  const dailyRef = (day, uid) => doc(db, 'daily', day, 'entries', uid)
  const seasonLine = ({ season, ...line }) => ({ ...line, updatedAt: serverTimestamp() })
  const dailyLine = ({ day, ...line }) => ({ ...line, updatedAt: serverTimestamp() })
  const rows = (snap) => snap.docs.map((entry) => ({ ...entry.data(), uid: entry.id, updatedAt: undefined }))

  return {
    async loadSave(uid) {
      const snap = await getDoc(userRef(uid))
      if (!snap.exists()) return null
      const data = snap.data()
      return { rev: data.rev ?? 0, save: data.save ?? null }
    },

    /** Writes the save as revision expectedRev + 1, if the cloud is still at expectedRev. */
    async pushSave(uid, save, expectedRev) {
      return runTransaction(db, async (transaction) => {
        const ref = userRef(uid)
        const snap = await transaction.get(ref)
        const currentRev = snap.exists() ? (snap.data().rev ?? 0) : 0
        if (currentRev !== expectedRev) throw new CloudConflictError(currentRev)
        const rev = currentRev + 1
        if (snap.exists()) transaction.update(ref, { save, rev, updatedAt: serverTimestamp() })
        else transaction.set(ref, { save, rev, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        return rev
      })
    },

    async myPseudo(uid) {
      const snap = await getDoc(entryRef(uid))
      return snap.exists() ? snap.data().pseudo : null
    },

    /** Claims a unique pseudo, frees the previous one, and publishes the leaderboard line. */
    async claimPseudo(uid, pseudo, entry, seasonEntry, dailyEntry = null) {
      await runTransaction(db, async (transaction) => {
        const wanted = pseudoRef(pseudo)
        const [taken, current] = await Promise.all([transaction.get(wanted), transaction.get(entryRef(uid))])
        if (taken.exists() && taken.data().uid !== uid) throw new PseudoTakenError(pseudo)
        const previous = current.exists() ? current.data().pseudo : null
        if (previous && previous.toLowerCase() !== pseudo.toLowerCase()) transaction.delete(pseudoRef(previous))
        if (!taken.exists()) transaction.set(wanted, { uid, pseudo })
        transaction.set(entryRef(uid), { ...entry, pseudo, updatedAt: serverTimestamp() })
        transaction.set(seasonRef(seasonEntry.season, uid), seasonLine({ ...seasonEntry, pseudo }))
        if (dailyEntry) transaction.set(dailyRef(dailyEntry.day, uid), dailyLine({ ...dailyEntry, pseudo }))
      })
    },

    /** Updates the leaderboard line (the pseudo must already be claimed). */
    async publishEntry(uid, entry, seasonEntry, dailyEntry = null) {
      const batch = writeBatch(db)
      batch.set(entryRef(uid), { ...entry, updatedAt: serverTimestamp() })
      batch.set(seasonRef(seasonEntry.season, uid), seasonLine(seasonEntry))
      if (dailyEntry) batch.set(dailyRef(dailyEntry.day, uid), dailyLine(dailyEntry))
      await batch.commit()
    },

    /** Leaves the leaderboard and frees the pseudo. */
    async removeEntry(uid, pseudo, season) {
      const batch = writeBatch(db)
      batch.delete(entryRef(uid))
      batch.delete(seasonRef(season, uid))
      batch.delete(pseudoRef(pseudo))
      await batch.commit()
    },

    /** The top players of all time by 'xp', 'tokens' or 'bestMultiplier'. */
    async leaderboard(by, size = 20) {
      return rows(await getDocs(query(collection(db, 'leaderboard'), orderBy(by, 'desc'), limit(size))))
    },

    /** The top players of a week, by weekly score. */
    async seasonBoard(season, size = 20) {
      const entries = collection(db, 'seasons', season, 'entries')
      return rows(await getDocs(query(entries, where('score', '>', 0), orderBy('score', 'desc'), limit(size))))
    },

    /** The player just above `score` this week (the rival to overtake), or null. */
    async seasonAbove(season, score) {
      const entries = collection(db, 'seasons', season, 'entries')
      const found = rows(await getDocs(query(entries, where('score', '>', score), orderBy('score', 'asc'), limit(1))))
      return found[0] ?? null
    },

    /** The day's challenge board, by best multiplier. */
    async dailyBoard(day, size = 20) {
      const entries = collection(db, 'daily', day, 'entries')
      return rows(await getDocs(query(entries, orderBy('best', 'desc'), limit(size))))
    },

    async dailyEntryOf(day, uid) {
      const snap = await getDoc(dailyRef(day, uid))
      return snap.exists() ? { ...snap.data(), uid, updatedAt: undefined } : null
    },

    async dailyRank(day, best) {
      const entries = collection(db, 'daily', day, 'entries')
      const [above, all] = await Promise.all([
        getCountFromServer(query(entries, where('best', '>', best))),
        getCountFromServer(entries),
      ])
      return { rank: above.data().count + 1, total: all.data().count }
    },

    async profileOf(uid) {
      const snap = await getDoc(entryRef(uid))
      return snap.exists() ? { ...snap.data(), uid, updatedAt: undefined } : null
    },

    async seasonEntryOf(season, uid) {
      const snap = await getDoc(seasonRef(season, uid))
      return snap.exists() ? { ...snap.data(), uid } : null
    },

    /** Admin only (firestore.rules): every player's save, with when it was made and last changed, and the pseudos. */
    async adminOverview(max = 2000) {
      const [saves, lines] = await Promise.all([
        getDocs(query(collection(db, 'users'), limit(max))),
        getDocs(query(collection(db, 'leaderboard'), limit(max))),
      ])
      const millis = (stamp) => (stamp?.toMillis ? stamp.toMillis() : null)
      return {
        users: saves.docs.map((entry) => {
          const data = entry.data()
          return {
            uid: entry.id,
            rev: data.rev ?? 0,
            createdAt: millis(data.createdAt),
            updatedAt: millis(data.updatedAt),
            save: data.save ?? null,
          }
        }),
        profiles: lines.docs.map((entry) => ({ uid: entry.id, pseudo: entry.data().pseudo ?? null })),
      }
    },

    async seasonRank(season, score) {
      const entries = collection(db, 'seasons', season, 'entries')
      const [above, scored] = await Promise.all([
        getCountFromServer(query(entries, where('score', '>', score))),
        getCountFromServer(query(entries, where('score', '>', 0))),
      ])
      return { rank: above.data().count + 1, total: scored.data().count }
    },
  }
}
