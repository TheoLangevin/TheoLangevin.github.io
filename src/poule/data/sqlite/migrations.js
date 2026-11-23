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
])

export const LATEST_VERSION = MIGRATIONS.at(-1).version
