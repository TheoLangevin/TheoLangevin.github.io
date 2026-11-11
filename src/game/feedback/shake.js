/** Camera shake based on a decaying "trauma" value. Off for reduced motion. */
const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const shake = { trauma: 0, x: 0, z: 0 }

export function addShake(amount) {
  if (!reducedMotion) shake.trauma = Math.min(1, shake.trauma + amount)
}

export function updateShake(dt) {
  shake.trauma = Math.max(0, shake.trauma - dt * 1.8)
  const strength = shake.trauma * shake.trauma * 1.2
  shake.x = (Math.random() * 2 - 1) * strength
  shake.z = (Math.random() * 2 - 1) * strength
}

export function resetShake() {
  shake.trauma = shake.x = shake.z = 0
}
