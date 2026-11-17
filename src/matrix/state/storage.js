/** Remembered preferences. Never throws: storage can be blocked or full. */

const KEY = 'matrix:prefs'
const DEFAULTS = Object.freeze({ sound: true })

export function loadPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePrefs(patch) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadPrefs(), ...patch }))
  } catch {
    /* not remembered, and that is fine */
  }
}
