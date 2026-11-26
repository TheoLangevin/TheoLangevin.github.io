import test from 'node:test'
import assert from 'node:assert/strict'
import { duration, eggs } from './format.js'

test('formats des œufs', () => {
  assert.equal(eggs(4.56), '4,5')
  assert.equal(eggs(12345).replace(/\s/g, ' '), '12 345')
  assert.equal(eggs(1.26e6), '1,2 M')
  assert.equal(eggs(3.4e9), '3,4 Md')
  assert.equal(duration(7500), '2 h 05')
})
