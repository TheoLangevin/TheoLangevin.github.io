/**
 * Keeps the SQLite file (a Uint8Array) in IndexedDB, which has room for it,
 * unlike localStorage. Every function resolves to null/false instead of
 * throwing when storage is unavailable (private mode, blocked site data...).
 */

const DB_NAME = 'poule-traverse'
const STORE = 'files'
const KEY = 'game.sqlite'

function open() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('IndexedDB is not available'))
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore(mode, work) {
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode)
      const request = work(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function loadFile() {
  try {
    const value = await withStore('readonly', (store) => store.get(KEY))
    return value instanceof Uint8Array ? value : value ? new Uint8Array(value) : null
  } catch {
    return null
  }
}

export async function saveFile(bytes) {
  try {
    await withStore('readwrite', (store) => store.put(bytes, KEY))
    return true
  } catch {
    return false
  }
}

export async function deleteFile() {
  try {
    await withStore('readwrite', (store) => store.delete(KEY))
    return true
  } catch {
    return false
  }
}
