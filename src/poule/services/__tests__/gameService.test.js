import { describe, expect, it } from 'vitest'
import { STARTING_BALANCE } from '../../config/economy.js'
import { modeById } from '../../config/modes.js'
import { createMemoryStore } from '../../data/memory/createMemoryStore.js'
import { drawOutcomes, firstFatalLane } from '../../domain/fairness.js'
import { payoutCents } from '../../domain/multiplier.js'
import { createGameService } from '../gameService.js'

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

const serviceWith = (seed, store = createMemoryStore()) => ({
  store,
  service: createGameService({ store, seeds: () => seed, clock: () => '2026-01-01T00:00:00Z' }),
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
    expect(summary.balanceCents).toBe(STARTING_BALANCE - 1000 + payoutCents(1000, easy, 3))
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
    expect(service.summary().balanceCents).toBe(STARTING_BALANCE - 1000)
    expect(service.summary().stats.returnedCents).toBe(0)
  })

  it('resumes a round left in progress, on the same road', async () => {
    const seed = await seedSafeFor(2)
    const first = serviceWith(seed)
    await first.service.start({ modeId: 'easy', betCents: 1000 })
    first.service.step()

    const reopened = createGameService({ store: first.store })
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

  it('resets the balance and the history', async () => {
    const { service } = serviceWith(await seedSafeFor(1))
    await service.start({ modeId: 'easy', betCents: 1000 })
    service.step()
    service.cashOut()
    service.reset()
    const summary = service.summary()
    expect(summary.balanceCents).toBe(STARTING_BALANCE)
    expect(summary.stats.played).toBe(0)
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
  it('pays feathers and experience for the lanes crossed, even on a loss', async () => {
    const { service } = serviceWith(await seedFatalAt(3))
    await service.start({ modeId: 'easy', betCents: 1000 })
    service.step()
    service.step()
    const result = service.step()
    expect(result.event).toBe('hit')
    expect(result.progress.feathers).toBe(4)
    expect(result.progress.achievements).toContain('first-steps')
    const { progression } = service.summary()
    expect(progression.feathers).toBe(4 + 10)
    expect(progression.xp).toBe(progression.feathers)
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

  it('buys an upgrade with feathers and wears it', () => {
    const store = createMemoryStore()
    store.profile.earn(100)
    const service = createGameService({ store })
    expect(() => service.buy('crown')).toThrow()
    service.buy('cap')
    const { progression } = service.summary()
    expect(progression.feathers).toBe(60)
    expect(progression.owned).toEqual(['cap'])
    expect(progression.equipped).toEqual({ hat: 'cap' })
    expect(() => service.buy('cap')).toThrow()

    service.toggleEquip('cap')
    expect(service.summary().progression.equipped).toEqual({})
  })

  it('does not take feathers for a purchase that fails', () => {
    const store = createMemoryStore()
    store.profile.earn(30)
    const service = createGameService({ store })
    expect(() => service.buy('cap')).toThrow()
    expect(service.summary().progression.feathers).toBe(30)
    expect(service.summary().progression.owned).toEqual([])
  })

  it('keeps progression when the balance is reset', async () => {
    const { service } = serviceWith(await seedSafeFor(1))
    await service.start({ modeId: 'easy', betCents: 1000 })
    service.step()
    service.cashOut()
    const before = service.summary().progression
    service.reset()
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
