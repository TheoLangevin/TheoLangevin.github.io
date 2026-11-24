import { DEFAULT_BET, REFILL_AMOUNT } from '../config/economy.js'
import { DOUBLE_LANE_BONUS } from '../config/events.js'
import { DEFAULT_MODE_ID, modeById } from '../config/modes.js'
import { HISTORY_SIZE } from '../config/ui.js'
import { AUTOCASH_TARGETS, upgradeById } from '../config/upgrades.js'
import { drawOutcomes, firstFatalLane, randomSeed, sha256Hex } from '../domain/fairness.js'
import {
  levelUpPay,
  xpFor,
  lanesCrossed,
  levelFromXp,
  levelProgress,
  newAchievements,
  purchaseCheck,
} from '../domain/progression.js'
import { advance, cashOut, createRound, ROUND_STATUS } from '../domain/round.js'
import { refillCheck } from '../domain/money.js'
import { roundToSave, SAVE_ROUNDS, SAVE_VERSION, validateSave } from '../domain/save.js'
import { isSeasonId, seasonReward, weeklyStats } from '../domain/seasons.js'

export class GameError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const PURCHASE_ERRORS = {
  unknown: 'Objet inconnu',
  exclusive: 'Récompense de saison : ne s’achète pas',
  owned: 'Déjà acheté',
  level: 'Niveau trop bas',
  tokens: 'Pas assez de jetons',
}

const toUpdate = (round, xp = 0) => ({
  id: round.id,
  lane: round.lane,
  status: round.status,
  multiplier: round.multiplier,
  payoutCents: round.payoutCents,
  endedAt: round.endedAt,
  crossed: round.status === ROUND_STATUS.active ? 0 : lanesCrossed(round),
  roadLanes: round.mode.lanes,
  xp,
})

/**
 * Use cases of the game, on top of the domain rules and a store. The UI only
 * talks to this service; the service is the only one writing to the store.
 * Every change of money or experience happens in one transaction with what
 * caused it, so a reload can never lose a bet, pay a round twice or charge an
 * upgrade without giving it.
 */
export function createGameService({ store, clock = () => new Date().toISOString(), seeds = randomSeed }) {
  let current = null
  let changes = 0
  const listeners = new Set()

  /**
   * A write that changes the player's progress: one transaction, flagged as
   * not yet synced with the account, then listeners are told.
   */
  function write(work) {
    const result = store.transaction(() => {
      const value = work()
      store.settings.set('sync_dirty', '1')
      return value
    })
    changes++
    // After the caller has updated the round in progress, so listeners see it.
    queueMicrotask(() => {
      for (const listener of listeners) listener()
    })
    return result
  }

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
        store.wallet.credit(achievement.reward)
        unlocked.push(achievement.id)
      }
    }
  }

  /**
   * Experience, level-up tokens and achievements of a finished round. Inside a
   * transaction. Each new level pays tokens once (`level_paid` remembers the
   * last one paid; players who already had a level are not paid back for it).
   */
  function settle(round) {
    const levelBefore = levelFromXp(store.profile.get().xp)
    const paidBefore = Number(store.settings.get('level_paid', 0)) || levelBefore
    // "Double poule" (random event): this round's XP counts twice and every lane pays tokens.
    const doubled = store.settings.get('double_next', '0') === '1'
    const xp = xpFor(round) * (doubled ? 2 : 1)
    const bonusCents = doubled ? lanesCrossed(round) * DOUBLE_LANE_BONUS : 0
    if (doubled) store.settings.set('double_next', '0')
    store.rounds.update(toUpdate(round, xp))
    if (round.payoutCents > 0) store.wallet.credit(round.payoutCents)
    if (bonusCents > 0) store.wallet.credit(bonusCents)
    if (xp > 0) store.profile.earn(xp)
    const levelAfter = levelFromXp(store.profile.get().xp)
    const levelCents = levelUpPay(paidBefore, levelAfter)
    if (levelCents > 0) store.wallet.credit(levelCents)
    store.settings.set('level_paid', Math.max(paidBefore, levelAfter))
    const achievements = unlockAchievements()
    return { xp, doubled, bonusCents, levelCents, achievements, levelUp: levelAfter > levelBefore ? levelAfter : null }
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
        haptics: store.settings.get('haptics', 'on') === 'on',
      }
    },

    savePreferences({ modeId, betCents, autocashTarget, sound, haptics }) {
      write(() => {
        if (modeId) store.settings.set('mode', modeId)
        if (betCents) store.settings.set('bet', betCents)
        if (autocashTarget !== undefined) store.settings.set('autocash', autocashTarget ?? '')
        if (sound !== undefined) store.settings.set('sound', sound ? 'on' : 'off')
        if (haptics !== undefined) store.settings.set('haptics', haptics ? 'on' : 'off')
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
        week: weeklyStats(store.rounds.forSave(SAVE_ROUNDS).map(roundToSave), new Date(clock())),
        claims: store.seasons.claimed(),
        doubleNext: store.settings.get('double_next', '0') === '1',
        lastRefillAt: Number(store.settings.get('last_refill_at', 0)) || null,
        progression: {
          xp: profile.xp,
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

      const id = write(() => {
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
     * plus `progress` (xp, level-up tokens, achievements) once the round ends.
     */
    step() {
      if (!current) throw new GameError('no-round', 'Aucune partie en cours')
      const result = advance(current, clock())
      if (result.event === 'crossed') {
        write(() => store.rounds.update(toUpdate(result.round)))
        current = result.round
        return { ...result, fatalLane: null, progress: null }
      }
      const progress = write(() => settle(result.round))
      current = null
      return { ...result, fatalLane: firstFatalLane(result.round.outcomes), progress }
    },

    cashOut() {
      if (!current) throw new GameError('no-round', 'Aucune partie en cours')
      const round = cashOut(current, clock())
      const progress = write(() => settle(round))
      current = null
      return { event: 'cashed', lane: round.lane, round, fatalLane: firstFatalLane(round.outcomes), progress }
    },

    /**
     * Buys an item with tokens and puts it on. Purchases wait for the round
     * in progress to end. Returns achievements it unlocked.
     */
    buy(upgradeId) {
      const upgrade = upgradeById(upgradeId)
      if (upgrade && current) {
        throw new GameError('round-in-progress', 'Terminez la partie en cours')
      }
      return write(() => {
        const profile = store.profile.get()
        const verdict = purchaseCheck(upgradeId, {
          owned: store.upgrades.owned(),
          level: levelFromXp(profile.xp),
          balanceCents: store.wallet.balance(),
        })
        if (verdict !== 'ok') throw new GameError(`purchase-${verdict}`, PURCHASE_ERRORS[verdict])
        if (!store.wallet.debit(upgrade.cost)) throw new GameError('purchase-tokens', PURCHASE_ERRORS.tokens)
        store.upgrades.add(upgradeId)
        if (upgrade.slot !== 'perk') store.upgrades.equip(upgrade.slot, upgradeId)
        return { upgrade, achievements: unlockAchievements() }
      })
    },

    /** Puts an owned upgrade on, or takes it off if it is already worn. */
    toggleEquip(upgradeId) {
      const upgrade = upgradeById(upgradeId)
      if (!upgrade || upgrade.slot === 'perk') return
      write(() => {
        if (!store.upgrades.owned().includes(upgradeId)) throw new GameError('not-owned', 'Pas encore achetée')
        if (store.upgrades.equipped()[upgrade.slot] === upgradeId) store.upgrades.unequip(upgrade.slot)
        else store.upgrades.equip(upgrade.slot, upgradeId)
      })
    },

    owns: (upgradeId) => store.upgrades.owned().includes(upgradeId),

    /** Clears the history and totals. Balance and progression stay. */
    clearStats() {
      if (current) throw new GameError('round-in-progress', 'Terminez la partie en cours')
      write(() => store.rounds.clearFinished())
    },

    /** Whether a refill is possible now: { verdict, waitMs } (domain/money.js). */
    refillStatus() {
      return refillCheck({
        balanceCents: store.wallet.balance(),
        lastRefillAt: Number(store.settings.get('last_refill_at', 0)) || null,
        now: Date.parse(clock()),
      })
    },

    /** Gives a broke player REFILL_AMOUNT tokens, once per cooldown. */
    refill() {
      if (current) throw new GameError('round-in-progress', 'Terminez la partie en cours')
      const { verdict } = service.refillStatus()
      if (verdict === 'not-broke') throw new GameError('refill-not-broke', 'Il vous reste des jetons')
      if (verdict === 'wait') throw new GameError('refill-wait', 'Recharge pas encore disponible')
      write(() => {
        store.wallet.credit(REFILL_AMOUNT)
        store.settings.set('last_refill_at', Date.parse(clock()))
      })
      return REFILL_AMOUNT
    },

    /**
     * A bonus from a random event (domain/events.js): a few tokens, and/or a
     * double hen (next round: double XP and tokens per lane).
     * Never touches the odds of a round.
     */
    grantBonus({ tokens = 0, double = false } = {}) {
      if (!(Number.isInteger(tokens) && tokens >= 0 && tokens <= 1_000_000)) throw new GameError('invalid-bonus', 'Bonus invalide')
      return write(() => {
        if (tokens) store.wallet.credit(tokens)
        if (double) store.settings.set('double_next', '1')
        return { tokens, double, achievements: unlockAchievements() }
      })
    },

    /** Seasons whose reward was already collected. */
    claimedSeasons: () => store.seasons.claimed().map((claim) => claim.season),

    /**
     * Collects a finished season's reward, once: tokens and exclusive items. `rank` and `total` come from
     * the season's board; without them only the league reward is paid.
     */
    claimSeason({ season, score, rank = null, total = null }) {
      if (!isSeasonId(season)) throw new GameError('invalid-season', 'Saison inconnue')
      if (service.claimedSeasons().includes(season)) throw new GameError('season-claimed', 'Récompense déjà récupérée')
      const reward = seasonReward({ score, rank, total })
      if (!reward) throw new GameError('season-no-reward', 'Pas de score cette saison')
      const achievements = write(() => {
        store.seasons.add({ season, rank, total, score })
        store.wallet.credit(reward.tokens)
        const owned = store.upgrades.owned()
        for (const id of reward.items) {
          if (owned.includes(id)) continue
          store.upgrades.add(id)
          const slot = upgradeById(id).slot
          if (!store.upgrades.equipped()[slot]) store.upgrades.equip(slot, id)
        }
        return unlockAchievements()
      })
      return { ...reward, achievements }
    },

    /** Called after every change of progress (to sync it). Returns an unsubscribe function. */
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    /** The player's whole progress as a save (domain/save.js). */
    exportSave() {
      const profile = store.profile.get()
      const prefs = service.preferences()
      return {
        v: SAVE_VERSION,
        balanceCents: store.wallet.balance(),
        xp: profile.xp,
        feathers: 0,
        upgrades: store.upgrades.owned(),
        equipped: store.upgrades.equipped(),
        achievements: store.achievements.unlocked(),
        prefs: { mode: prefs.modeId, bet: prefs.betCents, autocash: prefs.autocashTarget, sound: prefs.sound },
        rounds: store.rounds.forSave(SAVE_ROUNDS).map(roundToSave),
        claims: store.seasons.claimed(),
        lastRefillAt: Number(store.settings.get('last_refill_at', 0)) || null,
      }
    },

    /**
     * Replaces this device's progress with a save (from the account). Refused
     * during a round. Does not mark the device as changed.
     */
    importSave(raw) {
      if (current) throw new GameError('round-in-progress', 'Terminez la partie en cours')
      const save = validateSave(raw)
      if (!save) throw new GameError('invalid-save', 'Sauvegarde du compte illisible')
      store.transaction(() => {
        store.wallet.set(save.balanceCents)
        store.profile.set({ xp: save.xp })
        store.settings.set('level_paid', levelFromXp(save.xp))
        store.upgrades.replace(save.upgrades, save.equipped)
        store.achievements.replace(save.achievements)
        store.rounds.replaceFinished(save.rounds)
        store.seasons.replace(save.claims)
        store.settings.set('last_refill_at', save.lastRefillAt ?? 0)
        store.settings.set('mode', save.prefs.mode)
        if (save.prefs.bet) store.settings.set('bet', save.prefs.bet)
        store.settings.set('autocash', save.prefs.autocash ?? '')
        store.settings.set('sound', save.prefs.sound ? 'on' : 'off')
      })
      return save
    },

    /** Which account this device last synced with, and how far. */
    syncState() {
      return {
        linkedUid: store.settings.get('sync_uid', null) || null,
        syncedRev: Number(store.settings.get('sync_rev', 0)) || 0,
        dirty: store.settings.get('sync_dirty', '0') === '1',
      }
    },

    /** Counts changes of progress in this session, to spot one made during a sync. */
    changeCount: () => changes,

    /**
     * Records a successful sync: this device now matches `rev` of `uid`'s
     * save. `clean` is false when the player changed something meanwhile, so
     * the device stays flagged for the next sync.
     */
    markSynced(uid, rev, { clean = true } = {}) {
      store.transaction(() => {
        store.settings.set('sync_uid', uid)
        store.settings.set('sync_rev', rev)
        if (clean) store.settings.set('sync_dirty', '0')
      })
    },
  }
  return service
}
