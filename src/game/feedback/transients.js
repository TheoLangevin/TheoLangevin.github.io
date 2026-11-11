/**
 * Two small lists of very short-lived effects drawn on the ground:
 * shockwaves (expanding rings) and beams (chain lightning segments).
 */
const MAX_SHOCKWAVES = 48
const MAX_BEAMS = 48

export const shockwaves = []
export const beams = []

export function addShockwave(x, z, radius, color, life = 0.35) {
  if (shockwaves.length >= MAX_SHOCKWAVES) shockwaves.shift()
  shockwaves.push({ x, z, radius, color, life, maxLife: life })
}

export function addBeam(x1, z1, x2, z2, life = 0.14) {
  if (beams.length >= MAX_BEAMS) beams.shift()
  beams.push({ x1, z1, x2, z2, life, maxLife: life })
}

function age(list, dt) {
  let kept = 0
  for (const item of list) {
    item.life -= dt
    if (item.life > 0) list[kept++] = item
  }
  list.length = kept
}

export function updateTransients(dt) {
  age(shockwaves, dt)
  age(beams, dt)
}

export function resetTransients() {
  shockwaves.length = 0
  beams.length = 0
}
