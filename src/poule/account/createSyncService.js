import {
  decideSync,
  describeSave,
  isPristine,
  isValidPseudo,
  dailyEntry,
  leaderboardEntry,
  needsSeasonReset,
  seasonEntry,
  validateSave,
} from '../domain/save.js'
import { DUEL_STAKES } from '../config/duels.js'
import { TEAM_SIZE } from '../config/teams.js'
import { MAX_WEEKS_TO_FETCH } from '../config/seasons.js'
import { DUEL_MS, duelPayout, duelState } from '../domain/duels.js'
import { dailyReward, dayId, previousDayId } from '../domain/daily.js'
import { settleWeek, weeksBetween } from '../domain/leagues.js'
import { previousSeasonId, seasonId } from '../domain/seasons.js'
import { ADMIN_MAX_PLAYERS } from '../config/admin.js'
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
 * @param {() => Date} [deps.now]
 */
export function createSyncService({
  game,
  cloud,
  onStatus = () => {},
  onImported = () => {},
  delay = 2500,
  now = () => new Date(),
}) {
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
    await cloud.publishEntry(
      uid,
      leaderboardEntry(save, pseudo),
      seasonEntry(save, pseudo, now()),
      dailyEntry(save, pseudo, now()),
    )
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
    // A save from an earlier big season was reset on reading: send the reset back.
    if (needsSeasonReset(remote.save)) game.touch()
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
        const save = game.exportSave()
        await cloud.claimPseudo(
          uid,
          wanted,
          leaderboardEntry(save, wanted),
          seasonEntry(save, wanted, now()),
          dailyEntry(save, wanted, now()),
        )
        pseudo = wanted
        return pseudo
      })
    },

    /** Leaves the leaderboard and frees the pseudo. */
    leaveLeaderboard() {
      if (!pseudo) return Promise.resolve()
      return enqueue(async () => {
        await cloud.removeEntry(uid, pseudo, seasonId(now()))
        pseudo = null
      })
    },

    /** All-time board: by 'xp', 'tokens' or 'bestMultiplier'. */
    leaderboard: (by, size) => cloud.leaderboard(by, size),

    /** Another player's public profile: pseudo, look, level and records. */
    profileOf: (otherUid) => cloud.profileOf(otherUid),

    /** This week's board, and where the player stands in it. */
    async season(size) {
      const id = seasonId(now())
      const entries = await cloud.seasonBoard(id, size)
      const mine = uid ? await cloud.seasonEntryOf(id, uid) : null
      const standing = mine?.score > 0 ? await cloud.seasonRank(id, mine.score) : null
      return { id, entries, mine, standing }
    },

    /** The player just above this week's score: the rival to overtake. */
    async rival(score) {
      if (!uid) return null
      return cloud.seasonAbove(seasonId(now()), score)
    },

    /** Today's daily challenge board, and the player's line in it. */
    async dailyBoard(size) {
      const day = dayId(now())
      const entries = await cloud.dailyBoard(day, size)
      const mine = uid ? await cloud.dailyEntryOf(day, uid) : null
      const standing = mine ? await cloud.dailyRank(day, mine.best) : null
      return { day, entries, mine, standing }
    },

    /**
     * What ended since the player last came and is still to settle: finished
     * weeks of the league ({ season, score, rank, total }, oldest first) and
     * yesterday's daily challenge. Null when there is nothing.
     */
    async pendingResults() {
      if (!uid) return null
      const last = previousSeasonId(now())
      const league = game.league()
      if (!league.settled) {
        // First time on this season's leagues: they start with the current week.
        game.initLeague(last)
        return null
      }
      const ids = weeksBetween(league.settled, last)
      const fetched = new Set(ids.slice(-MAX_WEEKS_TO_FETCH))
      const weeks = []
      for (const id of ids) {
        const line = fetched.has(id) ? await cloud.seasonEntryOf(id, uid) : null
        const score = line?.score ?? 0
        const standing = score > 0 ? await cloud.seasonRank(id, score) : { rank: null, total: null }
        weeks.push({ season: id, score, ...standing })
      }

      let daily = null
      const yesterday = previousDayId(now())
      if (!game.dailyClaims().includes(yesterday)) {
        const line = await cloud.dailyEntryOf(yesterday, uid)
        if (line) {
          const standing = line.best > 0 ? await cloud.dailyRank(yesterday, line.best) : { rank: null, total: null }
          daily = { date: yesterday, best: line.best, ...standing }
        }
      }
      if (weeks.length === 0 && !daily) return null

      // What it would give, without changing anything yet.
      let preview = league
      const results = []
      for (const week of weeks) {
        const settled = settleWeek(preview, week)
        preview = settled.league
        results.push(settled.result)
      }
      return { weeks, daily, preview: { weeks: results, league: preview, daily: daily && { ...daily, reward: dailyReward(daily) } } }
    },

    /** Settles what pendingResults found; it syncs like any change. */
    claimResults(pending) {
      return game.settleResults({ weeks: pending.weeks, daily: pending.daily })
    },

    /**
     * The player's duels, newest first, after paying what finished ones give
     * back (once each). Resolves to { duels, paid } (paid in cents).
     */
    async duels() {
      if (!uid) return { duels: [], paid: 0 }
      const at = now().getTime()
      const list = (await cloud.duelsOf(uid)).sort((a, b) => b.createdAt - a.createdAt)
      let paid = 0
      const ledger = game.duelLedger()
      for (const duel of list) {
        if (ledger[duel.id] !== 'staked') continue
        const payout = duelPayout(duel, uid, at)
        if (payout != null && game.settleDuel(duel.id, payout)) paid += payout
      }
      return { duels: list.map((duel) => ({ ...duel, state: duelState(duel, at) })), paid }
    },

    /** Challenges another player: the stake is put aside, then the duel is sent. */
    async challenge(other, stake, modeId) {
      if (!uid || !pseudo) throw new Error('no-pseudo')
      if (!DUEL_STAKES.includes(stake) || other.uid === uid) throw new Error('invalid-duel')
      const id = cloud.newDuelId()
      const at = now().getTime()
      game.stakeDuel(id, stake)
      try {
        await cloud.createDuel(id, {
          from: { uid, pseudo },
          to: { uid: other.uid, pseudo: other.pseudo },
          mode: modeId,
          stake,
          status: 'open',
          createdAt: at,
          expiresAt: at + DUEL_MS,
          scores: {},
        })
      } catch (error) {
        game.settleDuel(id, stake) // not sent: the stake comes back
        throw error
      }
      return id
    },

    /** Accepts a duel: the same stake is put aside, and both have DUEL_HOURS to play. */
    async acceptDuel(duel) {
      game.stakeDuel(duel.id, duel.stake)
      try {
        await cloud.updateDuel(duel.id, { status: 'accepted', expiresAt: now().getTime() + DUEL_MS })
      } catch (error) {
        game.settleDuel(duel.id, duel.stake)
        throw error
      }
    },

    declineDuel: (duel) => cloud.updateDuel(duel.id, { status: 'declined' }),

    /** Publishes the player's tries and best multiplier in a duel. */
    pushDuelScore: (id, score) => cloud.updateDuel(id, { [`scores.${uid}`]: score }),

    /**
     * Poulaillers: every team with its members' league points summed, best
     * first, and the player's own team. Fixes the player's cached team if it
     * no longer holds them.
     */
    async teamBoard() {
      const [teams, lines] = await Promise.all([cloud.teams(), cloud.teamLines()])
      const lp = new Map(lines.map((line) => [line.uid, line.lp ?? 0]))
      const board = teams
        .map((team) => ({
          ...team,
          lp: team.members.reduce((sum, member) => sum + (lp.get(member) ?? 0), 0),
          size: team.members.length,
        }))
        .sort((a, b) => b.lp - a.lp)
      const mine = uid ? (board.find((team) => team.members.includes(uid)) ?? null) : null
      if (uid && (mine?.id ?? null) !== game.exportSave().team) game.setTeam(mine?.id ?? null)
      return { teams: board, mine }
    },

    async createTeam(name) {
      if (!uid || !pseudo) throw new Error('no-pseudo')
      const clean = name.trim().replace(/\s+/g, ' ')
      if (clean.length < 3 || clean.length > 20) throw new Error('Nom de 3 à 20 caractères.')
      const id = cloud.newTeamId()
      await cloud.createTeam(id, { name: clean, owner: uid, members: [uid], pseudos: { [uid]: pseudo }, createdAt: now().getTime() })
      game.setTeam(id)
      return id
    },

    async joinTeam(team) {
      if (!uid || !pseudo) throw new Error('no-pseudo')
      if (team.members.length >= TEAM_SIZE) throw new Error('Ce poulailler est complet.')
      const current = game.exportSave().team
      if (current && current !== team.id) await cloud.leaveTeam(current, uid)
      await cloud.joinTeam(team.id, uid, pseudo)
      game.setTeam(team.id)
    },

    async leaveTeam() {
      const current = game.exportSave().team
      game.setTeam(null)
      if (current) await cloud.leaveTeam(current, uid)
    },

    /** Posts to the activity feed (only players with a pseudo appear there). */
    postFeed(item) {
      if (!uid || !pseudo) return Promise.resolve()
      return cloud.postFeed({ uid, pseudo, mult: 0, mode: null, lanes: 0, other: null, ...item, at: now().getTime() })
    },

    feed: (size) => cloud.feed(size),

    /** Every player's save, for the admin's stats (refused by the cloud for anyone else). */
    adminOverview: () => cloud.adminOverview(ADMIN_MAX_PLAYERS),
  }
  return service
}
