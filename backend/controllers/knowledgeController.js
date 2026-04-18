// //E:\pro\midigenerator_v2\backend\controllers\knowledgeController.js

// 'use strict'

// const { getDb }  = require('../db/database')
// const ragService = require('../services/ragService')
// const path       = require('path')
// const fs         = require('fs')

// // ── Rebuild SQLite from localRag.json if empty (fixes redeploy data loss) ─────
// function rebuildFromLocalStore() {
//   const db    = getDb()
//   const count = db.prepare('SELECT COUNT(*) AS n FROM knowledge').get().n
//   if (count > 0) return

//   const storePath = path.join(__dirname, '../db/localRag.json')
//   if (!fs.existsSync(storePath)) return

//   let store
//   try { store = JSON.parse(fs.readFileSync(storePath, 'utf8')) }
//   catch { return }

//   const vectors = Object.values(store)
//   if (vectors.length === 0) return

//   console.log(`[knowledge] SQLite empty — rebuilding from localRag.json (${vectors.length} vectors)`)

//   const stmt = db.prepare(`
//     INSERT OR IGNORE INTO knowledge (source_file, chunk_id, chunk_type, summary, created_at)
//     VALUES (?, ?, ?, ?, datetime('now'))
//   `)
//   const insertMany = db.transaction((items) => {
//     for (const vec of items) {
//       stmt.run(
//         vec.metadata?.source || 'unknown',
//         vec.id,
//         vec.metadata?.type   || 'unknown',
//         (vec.metadata?.text  || '').slice(0, 300),
//       )
//     }
//   })
//   insertMany(vectors)
//   console.log(`[knowledge] Rebuilt ${vectors.length} rows`)
// }

// // ── GET /api/knowledge ────────────────────────────────────────────────────────
// function list(req, res, next) {
//   try {
//     rebuildFromLocalStore()
//     const db   = getDb()
//     const rows = db.prepare(`
//       SELECT MIN(id) AS id, source_file AS name, chunk_type,
//              COUNT(*) AS chunks, MIN(created_at) AS created_at
//       FROM knowledge
//       GROUP BY source_file
//       ORDER BY MIN(created_at) DESC
//     `).all()

//     const items = rows.map(row => {
//       const ext  = row.name.split('.').pop().toLowerCase()
//       const type = ['mid','midi'].includes(ext) ? 'midi' : 'doc'
//       const meta = db.prepare(`
//         SELECT summary FROM knowledge WHERE source_file = ? AND chunk_type = 'metadata' LIMIT 1
//       `).get(row.name)
//       const key   = meta ? extractField(meta.summary, 'key')   : null
//       const tempo = meta ? extractField(meta.summary, 'tempo') : null
//       return {
//         id:   row.id,
//         name: row.name,
//         type, chunks: row.chunks,
//         key:   key   || null,
//         tempo: tempo ? parseInt(tempo) : null,
//         date:  formatRelative(row.created_at),
//       }
//     })
//     res.json(items)
//   } catch (err) { next(err) }
// }

// // ── DELETE /api/knowledge/all ─────────────────────────────────────────────────
// async function removeAll(req, res, next) {
//   try {
//     const db     = getDb()
//     const chunks = db.prepare('SELECT chunk_id FROM knowledge').all()
//     const ids    = chunks.map(c => c.chunk_id)
//     if (ids.length > 0) {
//       try { await ragService.deleteMany(ids) } catch (e) { console.warn('[knowledge] deleteAll RAG fail:', e.message) }
//     }
//     db.prepare('DELETE FROM knowledge').run()
//     res.json({ success: true, deleted: ids.length })
//   } catch (err) { next(err) }
// }

// // ── DELETE /api/knowledge/by-name/:name ───────────────────────────────────────
// // Primary delete — by source_file name. Reliable after SQLite rebuild.
// async function removeByName(req, res, next) {
//   try {
//     const name = decodeURIComponent(req.params.name)
//     const db   = getDb()

//     const chunks = db.prepare('SELECT chunk_id FROM knowledge WHERE source_file = ?').all(name)
//     if (chunks.length === 0) {
//       // Not in SQLite — still try to clean from localRag by source match
//       try { await ragService.deleteBySource(name) } catch {}
//       return res.json({ success: true, deleted: 0 })
//     }

//     const ids = chunks.map(c => c.chunk_id)
//     try { await ragService.deleteMany(ids) } catch (e) { console.warn('[knowledge] delete RAG fail:', e.message) }
//     db.prepare('DELETE FROM knowledge WHERE source_file = ?').run(name)
//     res.json({ success: true, deleted: ids.length, source: name })
//   } catch (err) { next(err) }
// }

// // ── DELETE /api/knowledge/:id ─────────────────────────────────────────────────
// // Legacy delete by row id (kept for backwards compat)
// async function remove(req, res, next) {
//   try {
//     const { id } = req.params
//     const db  = getDb()
//     const row = db.prepare('SELECT source_file FROM knowledge WHERE id = ?').get(id)
//     if (!row) return res.status(404).json({ error: 'Not found' })
//     return removeByName({ params: { name: encodeURIComponent(row.source_file) } }, res, next)
//   } catch (err) { next(err) }
// }

// // ── Helpers ───────────────────────────────────────────────────────────────────
// function extractField(text, field) {
//   if (!text) return null
//   const m = text.match(new RegExp(`${field}[:\\s]+([^.\\s,]+)`, 'i'))
//   return m ? m[1] : null
// }

// function formatRelative(iso) {
//   const diff = Date.now() - new Date(iso)
//   if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`
//   if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`
//   if (diff < 172_800_000) return 'Yesterday'
//   return new Date(iso).toLocaleDateString()
// }

// module.exports = { list, remove, removeByName, removeAll }











'use strict'
// backend/controllers/knowledgeController.js
// Added: syncPinecone() handler for POST /api/knowledge/sync-pinecone

const { getDb }  = require('../db/database')
const ragService = require('../services/ragService')
const path       = require('path')
const fs         = require('fs')

// ── Rebuild SQLite from localRag.json if empty (fixes redeploy data loss) ─────
function rebuildFromLocalStore() {
  const db    = getDb()
  const count = db.prepare('SELECT COUNT(*) AS n FROM knowledge').get().n
  if (count > 0) return

  const storePath = path.join(__dirname, '../db/localRag.json')
  if (!fs.existsSync(storePath)) return

  let store
  try { store = JSON.parse(fs.readFileSync(storePath, 'utf8')) }
  catch { return }

  const vectors = Object.values(store)
  if (vectors.length === 0) return

  console.log(`[knowledge] SQLite empty — rebuilding from localRag.json (${vectors.length} vectors)`)

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO knowledge (source_file, chunk_id, chunk_type, summary, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `)
  const insertMany = db.transaction((items) => {
    for (const vec of items) {
      stmt.run(
        vec.metadata?.source || 'unknown',
        vec.id,
        vec.metadata?.type   || 'unknown',
        (vec.metadata?.text  || '').slice(0, 300),
      )
    }
  })
  insertMany(vectors)
  console.log(`[knowledge] Rebuilt ${vectors.length} rows`)
}

// ── GET /api/knowledge ────────────────────────────────────────────────────────
function list(req, res, next) {
  try {
    rebuildFromLocalStore()
    const db   = getDb()
    const rows = db.prepare(`
      SELECT MIN(id) AS id, source_file AS name, chunk_type,
             COUNT(*) AS chunks, MIN(created_at) AS created_at
      FROM knowledge
      GROUP BY source_file
      ORDER BY MIN(created_at) DESC
    `).all()

    const items = rows.map(row => {
      const ext  = row.name.split('.').pop().toLowerCase()
      const type = ['mid','midi'].includes(ext) ? 'midi' : 'doc'
      const meta = db.prepare(`
        SELECT summary FROM knowledge WHERE source_file = ? AND chunk_type = 'metadata' LIMIT 1
      `).get(row.name)
      const key   = meta ? extractField(meta.summary, 'key')   : null
      const tempo = meta ? extractField(meta.summary, 'tempo') : null
      return {
        id:   row.id,
        name: row.name,
        type, chunks: row.chunks,
        key:   key   || null,
        tempo: tempo ? parseInt(tempo) : null,
        date:  formatRelative(row.created_at),
      }
    })
    res.json(items)
  } catch (err) { next(err) }
}

// ── POST /api/knowledge/sync-pinecone ────────────────────────────────────────
// Pushes all vectors from localRag.json to Pinecone.
// Run this once after deploying to Render to get Pinecone in sync.
// After that, Pinecone persists across Render restarts (unlike localRag.json).
async function syncPinecone(req, res, next) {
  try {
    const result = await ragService.syncToPinecone()
    res.json({ success: true, ...result })
  } catch (err) {
    // Don't call next(err) — give a readable message to the caller
    res.status(500).json({ success: false, error: err.message })
  }
}

// ── DELETE /api/knowledge/all ─────────────────────────────────────────────────
async function removeAll(req, res, next) {
  try {
    const db     = getDb()
    const chunks = db.prepare('SELECT chunk_id FROM knowledge').all()
    const ids    = chunks.map(c => c.chunk_id)
    if (ids.length > 0) {
      try { await ragService.deleteMany(ids) } catch (e) { console.warn('[knowledge] deleteAll RAG fail:', e.message) }
    }
    db.prepare('DELETE FROM knowledge').run()
    res.json({ success: true, deleted: ids.length })
  } catch (err) { next(err) }
}

// ── DELETE /api/knowledge/by-name/:name ───────────────────────────────────────
async function removeByName(req, res, next) {
  try {
    const name = decodeURIComponent(req.params.name)
    const db   = getDb()

    const chunks = db.prepare('SELECT chunk_id FROM knowledge WHERE source_file = ?').all(name)
    if (chunks.length === 0) {
      try { await ragService.deleteBySource(name) } catch {}
      return res.json({ success: true, deleted: 0 })
    }

    const ids = chunks.map(c => c.chunk_id)
    try { await ragService.deleteMany(ids) } catch (e) { console.warn('[knowledge] delete RAG fail:', e.message) }
    db.prepare('DELETE FROM knowledge WHERE source_file = ?').run(name)
    res.json({ success: true, deleted: ids.length, source: name })
  } catch (err) { next(err) }
}

// ── DELETE /api/knowledge/:id ─────────────────────────────────────────────────
async function remove(req, res, next) {
  try {
    const { id } = req.params
    const db  = getDb()
    const row = db.prepare('SELECT source_file FROM knowledge WHERE id = ?').get(id)
    if (!row) return res.status(404).json({ error: 'Not found' })
    return removeByName({ params: { name: encodeURIComponent(row.source_file) } }, res, next)
  } catch (err) { next(err) }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractField(text, field) {
  if (!text) return null
  const m = text.match(new RegExp(`${field}[:\\s]+([^.\\s,]+)`, 'i'))
  return m ? m[1] : null
}

function formatRelative(iso) {
  const diff = Date.now() - new Date(iso)
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 172_800_000) return 'Yesterday'
  return new Date(iso).toLocaleDateString()
}

module.exports = { list, remove, removeByName, removeAll, syncPinecone }