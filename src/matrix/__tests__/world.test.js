import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTACT_EMAIL, experiences, navLinks, projects, stack } from '../../portfolio/content.js'
import { linkTranscript, outcomeLines, progressBar } from '../boot/script.js'
import { profile } from '../content/profile.js'
import {
  COLLIDERS,
  NODE_BY_ID,
  NODES,
  PLAYER_RADIUS,
  SECTOR_BY_ID,
  SECTORS,
  sectorAt,
  SPAWN,
  WORLD_RADIUS,
} from '../content/world.js'
import { createBody, RUN_SPEED, stepBody, WALK_SPEED } from '../world/player/physics.js'

const section = (name) => readFileSync(new URL(`../../portfolio/sections/${name}.jsx`, import.meta.url), 'utf8')
const FRAME = 1 / 60

function simulate(body, move, seconds) {
  const events = []
  for (let t = 0; t < seconds; t += FRAME) stepBody(body, move, FRAME, events)
  return events
}

const blocked = (x, z, margin = 0) =>
  COLLIDERS.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + PLAYER_RADIUS + margin)

describe('content of /new mirrors the classic site', () => {
  it('uses the same profile texts as the classic sections', () => {
    const hero = section('Hero')
    const facts = section('Facts')
    const contact = section('Contact')
    expect(hero).toContain(profile.role)
    expect(hero).toContain(profile.headline[0])
    expect(hero).toContain(profile.headline[1])
    // The lead is split over two lines in the JSX source.
    expect(hero.replace(/\s+/g, ' ')).toContain(profile.lead)
    expect(facts).toContain(profile.education.school)
    expect(facts).toContain(profile.education.detail)
    expect(facts).toContain(profile.motto)
    expect(contact).toContain(profile.contactTitle)
    expect(contact).toContain(profile.contactAction)
  })

  it('gives every project, experience and link a place in the world', () => {
    const kinds = (kind) => NODES.filter((node) => node.kind === kind)
    expect(kinds('project').map((node) => node.data)).toEqual(projects)
    expect(kinds('experience').map((node) => node.data)).toEqual(experiences)
    expect(NODE_BY_ID.stack.data).toEqual(stack)
    expect(NODE_BY_ID.contact.href).toBe(`mailto:${CONTACT_EMAIL}`)
    for (const link of navLinks.filter((entry) => entry.href.startsWith('/'))) {
      expect(NODES.some((node) => node.href === link.href)).toBe(true)
    }
    expect(NODES.some((node) => node.href === '/')).toBe(true)
  })

  it('has unique ids and codes', () => {
    expect(new Set(NODES.map((node) => node.id)).size).toBe(NODES.length)
    expect(new Set(NODES.map((node) => node.code)).size).toBe(NODES.length)
    expect(new Set(SECTORS.map((sector) => sector.id)).size).toBe(SECTORS.length)
  })
})

describe('layout of the world', () => {
  it('keeps every sector and node inside the world, in its own sector', () => {
    for (const sector of SECTORS) {
      expect(Math.hypot(...sector.at) + sector.radius).toBeLessThanOrEqual(WORLD_RADIUS)
    }
    for (const node of NODES) {
      expect(Math.hypot(...node.at)).toBeLessThan(WORLD_RADIUS - node.collider)
      expect(sectorAt(...node.at)).toBe(node.sector)
    }
  })

  it('does not let sectors overlap', () => {
    for (const a of SECTORS) {
      for (const b of SECTORS) {
        if (a === b) continue
        expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1])).toBeGreaterThan(a.radius + b.radius)
      }
    }
  })

  it('leaves room to walk between structures', () => {
    for (let i = 0; i < COLLIDERS.length; i++) {
      for (let j = i + 1; j < COLLIDERS.length; j++) {
        const a = COLLIDERS[i]
        const b = COLLIDERS[j]
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(a.r + b.r)
      }
    }
  })

  it('drops travellers on free ground, within reach of the node they chose', () => {
    expect(blocked(SPAWN.x, SPAWN.z, 0.5)).toBe(false)
    for (const node of NODES) {
      const [x, z] = node.approach
      expect(blocked(x, z, 0.05), node.id).toBe(false)
      expect(Math.hypot(x, z)).toBeLessThan(WORLD_RADIUS - PLAYER_RADIUS)
      expect(Math.hypot(x - node.at[0], z - node.at[1])).toBeLessThan(node.reach)
    }
  })

  it('names the sector under a point', () => {
    expect(sectorAt(0, 0)).toBe('origin')
    expect(sectorAt(...SECTOR_BY_ID.archive.at)).toBe('archive')
    expect(sectorAt(SPAWN.x, SPAWN.z)).toBe(null)
  })
})

describe('player physics', () => {
  it('walks forward (north) and runs faster', () => {
    const walker = createBody(0, 20)
    simulate(walker, { x: 0, z: 1 }, 1)
    expect(walker.z).toBeLessThan(20 - WALK_SPEED * 0.6)
    expect(Math.abs(walker.x)).toBeLessThan(0.001)
    expect(walker.speed).toBeCloseTo(WALK_SPEED, 0)

    const runner = createBody(0, 20)
    simulate(runner, { x: 0, z: 1, sprint: true }, 1)
    expect(runner.speed).toBeCloseTo(RUN_SPEED, 0)
    expect(runner.z).toBeLessThan(walker.z)
  })

  it('strafes relative to where it looks', () => {
    const body = createBody(0, 20, Math.PI / 2) // looking west
    simulate(body, { x: 0, z: 1 }, 0.5)
    expect(body.x).toBeLessThan(-1)
    expect(Math.abs(body.z - 20)).toBeLessThan(0.01)
  })

  it('cannot walk through the identity core and slides around it', () => {
    const body = createBody(0.3, 12)
    simulate(body, { x: 0, z: 1 }, 5)
    const core = NODE_BY_ID.identity
    expect(Math.hypot(body.x - core.at[0], body.z - core.at[1])).toBeGreaterThanOrEqual(core.collider + PLAYER_RADIUS - 0.01)
    expect(body.z).toBeLessThan(2) // slid past it
  })

  it('stays inside the edge of the world', () => {
    const body = createBody(0, 50)
    const events = simulate(body, { x: 0, z: -1, sprint: true }, 4)
    expect(Math.hypot(body.x, body.z)).toBeLessThanOrEqual(WORLD_RADIUS - PLAYER_RADIUS + 1e-6)
    expect(events).toContain('edge')
  })

  it('jumps, lands and takes steps', () => {
    const body = createBody(0, 20)
    const events = simulate(body, { x: 0, z: 0, jump: true }, 0.2)
    expect(events).toContain('jump')
    expect(body.y).toBeGreaterThan(0.5)
    const later = simulate(body, { x: 0, z: 0 }, 1.5)
    expect(body.y).toBe(0)
    expect(later).toContain('land')
    expect(simulate(body, { x: 0, z: 1 }, 2).filter((event) => event === 'step').length).toBeGreaterThan(2)
  })

  it('stops when the input stops', () => {
    const body = createBody(0, 20)
    simulate(body, { x: 1, z: 1 }, 1)
    simulate(body, { x: 0, z: 0 }, 1)
    expect(body.speed).toBeLessThan(0.01)
  })
})

describe('boot script', () => {
  it('prints the connection steps and the outcome', () => {
    const lines = linkTranscript().map((line) => line.text)
    expect(lines).toContain('SYSTEM BOOTING...')
    expect(lines).toContain('ESTABLISHING NEURAL CONNECTION...')
    expect(lines).toContain('ACCESSING THE MATRIX...')
    expect(outcomeLines('ready').map((line) => line.text)).toEqual(['CONNECTION ESTABLISHED.'])
    expect(outcomeLines('unsupported')[0].text).toMatch(/WEBGL/)
    expect(outcomeLines('failed')[0].text).toMatch(/FAILED/)
  })

  it('draws progress bars', () => {
    expect(progressBar(0, 4)).toBe('  [....]   0%')
    expect(progressBar(0.5, 4)).toBe('  [##..]  50%')
    expect(progressBar(1, 4)).toBe('  [####] 100%')
  })
})
