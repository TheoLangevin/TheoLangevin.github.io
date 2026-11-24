import { decideSync, describeSave, isPristine, isValidPseudo, leaderboardEntry, validateSave } from '../domain/save.js'
import { CloudConflictError } from './cloud.js'

/**
 * Keeps this device's progress and the signed-in account's save in step.
 *
 * The device's SQLite database stays the one the game plays on; the account
 * holds a copy (a save) with a revision number. Changes go up a moment after
 * they happen, never during a round; the account's save comes down when it is
 * newer. When both sides moved, the player chooses (conflict). Every cloud call
 * goes through one queue, so two syncs never run at the same time.
 *
 * @param {object} deps
 * @param {ReturnType<import('../services/gameService.js').createGameService>} deps.game
 * @param {import('./cloud.js').Cloud} deps.cloud
 * @param {(status: object) => void} [deps.onStatus]  { state: 'idle' | 'syncing' | 'synced' | 'pending' | 'error', at?, error? }
 * @param {() => void} [deps.onImported]  the device's progress was replaced
 * @param {number} [deps.delay]  ms to wait after a change before pushing
 */
export function createSyncService({ game, cloud, onStatus = () => {}, onImported = () => {}, delay = 2500 }) {
  let uid = null
  let pseudo = null
  let queue = Promise.resolve()
  let timer = null
  let waitingForRound = false

  const status = (state, extra = {}) => onStatus({ state, at: Date.now(), ...extra })

  /** Runs cloud work one at a time; failures are reported, not thrown to the queue. */
  function enqueue(work) {
    const run = queue.then(work)
    queue = run.catch(() => {})
    return run
  }

  async function publish(save) {
    if (!uid || !pseudo) return
    await cloud.publishEntry(uid, leaderboardEntry(save, pseudo))
  }

  async function upload(expectedRev) {
    const before = game.changeCount()
    const save = game.exportSave()
    const rev = await cloud.pushSave(uid, save, expectedRev)
    game.markSynced(uid, rev, { clean: game.changeCount() === before })
    await publish(save)
    return rev
  }

  function download(remote) {
    const save = game.importSave(remote.save)
    game.markSynced(uid, remote.rev)
    onImported()
    return save
  }

  /**
   * Compares this device with the account and acts. Resolves to
   * { action, conflict? } where conflict holds both sides, described.
   */
  async function reconcile() {
    const remote = await cloud.loadSave(uid)
    const valid = remote && validateSave(remote.save) ? remote : null
    const local = game.exportSave()
    const { linkedUid, syncedRev, dirty } = game.syncState()
    const action = decideSync({
      uid,
      linkedUid,
      syncedRev: linkedUid === uid ? syncedRev : 0,
      dirty,
      pristine: isPristine(local),
      cloud: valid,
    })

    if (game.round && action !== 'none') {
      waitingForRound = true
      status('pending')
      return { action: 'wait' }
    }
    if (action === 'upload') await upload(remote?.rev ?? 0)
    if (action === 'download') download(valid)
    if (action === 'ask') {
      status('idle')
      return {
        action,
        conflict: { device: describeSave(local), account: describeSave(validateSave(valid.save)), rev: valid.rev },
      }
    }
    status('synced')
    return { action }
  }

  const service = {
    get uid() {
      return uid
    },
    get pseudo() {
      return pseudo
    },

    /** A player signed in: load their pseudo, then reconcile. */
    connect(user) {
      uid = user.uid
      pseudo = null
      status('syncing')
      return enqueue(async () => {
        pseudo = await cloud.myPseudo(uid)
        return reconcile()
      }).catch((error) => {
        status('error', { error })
        throw error
      })
    },

    disconnect() {
      clearTimeout(timer)
      uid = null
      pseudo = null
      waitingForRound = false
      status('idle')
    },

    /** The game changed: push a moment later (or after the round). */
    changed() {
      if (!uid) return
      clearTimeout(timer)
      if (game.round) {
        waitingForRound = true
        status('pending')
        return
      }
      status('pending')
      timer = setTimeout(() => service.syncNow().catch(() => {}), delay)
    },

    /** Call when a round ends, to send what waited for it. */
    roundEnded() {
      if (waitingForRound) {
        waitingForRound = false
        service.changed()
      }
    },

    /** Syncs now. A cloud that moved meanwhile leads back to reconcile. */
    syncNow() {
      if (!uid) return Promise.resolve({ action: 'none' })
      clearTimeout(timer)
      status('syncing')
      return enqueue(async () => {
        if (game.round) {
          waitingForRound = true
          status('pending')
          return { action: 'wait' }
        }
        const { linkedUid, syncedRev, dirty } = game.syncState()
        if (linkedUid !== uid) return reconcile()
        if (!dirty) {
          status('synced')
          return { action: 'none' }
        }
        try {
          await upload(syncedRev)
          status('synced')
          return { action: 'upload' }
        } catch (error) {
          if (error instanceof CloudConflictError) return reconcile()
          throw error
        }
      }).catch((error) => {
        status('error', { error })
        throw error
      })
    },

    /** Checks the account for changes made on another device, and acts like on sign-in. */
    refresh() {
      if (!uid) return Promise.resolve({ action: 'none' })
      return enqueue(() => reconcile()).catch((error) => {
        status('error', { error })
        throw error
      })
    },

    /** The player's answer to a conflict: keep the 'device' or the 'account' progress. */
    resolve(choice, conflict) {
      status('syncing')
      return enqueue(async () => {
        if (choice === 'account') {
          const remote = await cloud.loadSave(uid)
          download(remote)
        } else {
          await upload(conflict.rev)
        }
        status('synced')
      }).catch((error) => {
        status('error', { error })
        throw error
      })
    },

    /** Picks or changes the public pseudo (shown on the leaderboard). */
    choosePseudo(name) {
      const wanted = name.trim()
      if (!isValidPseudo(wanted)) return Promise.reject(new Error('invalid-pseudo'))
      return enqueue(async () => {
        // The leaderboard line may not claim more than the account's save holds.
        const { dirty, syncedRev, linkedUid } = game.syncState()
        if (dirty && !game.round && linkedUid === uid) await upload(syncedRev)
        await cloud.claimPseudo(uid, wanted, leaderboardEntry(game.exportSave(), wanted))
        pseudo = wanted
        return pseudo
      })
    },

    /** Leaves the leaderboard and frees the pseudo. */
    leaveLeaderboard() {
      if (!pseudo) return Promise.resolve()
      return enqueue(async () => {
        await cloud.removeEntry(uid, pseudo)
        pseudo = null
      })
    },

    leaderboard: (by) => cloud.leaderboard(by),
  }
  return service
}
