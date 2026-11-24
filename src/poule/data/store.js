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
 * @property {() => object} rounds.progressStats  totals the achievements are checked against
 * @property {() => void} rounds.clearFinished
 * @property {(limit: number) => object[]} rounds.forSave  finished rounds, oldest first
 * @property {(rounds: object[]) => void} rounds.replaceFinished  from a save
 * @property {object} profile  experience (tokens are the only currency)
 * @property {() => { xp: number }} profile.get
 * @property {(amount: number) => void} profile.earn  adds experience
 * @property {(profile: { xp: number }) => void} profile.set
 * @property {object} upgrades
 * @property {() => string[]} upgrades.owned
 * @property {(id: string) => void} upgrades.add
 * @property {() => Record<string, string>} upgrades.equipped  slot → upgrade id
 * @property {(slot: string, id: string) => void} upgrades.equip
 * @property {(slot: string) => void} upgrades.unequip
 * @property {(owned: string[], equipped: Record<string, string>) => void} upgrades.replace
 * @property {object} achievements
 * @property {() => string[]} achievements.unlocked
 * @property {(id: string) => void} achievements.add
 * @property {(ids: string[]) => void} achievements.replace
 * @property {object} seasons  weekly season rewards collected
 * @property {() => { season: string, rank: number | null, total: number | null, score: number }[]} seasons.claimed
 * @property {(claim: object) => void} seasons.add  throws if that season was already claimed
 * @property {(claims: object[]) => void} seasons.replace
 * @property {object} settings
 * @property {(key: string, fallback?: string) => string | null} settings.get
 * @property {(key: string, value: unknown) => void} settings.set
 *
 * @typedef {{ modeId: string, betCents: number, seed: string, seedHash: string, lane: number, status: string, startedAt: string }} RoundInsert
 * @typedef {{ id: number, lane: number, status: string, multiplier: number | null, payoutCents: number, endedAt: string | null, crossed: number, roadLanes: number, xp: number }} RoundUpdate
 */

export { createMemoryStore } from './memory/createMemoryStore.js'
export { createSqliteStore } from './sqlite/createSqliteStore.js'
