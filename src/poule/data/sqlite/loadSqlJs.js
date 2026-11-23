/**
 * sql.js (SQLite compiled to WebAssembly) is loaded from cdnjs when the game
 * starts, pinned to one version. It is not an npm dependency so the site's
 * build and the other pages stay as they are; to bundle it instead, install
 * `sql.js` and import its `sql-wasm.js` here, the rest of the code is the same.
 */
export const SQL_JS_VERSION = '1.14.0'
const BASE = `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${SQL_JS_VERSION}/`
const TIMEOUT = 15000

let pending = null

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.crossOrigin = 'anonymous'
    script.onload = resolve
    script.onerror = () => reject(new Error(`Could not load ${src}`))
    document.head.appendChild(script)
  })
}

const timeout = (ms) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('SQLite took too long to load')), ms))

/** Resolves to the sql.js module (`SQL.Database`...). Loaded once. */
export function loadSqlJs() {
  pending ??= Promise.race([
    (async () => {
      if (!globalThis.initSqlJs) await injectScript(`${BASE}sql-wasm.js`)
      return globalThis.initSqlJs({ locateFile: (file) => `${BASE}${file}` })
    })(),
    timeout(TIMEOUT),
  ]).catch((error) => {
    pending = null
    throw error
  })
  return pending
}
