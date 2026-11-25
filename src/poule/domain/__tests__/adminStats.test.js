import { describe, expect, it } from 'vitest'
import { computeAdminStats } from '../adminStats.js'

const NOW = Date.parse('2026-11-24T12:00:00Z')
const HOUR = 3_600_000

const round = (extra = {}) => ({
  mode: 'easy',
  bet: 1000,
  payout: 0,
  mult: 0,
  lane: 2,
  crossed: 1,
  roadLanes: 24,
  xp: 2,
  status: 'lost',
  endedAt: '2026-11-24T10:00:00Z',
  ...extra,
})

const save = (extra = {}) => ({
  v: 4,
  epoch: 1,
  balanceCents: 100000,
  xp: 100,
  feathers: 0,
  upgrades: ['cap'],
  equipped: {},
  achievements: ['first-steps'],
  prefs: { mode: 'easy', bet: 1000, autocash: null, sound: true },
  rounds: [round(), round({ status: 'won', payout: 1220, mult: 1.22, lane: 3, crossed: 3 })],
  claims: [{ season: '2026-W47', rank: 1, total: 3, score: 120 }],
  lastRefillAt: null,
  ...extra,
})

const user = (uid, saveExtra, extra = {}) => ({
  uid,
  rev: 3,
  createdAt: NOW - 2 * 86_400_000,
  updatedAt: NOW - HOUR,
  save: save(saveExtra),
  ...extra,
})

describe('admin stats', () => {
  const stats = computeAdminStats({
    now: NOW,
    users: [
      user('a'),
      user('b', { balanceCents: 5000, upgrades: ['cap', 'beanie'], achievements: [] }, { updatedAt: NOW - 40 * 86_400_000 }),
      user('c', { rounds: [] }, { createdAt: NOW - 100 * HOUR }),
      { uid: 'bad', rev: 1, save: { v: 99 } },
    ],
    profiles: [{ uid: 'a', pseudo: 'Cocotte' }],
  })

  it('counts players and skips unreadable saves', () => {
    expect(stats.players.total).toBe(3)
    expect(stats.unreadable).toBe(1)
    expect(stats.players.withPseudo).toBe(1)
    expect(stats.players.active24h).toBe(3) // b's last round was today, whatever its save's age
    expect(stats.players.active30d).toBe(3)
    expect(stats.players.signupsByDay.at(-3).count).toBe(2)
  })

  it('computes the return to players overall and by mode', () => {
    expect(stats.rounds.total).toBe(4)
    expect(stats.rounds.won).toBe(2)
    expect(stats.rounds.wagered).toBe(4000)
    expect(stats.rounds.returned).toBe(2440)
    expect(stats.rounds.rtp).toBe(2440 / 4000)
    const easy = stats.rounds.byMode.find((mode) => mode.id === 'easy')
    expect(easy.played).toBe(4)
    expect(stats.rounds.byMode.find((mode) => mode.id === 'hard').rtp).toBeNull()
    expect(stats.rounds.byDay.at(-1).played).toBe(4)
    expect(stats.players.activeByDay.at(-1).count).toBe(2)
  })

  it('buckets winning multipliers and bets', () => {
    expect(stats.rounds.multipliers[0].count).toBe(2)
    expect(stats.rounds.bets[1].count).toBe(4)
  })

  it('summarises the economy, shop, achievements and seasons', () => {
    expect(stats.economy.circulating).toBe(100000 + 5000 + 100000)
    expect(stats.economy.broke).toBe(1)
    expect(stats.shop.items.find((item) => item.id === 'cap').owners).toBe(3)
    expect(stats.shop.items.find((item) => item.id === 'beanie').owners).toBe(1)
    expect(stats.achievements.find((entry) => entry.id === 'first-steps').count).toBe(2)
    expect(stats.seasons).toEqual([{ season: '2026-W47', count: 3 }])
  })

  it('flags a return far above the game’s', () => {
    const rounds = Array.from({ length: 40 }, () => round({ status: 'won', payout: 5000, mult: 5, crossed: 10, lane: 10 }))
    const flagged = computeAdminStats({ now: NOW, users: [user('cheat', { rounds })], profiles: [] }).flagged
    expect(flagged).toHaveLength(1)
    expect(flagged[0].uid).toBe('cheat')
    expect(stats.flagged).toHaveLength(0)
  })

  it('copes with nobody', () => {
    const empty = computeAdminStats({ now: NOW, users: [] })
    expect(empty.players.total).toBe(0)
    expect(empty.rounds.rtp).toBeNull()
    expect(empty.economy.median).toBe(0)
  })
})
