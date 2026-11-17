import { CONTACT_EMAIL, experiences, navLinks, projects, stack } from '../../portfolio/content.js'
import { profile } from './profile.js'

/**
 * The map of the world: where every section of the site stands, as plain data.
 *
 * Coordinates are [x, z] on the ground in metres; north is -z. Nothing here
 * depends on three.js, so the boot screen, the text mode and the tests can all
 * use it.
 */

export const WORLD_RADIUS = 60
export const EYE_HEIGHT = 1.7
export const PLAYER_RADIUS = 0.45

/** Where the visitor lands: south of the plaza, looking north at it. */
export const SPAWN = Object.freeze({ x: 0, z: 18, yaw: 0 })

const PLAZA = [0, 0]

const unit = (from, to) => {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz) || 1
  return [dx / length, dz / length]
}

const offset = (point, direction, distance) => [
  point[0] + direction[0] * distance,
  point[1] + direction[1] * distance,
]

/**
 * Sector-local to world coordinates. Standing at the sector's centre and
 * facing the plaza, `x` goes to the right and `z` goes forward.
 */
export const place = (sector, x, z) => {
  const [fx, fz] = sector.facing
  return [sector.at[0] - fz * x + fx * z, sector.at[1] + fx * x + fz * z]
}

/** Y rotation that turns an object's front (+z) towards a direction. */
export const yawTowards = ([dx, dz]) => Math.atan2(dx, dz)

/* ---------- Sectors: one per section of the classic site ---------- */

const sector = (def) => Object.freeze({ accent: 'green', gate: false, ...def, facing: def.facing ?? unit(def.at, PLAZA) })

export const SECTORS = Object.freeze([
  sector({
    id: 'origin',
    name: 'ORIGIN',
    label: 'IDENTITY',
    summary: 'Who is behind the signal',
    at: PLAZA,
    radius: 11,
    facing: [0, 1],
  }),
  sector({
    id: 'archive',
    name: 'ARCHIVE',
    label: 'PROJECTS',
    summary: `${projects.length} projects`,
    at: [-28, -16],
    radius: 14,
    gate: true,
  }),
  sector({
    id: 'log',
    name: 'LOG',
    label: 'EXPERIENCE',
    summary: `${experiences.length} entries`,
    at: [0, -38],
    radius: 14,
    gate: true,
  }),
  sector({
    id: 'core',
    name: 'CORE',
    label: 'SKILLS',
    summary: `${stack.length} modules`,
    at: [28, -16],
    radius: 14,
    gate: true,
  }),
  sector({ id: 'uplink', name: 'UPLINK', label: 'CONTACT', summary: 'Open a channel', at: [-23, 22], radius: 9, accent: 'cyan' }),
  sector({ id: 'arcade', name: 'ARCADE', label: 'SHARDSTORM', summary: 'Play the game', at: [23, 22], radius: 9 }),
  sector({ id: 'exit', name: 'EXIT', label: 'CLASSIC SITE', summary: 'Leave the Matrix', at: [0, 40], radius: 9, accent: 'white' }),
])

export const SECTOR_BY_ID = Object.freeze(Object.fromEntries(SECTORS.map((entry) => [entry.id, entry])))

/** The sector the point stands in, or null out in the open grid. */
export function sectorAt(x, z) {
  for (const entry of SECTORS) {
    if (Math.hypot(x - entry.at[0], z - entry.at[1]) <= entry.radius) return entry.id
  }
  return null
}

/** Entrance arch of a sector: two pillars on the path that leads to the plaza. */
export function gateOf(entry) {
  const centre = place(entry, 0, entry.radius - 3)
  return { centre, left: place(entry, -3.6, entry.radius - 3), right: place(entry, 3.6, entry.radius - 3), yaw: yawTowards(entry.facing) }
}

/* ---------- Nodes: everything the visitor can interact with ---------- */

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * `at` is the node's spot on the ground, `height` the point the visitor looks
 * at, `reach` how close they must be to interact, `radius` its rough size,
 * `front` the side it is meant to be seen from and `collider` its footprint.
 */
function node(def) {
  const home = SECTOR_BY_ID[def.sector]
  const front = def.front ?? home.facing
  return Object.freeze({
    height: 2.4,
    reach: 5.5,
    radius: 1.5,
    collider: 1,
    portal: false,
    ...def,
    front,
    // Where a fast-travel drops the visitor: in front of the node, facing it.
    approach: offset(def.at, front, def.approachAt ?? (def.reach ?? 5.5) * 0.72),
  })
}

const archive = SECTOR_BY_ID.archive
const log = SECTOR_BY_ID.log
const core = SECTOR_BY_ID.core

const PROJECT_SPOTS = [
  [-6.4, 0.6],
  [-2.3, -3.2],
  [2.3, -3.2],
  [6.4, 0.6],
]
const archiveFocus = place(archive, 0, 5)

const EXPERIENCE_SPOTS = [
  [-4.2, 6],
  [4.2, 0.5],
  [-4.2, -5],
]

const gameLink = navLinks.find((link) => link.href.startsWith('/game'))

export const NODES = Object.freeze([
  node({
    id: 'identity',
    sector: 'origin',
    kind: 'identity',
    code: 'ID-00',
    title: profile.name,
    subtitle: 'Identity',
    at: PLAZA,
    height: 3,
    reach: 10,
    approachAt: 7.5,
    radius: 2.6,
    collider: 2.6,
  }),

  ...projects.map((project, index) => {
    const at = place(archive, ...PROJECT_SPOTS[index % PROJECT_SPOTS.length])
    return node({
      id: `project-${slug(project.title)}`,
      sector: 'archive',
      kind: 'project',
      code: `PRJ-${String(index + 1).padStart(2, '0')}`,
      title: project.title,
      subtitle: project.tags,
      at,
      front: unit(at, archiveFocus),
      height: 2.85,
      reach: 7.5,
      approachAt: 5.6,
      index,
      data: project,
    })
  }),

  ...experiences.map((experience, index) => {
    const at = place(log, ...EXPERIENCE_SPOTS[index % EXPERIENCE_SPOTS.length])
    return node({
      id: `experience-${slug(experience.title)}`,
      sector: 'log',
      kind: 'experience',
      code: `LOG-${String(index + 1).padStart(2, '0')}`,
      title: experience.title,
      subtitle: experience.place,
      at,
      // Each panel is turned towards the path that runs up the middle.
      front: unit(at, [log.at[0], at[1] + 2.5]),
      height: 2.6,
      reach: 7.5,
      approachAt: 5.4,
      collider: 1.3,
      index,
      data: experience,
    })
  }),

  node({
    id: 'stack',
    sector: 'core',
    kind: 'stack',
    code: 'SYS-01',
    title: 'Stack',
    subtitle: `${stack.length} modules`,
    at: core.at,
    height: 3.3,
    reach: 9.5,
    approachAt: 7.6,
    radius: 2.2,
    collider: 2,
    data: stack,
  }),
  node({
    id: 'education',
    sector: 'core',
    kind: 'education',
    code: 'SYS-02',
    title: profile.education.school,
    subtitle: 'Education',
    at: place(core, 6.5, -2.5),
    front: unit(place(core, 6.5, -2.5), place(core, 2, 6)),
    height: 3,
    reach: 6.5,
    approachAt: 5,
    collider: 0.9,
    data: profile.education,
  }),
  node({
    id: 'motto',
    sector: 'core',
    kind: 'motto',
    code: 'SYS-03',
    title: 'Motto',
    subtitle: 'Words to work by',
    at: place(core, -6.5, -2.5),
    front: unit(place(core, -6.5, -2.5), place(core, -2, 6)),
    height: 2.3,
    reach: 6.5,
    approachAt: 4.8,
    collider: 0.9,
    data: profile.motto,
  }),

  node({
    id: 'contact',
    sector: 'uplink',
    kind: 'contact',
    code: 'LNK-01',
    title: 'Contact',
    subtitle: 'Uplink',
    at: SECTOR_BY_ID.uplink.at,
    reach: 7,
    approachAt: 6.2,
    radius: 2.3,
    collider: 0,
    portal: true,
    href: `mailto:${CONTACT_EMAIL}`,
  }),
  ...(gameLink
    ? [
        node({
          id: 'arcade',
          sector: 'arcade',
          kind: 'link',
          code: 'LNK-02',
          title: 'Shardstorm',
          subtitle: 'Arcade',
          at: SECTOR_BY_ID.arcade.at,
          reach: 7,
          approachAt: 6.2,
          radius: 2.3,
          collider: 0,
          portal: true,
          href: gameLink.href,
          action: gameLink.label,
          description:
            'A 3D arena survival game built with React Three Fiber: survive the waves, collect shards and upgrade your ship.',
        }),
      ]
    : []),
  node({
    id: 'exit',
    sector: 'exit',
    kind: 'link',
    code: 'LNK-03',
    title: 'Classic site',
    subtitle: 'Exit',
    at: SECTOR_BY_ID.exit.at,
    reach: 7,
    approachAt: 6.2,
    radius: 2.3,
    collider: 0,
    portal: true,
    href: '/',
    action: 'Return to the classic site',
    description: 'Disconnect from the Matrix and go back to the classic version of this site.',
  }),
])

export const NODE_BY_ID = Object.freeze(Object.fromEntries(NODES.map((entry) => [entry.id, entry])))

/** Half the opening of a portal ring: its two feet stand this far from its centre. */
export const PORTAL_RADIUS = 2.2

/* ---------- Colliders: circles the visitor cannot walk through ---------- */

export const COLLIDERS = Object.freeze([
  ...NODES.filter((entry) => entry.collider > 0).map((entry) => ({ x: entry.at[0], z: entry.at[1], r: entry.collider })),
  // A portal can be walked through: only the feet of its ring are solid.
  ...NODES.filter((entry) => entry.portal).flatMap((entry) => {
    const home = SECTOR_BY_ID[entry.sector]
    return [-PORTAL_RADIUS, PORTAL_RADIUS].map((side) => {
      const [x, z] = place(home, side, 0)
      return { x, z, r: 0.4 }
    })
  }),
  ...SECTORS.filter((entry) => entry.gate).flatMap((entry) => {
    const gate = gateOf(entry)
    return [gate.left, gate.right].map(([x, z]) => ({ x, z, r: 0.55 }))
  }),
])
