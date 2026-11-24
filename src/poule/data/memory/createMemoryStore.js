import { STARTING_BALANCE } from '../../config/economy.js'

/**
 * Store contract (see data/store.js) kept in memory. Used by the tests, and by
 * the game when SQLite cannot load: it plays the same, but forgets on reload.
 * Row shapes match the SQLite queries.
 */
export function createMemoryStore({ balance = STARTING_BALANCE } = {}) {
  let state = {
    balance,
    rounds: [],
    settings: {},
    nextId: 1,
    profile: { xp: 0, feathers: 0 },
    upgrades: [],
    equipped: {},
    achievements: [],
    claims: [],
  }

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
        crossed: 0,
        road_lanes: 0,
        feathers: 0,
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
        crossed: row.crossed ?? 0,
        road_lanes: row.roadLanes ?? 0,
        feathers: row.feathers ?? 0,
      })
    },
    active: () => state.rounds.find((row) => row.status === 'active') ?? null,
    history: (limit) =>
      finished()
        .slice(-limit)
        .reverse()
        .map(({ id, mode_id, status, multiplier, bet_cents, payout_cents, lane, seed, seed_hash }) => ({
          id,
          mode_id,
          status,
          multiplier,
          bet_cents,
          payout_cents,
          lane,
          seed,
          seed_hash,
        })),
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
    progressStats() {
      const rows = finished()
      const wins = rows.filter((row) => row.status === 'won')
      return {
        lanes_crossed: rows.reduce((sum, row) => sum + row.crossed, 0),
        won: wins.length,
        best_lanes: Math.max(0, ...rows.map((row) => row.crossed)),
        modes_won: new Set(wins.map((row) => row.mode_id)).size,
        hardcore_wins: wins.filter((row) => row.mode_id === 'hardcore').length,
        best_multiplier: Math.max(0, ...wins.map((row) => row.multiplier)),
        finished: wins.filter((row) => row.road_lanes > 0 && row.crossed === row.road_lanes).length,
      }
    },
    forSave: (limit) =>
      finished()
        .slice(-limit)
        .map(
          ({
            mode_id,
            bet_cents,
            payout_cents,
            multiplier,
            lane,
            crossed,
            road_lanes,
            feathers,
            status,
            ended_at,
          }) => ({
            mode_id,
            bet_cents,
            payout_cents,
            multiplier,
            lane,
            crossed,
            road_lanes,
            feathers,
            status,
            ended_at,
          }),
        ),
    replaceFinished(list) {
      state.rounds = state.rounds.filter((row) => row.status === 'active')
      for (const round of list) {
        state.rounds.push({
          id: state.nextId++,
          mode_id: round.mode,
          bet_cents: round.bet,
          seed: '',
          seed_hash: '',
          lane: round.lane,
          status: round.status,
          multiplier: round.mult,
          payout_cents: round.payout,
          started_at: round.endedAt,
          ended_at: round.endedAt,
          crossed: round.crossed,
          road_lanes: round.roadLanes,
          feathers: round.feathers,
        })
      }
    },
    clearFinished: () => void (state.rounds = state.rounds.filter((row) => row.status === 'active')),
  }

  const settings = {
    get: (key, fallback = null) => state.settings[key] ?? fallback,
    set: (key, value) => void (state.settings[key] = String(value)),
  }

  const profile = {
    get: () => ({ ...state.profile }),
    earn(amount) {
      state.profile.xp += amount
      state.profile.feathers += amount
    },
    spend(amount) {
      if (state.profile.feathers < amount) return false
      state.profile.feathers -= amount
      return true
    },
    set: ({ xp, feathers }) => void (state.profile = { xp, feathers }),
  }

  const upgrades = {
    owned: () => [...state.upgrades],
    add(id) {
      if (state.upgrades.includes(id)) throw new Error(`Upgrade ${id} already owned`)
      state.upgrades.push(id)
    },
    equipped: () => ({ ...state.equipped }),
    equip(slot, upgradeId) {
      if (!state.upgrades.includes(upgradeId)) throw new Error(`Upgrade ${upgradeId} not owned`)
      state.equipped[slot] = upgradeId
    },
    unequip: (slot) => void delete state.equipped[slot],
    replace(owned, equipped) {
      state.upgrades = [...owned]
      state.equipped = { ...equipped }
    },
  }

  const achievements = {
    unlocked: () => [...state.achievements],
    add(id) {
      if (state.achievements.includes(id)) throw new Error(`Achievement ${id} already unlocked`)
      state.achievements.push(id)
    },
    replace: (ids) => void (state.achievements = [...ids]),
  }

  const seasons = {
    claimed: () => state.claims.map((claim) => ({ ...claim })),
    add(claim) {
      if (state.claims.some((entry) => entry.season === claim.season))
        throw new Error(`Season ${claim.season} already claimed`)
      state.claims.push({
        season: claim.season,
        rank: claim.rank ?? null,
        total: claim.total ?? null,
        score: claim.score,
      })
    },
    replace: (claims) => void (state.claims = claims.map((claim) => ({ ...claim }))),
  }

  return {
    kind: 'memory',
    seasons,
    wallet,
    rounds,
    settings,
    profile,
    upgrades,
    achievements,
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
