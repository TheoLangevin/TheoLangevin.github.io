import { STARTING_BALANCE } from '../../config/economy.js'

/**
 * Store contract (see data/store.js) kept in memory. Used by the tests, and by
 * the game when SQLite cannot load: it plays the same, but forgets on reload.
 * Row shapes match the SQLite queries.
 */
export function createMemoryStore({ balance = STARTING_BALANCE } = {}) {
  let state = { balance, rounds: [], settings: {}, nextId: 1 }

  const finished = () => state.rounds.filter((row) => row.status !== 'active')

  const wallet = {
    balance: () => state.balance,
    debit(amount) {
      if (state.balance < amount) return false
      state.balance -= amount
      return true
    },
    credit: (amount) => void (state.balance += amount),
    set: (amount) => void (state.balance = amount),
  }

  const rounds = {
    insert(row) {
      if (row.status === 'active' && rounds.active()) throw new Error('A round is already in progress')
      const id = state.nextId++
      state.rounds.push({
        id,
        mode_id: row.modeId,
        bet_cents: row.betCents,
        seed: row.seed,
        seed_hash: row.seedHash,
        lane: row.lane,
        status: row.status,
        multiplier: null,
        payout_cents: 0,
        started_at: row.startedAt,
        ended_at: null,
      })
      return id
    },
    update(row) {
      const target = state.rounds.find((entry) => entry.id === row.id)
      if (!target) return
      Object.assign(target, {
        lane: row.lane,
        status: row.status,
        multiplier: row.multiplier,
        payout_cents: row.payoutCents,
        ended_at: row.endedAt,
      })
    },
    active: () => state.rounds.find((row) => row.status === 'active') ?? null,
    history: (limit) =>
      finished()
        .slice(-limit)
        .reverse()
        .map(({ started_at, ended_at, ...row }) => row),
    stats() {
      const rows = finished()
      const wins = rows.filter((row) => row.status === 'won')
      return {
        played: rows.length,
        won: wins.length,
        wagered_cents: rows.reduce((sum, row) => sum + row.bet_cents, 0),
        returned_cents: rows.reduce((sum, row) => sum + row.payout_cents, 0),
        best_multiplier: wins.length ? Math.max(...wins.map((row) => row.multiplier)) : null,
      }
    },
    statsByMode() {
      const byMode = new Map()
      for (const row of finished()) {
        const entry = byMode.get(row.mode_id) ?? { mode_id: row.mode_id, played: 0, won: 0 }
        entry.played++
        if (row.status === 'won') entry.won++
        byMode.set(row.mode_id, entry)
      }
      return [...byMode.values()]
    },
    clearFinished: () => void (state.rounds = state.rounds.filter((row) => row.status === 'active')),
  }

  const settings = {
    get: (key, fallback = null) => state.settings[key] ?? fallback,
    set: (key, value) => void (state.settings[key] = String(value)),
  }

  return {
    kind: 'memory',
    wallet,
    rounds,
    settings,
    /** All or nothing, like a SQL transaction. */
    transaction(work) {
      const snapshot = structuredClone(state)
      try {
        return work()
      } catch (error) {
        state = snapshot
        throw error
      }
    },
  }
}
