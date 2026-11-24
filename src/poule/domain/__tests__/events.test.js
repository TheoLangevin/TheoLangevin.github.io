import { describe, expect, it } from 'vitest'
import { EVENT_CHANCE, EVENT_MIN_GAP, EVENTS, WHEEL } from '../../config/events.js'
import { rollEvent, spinWheel, wheelRotation } from '../events.js'

const sequence = (...values) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('random events', () => {
  it('waits a few rounds between events', () => {
    expect(rollEvent(sequence(0, 0), EVENT_MIN_GAP - 1)).toBeNull()
    expect(rollEvent(sequence(0, 0), EVENT_MIN_GAP)).toBe(EVENTS[0].id)
  })

  it('happens only with the configured chance', () => {
    expect(rollEvent(sequence(EVENT_CHANCE), 10)).toBeNull()
    expect(rollEvent(sequence(EVENT_CHANCE - 0.001, 0.99), 10)).toBe(EVENTS.at(-1).id)
  })

  it('picks every event by weight, and about as often as configured', () => {
    const counts = Object.fromEntries(EVENTS.map((event) => [event.id, 0]))
    let seed = 1
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    let happened = 0
    for (let i = 0; i < 20000; i++) {
      const event = rollEvent(rng, 99)
      if (event) {
        happened++
        counts[event]++
      }
    }
    expect(happened / 20000).toBeGreaterThan(EVENT_CHANCE - 0.02)
    expect(happened / 20000).toBeLessThan(EVENT_CHANCE + 0.02)
    for (const event of EVENTS) expect(counts[event.id]).toBeGreaterThan(0)
    expect(counts.wheel).toBeGreaterThan(counts.tornado)
  })

  it('lands the wheel on a real segment and turns it under the pointer', () => {
    expect(spinWheel(() => 0)).toBe(0)
    expect(spinWheel(() => 0.9999)).toBe(WHEEL.length - 1)
    expect(wheelRotation(0) % 360).toBe(0)
    expect(wheelRotation(2) % 360).toBe(360 - 2 * (360 / WHEEL.length))
  })
})
