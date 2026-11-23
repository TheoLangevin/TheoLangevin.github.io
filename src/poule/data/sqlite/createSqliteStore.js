import { SQL } from './queries.js'

const now = () => new Date().toISOString()

/** Store contract (see data/store.js) backed by SQLite. */
export function createSqliteStore(database) {
  const wallet = {
    balance: () => database.get(SQL.walletBalance)?.balance_cents ?? 0,
    debit: (amount) => database.run(SQL.walletDebit, { amount, now: now() }) === 1,
    credit: (amount) => void database.run(SQL.walletCredit, { amount, now: now() }),
    set: (amount) => void database.run(SQL.walletSet, { amount, now: now() }),
  }

  const rounds = {
    insert(row) {
      database.run(SQL.roundInsert, row)
      return database.get(SQL.lastInsertId).id
    },
    update: (row) => void database.run(SQL.roundUpdate, row),
    active: () => database.get(SQL.roundActive),
    history: (limit) => database.all(SQL.roundHistory, { limit }),
    stats: () => database.get(SQL.roundStats),
    statsByMode: () => database.all(SQL.roundStatsByMode),
    clearFinished: () => void database.run(SQL.roundClearFinished),
  }

  const settings = {
    get: (key, fallback = null) => database.get(SQL.settingGet, { key })?.value ?? fallback,
    set: (key, value) => void database.run(SQL.settingSet, { key, value: String(value) }),
  }

  return {
    kind: 'sqlite',
    wallet,
    rounds,
    settings,
    transaction: (work) => database.transaction(work),
  }
}
