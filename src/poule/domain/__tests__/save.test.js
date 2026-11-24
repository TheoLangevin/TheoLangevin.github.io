import { describe, expect, it } from 'vitest'
import { STARTING_BALANCE } from '../../config/economy.js'
import {
  decideSync,
  describeSave,
  isPristine,
  isValidPseudo,
  leaderboardEntry,
  seasonEntry,
  validateSave,
} from '../save.js'

const save = (extra = {}) => ({
  v: 2,
  balanceCents: 90000,
  xp: 120,
  feathers: 40,
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
      feathers: 6,
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
      feathers: 15,
      status: 'lost',
      endedAt: 't',
    },
  ],
  claims: [{ season: '2026-W47', rank: 3, total: 20, score: 140 }],
  lastRefillAt: 1764000000000,
  ...extra,
})

describe('save format', () => {
  it('keeps a valid save as it is', () => {
    expect(validateSave(save())).toEqual(save())
  })

  it('refuses wrong versions, types and negative amounts', () => {
    expect(validateSave(null)).toBeNull()
    expect(validateSave(save({ v: 3 }))).toBeNull()
    expect(validateSave(save({ balanceCents: -1 }))).toBeNull()
    expect(validateSave(save({ xp: 'lots' }))).toBeNull()
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
      title: null,
      level: 3,
      xp: 120,
      tokens: 90000,
      bestMultiplier: 1.22,
      bestLanes: 3,
    })
  })

  it('still reads v1 saves, without claims', () => {
    const old = validateSave({ ...save(), v: 1, claims: undefined, lastRefillAt: undefined })
    expect(old.claims).toEqual([])
    expect(old.lastRefillAt).toBeNull()
  })

  it('builds the weekly season line from the rounds of the week', () => {
    const rounds = [
      { ...save().rounds[0], endedAt: '2026-11-24T10:00:00Z' },
      { ...save().rounds[1], endedAt: '2026-11-25T10:00:00Z' },
    ]
    const entry = seasonEntry(save({ rounds }), 'Poulette', new Date('2026-11-26T00:00:00Z'))
    expect(entry).toEqual({
      season: '2026-W48',
      pseudo: 'Poulette',
      title: null,
      level: 3,
      score: 21,
      bestMultiplier: 1.22,
      league: 'bronze',
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
