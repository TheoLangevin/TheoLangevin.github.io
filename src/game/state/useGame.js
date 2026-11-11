import { create } from 'zustand'
import { setMuted, unlockAudio } from '../audio/sfx.js'
import { createWorld } from '../engine/createWorld.js'
import { hudSnapshot, runSummary } from '../engine/snapshot.js'
import { applyUpgrade, rollUpgradeChoices } from '../engine/systems/progression.js'
import { resetFeedback } from '../feedback/index.js'
import { runtime } from './runtime.js'
import { loadBest, loadSettings, saveBest, saveSettings } from './storage.js'

const sameHud = (a, b) => a !== null && Object.keys(b).every((key) => a[key] === b[key])

/**
 * UI-facing state of the game: which screen is shown, the HUD numbers and the
 * settings. Phases: menu → playing ⇄ paused / levelup → gameover.
 */
export const useGame = create((set, get) => ({
  phase: 'menu',
  hud: null,
  choices: [],
  result: null,
  best: loadBest(),
  settings: loadSettings(),

  start() {
    runtime.world = createWorld()
    resetFeedback()
    unlockAudio()
    setMuted(!get().settings.sound)
    set({ phase: 'playing', hud: hudSnapshot(runtime.world), choices: [], result: null })
  },

  pause() {
    if (get().phase === 'playing') set({ phase: 'paused' })
  },

  resume() {
    if (get().phase === 'paused') set({ phase: 'playing' })
  },

  quit() {
    runtime.world = null
    resetFeedback()
    set({ phase: 'menu', hud: null, choices: [], result: null })
  },

  /** Called by the simulation when the player has a level up to spend. */
  offerUpgrades() {
    set({ phase: 'levelup', choices: rollUpgradeChoices(runtime.world), hud: hudSnapshot(runtime.world) })
  },

  choose(id) {
    const world = runtime.world
    if (get().phase !== 'levelup' || !applyUpgrade(world, id)) return
    if (world.pendingLevelUps > 0) set({ choices: rollUpgradeChoices(world) })
    else set({ phase: 'playing', choices: [], hud: hudSnapshot(world) })
  },

  /** Called by the simulation when the player dies. */
  finish() {
    const result = runSummary(runtime.world)
    const record = result.score > get().best
    if (record) saveBest(result.score)
    set({
      phase: 'gameover',
      hud: hudSnapshot(runtime.world),
      result: { ...result, record },
      best: record ? result.score : get().best,
    })
  },

  syncHud() {
    const next = hudSnapshot(runtime.world)
    if (!sameHud(get().hud, next)) set({ hud: next })
  },

  toggleSetting(key) {
    const settings = { ...get().settings, [key]: !get().settings[key] }
    saveSettings(settings)
    if (key === 'sound') setMuted(!settings.sound)
    set({ settings })
  },
}))
