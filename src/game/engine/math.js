export const TAU = Math.PI * 2

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const distanceSq = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2

/** Rotates `from` towards `to` by at most `maxStep` radians, taking the short way round. */
export function approachAngle(from, to, maxStep) {
  let delta = (to - from) % TAU
  if (delta > Math.PI) delta -= TAU
  if (delta < -Math.PI) delta += TAU
  return Math.abs(delta) <= maxStep ? to : from + Math.sign(delta) * maxStep
}

/** Removes every item flagged `dead`, in place and without allocating. */
export function removeDead(list) {
  let kept = 0
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    if (!item.dead) list[kept++] = item
  }
  list.length = kept
}
