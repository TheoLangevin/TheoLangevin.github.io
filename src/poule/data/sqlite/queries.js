/**
 * Every SQL statement the game runs, in one place. Parameters are named
 * (`:name`); SqlDatabase adds the colon to the keys of the object it is given.
 */
export const SQL = Object.freeze({
  walletBalance: `SELECT balance_cents FROM wallet WHERE id = 1`,

  walletDebit: `
    UPDATE wallet
    SET balance_cents = balance_cents - :amount, updated_at = :now
    WHERE id = 1 AND balance_cents >= :amount`,

  walletCredit: `
    UPDATE wallet
    SET balance_cents = balance_cents + :amount, updated_at = :now
    WHERE id = 1`,

  walletSet: `UPDATE wallet SET balance_cents = :amount, updated_at = :now WHERE id = 1`,

  roundInsert: `
    INSERT INTO rounds (mode_id, bet_cents, seed, seed_hash, lane, status, started_at)
    VALUES (:modeId, :betCents, :seed, :seedHash, :lane, :status, :startedAt)`,

  lastInsertId: `SELECT last_insert_rowid() AS id`,

  roundUpdate: `
    UPDATE rounds
    SET lane = :lane, status = :status, multiplier = :multiplier,
        payout_cents = :payoutCents, ended_at = :endedAt,
        crossed = :crossed, road_lanes = :roadLanes, feathers = :feathers
    WHERE id = :id`,

  roundActive: `
    SELECT id, mode_id, bet_cents, seed, seed_hash, lane, started_at
    FROM rounds WHERE status = 'active'
    LIMIT 1`,

  roundHistory: `
    SELECT id, mode_id, status, multiplier, bet_cents, payout_cents, lane, seed, seed_hash
    FROM rounds WHERE status <> 'active'
    ORDER BY id DESC
    LIMIT :limit`,

  roundStats: `
    SELECT
      COUNT(*)                                                 AS played,
      COALESCE(SUM(status = 'won'), 0)                         AS won,
      COALESCE(SUM(bet_cents), 0)                              AS wagered_cents,
      COALESCE(SUM(payout_cents), 0)                           AS returned_cents,
      MAX(CASE WHEN status = 'won' THEN multiplier END)        AS best_multiplier
    FROM rounds WHERE status <> 'active'`,

  roundStatsByMode: `
    SELECT mode_id, COUNT(*) AS played, COALESCE(SUM(status = 'won'), 0) AS won
    FROM rounds WHERE status <> 'active'
    GROUP BY mode_id`,

  roundClearFinished: `DELETE FROM rounds WHERE status <> 'active'`,

  progressStats: `
    SELECT
      COALESCE(SUM(crossed), 0)                                              AS lanes_crossed,
      COALESCE(SUM(status = 'won'), 0)                                       AS won,
      COALESCE(MAX(crossed), 0)                                              AS best_lanes,
      COUNT(DISTINCT CASE WHEN status = 'won' THEN mode_id END)              AS modes_won,
      COALESCE(SUM(status = 'won' AND mode_id = 'hardcore'), 0)              AS hardcore_wins,
      COALESCE(MAX(CASE WHEN status = 'won' THEN multiplier END), 0)         AS best_multiplier,
      COALESCE(SUM(status = 'won' AND road_lanes > 0 AND crossed = road_lanes), 0) AS finished
    FROM rounds WHERE status <> 'active'`,

  profileGet: `SELECT xp, feathers FROM profile WHERE id = 1`,

  profileEarn: `UPDATE profile SET xp = xp + :amount, feathers = feathers + :amount WHERE id = 1`,

  profileSpend: `UPDATE profile SET feathers = feathers - :amount WHERE id = 1 AND feathers >= :amount`,

  upgradesOwned: `SELECT id FROM upgrades ORDER BY bought_at, id`,

  upgradeInsert: `INSERT INTO upgrades (id, bought_at) VALUES (:id, :now)`,

  equippedAll: `SELECT slot, upgrade_id FROM equipped`,

  equip: `
    INSERT INTO equipped (slot, upgrade_id) VALUES (:slot, :upgradeId)
    ON CONFLICT (slot) DO UPDATE SET upgrade_id = excluded.upgrade_id`,

  unequip: `DELETE FROM equipped WHERE slot = :slot`,

  achievementsUnlocked: `SELECT id, unlocked_at FROM achievements ORDER BY unlocked_at, id`,

  achievementInsert: `INSERT INTO achievements (id, unlocked_at) VALUES (:id, :now)`,

  settingGet: `SELECT value FROM settings WHERE key = :key`,

  settingSet: `
    INSERT INTO settings (key, value) VALUES (:key, :value)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
})
