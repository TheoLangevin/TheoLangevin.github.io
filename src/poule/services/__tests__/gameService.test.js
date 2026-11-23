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
    expect(service.preferences()).toEqual({ modeId: 'hard', betCents: 5000 })
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
