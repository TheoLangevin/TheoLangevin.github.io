import { create } from 'zustand'
import { setMuted, sfx, startAmbience, unlockAudio } from '../audio/audio.js'
import { NODE_BY_ID } from '../content/world.js'
import { clearInput } from '../input/controls.js'
import { capturePointer, releasePointer } from '../input/pointerLock.js'
import { beginIntro, rig, teleportToNode } from './rig.js'
import { loadPrefs, savePrefs } from './storage.js'

const QUALITY_LEVELS = ['high', 'medium', 'low']
const params = new URLSearchParams(window.location.search)
const media = (query) => window.matchMedia(query).matches

/** `?quality=low|medium|high` pins the rendering quality; otherwise it adapts. */
function startingQuality() {
  const forced = params.get('quality')
  if (QUALITY_LEVELS.includes(forced)) return { quality: forced, qualityMode: 'manual' }
  const modest = media('(pointer: coarse)') || Math.min(window.innerWidth, window.innerHeight) < 600
  return { quality: modest ? 'medium' : 'high', qualityMode: 'auto' }
}

let toastTimer = 0

/**
 * Everything the interface reacts to.
 *
 * phase: boot → entering → world, or boot → textmode when 3D is unavailable.
 * worldStatus: where the 3D scene stands (loading → ready, or unsupported / failed).
 * overlay: the one window open over the world: a node's panel, the directory or the pause menu.
 */
export const useMatrix = create((set, get) => ({
  phase: 'boot',
  worldStatus: 'loading',
  overlay: null,
  focusId: null,
  sectorId: 'origin',
  locked: false,
  sound: loadPrefs().sound,
  ...startingQuality(),
  toast: null,
  /** Bumped to replay the full-screen sweep that marks a jump or a new sector. */
  sweep: 0,
  leaving: false,
  signalLost: false,
  moveKeys: 'ZQSD',
  touch: media('(pointer: coarse)'),
  reducedMotion: media('(prefers-reduced-motion: reduce)'),
  skipBoot: params.has('skipboot'),
  skipIntro: params.has('skipintro'),

  setWorldStatus(worldStatus) {
    if (get().worldStatus !== worldStatus) set({ worldStatus })
  },
  setMoveKeys: (moveKeys) => set({ moveKeys }),
  setLocked: (locked) => set({ locked }),
  setFocus: (focusId) => set({ focusId }),
  setSignalLost: (signalLost) => set({ signalLost }),
  stay: () => set({ leaving: false }),

  setSector(sectorId) {
    if (sectorId === get().sectorId) return
    set(sectorId ? { sectorId, sweep: get().sweep + 1 } : { sectorId })
    if (sectorId) sfx.sector()
  },

  setQuality(quality, mode = get().qualityMode) {
    set({ quality, qualityMode: mode })
  },
  /** Pause menu: AUTO → HIGH → MEDIUM → LOW → AUTO. */
  cycleQuality() {
    const { quality, qualityMode } = get()
    if (qualityMode === 'auto') return set({ quality: 'high', qualityMode: 'manual' })
    const next = QUALITY_LEVELS[QUALITY_LEVELS.indexOf(quality) + 1]
    set(next ? { quality: next } : { ...startingQuality(), qualityMode: 'auto' })
  },

  toggleSound() {
    const sound = !get().sound
    savePrefs({ sound })
    unlockAudio()
    setMuted(!sound)
    set({ sound })
  },

  showToast(text, duration = 3600) {
    clearTimeout(toastTimer)
    set({ toast: text })
    toastTimer = setTimeout(() => set({ toast: null }), duration)
  },

  /** "ENTER THE MATRIX": called from the click, so audio and mouse capture are allowed. */
  enterWorld() {
    if (get().phase !== 'boot') return
    unlockAudio()
    setMuted(!get().sound)
    sfx.enter()
    setTimeout(startAmbience, 1300)
    const skip = get().skipIntro || get().reducedMotion
    beginIntro({ skip })
    capturePointer()
    set({ phase: 'entering', overlay: null, sectorId: 'origin' })
  },

  /** The arrival is over: hand the controls to the visitor. */
  arrive() {
    if (get().phase !== 'entering') return
    set({ phase: 'world', sweep: get().sweep + 1 })
    sfx.sector()
  },

  enterTextMode() {
    unlockAudio()
    setMuted(!get().sound)
    sfx.confirm()
    releasePointer()
    set({ phase: 'textmode', overlay: null })
  },

  openPanel(id) {
    if (!NODE_BY_ID[id]) return
    clearInput()
    releasePointer()
    sfx.open()
    set({ overlay: { type: 'panel', id } })
  },
  openDirectory() {
    clearInput()
    releasePointer()
    sfx.open()
    set({ overlay: { type: 'directory' } })
  },
  openPause() {
    clearInput()
    releasePointer()
    set({ overlay: { type: 'pause' } })
  },
  /** Closes the open window. Call it from a user gesture so the mouse can be captured again. */
  closeOverlay() {
    if (!get().overlay) return
    sfx.close()
    set({ overlay: null })
    if (get().phase === 'world') capturePointer()
  },

  /** E, a click or the ACCESS button: opens what the visitor is looking at. */
  interact() {
    const { phase, overlay } = get()
    if (phase !== 'world' || overlay) return
    if (rig.focusId) get().openPanel(rig.focusId)
    else sfx.deny()
  },

  /** A click or tap on a node: open it when close enough, otherwise travel to it. */
  activate(id) {
    const node = NODE_BY_ID[id]
    if (!node || get().phase !== 'world' || get().overlay) return
    const distance = Math.hypot(rig.x - node.at[0], rig.z - node.at[1])
    if (distance <= node.reach) get().openPanel(id)
    else get().visit(id)
  },

  /** Goes to a node: a jump through the world, or simply its panel in text mode. */
  visit(id) {
    const node = NODE_BY_ID[id]
    if (!node) return
    if (get().phase !== 'world') return get().openPanel(id)
    teleportToNode(node)
    sfx.teleport()
    set({ overlay: null, sweep: get().sweep + 1 })
    capturePointer()
  },

  /** Follows a link out of the experience, after the screen has switched off. */
  leave(href) {
    if (get().leaving) return
    releasePointer()
    sfx.powerOff()
    set({ leaving: true })
    setTimeout(() => window.location.assign(href), 620)
  },
}))

/** Resolves once the 3D world is ready, or known to be unavailable. */
export function whenWorldSettles(timeout = 25000) {
  return new Promise((resolve) => {
    const settled = (status) => status !== 'loading'
    if (settled(useMatrix.getState().worldStatus)) return resolve(useMatrix.getState().worldStatus)
    const timer = setTimeout(() => useMatrix.getState().setWorldStatus('failed'), timeout)
    const unsubscribe = useMatrix.subscribe((state) => {
      if (!settled(state.worldStatus)) return
      clearTimeout(timer)
      unsubscribe()
      resolve(state.worldStatus)
    })
  })
}
