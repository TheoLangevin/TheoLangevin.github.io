import { tokensToCents } from '../domain/money.js'

/**
 * The first version of the game kept its balance in localStorage under
 * `poule`. When a brand new database is created, carry that balance over
 * once, then forget the old key.
 */
const LEGACY_KEY = 'poule'

export function readLegacyBalance() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const balance = Number(JSON.parse(raw)?.bal)
    return Number.isFinite(balance) && balance >= 0 ? tokensToCents(balance) : null
  } catch {
    return null
  }
}

export function forgetLegacy() {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* nothing to forget */
  }
}

export function importLegacy(store) {
  const balance = readLegacyBalance()
  if (balance === null) return false
  store.transaction(() => store.wallet.set(Math.floor(balance)))
  forgetLegacy()
  return true
}
