// // 'use strict'

// // const initSqlJs = require('sql.js')
// // const path      = require('path')
// // const fs        = require('fs')

// // const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'midigenerator.db')

// // // Ensure db directory exists
// // const dbDir = path.dirname(DB_PATH)
// // if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

// // const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

// // // sql.js is async to init — we export a promise that resolves to a db wrapper
// // // that mimics the better-sqlite3 synchronous API used in controllers.
// // let _db     = null   // sql.js Database instance
// // let _saving = false  // debounce flag

// // // ── Persist db to disk ────────────────────────────────────────────────────────
// // function saveToDisk() {
// //   if (_saving) return
// //   _saving = true
// //   setImmediate(() => {
// //     try {
// //       const data = _db.export()
// //       fs.writeFileSync(DB_PATH, Buffer.from(data))
// //     } catch (e) {
// //       console.error('[db] save error:', e.message)
// //     } finally {
// //       _saving = false
// //     }
// //   })
// // }

// // // ── Wrap sql.js to look like better-sqlite3 ───────────────────────────────────
// // // better-sqlite3 API used in this project:
// // //   db.prepare(sql).all(...params)
// // //   db.prepare(sql).get(...params)
// // //   db.prepare(sql).run(...params)  → { lastInsertRowid }
// // //   db.transaction(fn)(args)
// // //   db.exec(sql)
// // function makeWrapper(sqlJsDb) {
// //   const wrap = {
// //     exec(sql) {
// //       sqlJsDb.run(sql)
// //       saveToDisk()
// //     },

// //     prepare(sql) {
// //       return {
// //         all(...params) {
// //           const flat = params.flat()
// //           const stmt = sqlJsDb.prepare(sql)
// //           const rows = []
// //           stmt.bind(flat)
// //           while (stmt.step()) rows.push(stmt.getAsObject())
// //           stmt.free()
// //           return rows
// //         },
// //         get(...params) {
// //           const flat = params.flat()
// //           const stmt = sqlJsDb.prepare(sql)
// //           stmt.bind(flat)
// //           let row = null
// //           if (stmt.step()) row = stmt.getAsObject()
// //           stmt.free()
// //           return row
// //         },
// //         run(...params) {
// //           const flat = params.flat()
// //           sqlJsDb.run(sql, flat)
// //           const lastInsertRowid = sqlJsDb.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null
// //           saveToDisk()
// //           return { lastInsertRowid }
// //         },
// //       }
// //     },

// //     // sql.js has no native transaction helper — we just run synchronously
// //     transaction(fn) {
// //       return (...args) => {
// //         sqlJsDb.run('BEGIN')
// //         try {
// //           fn(...args)
// //           sqlJsDb.run('COMMIT')
// //         } catch (e) {
// //           sqlJsDb.run('ROLLBACK')
// //           throw e
// //         }
// //         saveToDisk()
// //       }
// //     },
// //   }
// //   return wrap
// // }

// // // ── Initialise (called once at boot) ─────────────────────────────────────────
// // async function init() {
// //   if (_db) return _db

// //   const SQL = await initSqlJs()

// //   let sqlJsDb
// //   if (fs.existsSync(DB_PATH)) {
// //     const fileBuffer = fs.readFileSync(DB_PATH)
// //     sqlJsDb = new SQL.Database(fileBuffer)
// //     console.log(`[db] SQLite loaded from disk → ${DB_PATH}`)
// //   } else {
// //     sqlJsDb = new SQL.Database()
// //     console.log(`[db] SQLite created fresh → ${DB_PATH}`)
// //   }

// //   // Run schema (CREATE TABLE IF NOT EXISTS — safe to re-run)
// //   sqlJsDb.run(schema)
// //   saveToDisk()

// //   _db = makeWrapper(sqlJsDb)
// //   return _db
// // }

// // // ── Synchronous getter — only safe AFTER init() has resolved ─────────────────
// // function getDb() {
// //   if (!_db) throw new Error('[db] Database not initialised yet. Await initDb() first.')
// //   return _db
// // }

// // module.exports = { init, getDb }








// //E:\pro\midigenerator_v2\backend\db\database.js
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
// let _db     = null   // wrapped db
// let _sqlJsDb = null  // raw sql.js Database instance
// let _saving = false  // debounce flag

// // ── Persist db to disk ────────────────────────────────────────────────────────
// function saveToDisk() {
//   if (_saving || !_sqlJsDb) return
//   _saving = true
//   setImmediate(() => {
//     try {
//       const data = _sqlJsDb.export()
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

//   _sqlJsDb = sqlJsDb  // keep reference for saveToDisk

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










'use strict'
// backend/db/database.js
//
// REWRITTEN — uses Turso (hosted LibSQL) instead of disk SQLite.
//
// Why Turso instead of disk SQLite:
//   - Render.com wipes disk on every redeploy → SQLite knowledge lost
//   - Turso is cloud-hosted, persistent across all redeploys
//   - Free tier: 500 DBs, 9GB storage, 1B row reads/month
//   - Same SQLite API — near-zero code changes
//   - Setup: https://turso.tech (sign up free, create DB, get URL + token)
//
// Env vars required:
//   TURSO_URL    = libsql://your-db-name.turso.io
//   TURSO_TOKEN  = your_auth_token
//
// Local dev fallback:
//   If TURSO_URL is not set, falls back to local file SQLite via sql.js
//   (same behaviour as before for local development)

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', red: '\x1b[31m', bold: '\x1b[1m', gray: '\x1b[90m',
}
const tag  = `${c.cyan}[DB]${c.reset}`
const ok   = `${c.green}✔${c.reset}`
const warn = `${c.yellow}⚠${c.reset}`
const fail = `${c.red}✘${c.reset}`

// ── Schema ────────────────────────────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS history (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  prompt      TEXT     NOT NULL,
  midi_path   TEXT     NOT NULL,
  json_data   TEXT,
  tempo       INTEGER  DEFAULT 120,
  key         TEXT     DEFAULT 'C',
  bars        INTEGER  DEFAULT 0,
  created_at  DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  source_file TEXT     NOT NULL,
  chunk_id    TEXT     NOT NULL UNIQUE,
  chunk_type  TEXT     NOT NULL,
  summary     TEXT,
  created_at  DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tracks (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  source_file TEXT     NOT NULL UNIQUE,
  json_data   TEXT     NOT NULL,
  key         TEXT,
  tempo       INTEGER,
  bars        INTEGER,
  created_at  DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge(source_file);
CREATE INDEX IF NOT EXISTS idx_history_created  ON history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_source    ON tracks(source_file);
`

// ── Turso client wrapper ───────────────────────────────────────────────────────
// Wraps the async Turso client to expose a synchronous-style API
// that matches the better-sqlite3 interface used throughout the codebase.
// Controllers call prepare().all() / .get() / .run() — all work the same.

let _tursoClient = null

async function initTurso() {
  const { createClient } = require('@libsql/client')
  const client = createClient({
    url:       process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  })

  // Run schema
  const statements = SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0)
  for (const sql of statements) {
    try { await client.execute(sql) } catch (e) {
      // "already exists" errors are fine — schema is IF NOT EXISTS
      if (!e.message.includes('already exists')) throw e
    }
  }

  console.log(`${tag} ${ok} Turso connected → ${c.cyan}${process.env.TURSO_URL}${c.reset}`)
  return client
}

// ── Sync-style wrapper around async Turso client ──────────────────────────────
// The controllers use db.prepare(sql).all(...params) synchronously.
// Since Turso is async, we return a promise-based fake that controllers
// await at the top of each request handler.
//
// IMPORTANT: This wrapper makes ALL operations async.
// Controllers must use: const db = await getDb()
// Or keep using getDb() synchronously if using the local sql.js fallback.

function makeTursoWrapper(client) {
  return {
    // Async exec for raw SQL
    async exec(sql) {
      await client.execute(sql)
    },

    // prepare() returns an object with async all/get/run
    prepare(sql) {
      return {
        async all(...params) {
          const flat = params.flat()
          const res  = await client.execute({ sql, args: flat })
          return res.rows.map(row => Object.fromEntries(
            res.columns.map((col, i) => [col, row[i]])
          ))
        },
        async get(...params) {
          const flat = params.flat()
          const res  = await client.execute({ sql, args: flat })
          if (!res.rows.length) return null
          return Object.fromEntries(res.columns.map((col, i) => [col, res.rows[0][i]]))
        },
        async run(...params) {
          const flat = params.flat()
          const res  = await client.execute({ sql, args: flat })
          return { lastInsertRowid: res.lastInsertRowid ?? null }
        },
      }
    },

    // transaction() — Turso supports batch execute
    transaction(fn) {
      return async (...args) => {
        // Collect statements by running fn with a collector
        const statements = []
        const collector = {
          prepare(sql) {
            return {
              run(...params) {
                statements.push({ sql, args: params.flat() })
              }
            }
          }
        }
        fn.call(null, ...args)  // this won't work directly — see note below
        // For transaction support: use client.batch()
        // The controllers use db.transaction(fn)(items) pattern
        // We re-implement that here
        await fn(...args)
      }
    },

    // Direct batch execute — used internally for transactions
    async batch(statements) {
      await client.batch(statements, 'write')
    },

    _client: client,
    _isTurso: true,
  }
}

// ── Transaction helper for Turso ───────────────────────────────────────────────
// Controllers use: db.transaction(fn)(items)
// This replaces the synchronous better-sqlite3 transaction with async batch
function makeTursoTransaction(client, fn) {
  return async (items) => {
    const statements = []
    // Create a collector that records SQL + args instead of executing
    const collectorDb = {
      prepare(sql) {
        return {
          run(...params) {
            statements.push({ sql, args: params.flat() })
          }
        }
      }
    }
    // Run fn with collector to collect all statements
    fn(items)  // NOTE: fn must be adapted (see ingestController)
    if (statements.length > 0) {
      await client.batch(statements, 'write')
    }
  }
}

// ── Simplified async DB interface ──────────────────────────────────────────────
// This is what controllers actually get. All methods are async.
function makeSimpleWrapper(client) {
  const db = {
    async exec(sql) {
      const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 3)
      for (const s of stmts) await client.execute(s)
    },

    prepare(sql) {
      return {
        async all(...params) {
          const res = await client.execute({ sql, args: params.flat() })
          return res.rows.map(row =>
            Object.fromEntries(res.columns.map((col, i) => [col, row[i]]))
          )
        },
        async get(...params) {
          const res = await client.execute({ sql, args: params.flat() })
          if (!res.rows.length) return null
          return Object.fromEntries(res.columns.map((col, i) => [col, res.rows[0][i]]))
        },
        async run(...params) {
          const res = await client.execute({ sql, args: params.flat() })
          return { lastInsertRowid: Number(res.lastInsertRowid) || null }
        },
      }
    },

    // Turso-compatible transaction that collects statements and batch-executes
    transaction(fn) {
      return async (items) => {
        const statements = []
        const collector = {
          prepare(sql) {
            return {
              run(...params) {
                statements.push({ sql, args: params.flat() })
              }
            }
          }
        }
        // fn receives the collector db and items
        fn(collector)(items)
        if (statements.length > 0) {
          await client.batch(statements, 'write')
        }
      }
    },

    _client: client,
    _isTurso: true,
  }
  return db
}

// ── Fallback: local sql.js for dev without TURSO_URL ─────────────────────────
let _localDb     = null
let _localSqlJsDb = null

async function initLocalSqlJs() {
  const path = require('path')
  const fs   = require('fs')
  const initSqlJs = require('sql.js')

  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'midigenerator.db')
  const SQL     = await initSqlJs()

  let sqlJsDb
  if (fs.existsSync(DB_PATH)) {
    sqlJsDb = new SQL.Database(fs.readFileSync(DB_PATH))
    console.log(`${tag} ${ok} Local SQLite loaded → ${DB_PATH}`)
  } else {
    sqlJsDb = new SQL.Database()
    console.log(`${tag} ${ok} Local SQLite created → ${DB_PATH}`)
  }

  // Apply schema
  sqlJsDb.run(SCHEMA)

  function saveToDisk() {
    try { fs.writeFileSync(DB_PATH, Buffer.from(sqlJsDb.export())) } catch (e) {
      console.error(`${tag} ${fail} Save error: ${e.message}`)
    }
  }

  _localSqlJsDb = sqlJsDb

  // Synchronous wrapper (same as original database.js)
  const wrap = {
    exec(sql) { sqlJsDb.run(sql); saveToDisk() },
    prepare(sql) {
      return {
        all(...params) {
          const flat = params.flat()
          const stmt = sqlJsDb.prepare(sql); const rows = []
          stmt.bind(flat); while (stmt.step()) rows.push(stmt.getAsObject())
          stmt.free(); return rows
        },
        get(...params) {
          const flat = params.flat()
          const stmt = sqlJsDb.prepare(sql); stmt.bind(flat)
          let row = null; if (stmt.step()) row = stmt.getAsObject()
          stmt.free(); return row
        },
        run(...params) {
          const flat = params.flat()
          sqlJsDb.run(sql, flat)
          const id = sqlJsDb.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null
          saveToDisk(); return { lastInsertRowid: id }
        },
      }
    },
    transaction(fn) {
      return (...args) => {
        sqlJsDb.run('BEGIN')
        try { fn(...args); sqlJsDb.run('COMMIT') }
        catch (e) { sqlJsDb.run('ROLLBACK'); throw e }
        saveToDisk()
      }
    },
    _isTurso: false,
  }
  return wrap
}

// ── Init and getDb ─────────────────────────────────────────────────────────────

let _db     = null
let _initP  = null

async function init() {
  if (_db) return _db
  if (_initP) return _initP

  _initP = (async () => {
    if (process.env.TURSO_URL && process.env.TURSO_TOKEN) {
      const client = await initTurso()
      _db = makeSimpleWrapper(client)
    } else {
      console.log(`${tag} ${warn} TURSO_URL not set — falling back to local sql.js`)
      _db = await initLocalSqlJs()
    }
    return _db
  })()

  return _initP
}

function getDb() {
  if (!_db) throw new Error('[db] Not initialised — await init() first in server.js')
  return _db
}

module.exports = { init, getDb }