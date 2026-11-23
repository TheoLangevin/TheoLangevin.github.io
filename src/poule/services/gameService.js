import { DEFAULT_BET, STARTING_BALANCE } from '../config/economy.js'
import { DEFAULT_MODE_ID, modeById } from '../config/modes.js'
import { HISTORY_SIZE } from '../config/ui.js'
import { AUTOCASH_TARGETS, upgradeById } from '../config/upgrades.js'
import { drawOutcomes, firstFatalLane, randomSeed, sha256Hex } from '../domain/fairness.js'
import {
  feathersFor,
  lanesCrossed,
  levelFromXp,
  levelProgress,
  newAchievements,
  purchaseCheck,
} from '../domain/progression.js'
import { advance, cashOut, createRound, ROUND_STATUS } from '../domain/round.js'

export class GameError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const PURCHASE_ERRORS = {
  unknown: 'Amélioration inconnue',
  owned: 'Déjà achetée',
  level: 'Niveau trop bas',
  feathers: 'Pas assez de plumes',
}

const toUpdate = (round, feathers = 0) => ({
  id: round.id,
  lane: round.lane,
  status: round.status,
  multiplier: round.multiplier,
  payoutCents: round.payoutCents,
  endedAt: round.endedAt,
  crossed: round.status === ROUND_STATUS.active ? 0 : lanesCrossed(round),
  roadLanes: round.mode.lanes,
  feathers,
})

/**
 * Use cases of the game, on top of the domain rules and a store. The UI only
 * talks to this service; the service is the only one writing to the store.
 * Every change of money or feathers happens in one transaction with what
 * caused it, so a reload can never lose a bet, pay a round twice or charge an
 * upgrade without giving it.
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

  /** Totals the achievements are checked against. */
  function achievementStats() {
    const stats = store.rounds.progressStats()
    return {
      lanesCrossed: stats.lanes_crossed,
      won: stats.won,
      bestLanes: stats.best_lanes,
      modesWon: stats.modes_won,
      hardcoreWins: stats.hardcore_wins,
      bestMultiplier: stats.best_multiplier ?? 0,
      finished: stats.finished,
      owned: store.upgrades.owned().length,
      level: levelFromXp(store.profile.get().xp),
    }
  }

  /**
   * Unlocks what is newly earned and pays the rewards. Rewards raise the level,
   * which can unlock more, so it loops until nothing new comes. Call inside a
   * transaction.
   */
  function unlockAchievements() {
    const unlocked = []
    for (;;) {
      const fresh = newAchievements(achievementStats(), [...store.achievements.unlocked()])
      if (fresh.length === 0) return unlocked
      for (const achievement of fresh) {
        store.achievements.add(achievement.id)
        store.profile.earn(achievement.reward)
        unlocked.push(achievement.id)
      }
    }
  }

  /** Feathers, experience and achievements of a finished round. Inside a transaction. */
  function settle(round) {
    const levelBefore = levelFromXp(store.profile.get().xp)
    const feathers = feathersFor(round)
    store.rounds.update(toUpdate(round, feathers))
    if (round.payoutCents > 0) store.wallet.credit(round.payoutCents)
    if (feathers > 0) store.profile.earn(feathers)
    const achievements = unlockAchievements()
    const levelAfter = levelFromXp(store.profile.get().xp)
    return { feathers, achievements, levelUp: levelAfter > levelBefore ? levelAfter : null }
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
      const target = Number(store.settings.get('autocash', ''))
      return {
        modeId: modeById(store.settings.get('mode', DEFAULT_MODE_ID)).id,
        betCents: Number(store.settings.get('bet', DEFAULT_BET)) || DEFAULT_BET,
        autocashTarget: AUTOCASH_TARGETS.includes(target) ? target : null,
        sound: store.settings.get('sound', 'on') === 'on',
      }
    },

    savePreferences({ modeId, betCents, autocashTarget, sound }) {
      store.transaction(() => {
        if (modeId) store.settings.set('mode', modeId)
        if (betCents) store.settings.set('bet', betCents)
        if (autocashTarget !== undefined) store.settings.set('autocash', autocashTarget ?? '')
        if (sound !== undefined) store.settings.set('sound', sound ? 'on' : 'off')
      })
    },

    /** Balance, history, totals and progression, as the screens show them. */
    summary() {
      const stats = store.rounds.stats()
      const profile = store.profile.get()
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
        progression: {
          xp: profile.xp,
          feathers: profile.feathers,
          ...levelProgress(profile.xp),
          owned: store.upgrades.owned(),
          equipped: store.upgrades.equipped(),
          achievements: store.achievements.unlocked(),
        },
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

    /**
     * One lane forward: { event: 'crossed' | 'hit' | 'finished', lane, round },
     * plus `progress` (feathers, achievements, level up) once the round ends.
     */
    step() {
      if (!current) throw new GameError('no-round', 'Aucune partie en cours')
      const result = advance(current, clock())
      if (result.event === 'crossed') {
        store.transaction(() => store.rounds.update(toUpdate(result.round)))
        current = result.round
        return { ...result, fatalLane: null, progress: null }
      }
      const progress = store.transaction(() => settle(result.round))
      current = null
      return { ...result, fatalLane: firstFatalLane(result.round.outcomes), progress }
    },

    cashOut() {
      if (!current) throw new GameError('no-round', 'Aucune partie en cours')
      const round = cashOut(current, clock())
      const progress = store.transaction(() => settle(round))
      current = null
      return { event: 'cashed', lane: round.lane, round, fatalLane: firstFatalLane(round.outcomes), progress }
    },

    /** Buys an upgrade with feathers and puts it on. Returns achievements it unlocked. */
    buy(upgradeId) {
      return store.transaction(() => {
        const profile = store.profile.get()
        const verdict = purchaseCheck(upgradeId, {
          owned: store.upgrades.owned(),
          level: levelFromXp(profile.xp),
          feathers: profile.feathers,
        })
        if (verdict !== 'ok') throw new GameError(`purchase-${verdict}`, PURCHASE_ERRORS[verdict])
        const upgrade = upgradeById(upgradeId)
        if (!store.profile.spend(upgrade.cost)) throw new GameError('purchase-feathers', PURCHASE_ERRORS.feathers)
        store.upgrades.add(upgradeId)
        if (upgrade.slot !== 'perk') store.upgrades.equip(upgrade.slot, upgradeId)
        return { upgrade, achievements: unlockAchievements() }
      })
    },

    /** Puts an owned upgrade on, or takes it off if it is already worn. */
    toggleEquip(upgradeId) {
      const upgrade = upgradeById(upgradeId)
      if (!upgrade || upgrade.slot === 'perk') return
      store.transaction(() => {
        if (!store.upgrades.owned().includes(upgradeId)) throw new GameError('not-owned', 'Pas encore achetée')
        if (store.upgrades.equipped()[upgrade.slot] === upgradeId) store.upgrades.unequip(upgrade.slot)
        else store.upgrades.equip(upgrade.slot, upgradeId)
      })
    },

    owns: (upgradeId) => store.upgrades.owned().includes(upgradeId),

    /** Back to the starting balance, history and totals cleared. Progression stays. */
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
