import { describe, expect, it } from 'vitest'
import { STARTING_BALANCE } from '../../config/economy.js'
import {
  decideSync,
  describeSave,
  isPristine,
  isValidPseudo,
  leaderboardEntry,
  publicLook,
  dailyEntry,
  needsSeasonReset,
  seasonEntry,
  validateSave,
} from '../save.js'

const save = (extra = {}) => ({
  v: 4,
  epoch: 1,
  balanceCents: 90000,
  xp: 120,
  feathers: 0,
  upgrades: ['cap', 'turbo'],
  equipped: { hat: 'cap' },
  achievements: ['first-steps'],
  prefs: { mode: 'medium', bet: 2000, autocash: 3, sound: false },
  rounds: [
    {
      mode: 'easy',
      bet: 1000,
      payout: 1220,
      mult: 1.22,
      lane: 3,
      crossed: 3,
      roadLanes: 24,
      xp: 6,
      status: 'won',
      endedAt: 't',
    },
    {
      mode: 'hard',
      bet: 1000,
      payout: 0,
      mult: 0,
      lane: 4,
      crossed: 3,
      roadLanes: 20,
      xp: 15,
      status: 'lost',
      endedAt: 't',
    },
  ],
  claims: [{ season: '2026-11-24', rank: 3, total: 20, score: 140 }],
  lastRefillAt: 1764000000000,
  league: { lp: 320, peak: 400, settled: '2026-11-24', gates: { top10: true, first: false }, history: [] },
  daily: { date: '2026-11-25', tries: 2, best: 1.5 },
  dailyClaims: ['2026-11-24'],
  missions: null,
  streak: null,
  duels: { ledger: {}, tries: {} },
  gifts: [],
  setsClaimed: [],
  team: null,
  talents: { instinct: 2 },
  pass: { season: 1, startXp: 0, claimed: [1, 2] },
  coop: null,
  ...extra,
})

describe('save format', () => {
  it('keeps a valid save as it is', () => {
    expect(validateSave(save())).toEqual(save())
  })

  it('repairs talents and the season pass', () => {
    expect(validateSave(save({ talents: { instinct: 99, nope: 3, insurance: -1 } })).talents).toEqual({ instinct: 5 })
    expect(validateSave(save({ pass: { season: 1, startXp: -5 } })).pass).toBeNull()
    expect(validateSave(save({ pass: { season: 1, startXp: 10, claimed: [3, 3, 99, 1] } })).pass.claimed).toEqual([1, 3])
  })

  it('refuses wrong versions, types and negative amounts', () => {
    expect(validateSave(null)).toBeNull()
    expect(validateSave(save({ v: 5 }))).toBeNull()
    expect(validateSave(save({ balanceCents: -1 }))).toBeNull()
    expect(validateSave(save({ xp: 'lots' }))).toBeNull()
  })

  it('turns the feathers of an older save into tokens', () => {
    const old = { ...save({ v: 2, feathers: 40 }) }
    old.rounds = old.rounds.map(({ xp, ...round }) => ({ ...round, feathers: xp }))
    const migrated = validateSave({ ...old, epoch: 1 })
    expect(migrated.v).toBe(4)
    expect(migrated.feathers).toBe(0)
    expect(migrated.balanceCents).toBe(90000 + 40 * 1000)
    expect(migrated.rounds[0].xp).toBe(6)
    expect(validateSave(save({ feathers: 40 })).balanceCents).toBe(90000)
  })

  it('resets a save from before Saison 1: 1000 tokens, a new league, the beta skin', () => {
    const before = validateSave(save({ v: 3, epoch: undefined, balanceCents: 5_000_000 }))
    expect(before.epoch).toBe(1)
    expect(before.balanceCents).toBe(STARTING_BALANCE)
    expect(before.upgrades).toContain('skin-roadworks')
    expect(before.equipped.skin).toBe('skin-roadworks')
    expect(before.league).toEqual({ lp: 0, peak: 0, settled: null, gates: { top10: false, first: false }, history: [] })
    expect(before.xp).toBe(120)
    expect(before.achievements).toEqual(['first-steps'])
    expect(needsSeasonReset(save({ epoch: 0 }))).toBe(true)
    expect(needsSeasonReset(save())).toBe(false)
    const fresh = validateSave(save({ epoch: 0, xp: 0, rounds: [], upgrades: [], equipped: {} }))
    expect(fresh.upgrades).toEqual([])
  })

  it('drops what it does not know instead of failing', () => {
    const cleaned = validateSave(
      save({
        upgrades: ['cap', 'jetpack', 'cap'],
        equipped: { hat: 'crown', plumage: 'gold', perk: 'turbo' },
        achievements: ['first-steps', 'moon-landing'],
        rounds: [{ mode: 'nightmare', status: 'won' }, save().rounds[0], { ...save().rounds[1], lane: 99 }],
      }),
    )
    expect(cleaned.upgrades).toEqual(['cap'])
    expect(cleaned.equipped).toEqual({})
    expect(cleaned.achievements).toEqual(['first-steps'])
    expect(cleaned.rounds).toHaveLength(1)
  })

  it('tells a fresh device from one that has been played on', () => {
    const fresh = { ...save(), xp: 0, upgrades: [], rounds: [], balanceCents: STARTING_BALANCE }
    expect(isPristine(fresh)).toBe(true)
    expect(isPristine(save())).toBe(false)
  })

  it('summarises a save and builds its leaderboard line', () => {
    expect(describeSave(save()).played).toBe(2)
    expect(leaderboardEntry(save(), 'Poulette')).toEqual({
      pseudo: 'Poulette',
      look: { hat: 'cap' },
      title: null,
      level: 3,
      xp: 120,
      tokens: 90000,
      lp: 320,
      division: 'silver-3',
      bestMultiplier: 1.22,
      bestLanes: 3,
      team: null,
    })
  })

  it('publishes only what the hen wears, never perks or unknown items', () => {
    expect(publicLook({ hat: 'cone', perk: 'turbo', road: 'neon', neck: 'jetpack', plumage: 'cap' })).toEqual({
      hat: 'cone',
      road: 'neon',
    })
  })

  it('still reads v1 saves, without claims', () => {
    const old = validateSave({ ...save(), v: 1, epoch: 1, claims: undefined, lastRefillAt: undefined })
    expect(old.claims).toEqual([])
    expect(old.lastRefillAt).toBeNull()
  })

  it('builds the daily challenge line only on the day it was played', () => {
    expect(dailyEntry(save(), 'Poulette', new Date('2026-11-25T20:00:00Z'))).toEqual({
      day: '2026-11-25',
      pseudo: 'Poulette',
      title: null,
      best: 1.5,
      tries: 2,
    })
    expect(dailyEntry(save(), 'Poulette', new Date('2026-11-26T01:00:00Z'))).toBeNull()
  })

  it('builds the day\'s league line from the rounds of the day', () => {
    const rounds = [
      { ...save().rounds[0], endedAt: '2026-11-25T10:00:00Z' },
      { ...save().rounds[1], endedAt: '2026-11-25T11:00:00Z' },
    ]
    const entry = seasonEntry(save({ rounds }), 'Poulette', new Date('2026-11-25T20:00:00Z'))
    expect(entry).toEqual({
      season: '2026-11-25',
      pseudo: 'Poulette',
      title: null,
      level: 3,
      score: 21,
      bestMultiplier: 1.22,
      league: 'silver-3',
    })
  })

  it('accepts pseudos of 3 to 16 letters, digits, - and _', () => {
    expect(isValidPseudo('Poule_42')).toBe(true)
    expect(isValidPseudo('ab')).toBe(false)
    expect(isValidPseudo('a'.repeat(17))).toBe(false)
    expect(isValidPseudo('poule cot')).toBe(false)
  })
})

describe('sync decision', () => {
  const base = { uid: 'u1', linkedUid: 'u1', syncedRev: 3, dirty: false, pristine: false, cloud: { rev: 3 } }

  it('uploads when the account has no save yet', () => {
    expect(decideSync({ ...base, cloud: null, linkedUid: null })).toBe('upload')
  })

  it('downloads onto a fresh device, asks on a used one', () => {
    expect(decideSync({ ...base, linkedUid: null, pristine: true })).toBe('download')
    expect(decideSync({ ...base, linkedUid: null })).toBe('ask')
    expect(decideSync({ ...base, linkedUid: 'someone-else' })).toBe('ask')
  })

  it('follows whichever side moved, and asks when both did', () => {
    expect(decideSync(base)).toBe('none')
    expect(decideSync({ ...base, dirty: true })).toBe('upload')
    expect(decideSync({ ...base, cloud: { rev: 4 } })).toBe('download')
    expect(decideSync({ ...base, cloud: { rev: 4 }, dirty: true })).toBe('ask')
  })
})

describe('save of the coop', () => {
  it('keeps a valid coop and drops a broken one', async () => {
    const { freshCoop } = await import('../coop.js')
    const coop = { ...freshCoop(1764000000000), eggs: 12, total: 12, lifetime: 12 }
    expect(validateSave(save({ coop })).coop).toEqual(coop)
    expect(validateSave(save({ coop: { ...coop, eggs: -1 } })).coop).toEqual(null)
  })
})
