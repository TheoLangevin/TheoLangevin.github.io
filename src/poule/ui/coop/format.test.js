import { expect, it as test } from 'vitest'
import { duration, eggs } from './format.js'

test('formats des œufs', () => {
  expect(eggs(4.56)).toBe('4,5')
  expect(eggs(12345).replace(/\s/g, ' ')).toBe('12 345')
  expect(eggs(1.26e6)).toBe('1,2 M')
  expect(eggs(3.4e9)).toBe('3,4 Md')
  expect(duration(7500)).toBe('2 h 05')
})
