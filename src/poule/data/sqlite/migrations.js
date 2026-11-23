/**
 * Schema of the SQLite database, one migration per version. The applied
 * version is kept in `PRAGMA user_version`. Never edit a migration that has
 * shipped: add the next one.
 */
export const MIGRATIONS = Object.freeze([
  {
    version: 1,
    name: 'wallet, rounds and settings',
    up: `
      CREATE TABLE wallet (
        id            INTEGER PRIMARY KEY CHECK (id = 1),
        balance_cents INTEGER NOT NULL CHECK (balance_cents >= 0),
        updated_at    TEXT    NOT NULL
      );

      INSERT INTO wallet (id, balance_cents, updated_at)
      VALUES (1, 100000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

      CREATE TABLE rounds (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        mode_id       TEXT    NOT NULL,
        bet_cents     INTEGER NOT NULL CHECK (bet_cents > 0),
        seed          TEXT    NOT NULL,
        seed_hash     TEXT    NOT NULL,
        lane          INTEGER NOT NULL DEFAULT 0 CHECK (lane >= 0),
        status        TEXT    NOT NULL CHECK (status IN ('active', 'won', 'lost')),
        multiplier    REAL,
        payout_cents  INTEGER NOT NULL DEFAULT 0 CHECK (payout_cents >= 0),
        started_at    TEXT    NOT NULL,
        ended_at      TEXT
      );

      CREATE INDEX rounds_by_status ON rounds (status, id);

      -- At most one round in progress at a time.
      CREATE UNIQUE INDEX one_active_round ON rounds (status) WHERE status = 'active';

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: 'progression: feathers, levels, upgrades, achievements',
    up: `
      ALTER TABLE rounds ADD COLUMN crossed    INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE rounds ADD COLUMN road_lanes INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE rounds ADD COLUMN feathers   INTEGER NOT NULL DEFAULT 0;

      -- Rounds played before this version: fill in the new columns with the
      -- values the game had then (lanes and feathers per lane by mode).
      UPDATE rounds
      SET crossed = CASE WHEN status = 'lost' THEN lane - 1 ELSE lane END,
          road_lanes = CASE mode_id WHEN 'easy' THEN 24 WHEN 'medium' THEN 22 WHEN 'hard' THEN 20 ELSE 15 END
      WHERE status <> 'active';

      UPDATE rounds
      SET feathers = crossed * CASE mode_id WHEN 'easy' THEN 2 WHEN 'medium' THEN 3 WHEN 'hard' THEN 5 ELSE 8 END
      WHERE status <> 'active';

      CREATE TABLE profile (
        id       INTEGER PRIMARY KEY CHECK (id = 1),
        xp       INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
        feathers INTEGER NOT NULL DEFAULT 0 CHECK (feathers >= 0)
      );

      -- Players keep the feathers their past rounds would have earned.
      INSERT INTO profile (id, xp, feathers)
      SELECT 1, COALESCE(SUM(feathers), 0), COALESCE(SUM(feathers), 0) FROM rounds;

      CREATE TABLE upgrades (
        id        TEXT PRIMARY KEY,
        bought_at TEXT NOT NULL
      );

      -- What the hen wears: one upgrade per slot.
      CREATE TABLE equipped (
        slot       TEXT PRIMARY KEY,
        upgrade_id TEXT NOT NULL REFERENCES upgrades (id) ON DELETE CASCADE
      );

      CREATE TABLE achievements (
        id          TEXT PRIMARY KEY,
        unlocked_at TEXT NOT NULL
      );
    `,
  },
])

export const LATEST_VERSION = MIGRATIONS.at(-1).version
