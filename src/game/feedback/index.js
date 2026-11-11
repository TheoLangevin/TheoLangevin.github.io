import { resetParticles, updateParticles } from './particles.js'
import { resetShake, updateShake } from './shake.js'
import { resetTransients, updateTransients } from './transients.js'

export function updateFeedback(dt) {
  updateParticles(dt)
  updateTransients(dt)
  updateShake(dt)
}

export function resetFeedback() {
  resetParticles()
  resetTransients()
  resetShake()
}
