import { MIGRATIONS } from './migrations.js'

/**
 * Brings the database up to the latest schema, one transaction per
 * migration. Returns the version it started from (0 = brand new file).
 */
export function migrate(database, migrations = MIGRATIONS) {
  const from = database.get('PRAGMA user_version')?.user_version ?? 0
  const latest = migrations.at(-1)?.version ?? 0
  if (from > latest) throw new Error(`Database version ${from} is newer than this game (${latest})`)

  for (const migration of migrations) {
    if (migration.version <= from) continue
    database.transaction(() => {
      database.exec(migration.up)
      database.exec(`PRAGMA user_version = ${Number(migration.version)}`)
    })
  }
  return { from, to: latest }
}
