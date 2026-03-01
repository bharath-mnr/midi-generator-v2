// 'use strict'

// const initSqlJs = require('sql.js')
// const path      = require('path')
// const fs        = require('fs')

// const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'midigenerator.db')

// // Ensure db directory exists
// const dbDir = path.dirname(DB_PATH)
// if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

// const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

// // sql.js is async to init — we export a promise that resolves to a db wrapper
// // that mimics the better-sqlite3 synchronous API used in controllers.
// let _db     = null   // sql.js Database instance
// let _saving = false  // debounce flag

// // ── Persist db to disk ────────────────────────────────────────────────────────
// function saveToDisk() {
//   if (_saving) return
//   _saving = true
//   setImmediate(() => {
//     try {
//       const data = _db.export()
//       fs.writeFileSync(DB_PATH, Buffer.from(data))
//     } catch (e) {
//       console.error('[db] save error:', e.message)
//     } finally {
//       _saving = false
//     }
//   })
// }

// // ── Wrap sql.js to look like better-sqlite3 ───────────────────────────────────
// // better-sqlite3 API used in this project:
// //   db.prepare(sql).all(...params)
// //   db.prepare(sql).get(...params)
// //   db.prepare(sql).run(...params)  → { lastInsertRowid }
// //   db.transaction(fn)(args)
// //   db.exec(sql)
// function makeWrapper(sqlJsDb) {
//   const wrap = {
//     exec(sql) {
//       sqlJsDb.run(sql)
//       saveToDisk()
//     },

//     prepare(sql) {
//       return {
//         all(...params) {
//           const flat = params.flat()
//           const stmt = sqlJsDb.prepare(sql)
//           const rows = []
//           stmt.bind(flat)
//           while (stmt.step()) rows.push(stmt.getAsObject())
//           stmt.free()
//           return rows
//         },
//         get(...params) {
//           const flat = params.flat()
//           const stmt = sqlJsDb.prepare(sql)
//           stmt.bind(flat)
//           let row = null
//           if (stmt.step()) row = stmt.getAsObject()
//           stmt.free()
//           return row
//         },
//         run(...params) {
//           const flat = params.flat()
//           sqlJsDb.run(sql, flat)
//           const lastInsertRowid = sqlJsDb.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null
//           saveToDisk()
//           return { lastInsertRowid }
//         },
//       }
//     },

//     // sql.js has no native transaction helper — we just run synchronously
//     transaction(fn) {
//       return (...args) => {
//         sqlJsDb.run('BEGIN')
//         try {
//           fn(...args)
//           sqlJsDb.run('COMMIT')
//         } catch (e) {
//           sqlJsDb.run('ROLLBACK')
//           throw e
//         }
//         saveToDisk()
//       }
//     },
//   }
//   return wrap
// }

// // ── Initialise (called once at boot) ─────────────────────────────────────────
// async function init() {
//   if (_db) return _db

//   const SQL = await initSqlJs()

//   let sqlJsDb
//   if (fs.existsSync(DB_PATH)) {
//     const fileBuffer = fs.readFileSync(DB_PATH)
//     sqlJsDb = new SQL.Database(fileBuffer)
//     console.log(`[db] SQLite loaded from disk → ${DB_PATH}`)
//   } else {
//     sqlJsDb = new SQL.Database()
//     console.log(`[db] SQLite created fresh → ${DB_PATH}`)
//   }

//   // Run schema (CREATE TABLE IF NOT EXISTS — safe to re-run)
//   sqlJsDb.run(schema)
//   saveToDisk()

//   _db = makeWrapper(sqlJsDb)
//   return _db
// }

// // ── Synchronous getter — only safe AFTER init() has resolved ─────────────────
// function getDb() {
//   if (!_db) throw new Error('[db] Database not initialised yet. Await initDb() first.')
//   return _db
// }

// module.exports = { init, getDb }








//E:\pro\midigenerator_v2\backend\db\database.js
'use strict'

const initSqlJs = require('sql.js')
const path      = require('path')
const fs        = require('fs')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'midigenerator.db')

// Ensure db directory exists
const dbDir = path.dirname(DB_PATH)
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

// sql.js is async to init — we export a promise that resolves to a db wrapper
// that mimics the better-sqlite3 synchronous API used in controllers.
let _db     = null   // wrapped db
let _sqlJsDb = null  // raw sql.js Database instance
let _saving = false  // debounce flag

// ── Persist db to disk ────────────────────────────────────────────────────────
function saveToDisk() {
  if (_saving || !_sqlJsDb) return
  _saving = true
  setImmediate(() => {
    try {
      const data = _sqlJsDb.export()
      fs.writeFileSync(DB_PATH, Buffer.from(data))
    } catch (e) {
      console.error('[db] save error:', e.message)
    } finally {
      _saving = false
    }
  })
}

// ── Wrap sql.js to look like better-sqlite3 ───────────────────────────────────
// better-sqlite3 API used in this project:
//   db.prepare(sql).all(...params)
//   db.prepare(sql).get(...params)
//   db.prepare(sql).run(...params)  → { lastInsertRowid }
//   db.transaction(fn)(args)
//   db.exec(sql)
function makeWrapper(sqlJsDb) {
  const wrap = {
    exec(sql) {
      sqlJsDb.run(sql)
      saveToDisk()
    },

    prepare(sql) {
      return {
        all(...params) {
          const flat = params.flat()
          const stmt = sqlJsDb.prepare(sql)
          const rows = []
          stmt.bind(flat)
          while (stmt.step()) rows.push(stmt.getAsObject())
          stmt.free()
          return rows
        },
        get(...params) {
          const flat = params.flat()
          const stmt = sqlJsDb.prepare(sql)
          stmt.bind(flat)
          let row = null
          if (stmt.step()) row = stmt.getAsObject()
          stmt.free()
          return row
        },
        run(...params) {
          const flat = params.flat()
          sqlJsDb.run(sql, flat)
          const lastInsertRowid = sqlJsDb.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null
          saveToDisk()
          return { lastInsertRowid }
        },
      }
    },

    // sql.js has no native transaction helper — we just run synchronously
    transaction(fn) {
      return (...args) => {
        sqlJsDb.run('BEGIN')
        try {
          fn(...args)
          sqlJsDb.run('COMMIT')
        } catch (e) {
          sqlJsDb.run('ROLLBACK')
          throw e
        }
        saveToDisk()
      }
    },
  }
  return wrap
}

// ── Initialise (called once at boot) ─────────────────────────────────────────
async function init() {
  if (_db) return _db

  const SQL = await initSqlJs()

  let sqlJsDb
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    sqlJsDb = new SQL.Database(fileBuffer)
    console.log(`[db] SQLite loaded from disk → ${DB_PATH}`)
  } else {
    sqlJsDb = new SQL.Database()
    console.log(`[db] SQLite created fresh → ${DB_PATH}`)
  }

  _sqlJsDb = sqlJsDb  // keep reference for saveToDisk

  // Run schema (CREATE TABLE IF NOT EXISTS — safe to re-run)
  sqlJsDb.run(schema)
  saveToDisk()

  _db = makeWrapper(sqlJsDb)
  return _db
}

// ── Synchronous getter — only safe AFTER init() has resolved ─────────────────
function getDb() {
  if (!_db) throw new Error('[db] Database not initialised yet. Await initDb() first.')
  return _db
}

module.exports = { init, getDb }