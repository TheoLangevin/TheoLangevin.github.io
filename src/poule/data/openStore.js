import { importLegacy } from './legacyImport.js'
import { createMemoryStore } from './memory/createMemoryStore.js'
import { createSaver } from './persistence/createSaver.js'
import { loadFile, saveFile } from './persistence/indexedDbFile.js'
import { createSqliteStore } from './sqlite/createSqliteStore.js'
import { loadSqlJs } from './sqlite/loadSqlJs.js'
import { migrate } from './sqlite/migrate.js'
import { SqlDatabase } from './sqlite/SqlDatabase.js'

/**
 * Opens the game's database: the SQLite file saved in this browser, migrated
 * to the latest schema. If SQLite cannot load (offline, blocked CDN), the game
 * still opens on an in-memory store and says it will not be saved.
 *
 * @returns {Promise<{ store: import('./store.js').Store, persistent: boolean, error?: Error, close: () => void }>}
 */
export async function openStore({ onSaveError } = {}) {
  try {
    const [SQL, bytes] = await Promise.all([loadSqlJs(), loadFile()])
    const raw = bytes ? new SQL.Database(bytes) : new SQL.Database()

    let saver = null
    const database = new SqlDatabase(raw, { onCommit: () => saver?.schedule() })
    saver = createSaver({ exportFile: () => database.export(), saveFile, onError: onSaveError })

    const { from } = migrate(database)
    const store = createSqliteStore(database)
    if (from === 0) importLegacy(store)
    await saver.flush()

    const stopListening = saver.listen()
    return {
      store,
      persistent: true,
      close() {
        stopListening()
        saver.flush()
      },
    }
  } catch (error) {
    console.warn('[poule] SQLite unavailable, playing without saving:', error)
    return { store: createMemoryStore(), persistent: false, error, close() {} }
  }
}
