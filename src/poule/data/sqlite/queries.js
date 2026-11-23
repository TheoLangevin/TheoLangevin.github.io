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
        payout_cents = :payoutCents, ended_at = :endedAt
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

  settingGet: `SELECT value FROM settings WHERE key = :key`,

  settingSet: `
    INSERT INTO settings (key, value) VALUES (:key, :value)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
})
