import { experiences, projects, stack } from '../../portfolio/content.js'

/**
 * What the old machine prints. Two screens: a grey power-on self test, like a
 * 90s PC, then a green terminal once "something else" takes over the line.
 */

export const BIOS = Object.freeze({
  title: 'LANGEVIN MODULAR BIOS v4.51PG',
  copyright: 'Copyright (C) 1984-1999, T.L. Systems',
  cpu: 'NEURAL-586 CPU at 133MHz',
  memory: 32768,
  devices: [
    ['Detecting Primary Master   ... ', 'PORTFOLIO.SYS'],
    ['Detecting Primary Slave    ... ', `PROJECTS.DAT  (${projects.length} records)`],
    ['Detecting Secondary Master ... ', `EXPERIENCE.LOG  (${experiences.length} records)`],
    ['Detecting Secondary Slave  ... ', `STACK.BIN  (${stack.length} modules)`],
  ],
  handover: 'Unknown signal on COM2 - handing over control...',
})

export const LINK = Object.freeze({
  booting: 'SYSTEM BOOTING...',
  checks: ['  kernel ............ OK', '  memory ............ OK', '  identity .......... THEO LANGEVIN'],
  connecting: 'ESTABLISHING NEURAL CONNECTION...',
  accessing: 'ACCESSING THE MATRIX...',
  established: 'CONNECTION ESTABLISHED.',
  unsupported: ['3D LINK UNAVAILABLE: THIS DEVICE HAS NO WEBGL 2 SUPPORT.', 'FALLING BACK TO TEXT MODE.'],
  failed: ['CONNECTION FAILED: THE WORLD COULD NOT BE LOADED.', 'CHECK YOUR NETWORK AND RETRY, OR USE TEXT MODE.'],
})

export const memoryLine = (kilobytes, done = false) =>
  `Memory Test : ${String(kilobytes).padStart(6)}K${done ? ' OK' : ''}`

export function progressBar(progress, width = 24) {
  const filled = Math.round(Math.min(1, Math.max(0, progress)) * width)
  return `  [${'#'.repeat(filled)}${'.'.repeat(width - filled)}] ${String(Math.round(progress * 100)).padStart(3)}%`
}

/** The green screen as it stands once everything has been typed (used when skipping). */
export function linkTranscript() {
  return [
    { text: LINK.booting, tone: 'bright' },
    ...LINK.checks.map((text) => ({ text })),
    { text: LINK.connecting, tone: 'bright' },
    { text: progressBar(1) },
    { text: LINK.accessing, tone: 'bright' },
  ]
}

/** The last lines, which depend on whether the 3D world could be reached. */
export function outcomeLines(status) {
  if (status === 'ready') return [{ text: LINK.established, tone: 'ok' }]
  return LINK[status === 'unsupported' ? 'unsupported' : 'failed'].map((text) => ({ text, tone: 'warn' }))
}
