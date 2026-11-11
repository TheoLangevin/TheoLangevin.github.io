/** localStorage helpers that never throw (private mode, blocked storage...). */

const BEST_KEY = 'shardstorm:best'
const SETTINGS_KEY = 'shardstorm:settings'

export const DEFAULT_SETTINGS = Object.freeze({ sound: true, glow: true })

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* not remembered, and that is fine */
  }
}

export const loadBest = () => Number(read(BEST_KEY)) || 0
export const saveBest = (score) => write(BEST_KEY, String(score))

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(read(SETTINGS_KEY) ?? '{}') }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export const saveSettings = (settings) => write(SETTINGS_KEY, JSON.stringify(settings))
