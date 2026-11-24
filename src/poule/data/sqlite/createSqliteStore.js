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
    progressStats: () => database.get(SQL.progressStats),
    clearFinished: () => void database.run(SQL.roundClearFinished),
    /** Finished rounds, oldest first, for a save. */
    forSave: (limit) => database.all(SQL.roundsForSave, { limit }).reverse(),
    /** Replaces every finished round with these (save form). */
    replaceFinished(rounds) {
      database.run(SQL.roundClearFinished)
      for (const round of rounds) {
        database.run(SQL.roundImport, {
          modeId: round.mode,
          betCents: round.bet,
          lane: round.lane,
          status: round.status,
          multiplier: round.mult,
          payoutCents: round.payout,
          endedAt: round.endedAt ?? now(),
          crossed: round.crossed,
          roadLanes: round.roadLanes,
          feathers: round.feathers,
        })
      }
    },
  }

  const settings = {
    get: (key, fallback = null) => database.get(SQL.settingGet, { key })?.value ?? fallback,
    set: (key, value) => void database.run(SQL.settingSet, { key, value: String(value) }),
  }

  const profile = {
    get: () => database.get(SQL.profileGet) ?? { xp: 0, feathers: 0 },
    earn: (amount) => void database.run(SQL.profileEarn, { amount }),
    spend: (amount) => database.run(SQL.profileSpend, { amount }) === 1,
    set: ({ xp, feathers }) => void database.run(SQL.profileSet, { xp, feathers }),
  }

  const upgrades = {
    owned: () => database.all(SQL.upgradesOwned).map((row) => row.id),
    add: (id) => void database.run(SQL.upgradeInsert, { id, now: now() }),
    equipped: () => Object.fromEntries(database.all(SQL.equippedAll).map((row) => [row.slot, row.upgrade_id])),
    equip: (slot, upgradeId) => void database.run(SQL.equip, { slot, upgradeId }),
    unequip: (slot) => void database.run(SQL.unequip, { slot }),
    replace(owned, equipped) {
      database.run(SQL.equippedClear)
      database.run(SQL.upgradesClear)
      for (const id of owned) database.run(SQL.upgradeInsert, { id, now: now() })
      for (const [slot, upgradeId] of Object.entries(equipped)) database.run(SQL.equip, { slot, upgradeId })
    },
  }

  const achievements = {
    unlocked: () => database.all(SQL.achievementsUnlocked).map((row) => row.id),
    add: (id) => void database.run(SQL.achievementInsert, { id, now: now() }),
    replace(ids) {
      database.run(SQL.achievementsClear)
      for (const id of ids) database.run(SQL.achievementInsert, { id, now: now() })
    },
  }

  return {
    kind: 'sqlite',
    wallet,
    rounds,
    settings,
    profile,
    upgrades,
    achievements,
    transaction: (work) => database.transaction(work),
  }
}
