/**
 * The game server of La Poule Traverse (Cloud Functions for Firebase).
 *
 * Signed-in players do not change their progress themselves any more: every
 * action goes through the `game` callable, which runs the very same game
 * service as the browser (src/poule/services/gameService.js) on the player's
 * save, inside a Firestore transaction, with the server's own randomness.
 * The round in progress (and its secret seed) stays in `activeRounds/{uid}`,
 * which no client can read. After each action the server also publishes the
 * player's public lines (leaderboard, week, daily challenge) and big moments
 * to the feed. firestore.rules forbid clients to write any of these.
 *
 * Bundled with esbuild (see .github/workflows/functions.yml), so it imports
 * the game's modules straight from src/poule.
 */
import { randomBytes, randomInt } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { DUEL_STAKES } from '../../src/poule/config/duels.js'
import { EVENT_MIN_GAP, TORNADO_BONUS, WHEEL } from '../../src/poule/config/events.js'
import { MAX_WEEKS_TO_FETCH } from '../../src/poule/config/seasons.js'
import { FEED_MIN_MULTIPLIER } from '../../src/poule/config/teams.js'
import { createMemoryStore } from '../../src/poule/data/memory/createMemoryStore.js'
import { dayId, previousDayId } from '../../src/poule/domain/daily.js'
import { DUEL_MS, duelPayout } from '../../src/poule/domain/duels.js'
import { weeksBetween } from '../../src/poule/domain/leagues.js'
import { dailyEntry, isValidPseudo, leaderboardEntry, seasonEntry } from '../../src/poule/domain/save.js'
import { previousSeasonId } from '../../src/poule/domain/seasons.js'
import { createGameService, GameError } from '../../src/poule/services/gameService.js'

initializeApp()
const db = getFirestore()

const seeds = () => randomBytes(32).toString('hex')
const rng = () => randomInt(0, 2 ** 32) / 2 ** 32
const fail = (code, message) => {
  throw new HttpsError('failed-precondition', message, { code })
}

/** The round as the player may see it: the seed only once it is over. */
function publicRound(round) {
  if (!round) return null
  const over = round.status !== 'active'
  return {
    id: round.id,
    modeId: round.mode.id,
    betCents: round.betCents,
    seedHash: round.seedHash,
    seed: over ? round.seed : null,
    lane: round.lane,
    status: round.status,
    multiplier: round.multiplier,
    payoutCents: round.payoutCents,
    startedAt: round.startedAt,
    endedAt: round.endedAt ?? null,
  }
}

/** A result safe to send: rounds without their road. */
function publicResult(result) {
  if (!result || typeof result !== 'object') return result ?? null
  const copy = { ...result }
  if (copy.round) copy.round = publicRound(copy.round)
  return copy
}

/** Season and daily results of the player, computed here (never trusted from the client). */
async function pendingResults(uid, service, now) {
  const league = service.league()
  const last = previousSeasonId(now)
  const weeks = []
  if (league.settled) {
    const ids = weeksBetween(league.settled, last)
    const fetched = new Set(ids.slice(-MAX_WEEKS_TO_FETCH))
    for (const id of ids) {
      const entries = db.collection('seasons').doc(id).collection('entries')
      const line = fetched.has(id) ? await entries.doc(uid).get() : null
      const score = line?.exists ? (line.data().score ?? 0) : 0
      let rank = null
      let total = null
      if (score > 0) {
        const [above, scored] = await Promise.all([
          entries.where('score', '>', score).count().get(),
          entries.where('score', '>', 0).count().get(),
        ])
        rank = above.data().count + 1
        total = scored.data().count
      }
      weeks.push({ season: id, score, rank, total })
    }
  }
  let daily = null
  const yesterday = previousDayId(now)
  if (!service.dailyClaims().includes(yesterday)) {
    const entries = db.collection('daily').doc(yesterday).collection('entries')
    const line = await entries.doc(uid).get()
    if (line.exists) {
      const best = line.data().best ?? 0
      let rank = null
      let total = null
      if (best > 0) {
        const [above, all] = await Promise.all([entries.where('best', '>', best).count().get(), entries.count().get()])
        rank = above.data().count + 1
        total = all.data().count
      }
      daily = { date: yesterday, best, rank, total }
    }
  }
  return { weeks, daily }
}

/** Every action a player may ask for. `ctx` holds the transaction and what was read. */
const OPS = {
  load: () => null,
  start: ({ service }, options = {}) =>
    service.start({
      modeId: options.modeId,
      betCents: options.betCents,
      daily: Boolean(options.daily),
      duel: options.duel ? { id: String(options.duel.id), modeId: options.duel.modeId } : null,
    }),
  step: ({ service }) => service.step(),
  cashOut: ({ service }) => service.cashOut(),
  savePreferences: ({ service }, prefs = {}) => service.savePreferences(prefs),
  buy: ({ service }, id) => service.buy(String(id)),
  toggleEquip: ({ service }, id) => service.toggleEquip(String(id)),
  clearStats: ({ service }) => service.clearStats(),
  refill: ({ service }) => service.refill(),
  claimMission: ({ service }, id) => service.claimMission(String(id)),
  claimStreak: ({ service }) => service.claimStreak(),
  claimGift: ({ service }, id) => service.claimGift(String(id)),
  claimSet: ({ service }, id) => service.claimSet(String(id)),
  openBox: ({ service }) => service.openBox(),
  setTeam: async ({ tx, uid, service }, id) => {
    if (id) {
      const team = await tx.get(db.doc(`teams/${id}`))
      if (!team.exists || !team.data().members.includes(uid)) fail('team', 'Pas membre de ce poulailler')
    }
    return service.setTeam(id ?? null)
  },
  /** Event bonuses: only what the game's events can give, once per few rounds. */
  grantBonus: ({ service, store }, bonus = {}) => {
    const allowed = [...WHEEL.map((segment) => segment.bonus), TORNADO_BONUS, { double: true }]
    const ok = allowed.some((entry) => (entry.tokens ?? 0) === (bonus.tokens ?? 0) && Boolean(entry.double) === Boolean(bonus.double))
    if (!ok) fail('bonus', 'Bonus inconnu')
    const played = store.rounds.stats().played
    const last = Number(store.settings.get('bonus_at_round', -99))
    if (played - last < EVENT_MIN_GAP) fail('bonus', 'Pas d’événement pour l’instant')
    store.settings.set('bonus_at_round', played)
    return service.grantBonus({ tokens: bonus.tokens ?? 0, double: Boolean(bonus.double) })
  },
  /** Finished weeks and yesterday's challenge, ranks computed here. */
  settleResults: async ({ uid, service, now }) => {
    const league = service.league()
    if (!league.settled) {
      service.initLeague(previousSeasonId(now))
      return null
    }
    return service.settleResults(await pendingResults(uid, service, now))
  },
  initLeague: ({ service, now }) => service.initLeague(previousSeasonId(now)),
  /** Sends a duel: the stake is put aside and the duel written, together. */
  challenge: ({ tx, uid, service, pseudo, now }, { to, stake, modeId } = {}) => {
    if (!pseudo) fail('no-pseudo', 'Choisissez un pseudo pour défier')
    if (!DUEL_STAKES.includes(stake) || !to?.uid || to.uid === uid || !isValidPseudo(to.pseudo)) fail('duel', 'Défi invalide')
    const ref = db.collection('duels').doc()
    service.stakeDuel(ref.id, stake)
    tx.set(ref, {
      from: { uid, pseudo },
      to: { uid: to.uid, pseudo: to.pseudo },
      mode: modeId,
      stake,
      status: 'open',
      createdAt: now.getTime(),
      expiresAt: now.getTime() + DUEL_MS,
      scores: {},
    })
    return { id: ref.id }
  },
  acceptDuel: async ({ tx, uid, service, now }, id) => {
    const ref = db.doc(`duels/${id}`)
    const snap = await tx.get(ref)
    const duel = snap.data()
    if (!snap.exists || duel.to.uid !== uid || duel.status !== 'open' || now.getTime() > duel.expiresAt) {
      fail('duel', 'Ce défi n’est plus ouvert')
    }
    service.stakeDuel(id, duel.stake)
    tx.update(ref, { status: 'accepted', expiresAt: now.getTime() + DUEL_MS })
    return null
  },
  /** Pays what the player's finished duels give back, from the duels themselves. */
  settleDuels: async ({ tx, uid, service, now }) => {
    const staked = Object.entries(service.duelLedger()).filter(([, state]) => state === 'staked')
    let paid = 0
    for (const [id] of staked) {
      const snap = await tx.get(db.doc(`duels/${id}`))
      if (!snap.exists) continue
      const payout = duelPayout(snap.data(), uid, now.getTime())
      if (payout != null && service.settleDuel(id, payout)) paid += payout
    }
    return { paid }
  },
}

export const game = onCall({ region: 'europe-west1', maxInstances: 10, cors: true }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous')
  const { op, args = [] } = request.data ?? {}
  if (!Object.hasOwn(OPS, op) || !Array.isArray(args)) throw new HttpsError('invalid-argument', 'Action inconnue')

  try {
    return await db.runTransaction(async (tx) => {
      const now = new Date()
      const userRef = db.doc(`users/${uid}`)
      const activeRef = db.doc(`activeRounds/${uid}`)
      const lineRef = db.doc(`leaderboard/${uid}`)
      const [userSnap, activeSnap, lineSnap] = await tx.getAll(userRef, activeRef, lineRef)
      const pseudo = userSnap.data()?.pseudo ?? lineSnap.data()?.pseudo ?? null

      // The player's game, rebuilt from their save and their round in progress.
      const store = createMemoryStore()
      const service = createGameService({ store, seeds, rng, clock: () => new Date().toISOString() })
      const saved = userSnap.data()?.save
      if (saved) service.importSave(saved)
      service.startSeason()
      const active = activeSnap.exists ? activeSnap.data() : null
      if (active) {
        const id = store.rounds.insert({
          modeId: active.modeId,
          betCents: active.betCents,
          seed: active.seed,
          seedHash: active.seedHash,
          lane: active.lane,
          status: 'active',
          startedAt: active.startedAt,
        })
        if (active.daily) store.settings.set('daily_round', id)
        if (active.duel) store.settings.set('duel_round', JSON.stringify({ id: active.duel, roundId: id }))
        await service.resume()
      }

      const result = await OPS[op]({ tx, uid, service, store, pseudo, now }, ...args)

      // What the action changed: the save, the round in progress, the public lines.
      const save = service.exportSave()
      const rev = (userSnap.data()?.rev ?? 0) + 1
      tx.set(userRef, {
        save,
        rev,
        pseudo,
        createdAt: userSnap.data()?.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      const round = service.round
      if (round) {
        const daily = Number(store.settings.get('daily_round', 0)) === round.id
        const duelRound = JSON.parse(store.settings.get('duel_round', 'null') ?? 'null')
        tx.set(activeRef, {
          modeId: round.mode.id,
          betCents: round.betCents,
          seed: round.seed,
          seedHash: round.seedHash,
          lane: round.lane,
          startedAt: round.startedAt,
          daily,
          duel: duelRound?.roundId === round.id ? duelRound.id : null,
        })
      } else if (active) {
        tx.delete(activeRef)
      }

      if (pseudo) {
        const stamp = FieldValue.serverTimestamp()
        tx.set(lineRef, { ...leaderboardEntry(save, pseudo), updatedAt: stamp })
        const { season, ...week } = seasonEntry(save, pseudo, now)
        tx.set(db.doc(`seasons/${season}/entries/${uid}`), { ...week, updatedAt: stamp })
        const day = dailyEntry(save, pseudo, now)
        if (day) {
          const { day: id, ...line } = day
          tx.set(db.doc(`daily/${id}/entries/${uid}`), { ...line, updatedAt: stamp })
        }
        // A finished round: its duel score, and big moments to the feed.
        const ended = result?.round && result.round.status !== 'active' ? result.round : null
        if (ended && result.progress?.duel) {
          const { id, tries, best } = result.progress.duel
          tx.update(db.doc(`duels/${id}`), { [`scores.${uid}`]: { tries, best } })
        }
        if (ended?.status === 'won' && (ended.multiplier >= FEED_MIN_MULTIPLIER || ended.lane === ended.mode.lanes)) {
          tx.set(db.collection('feed').doc(), {
            uid,
            pseudo,
            kind: ended.lane === ended.mode.lanes ? 'finish' : 'cash',
            mult: ended.multiplier,
            mode: ended.mode.id,
            lanes: ended.lane,
            other: null,
            at: now.getTime(),
          })
        }
      }

      return { result: publicResult(result), round: publicRound(round), save, rev, today: dayId(now) }
    })
  } catch (error) {
    if (error instanceof GameError) throw new HttpsError('failed-precondition', error.message, { code: error.code })
    if (error instanceof HttpsError) throw error
    console.error(error)
    throw new HttpsError('internal', 'Erreur du serveur, réessayez')
  }
})

/** Claims a unique pseudo (or changes it) and publishes the player's lines. */
export const pseudo = onCall({ region: 'europe-west1', maxInstances: 5, cors: true }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous')
  const wanted = String(request.data?.pseudo ?? '').trim()
  const leave = request.data?.leave === true
  if (!leave && !isValidPseudo(wanted)) throw new HttpsError('invalid-argument', '3 à 16 caractères : lettres, chiffres, - ou _.')
  return db.runTransaction(async (tx) => {
    const userRef = db.doc(`users/${uid}`)
    const lineRef = db.doc(`leaderboard/${uid}`)
    const wantedRef = leave ? null : db.doc(`pseudos/${wanted.toLowerCase()}`)
    const [userSnap, lineSnap, takenSnap] = await tx.getAll(userRef, lineRef, ...(wantedRef ? [wantedRef] : []))
    const previous = userSnap.data()?.pseudo ?? lineSnap.data()?.pseudo ?? null
    if (leave) {
      if (previous) tx.delete(db.doc(`pseudos/${previous.toLowerCase()}`))
      tx.delete(lineRef)
      tx.set(userRef, { pseudo: null }, { merge: true })
      return { pseudo: null }
    }
    if (takenSnap.exists && takenSnap.data().uid !== uid) throw new HttpsError('already-exists', 'Ce pseudo est déjà pris.')
    if (previous && previous.toLowerCase() !== wanted.toLowerCase()) tx.delete(db.doc(`pseudos/${previous.toLowerCase()}`))
    tx.set(wantedRef, { uid, pseudo: wanted })
    tx.set(userRef, { pseudo: wanted }, { merge: true })
    const save = userSnap.data()?.save
    if (save) tx.set(lineRef, { ...leaderboardEntry(save, wanted), updatedAt: FieldValue.serverTimestamp() })
    return { pseudo: wanted }
  })
})
