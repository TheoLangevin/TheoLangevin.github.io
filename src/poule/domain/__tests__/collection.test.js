import { describe, expect, it } from 'vitest'
import { SETS } from '../../config/collection.js'
import { modeById } from '../../config/modes.js'
import { upgradeById } from '../../config/upgrades.js'
import { activeEvents, isEventActive, xpMultiplier } from '../calendar.js'
import { boxPool, collectionStatus, COLLECTIBLES, drawBox, rarityOf } from '../collection.js'
import { multiplierAt } from '../multiplier.js'
import { purchaseCheck } from '../progression.js'

describe('calendar events', () => {
  it('doubles Hardcore and Night XP on weekends only', () => {
    const saturday = new Date('2026-11-28T12:00:00Z')
    expect(xpMultiplier('hardcore', saturday)).toBe(2)
    expect(xpMultiplier('easy', saturday)).toBe(1)
    expect(xpMultiplier('hardcore', new Date('2026-11-25T12:00:00Z'))).toBe(1)
    expect(activeEvents(new Date('2026-12-02T12:00:00Z')).map((event) => event.id)).toEqual(['christmas'])
  })

  it('sells limited items only during their event', () => {
    const profile = { owned: [], level: 1, balanceCents: 1e9 }
    expect(purchaseCheck('santa', { ...profile, date: new Date('2026-11-25T12:00:00Z') })).toBe('limited')
    expect(purchaseCheck('santa', { ...profile, date: new Date('2026-12-10T12:00:00Z') })).toBe('ok')
    expect(isEventActive('christmas', new Date('2027-01-01T00:00:00Z'))).toBe(false)
  })
})

describe('new modes', () => {
  it('pays more in the night, hides nothing of the odds', () => {
    const night = modeById('night')
    expect(night.survival).toBeLessThan(modeById('medium').survival)
    expect(multiplierAt(night, 5)).toBeGreaterThan(multiplierAt(modeById('medium'), 5))
    expect(modeById('mystery').mystery).toBe(true)
  })
})

describe('collection', () => {
  it('counts completion and sets', () => {
    const status = collectionStatus(['cap', 'scarf', 'russet', 'dust'], [])
    expect(status.owned).toBe(4)
    expect(status.total).toBe(COLLECTIBLES.length)
    expect(status.sets.find((set) => set.id === 'farm')).toMatchObject({ have: 4, claimed: false })
    for (const set of SETS) for (const id of set.items) expect(upgradeById(id)).toBeTruthy()
  })

  it('draws only buyable items not owned, by rarity', () => {
    expect(drawBox([], () => 0).cost).toBeLessThan(200000)
    expect(rarityOf(drawBox([], () => 0.999)).id).toBe('epic')
    const pool = boxPool([])
    expect(pool.every((item) => !item.exclusive && !item.limited && !item.secret)).toBe(true)
    const almost = pool.slice(1).map((item) => item.id)
    expect(drawBox(almost, () => 0.5).id).toBe(pool[0].id)
    expect(drawBox(pool.map((item) => item.id), () => 0.5)).toBeNull()
  })
})
