import { describe, expect, it } from 'vitest'
import { achievementById } from '../../config/achievements.js'
import { STARTING_BALANCE } from '../../config/economy.js'
import { createMemoryStore } from '../../data/memory/createMemoryStore.js'
import { drawOutcomes, firstFatalLane } from '../../domain/fairness.js'
import { createGameService } from '../../services/gameService.js'

/** A game already in the current big season (the app calls startSeason when it opens). */
const startedGame = (options) => {
  const game = createGameService(options)
  game.startSeason()
  return game
}
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
  const game = startedGame({ store: createMemoryStore(), seeds: () => seed })
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

  it("publishes the tokens board and this week's season line", async () => {
    const cloud = createMemoryCloud()
    const phone = await device(cloud)
    await phone.sync.connect(user)
    await phone.sync.choosePseudo('Poulette')
    await playAndWin(phone.game)
    await phone.sync.syncNow()
    expect(cloud.entries.get('u1').tokens).toBe(phone.game.exportSave().balanceCents)
    const profile = await phone.sync.profileOf('u1')
    expect(profile.pseudo).toBe('Poulette')
    expect(profile.look).toEqual({})
    expect(await phone.sync.profileOf('nobody')).toBeNull()
    const week = await phone.sync.season()
    expect(week.entries[0].pseudo).toBe('Poulette')
    expect(week.mine.score).toBeGreaterThan(0)
    expect(week.standing).toEqual({ rank: 1, total: 1 })
  })
})

describe('week and daily results', () => {
  it('settles finished weeks and yesterday\'s challenge once, by rank', async () => {
    const cloud = createMemoryCloud()
    cloud.seasons.set(
      '2026-W47',
      new Map([
        ['u1', { pseudo: 'Poulette', score: 300 }],
        ['u2', { pseudo: 'Autre', score: 120 }],
        ['u3', { pseudo: 'Troisième', score: 0 }],
      ]),
    )
    cloud.days.set(
      '2026-11-23',
      new Map([
        ['u1', { pseudo: 'Poulette', best: 2.5, tries: 3 }],
        ['u2', { pseudo: 'Autre', best: 1.2, tries: 1 }],
      ]),
    )
    const now = () => new Date('2026-11-24T10:00:00Z')
    const game = startedGame({ store: createMemoryStore(), clock: () => '2026-11-24T10:00:00Z' })
    const sync = createSyncService({ game, cloud: createMemoryCloud(), delay: 0, now })
    await sync.connect(user)

    // First visit of the season: leagues start from the current week.
    expect(await sync.pendingResults()).toBeNull()
    expect(game.league().settled).toBe('2026-W47')

    // A player last settled two weeks ago.
    const back = startedGame({ store: createMemoryStore(), clock: () => '2026-11-24T10:00:00Z' })
    back.initLeague('2026-W45')
    const backSync = createSyncService({ game: back, cloud, delay: 0, now })
    await backSync.connect(user)
    const pending = await backSync.pendingResults()
    expect(pending.weeks.map((week) => week.season)).toEqual(['2026-W46', '2026-W47'])
    expect(pending.weeks[0].score).toBe(0)
    expect(pending.weeks[1]).toEqual({ season: '2026-W47', score: 300, rank: 1, total: 2 })
    expect(pending.daily).toEqual({ date: '2026-11-23', best: 2.5, rank: 1, total: 2 })
    expect(pending.preview.daily.reward.id).toBe('first')

    const before = back.summary().balanceCents
    const result = backSync.claimResults(pending)
    expect(result.league.lp).toBe(Math.round(6 * Math.sqrt(300)) + 150)
    expect(result.league.settled).toBe('2026-W47')
    const achievements = result.achievements.reduce((sum, id) => sum + achievementById(id).reward, 0)
    expect(back.summary().balanceCents).toBe(before + result.tokens + achievements)
    expect(back.summary().progression.owned).toContain('title-champion')
    expect(await backSync.pendingResults()).toBeNull()
    // Settling the same weeks again pays nothing.
    expect(backSync.claimResults(pending).tokens).toBe(0)
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

describe('duels', () => {
  it('stakes, plays and pays a duel once', async () => {
    const cloud = createMemoryCloud()
    let now = Date.parse('2026-11-25T10:00:00Z')
    const make = async (uid, pseudo) => {
      const game = startedGame({ store: createMemoryStore(), seeds: () => 's', clock: () => new Date(now).toISOString() })
      const sync = createSyncService({ game, cloud, delay: 0, now: () => new Date(now) })
      await sync.connect({ uid, name: pseudo })
      await sync.choosePseudo(pseudo)
      return { game, sync }
    }
    const a = await make('ua', 'Alice')
    const b = await make('ub', 'Bruno')
    const start = a.game.summary().balanceCents
    const id = await a.sync.challenge({ uid: 'ub', pseudo: 'Bruno' }, 10000, 'easy')
    expect(a.game.summary().balanceCents).toBe(start - 10000)
    const [incoming] = (await b.sync.duels()).duels
    expect(incoming.state).toBe('open')
    await b.sync.acceptDuel(incoming)
    expect(b.game.summary().balanceCents).toBe(start - 10000)
    await a.sync.pushDuelScore(id, { tries: 3, best: 2.5 })
    await b.sync.pushDuelScore(id, { tries: 3, best: 1.2 })
    const before = a.game.summary().balanceCents
    expect((await a.sync.duels()).paid).toBe(20000)
    expect(a.game.summary().balanceCents).toBe(before + 20000)
    expect((await a.sync.duels()).paid).toBe(0)
    expect((await b.sync.duels()).paid).toBe(0)
  })
})

describe('teams and feed', () => {
  it('builds poulaillers that add up their league points, and posts to the feed', async () => {
    const cloud = createMemoryCloud()
    const make = async (uid, pseudo, lp) => {
      const game = startedGame({ store: createMemoryStore(), seeds: () => 's' })
      const sync = createSyncService({ game, cloud, delay: 0 })
      await sync.connect({ uid, name: pseudo })
      await sync.choosePseudo(pseudo)
      cloud.entries.set(uid, { ...cloud.entries.get(uid), lp })
      return { game, sync }
    }
    const a = await make('ua', 'Alice', 300)
    const b = await make('ub', 'Bruno', 120)
    const id = await a.sync.createTeam('Les Cocottes')
    expect(a.game.exportSave().team).toBe(id)
    const { teams } = await b.sync.teamBoard()
    await b.sync.joinTeam(teams[0])
    cloud.entries.set('ua', { ...cloud.entries.get('ua'), team: id })
    cloud.entries.set('ub', { ...cloud.entries.get('ub'), team: id })
    const board = await a.sync.teamBoard()
    expect(board.mine.members).toEqual(['ua', 'ub'])
    expect(board.mine.lp).toBe(420)
    await b.sync.leaveTeam()
    expect(b.game.exportSave().team).toBeNull()
    expect((await a.sync.teamBoard()).mine.members).toEqual(['ua'])
    await a.sync.postFeed({ kind: 'cash', mult: 12.5, mode: 'hard', lanes: 9 })
    const [item] = await a.sync.feed()
    expect(item).toMatchObject({ uid: 'ua', pseudo: 'Alice', kind: 'cash', mult: 12.5 })
    await expect(a.sync.createTeam('x')).rejects.toThrow()
  })
})
