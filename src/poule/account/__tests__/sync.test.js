import { describe, expect, it } from 'vitest'
import { STARTING_BALANCE } from '../../config/economy.js'
import { createMemoryStore } from '../../data/memory/createMemoryStore.js'
import { drawOutcomes, firstFatalLane } from '../../domain/fairness.js'
import { createGameService } from '../../services/gameService.js'
import { createMemoryCloud, PseudoTakenError } from '../cloud.js'
import { createSyncService } from '../createSyncService.js'

const user = { uid: 'u1', name: 'Théo' }

async function safeSeed(lanes) {
  for (let i = 0; ; i++) {
    const fatal = firstFatalLane(await drawOutcomes(`seed-${i}`, { id: 'easy', survival: 0.92, lanes: 24 }))
    if (fatal === null || fatal > lanes) return `seed-${i}`
  }
}

/** A device: its own local store and game, syncing with a shared cloud. */
async function device(cloud) {
  const seed = await safeSeed(3)
  const game = createGameService({ store: createMemoryStore(), seeds: () => seed })
  const statuses = []
  let imported = 0
  const sync = createSyncService({
    game,
    cloud,
    delay: 0,
    onStatus: (status) => statuses.push(status.state),
    onImported: () => imported++,
  })
  return { game, sync, statuses, imported: () => imported }
}

async function playAndWin(game, lanes = 2) {
  await game.start({ modeId: 'easy', betCents: 1000 })
  for (let i = 0; i < lanes; i++) game.step()
  game.cashOut()
}

describe('account sync', () => {
  it('uploads the first device and downloads onto a fresh second one', async () => {
    const cloud = createMemoryCloud()
    const phone = await device(cloud)
    await playAndWin(phone.game)
    expect((await phone.sync.connect(user)).action).toBe('upload')
    expect(cloud.users.get('u1').rev).toBe(1)

    const laptop = await device(cloud)
    expect((await laptop.sync.connect(user)).action).toBe('download')
    expect(laptop.imported()).toBe(1)
    expect(laptop.game.exportSave()).toEqual(phone.game.exportSave())
  })

  it('pushes changes, then the other device picks them up', async () => {
    const cloud = createMemoryCloud()
    const phone = await device(cloud)
    const laptop = await device(cloud)
    await phone.sync.connect(user)
    await laptop.sync.connect(user)

    await playAndWin(phone.game)
    expect((await phone.sync.syncNow()).action).toBe('upload')
    expect((await laptop.sync.connect(user)).action).toBe('download')
    expect(laptop.game.summary().stats.played).toBe(1)
    expect((await laptop.sync.syncNow()).action).toBe('none')
  })

  it('asks when both devices played since the last sync, and applies the choice', async () => {
    const cloud = createMemoryCloud()
    const phone = await device(cloud)
    const laptop = await device(cloud)
    await phone.sync.connect(user)
    await laptop.sync.connect(user)

    await playAndWin(phone.game)
    await phone.sync.syncNow()
    await playAndWin(laptop.game, 3)
    const result = await laptop.sync.syncNow()
    expect(result.action).toBe('ask')
    expect(result.conflict.account.played).toBe(1)
    expect(result.conflict.device.played).toBe(1)

    await laptop.sync.resolve('device', result.conflict)
    expect(cloud.users.get('u1').save).toEqual(laptop.game.exportSave())
    expect((await phone.sync.connect(user)).action).toBe('download')
  })

  it('asks before replacing progress made as a guest', async () => {
    const cloud = createMemoryCloud()
    const phone = await device(cloud)
    await phone.sync.connect(user)

    const guest = await device(cloud)
    await playAndWin(guest.game)
    const result = await guest.sync.connect(user)
    expect(result.action).toBe('ask')
    await guest.sync.resolve('account', result.conflict)
    expect(guest.game.summary().balanceCents).toBe(STARTING_BALANCE)
  })

  it('never syncs in the middle of a round', async () => {
    const cloud = createMemoryCloud()
    const phone = await device(cloud)
    await phone.sync.connect(user)
    await phone.game.start({ modeId: 'easy', betCents: 1000 })
    phone.game.step()
    expect((await phone.sync.syncNow()).action).toBe('wait')
    expect(cloud.users.get('u1').rev).toBe(1)
    phone.game.cashOut()
    expect((await phone.sync.syncNow()).action).toBe('upload')
  })

  it('claims unique pseudos and publishes the leaderboard line', async () => {
    const cloud = createMemoryCloud()
    const phone = await device(cloud)
    await playAndWin(phone.game)
    await phone.sync.connect(user)
    await phone.sync.choosePseudo('Poulette')
    expect(cloud.entries.get('u1').pseudo).toBe('Poulette')
    expect(cloud.entries.get('u1').xp).toBe(phone.game.exportSave().xp)

    const other = await device(cloud)
    await other.sync.connect({ uid: 'u2', name: 'Autre' })
    await expect(other.sync.choosePseudo('poulette')).rejects.toThrow()
    await expect(other.sync.choosePseudo('a b')).rejects.toThrow()
    expect(PseudoTakenError).toBeTruthy()

    await phone.sync.choosePseudo('Cocotte')
    await other.sync.choosePseudo('Poulette')
    expect((await phone.sync.leaderboard('xp')).map((entry) => entry.pseudo)).toEqual(['Cocotte', 'Poulette'])
  })
})

describe('refresh', () => {
  it('pulls what another device saved, without local changes', async () => {
    const cloud = createMemoryCloud()
    const phone = await device(cloud)
    const laptop = await device(cloud)
    await phone.sync.connect(user)
    await laptop.sync.connect(user)
    await playAndWin(phone.game)
    await phone.sync.syncNow()
    expect((await laptop.sync.syncNow()).action).toBe('none')
    expect((await laptop.sync.refresh()).action).toBe('download')
  })
})
