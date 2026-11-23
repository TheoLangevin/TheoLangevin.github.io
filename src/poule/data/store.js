/**
 * The store contract the game service talks to. Two implementations share it:
 * `sqlite/createSqliteStore.js` (the real one) and `memory/createMemoryStore.js`
 * (tests, and fallback when SQLite cannot load). Every method is synchronous.
 * Amounts are integer cents.
 *
 * @typedef {object} Store
 * @property {'sqlite' | 'memory'} kind
 * @property {(work: () => T) => T} transaction  all or nothing
 * @property {object} wallet
 * @property {() => number} wallet.balance
 * @property {(amount: number) => boolean} wallet.debit  false if the balance is too low
 * @property {(amount: number) => void} wallet.credit
 * @property {(amount: number) => void} wallet.set
 * @property {object} rounds
 * @property {(row: RoundInsert) => number} rounds.insert  returns the new id
 * @property {(row: RoundUpdate) => void} rounds.update
 * @property {() => object | null} rounds.active  the round in progress, if any
 * @property {(limit: number) => object[]} rounds.history  finished rounds, newest first
 * @property {() => object} rounds.stats  totals over finished rounds
 * @property {() => object[]} rounds.statsByMode
 * @property {() => void} rounds.clearFinished
 * @property {object} settings
 * @property {(key: string, fallback?: string) => string | null} settings.get
 * @property {(key: string, value: unknown) => void} settings.set
 *
 * @typedef {{ modeId: string, betCents: number, seed: string, seedHash: string, lane: number, status: string, startedAt: string }} RoundInsert
 * @typedef {{ id: number, lane: number, status: string, multiplier: number | null, payoutCents: number, endedAt: string | null }} RoundUpdate
 */

export { createMemoryStore } from './memory/createMemoryStore.js'
export { createSqliteStore } from './sqlite/createSqliteStore.js'
