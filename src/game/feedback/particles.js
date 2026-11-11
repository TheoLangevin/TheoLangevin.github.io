/**
 * Pool of short-lived sparks, stored in typed arrays so the scene can copy
 * them straight into an instanced mesh. Positions are in scene space (y up).
 */
export const MAX_PARTICLES = 900
const GRAVITY = 14

const field = () => new Float32Array(MAX_PARTICLES)

export const particles = {
  count: 0,
  x: field(),
  y: field(),
  z: field(),
  vx: field(),
  vy: field(),
  vz: field(),
  life: field(),
  maxLife: field(),
  size: field(),
  r: field(),
  g: field(),
  b: field(),
}

const FIELDS = Object.keys(particles).filter((key) => key !== 'count')

/** Throws `count` sparks outwards from a point on the ground plane. */
export function burst(x, z, color, count, { speed = 8, size = 0.2, life = 0.5, lift = 5 } = {}) {
  const p = particles
  const r = ((color >> 16) & 255) / 255
  const g = ((color >> 8) & 255) / 255
  const b = (color & 255) / 255

  for (let n = 0; n < count && p.count < MAX_PARTICLES; n++) {
    const i = p.count++
    const angle = Math.random() * Math.PI * 2
    const velocity = speed * (0.3 + Math.random() * 0.7)
    p.x[i] = x
    p.y[i] = 0.6
    p.z[i] = z
    p.vx[i] = Math.cos(angle) * velocity
    p.vy[i] = Math.random() * lift
    p.vz[i] = Math.sin(angle) * velocity
    p.maxLife[i] = p.life[i] = life * (0.6 + Math.random() * 0.8)
    p.size[i] = size * (0.6 + Math.random() * 0.8)
    p.r[i] = r
    p.g[i] = g
    p.b[i] = b
  }
}

export function updateParticles(dt) {
  const p = particles
  for (let i = p.count - 1; i >= 0; i--) {
    p.life[i] -= dt
    if (p.life[i] <= 0) {
      // Swap the last live particle into the freed slot.
      const last = --p.count
      if (i !== last) for (const key of FIELDS) p[key][i] = p[key][last]
      continue
    }
    p.vy[i] -= GRAVITY * dt
    p.x[i] += p.vx[i] * dt
    p.y[i] = Math.max(0.05, p.y[i] + p.vy[i] * dt)
    p.z[i] += p.vz[i] * dt
  }
}

export function resetParticles() {
  particles.count = 0
}
