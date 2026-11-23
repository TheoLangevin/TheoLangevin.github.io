/**
 * Thin wrapper over a sql.js `Database`: prepared statements with named
 * parameters, nested-safe transactions, and a callback after each committed
 * write so the file can be saved.
 */
export class SqlDatabase {
  #db
  #depth = 0
  #onCommit

  constructor(db, { onCommit = () => {} } = {}) {
    this.#db = db
    this.#onCommit = onCommit
  }

  static bind(params) {
    return Object.fromEntries(Object.entries(params).map(([key, value]) => [`:${key}`, value ?? null]))
  }

  /** Rows of a query, as plain objects. */
  all(sql, params = {}) {
    const statement = this.#db.prepare(sql)
    try {
      statement.bind(SqlDatabase.bind(params))
      const rows = []
      while (statement.step()) rows.push(statement.getAsObject())
      return rows
    } finally {
      statement.free()
    }
  }

  get(sql, params = {}) {
    return this.all(sql, params)[0] ?? null
  }

  /** Runs a statement and returns the number of rows it changed. */
  run(sql, params = {}) {
    this.#db.run(sql, SqlDatabase.bind(params))
    const changes = this.#db.getRowsModified()
    if (this.#depth === 0) this.#onCommit()
    return changes
  }

  /** Runs several statements with no parameters (migrations). */
  exec(sql) {
    this.#db.exec(sql)
  }

  /**
   * Runs `work` atomically. A transaction inside a transaction joins the
   * outer one. `work` must be synchronous: sql.js is.
   */
  transaction(work) {
    if (this.#depth > 0) return work()
    this.#db.exec('BEGIN IMMEDIATE')
    this.#depth++
    try {
      const result = work()
      this.#db.exec('COMMIT')
      return result
    } catch (error) {
      this.#db.exec('ROLLBACK')
      throw error
    } finally {
      this.#depth--
      if (this.#depth === 0) this.#onCommit()
    }
  }

  /** The whole database file, to save it. */
  export() {
    return this.#db.export()
  }
}
