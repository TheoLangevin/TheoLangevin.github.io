import { describe, expect, it } from 'vitest'
import { achievementById } from '../../config/achievements.js'
import { STARTING_BALANCE } from '../../config/economy.js'
import { DAILY_BET } from '../../config/daily.js'
import { DUEL_TRY_BET } from '../../config/duels.js'
import { DOUBLE_LANE_BONUS } from '../../config/events.js'
import { modeById } from '../../config/modes.js'
import { createMemoryStore } from '../../data/memory/createMemoryStore.js'
import { drawOutcomes, firstFatalLane } from '../../domain/fairness.js'
import { payoutCents } from '../../domain/multiplier.js'
import { createGameService } from '../gameService.js'

/** A game already in the current big season (the app calls startSeason when it opens). */
const startedGame = (options) => {
  const game = createGameService(options)
  game.startSeason()
  return game
}

const easy = modeById('easy')

/** A seed whose road has its first fatal lane at `lane` or later. */
async function seedSafeFor(lanes, mode = easy) {
  for (let i = 0; ; i++) {
    const fatal = firstFatalLane(await drawOutcomes(`seed-${i}`, mode))
    if (fatal === null || fatal > lanes) return `seed-${i}`
  }
}

async function seedFatalAt(lane, mode = easy) {
  for (let i = 0; ; i++) {
    if (firstFatalLane(await drawOutcomes(`seed-${i}`, mode)) === lane) return `seed-${i}`
  }
}

/** Tokens (cents) the unlocked achievements paid. */
const achievementPay = (service) =>
  service.summary().progression.achievements.reduce((sum, id) => sum + achievementById(id).reward, 0)

const serviceWith = (seed, store = createMemoryStore()) => ({
  store,
  service: startedGame({ store, seeds: () => seed, clock: () => '2026-01-01T00:00:00Z' }),
})

describe('game service', () => {
  it('takes the bet when a round starts', async () => {
    const { service } = serviceWith(await seedSafeFor(3))
    await service.start({ modeId: 'easy', betCents: 1000 })
    expect(service.summary().balanceCents).toBe(STARTING_BALANCE - 1000)
    await expect(service.start({ modeId: 'easy', betCents: 1000 })).rejects.toThrow()
  })

  it('refuses a bet larger than the balance and keeps the money', async () => {
    const { service, store } = serviceWith('s', createMemoryStore({ balance: 500 }))
    store.wallet.set(500)
    await expect(service.start({ modeId: 'easy', betCents: 1000 })).rejects.toThrow()
    expect(store.wallet.balance()).toBe(500)
    expect(store.rounds.active()).toBeNull()
  })

  it('pays a cash out once, and records it', async () => {
    const { service } = serviceWith(await seedSafeFor(3))
    await service.start({ modeId: 'easy', betCents: 1000 })
    for (let i = 0; i < 3; i++) expect(service.step().event).toBe('crossed')
    const result = service.cashOut()
    expect(result.round.payoutCents).toBe(payoutCents(1000, easy, 3))
    expect(() => service.cashOut()).toThrow()

    const summary = service.summary()
    expect(summary.balanceCents).toBe(STARTING_BALANCE - 1000 + payoutCents(1000, easy, 3) + achievementPay(service))
    expect(summary.stats.played).toBe(1)
    expect(summary.stats.won).toBe(1)
    expect(summary.history[0].status).toBe('won')
  })

  it('loses the bet on the fatal lane and reveals it', async () => {
    const { service } = serviceWith(await seedFatalAt(2))
    await service.start({ modeId: 'easy', betCents: 1000 })
    expect(service.step().event).toBe('crossed')
    const result = service.step()
    expect(result.event).toBe('hit')
    expect(result.fatalLane).toBe(2)
    expect(service.summary().balanceCents).toBe(STARTING_BALANCE - 1000 + achievementPay(service))
    expect(service.summary().stats.returnedCents).toBe(0)
  })

  it('resumes a round left in progress, on the same road', async () => {
    const seed = await seedSafeFor(2)
    const first = serviceWith(seed)
    await first.service.start({ modeId: 'easy', betCents: 1000 })
    first.service.step()

    const reopened = startedGame({ store: first.store })
    const round = await reopened.resume()
    expect(round.lane).toBe(1)
    expect(round.seed).toBe(seed)
    expect(reopened.step().event).toBe('crossed')
  })

  it('remembers the chosen mode and bet', () => {
    const { service } = serviceWith('s')
    service.savePreferences({ modeId: 'hard', betCents: 5000 })
    expect(service.preferences().modeId).toBe('hard')
    expect(service.preferences().betCents).toBe(5000)
  })

  it('clears the history but keeps the balance', async () => {
    const { service } = serviceWith(await seedSafeFor(1))
    await service.start({ modeId: 'easy', betCents: 1000 })
    service.step()
    service.cashOut()
    const balance = service.summary().balanceCents
    service.clearStats()
    const summary = service.summary()
    expect(summary.balanceCents).toBe(balance)
    expect(summary.stats.played).toBe(0)
  })

  it('refills a broke player once per cooldown', () => {
    let now = Date.parse('2026-11-24T10:00:00Z')
    const store = createMemoryStore({ balance: 1000 })
    const service = createGameService({ store, clock: () => new Date(now).toISOString() })
    expect(service.refill()).toBe(5000)
    expect(store.wallet.balance()).toBe(6000)
    expect(() => service.refill()).toThrow()
    expect(service.refillStatus().verdict).toBe('wait')
    now += 11 * 60_000
    service.refill()
    expect(store.wallet.balance()).toBe(11000)
    store.wallet.set(25000)
    now += 11 * 60_000
    expect(() => service.refill()).toThrow()
  })

  it('rolls back the whole transaction when a write fails', () => {
    const store = createMemoryStore({ balance: 1000 })
    expect(() =>
      store.transaction(() => {
        store.wallet.debit(500)
        throw new Error('disk full')
      }),
    ).toThrow()
    expect(store.wallet.balance()).toBe(1000)
  })
})

describe('progression', () => {
  it('pays experience for the lanes crossed, even on a loss, and achievements in tokens', async () => {
    const { service } = serviceWith(await seedFatalAt(3))
    await service.start({ modeId: 'easy', betCents: 1000 })
    service.step()
    service.step()
    const result = service.step()
    expect(result.event).toBe('hit')
    expect(result.progress.xp).toBe(4)
    expect(result.progress.achievements).toContain('first-steps')
    const { progression } = service.summary()
    expect(progression.xp).toBe(4)
    expect(service.summary().balanceCents).toBe(STARTING_BALANCE - 1000 + achievementPay(service))
  })

  it('pays tokens for a new level, once, and not for the level already reached', async () => {
    const store = createMemoryStore()
    store.profile.earn(88) // level 2, level 3 needs 90
    const { service } = serviceWith(await seedSafeFor(2), store)
    await service.start({ modeId: 'easy', betCents: 1000 })
    service.step()
    service.step()
    const progress = service.cashOut().progress
    expect(progress.levelUp).toBe(3)
    expect(progress.levelCents).toBe(3000)
    expect(store.settings.get('level_paid')).toBe('3')
  })

  it('unlocks an achievement only once', async () => {
    const seed = await seedSafeFor(2)
    const { service } = serviceWith(seed)
    for (let i = 0; i < 2; i++) {
      await service.start({ modeId: 'easy', betCents: 1000 })
      service.step()
      const { progress } = service.cashOut()
      if (i === 0) expect(progress.achievements).toEqual(['first-steps', 'first-win'])
      else expect(progress.achievements).toEqual([])
    }
    expect(service.summary().progression.achievements).toEqual(['first-steps', 'first-win'])
  })

  it('buys an upgrade with tokens and wears it', () => {
    const store = createMemoryStore({ balance: 50000 })
    const service = createGameService({ store })
    expect(() => service.buy('crown')).toThrow()
    service.buy('cap')
    const { progression } = service.summary()
    expect(store.wallet.balance()).toBe(10000)
    expect(progression.owned).toEqual(['cap'])
    expect(progression.equipped).toEqual({ hat: 'cap' })
    expect(() => service.buy('cap')).toThrow()

    service.toggleEquip('cap')
    expect(service.summary().progression.equipped).toEqual({})
  })

  it('does not take tokens for a purchase that fails', () => {
    const store = createMemoryStore({ balance: 30000 })
    const service = createGameService({ store })
    expect(() => service.buy('cap')).toThrow()
    expect(store.wallet.balance()).toBe(30000)
    expect(service.summary().progression.owned).toEqual([])
  })

  it('keeps progression when the history is cleared', async () => {
    const { service } = serviceWith(await seedSafeFor(1))
    await service.start({ modeId: 'easy', betCents: 1000 })
    service.step()
    service.cashOut()
    const before = service.summary().progression
    service.clearStats()
    expect(service.summary().progression.xp).toBe(before.xp)
    expect(service.summary().progression.achievements).toEqual(before.achievements)
  })

  it('remembers the auto cash-out target and sound', () => {
    const { service } = serviceWith('s')
    expect(service.preferences().autocashTarget).toBeNull()
    service.savePreferences({ autocashTarget: 3, sound: false })
    expect(service.preferences().autocashTarget).toBe(3)
    expect(service.preferences().sound).toBe(false)
    service.savePreferences({ autocashTarget: null })
    expect(service.preferences().autocashTarget).toBeNull()
  })
})

describe('saves', () => {
  it('exports progress and imports it on another device', async () => {
    const seed = await seedSafeFor(2)
    const first = serviceWith(seed)
    await first.service.start({ modeId: 'easy', betCents: 1000 })
    first.service.step()
    first.service.step()
    first.service.cashOut()
    first.store.profile.earn(100)
    first.service.buy('cap')
    first.service.savePreferences({ modeId: 'hard', sound: false })
    const exported = first.service.exportSave()

    const second = serviceWith('other')
    second.service.importSave(exported)
    expect(second.service.exportSave()).toEqual(exported)
    const summary = second.service.summary()
    expect(summary.stats.played).toBe(1)
    expect(summary.progression.equipped).toEqual({ hat: 'cap' })
    expect(second.service.preferences().modeId).toBe('hard')
  })

  it('refuses to import during a round or from a broken save', async () => {
    const { service } = serviceWith(await seedSafeFor(1))
    expect(() => service.importSave({ v: 1 })).toThrow()
    const good = service.exportSave()
    await service.start({ modeId: 'easy', betCents: 1000 })
    expect(() => service.importSave(good)).toThrow()
  })

  it('flags changes for sync and clears the flag once synced', async () => {
    const { service } = serviceWith(await seedSafeFor(1))
    let calls = 0
    service.onChange(() => calls++)
    expect(service.syncState().dirty).toBe(false)
    await service.start({ modeId: 'easy', betCents: 1000 })
    expect(service.syncState().dirty).toBe(true)
    await Promise.resolve()
    expect(calls).toBe(1)
    service.markSynced('u1', 4)
    expect(service.syncState()).toEqual({ linkedUid: 'u1', syncedRev: 4, dirty: false })
    service.step()
    service.markSynced('u1', 5, { clean: false })
    expect(service.syncState().dirty).toBe(true)
  })
})

describe('token shop and seasons', () => {
  it('buys goodies with tokens, not during a round', async () => {
    const { service, store } = serviceWith(await seedSafeFor(1))
    service.buy('beanie')
    expect(store.wallet.balance()).toBe(STARTING_BALANCE - 80000)
    expect(service.summary().progression.equipped.hat).toBe('beanie')
    expect(() => service.buy('halo')).toThrow()
    expect(() => service.buy('laurel')).toThrow()
    await service.start({ modeId: 'easy', betCents: 1000 })
    expect(() => service.buy('bow-tie')).toThrow()
  })

  it('settles weeks once: league points, division and rank rewards', () => {
    const { service, store } = serviceWith('s')
    service.initLeague('2026-W46')
    const result = service.settleResults({ weeks: [{ season: '2026-W47', score: 250, rank: 1, total: 9 }] })
    expect(result.league.lp).toBe(Math.round(6 * Math.sqrt(250)) + 150)
    expect(store.wallet.balance()).toBe(STARTING_BALANCE + result.tokens + achievementPay(service))
    const { progression, league } = service.summary()
    expect(league.lp).toBe(result.league.lp)
    expect(progression.owned).toContain('title-champion')
    expect(progression.equipped.title).toBe('title-champion')
    expect(service.settleResults({ weeks: [{ season: '2026-W47', score: 250, rank: 1, total: 9 }] }).tokens).toBe(0)
    expect(service.claimedSeasons()).toEqual(['2026-W47'])
  })

  it('carries claims, league, daily and the last refill in the save', () => {
    const first = serviceWith('s')
    first.service.initLeague('2026-W46')
    first.service.settleResults({
      weeks: [{ season: '2026-W47', score: 30, rank: 2, total: 5 }],
      daily: { date: '2026-11-23', best: 2, rank: 1, total: 3 },
    })
    first.store.wallet.set(0)
    first.service.refill()
    const exported = first.service.exportSave()
    expect(exported.dailyClaims).toEqual(['2026-11-23'])
    const second = serviceWith('t')
    second.service.importSave(exported)
    expect(second.service.claimedSeasons()).toEqual(['2026-W47'])
    expect(second.service.exportSave()).toEqual(exported)
  })
})

describe('big season', () => {
  it('resets the balance once and gives the beta skin to players who played', async () => {
    const store = createMemoryStore()
    const old = createGameService({ store, seeds: () => 's', clock: () => '2026-11-20T10:00:00Z' })
    store.profile.earn(50)
    store.wallet.set(9_000_000)
    const started = old.startSeason()
    expect(started).toEqual({ beta: true, previousBalanceCents: 9_000_000 })
    expect(store.wallet.balance()).toBe(STARTING_BALANCE)
    expect(old.summary().progression.equipped.skin).toBe('skin-roadworks')
    expect(old.summary().progression.xp).toBe(50)
    expect(old.startSeason()).toBeNull()
    store.wallet.set(5000)
    expect(createGameService({ store }).startSeason()).toBeNull()
    expect(store.wallet.balance()).toBe(5000)
  })

  it('gives nothing to a brand new player', () => {
    const fresh = createGameService({ store: createMemoryStore() })
    expect(fresh.startSeason()).toEqual({ beta: false, previousBalanceCents: STARTING_BALANCE })
    expect(fresh.summary().progression.owned).toEqual([])
  })
})

describe('all-in and the daily challenge', () => {
  it('lets a player bet everything, cents included', async () => {
    const store = createMemoryStore({ balance: 123456 })
    const service = startedGame({ store, seeds: () => 's' })
    store.wallet.set(123456)
    await service.start({ modeId: 'easy', betCents: 123456 })
    expect(store.wallet.balance()).toBe(0)
  })

  it('plays the day\'s mode and bet, three tries, and keeps the best', async () => {
    const seed = await seedSafeFor(3)
    const store = createMemoryStore()
    const service = startedGame({ store, seeds: () => seed, clock: () => '2026-11-25T10:00:00Z' })
    expect(service.summary().daily).toMatchObject({ date: '2026-11-25', left: 3, best: 0 })
    const round = await service.start({ modeId: 'hardcore', betCents: 5000, daily: true })
    expect(round.mode.id).toBe('easy')
    expect(round.betCents).toBe(DAILY_BET)
    service.step()
    service.step()
    const { progress } = service.cashOut()
    expect(progress.daily.best).toBe(progress.daily.multiplier)
    expect(progress.daily.record).toBe(true)
    await service.start({ daily: true })
    service.step()
    service.cashOut()
    await service.start({ daily: true })
    service.step()
    service.cashOut()
    expect(service.summary().daily.left).toBe(0)
    await expect(service.start({ daily: true })).rejects.toThrow()
    const best = service.summary().daily.best
    expect(best).toBeGreaterThan(1)
    expect(service.exportSave().daily).toEqual({ date: '2026-11-25', tries: 3, best })
  })
})

describe('event bonuses', () => {
  it('hands out tokens', () => {
    const { service, store } = serviceWith('s')
    service.grantBonus({ tokens: 2500 })
    expect(store.wallet.balance()).toBe(STARTING_BALANCE + 2500)
    expect(() => service.grantBonus({ tokens: -5 })).toThrow()
  })

  it('doubles the XP of the next round only, and pays tokens per lane', async () => {
    const seed = await seedSafeFor(3)
    const { service } = serviceWith(seed)
    service.grantBonus({ double: true })
    expect(service.summary().doubleNext).toBe(true)
    await service.start({ modeId: 'easy', betCents: 1000 })
    service.step()
    service.step()
    const first = service.cashOut().progress
    expect(first.doubled).toBe(true)
    expect(first.xp).toBe(8)
    expect(first.bonusCents).toBe(2 * DOUBLE_LANE_BONUS)
    expect(service.summary().doubleNext).toBe(false)
    await service.start({ modeId: 'easy', betCents: 1000 })
    service.step()
    service.step()
    expect(service.cashOut().progress.xp).toBe(4)
  })
})

describe('missions and duel tries', () => {
  it('pays a finished mission and the daily bonus once', async () => {
    const seed = await seedSafeFor(3)
    const store = createMemoryStore()
    const service = startedGame({ store, seeds: () => seed, clock: () => '2026-11-25T10:00:00Z' })
    const bonus = service.claimStreak()
    expect(bonus).toEqual({ days: 1, bonus: 2000 })
    expect(() => service.claimStreak()).toThrow()
    const mission = service.summary().missions[0]
    expect(() => service.claimMission(mission.id)).toThrow()
    store.settings.set('missions', JSON.stringify(null))
    expect(service.summary().streak.next).toBeNull()
  })

  it("plays a duel's tries in its mode and keeps the best", async () => {
    const seed = await seedSafeFor(3)
    const store = createMemoryStore()
    const service = startedGame({ store, seeds: () => seed })
    service.stakeDuel('duel0001', 2500)
    const round = await service.start({ modeId: 'hard', betCents: 5000, duel: { id: 'duel0001', modeId: 'easy' } })
    expect(round.mode.id).toBe('easy')
    expect(round.betCents).toBe(DUEL_TRY_BET)
    service.step()
    const { progress } = service.cashOut()
    expect(progress.duel).toEqual({ id: 'duel0001', tries: 1, best: progress.duel.best })
    expect(progress.duel.best).toBeGreaterThan(1)
    expect(service.settleDuel('duel0001', 5000)).toBe(true)
    expect(service.settleDuel('duel0001', 5000)).toBe(false)
    await expect(service.start({ duel: { id: 'duel0001', modeId: 'easy' } })).rejects.toThrow()
  })
})
