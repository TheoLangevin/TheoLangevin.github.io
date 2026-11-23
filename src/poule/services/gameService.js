import { HISTORY_SIZE } from '../config/ui.js'
import { DEFAULT_BET, STARTING_BALANCE } from '../config/economy.js'
import { DEFAULT_MODE_ID, modeById } from '../config/modes.js'
import { drawOutcomes, firstFatalLane, randomSeed, sha256Hex } from '../domain/fairness.js'
import { advance, cashOut, createRound, ROUND_STATUS } from '../domain/round.js'

export class GameError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const toUpdate = (round) => ({
  id: round.id,
  lane: round.lane,
  status: round.status,
  multiplier: round.multiplier,
  payoutCents: round.payoutCents,
  endedAt: round.endedAt,
})

/**
 * Use cases of the game, on top of the domain rules and a store. The UI only
 * talks to this service; the service is the only one writing to the store.
 * Every change of money happens in one transaction with the round it belongs
 * to, so a reload can never lose a bet or pay a round twice.
 */
export function createGameService({ store, clock = () => new Date().toISOString(), seeds = randomSeed }) {
  let current = null

  async function restore(row) {
    const mode = modeById(row.mode_id)
    const outcomes = await drawOutcomes(row.seed, mode)
    return createRound({
      id: row.id,
      mode,
      betCents: row.bet_cents,
      seed: row.seed,
      seedHash: row.seed_hash,
      outcomes,
      lane: row.lane,
      startedAt: row.started_at,
    })
  }

  const service = {
    /** Picks up a round left in progress (tab closed mid-road). */
    async resume() {
      const row = store.rounds.active()
      current = row ? await restore(row) : null
      return current
    },

    get round() {
      return current
    },

    preferences() {
      return {
        modeId: modeById(store.settings.get('mode', DEFAULT_MODE_ID)).id,
        betCents: Number(store.settings.get('bet', DEFAULT_BET)) || DEFAULT_BET,
      }
    },

    savePreferences({ modeId, betCents }) {
      store.transaction(() => {
        if (modeId) store.settings.set('mode', modeId)
        if (betCents) store.settings.set('bet', betCents)
      })
    },

    /** Balance, history and totals, as the screens show them. */
    summary() {
      const stats = store.rounds.stats()
      return {
        balanceCents: store.wallet.balance(),
        history: store.rounds.history(HISTORY_SIZE),
        stats: {
          played: stats.played,
          won: stats.won,
          wageredCents: stats.wagered_cents,
          returnedCents: stats.returned_cents,
          bestMultiplier: stats.best_multiplier,
        },
        byMode: store.rounds.statsByMode(),
      }
    },

    async start({ modeId, betCents }) {
      if (current) throw new GameError('round-in-progress', 'Une partie est déjà en cours')
      const mode = modeById(modeId)
      const seed = seeds()
      const [seedHash, outcomes] = await Promise.all([sha256Hex(seed), drawOutcomes(seed, mode)])
      const startedAt = clock()

      const id = store.transaction(() => {
        if (!store.wallet.debit(betCents)) throw new GameError('insufficient-funds', 'Solde insuffisant')
        return store.rounds.insert({
          modeId: mode.id,
          betCents,
          seed,
          seedHash,
          lane: 0,
          status: ROUND_STATUS.active,
          startedAt,
        })
      })
      current = createRound({ id, mode, betCents, seed, seedHash, outcomes, startedAt })
      return current
    },

    /** One lane forward: { event: 'crossed' | 'hit' | 'finished', lane, round }. */
    step() {
      if (!current) throw new GameError('no-round', 'Aucune partie en cours')
      const result = advance(current, clock())
      store.transaction(() => {
        store.rounds.update(toUpdate(result.round))
        if (result.round.payoutCents > 0) store.wallet.credit(result.round.payoutCents)
      })
      current = result.event === 'crossed' ? result.round : null
      return { ...result, fatalLane: result.event === 'crossed' ? null : firstFatalLane(result.round.outcomes) }
    },

    cashOut() {
      if (!current) throw new GameError('no-round', 'Aucune partie en cours')
      const round = cashOut(current, clock())
      store.transaction(() => {
        store.rounds.update(toUpdate(round))
        store.wallet.credit(round.payoutCents)
      })
      current = null
      return { event: 'cashed', lane: round.lane, round, fatalLane: firstFatalLane(round.outcomes) }
    },

    /** Back to the starting balance, history and totals cleared. */
    reset() {
      if (current) throw new GameError('round-in-progress', 'Terminez la partie en cours')
      store.transaction(() => {
        store.rounds.clearFinished()
        store.wallet.set(STARTING_BALANCE)
      })
    },
  }
  return service
}
