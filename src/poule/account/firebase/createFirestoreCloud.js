import { CloudConflictError, PseudoTakenError } from '../cloud.js'

/**
 * Cloud contract (see account/cloud.js) on Cloud Firestore.
 *
 *   users/{uid}          { save, rev, createdAt, updatedAt }       private
 *   pseudos/{lowercase}  { uid, pseudo }                           public, unique names
 *   leaderboard/{uid}    { pseudo, level, xp, bestMultiplier, bestLanes, updatedAt }  public
 *
 * firestore.rules enforces who may write what.
 */
export function createFirestoreCloud({ db, firestoreSdk }) {
  const { doc, getDoc, runTransaction, serverTimestamp, writeBatch, collection, query, orderBy, limit, getDocs } =
    firestoreSdk

  const userRef = (uid) => doc(db, 'users', uid)
  const pseudoRef = (pseudo) => doc(db, 'pseudos', pseudo.toLowerCase())
  const entryRef = (uid) => doc(db, 'leaderboard', uid)

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
    async claimPseudo(uid, pseudo, entry) {
      await runTransaction(db, async (transaction) => {
        const wanted = pseudoRef(pseudo)
        const [taken, current] = await Promise.all([transaction.get(wanted), transaction.get(entryRef(uid))])
        if (taken.exists() && taken.data().uid !== uid) throw new PseudoTakenError(pseudo)
        const previous = current.exists() ? current.data().pseudo : null
        if (previous && previous.toLowerCase() !== pseudo.toLowerCase()) transaction.delete(pseudoRef(previous))
        if (!taken.exists()) transaction.set(wanted, { uid, pseudo })
        transaction.set(entryRef(uid), { ...entry, pseudo, updatedAt: serverTimestamp() })
      })
    },

    /** Updates the leaderboard line (the pseudo must already be claimed). */
    async publishEntry(uid, entry) {
      const batch = writeBatch(db)
      batch.set(entryRef(uid), { ...entry, updatedAt: serverTimestamp() })
      await batch.commit()
    },

    /** Leaves the leaderboard and frees the pseudo. */
    async removeEntry(uid, pseudo) {
      const batch = writeBatch(db)
      batch.delete(entryRef(uid))
      batch.delete(pseudoRef(pseudo))
      await batch.commit()
    },

    /** The top players by 'xp' or 'bestMultiplier'. */
    async leaderboard(by, size = 20) {
      const snap = await getDocs(query(collection(db, 'leaderboard'), orderBy(by, 'desc'), limit(size)))
      return snap.docs.map((entry) => ({ uid: entry.id, ...entry.data(), updatedAt: undefined }))
    },
  }
}
