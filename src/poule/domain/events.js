import { EVENT_CHANCE, EVENT_MIN_GAP, EVENTS, WHEEL } from '../config/events.js'

/**
 * Whether an event pops up after a round, and which one. `rng` returns a
 * number in [0, 1) (Math.random in the game, a fixed sequence in tests).
 * These draws are for fun only and separate from the rounds' fair draws.
 */
export function rollEvent(rng, roundsSinceLast) {
  if (roundsSinceLast < EVENT_MIN_GAP) return null
  if (rng() >= EVENT_CHANCE) return null
  const total = EVENTS.reduce((sum, event) => sum + event.weight, 0)
  let pick = rng() * total
  for (const event of EVENTS) {
    pick -= event.weight
    if (pick < 0) return event.id
  }
  return EVENTS.at(-1).id
}

/** The wheel segment a spin lands on (index into WHEEL). */
export const spinWheel = (rng) => Math.min(WHEEL.length - 1, Math.floor(rng() * WHEEL.length))

/**
 * Rotation (degrees) that brings segment `index` under the pointer at the
 * top, after a few full turns. Segment 0 starts centred on the pointer.
 */
export function wheelRotation(index, turns = 5) {
  const slice = 360 / WHEEL.length
  return turns * 360 + (360 - index * slice)
}
