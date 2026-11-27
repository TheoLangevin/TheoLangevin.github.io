import { expect, it as test } from 'vitest'
import { createTapGuard, FATIGUE_FLOOR } from './tapGuard.js'

test('un humain : rythme irrégulier, tout compte', () => {
  const guard = createTapGuard()
  let t = 0
  for (let i = 0; i < 200; i++) {
    t += 90 + ((i * 37) % 60)
    expect(guard.accept(t)).toBe(1)
  }
})

test('au-delà de 12 touchers par seconde, le surplus est refusé', () => {
  const guard = createTapGuard()
  const counted = Array.from({ length: 30 }, (_, i) => guard.accept(1000 + i * 30 + (i % 3))).filter((f) => f > 0)
  expect(counted.length <= 12).toBe(true)
})

test('un auto-clicker parfaitement régulier est ignoré', () => {
  const guard = createTapGuard()
  const results = Array.from({ length: 40 }, (_, i) => guard.accept(i * 100))
  expect(results.slice(25).every((f) => f === 0)).toBe(true)
})

test('fatigue après 2 min sans pause, repos après 5 s', () => {
  const guard = createTapGuard()
  let t = 0
  let f = 1
  for (let i = 0; i < 4000; i++) {
    t += 110 + ((i * 53) % 70)
    f = guard.accept(t)
  }
  expect(f).toBe(FATIGUE_FLOOR)
  expect(guard.accept(t + 6000)).toBe(1)
})
