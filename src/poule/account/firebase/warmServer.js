import { FIREBASE_CONFIG } from './config.js'

const URL = 'https://europe-west1-la-poule-traverse.cloudfunctions.net/game'
const EVERY = 5 * 60_000
let last = 0

/**
 * Wakes the game server while the page loads, so the first action does not
 * wait for it to start: an empty call, refused at once (no sign-in), still
 * starts a server. Done again when the player comes back after a while.
 */
export function warmServer() {
  if (!FIREBASE_CONFIG || typeof fetch !== 'function') return
  const ping = () => {
    if (Date.now() - last < EVERY) return
    last = Date.now()
    fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"data":{}}' }).catch(() => {})
  }
  ping()
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && ping())
}
