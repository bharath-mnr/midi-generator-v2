// // // // //E:\pro\midigenerator_v2\backend\controllers\ingestController.js
// // // // 'use strict'

// // // // const fs   = require('fs')
// // // // const path = require('path')

// // // // const { uploadMidi, uploadDoc, multerPromise } = require('../middleware/upload')
// // // // const midiToJson      = require('../services/converters/midiToJson')
// // // // const chunkingService = require('../services/chunkingService')
// // // // const ragService      = require('../services/ragService')
// // // // const { getDb }       = require('../db/database')

// // // // // ─────────────────────────────────────────────────────────────────────────────
// // // // // POST /api/ingest/midi
// // // // // ─────────────────────────────────────────────────────────────────────────────
// // // // async function ingestMidi(req, res, next) {
// // // //   try {
// // // //     // 1. Receive file via multer
// // // //     await multerPromise(uploadMidi)(req, res)

// // // //     if (!req.file) {
// // // //       return res.status(400).json({ error: 'No MIDI file uploaded' })
// // // //     }

// // // //     const { path: filePath, originalname } = req.file

// // // //     // 2. Convert MIDI → generation JSON
// // // //     const fileBuffer = fs.readFileSync(filePath)
// // // //     const json = midiToJson.convert(fileBuffer)

// // // //     // 3. Chunk into RAG-friendly pieces
// // // //     const chunks = chunkingService.chunkMidi(json, originalname)

// // // //     // 4. Upsert chunks into Pinecone
// // // //     await ragService.upsert(chunks)

// // // //     // 5. Record each chunk in SQLite knowledge table
// // // //     const db = getDb()
// // // //     const insertStmt = db.prepare(`
// // // //       INSERT INTO knowledge (source_file, chunk_id, chunk_type, summary)
// // // //       VALUES (?, ?, ?, ?)
// // // //     `)
// // // //     const insertMany = db.transaction((items) => {
// // // //       for (const chunk of items) {
// // // //         insertStmt.run(originalname, chunk.id, chunk.metadata.type, chunk.text)
// // // //       }
// // // //     })
// // // //     insertMany(chunks)

// // // //     // 6. Lookup the inserted rows to get the first row's id as the item id
// // // //     const row = db.prepare('SELECT id FROM knowledge WHERE source_file = ? ORDER BY id ASC LIMIT 1')
// // // //                   .get(originalname)

// // // //     res.json({
// // // //       success: true,
// // // //       id:      row?.id,
// // // //       name:    originalname,
// // // //       type:    'midi',
// // // //       key:     json.key   || 'C',
// // // //       tempo:   json.tempo || 120,
// // // //       chunks:  chunks.length,
// // // //       date:    'Just now',
// // // //     })
// // // //   } catch (err) {
// // // //     next(err)
// // // //   }
// // // // }

// // // // // ─────────────────────────────────────────────────────────────────────────────
// // // // // POST /api/ingest/doc
// // // // // ─────────────────────────────────────────────────────────────────────────────
// // // // async function ingestDoc(req, res, next) {
// // // //   try {
// // // //     // 1. Receive file
// // // //     await multerPromise(uploadDoc)(req, res)

// // // //     if (!req.file) {
// // // //       return res.status(400).json({ error: 'No document uploaded' })
// // // //     }

// // // //     const { path: filePath, originalname, mimetype } = req.file

// // // //     // 2. Read text content
// // // //     const ext = path.extname(originalname).toLowerCase()
// // // //     let textContent = ''

// // // //     if (ext === '.pdf') {
// // // //       // Basic PDF extraction (service layer will handle advanced parsing)
// // // //       textContent = await extractPdfText(filePath)
// // // //     } else {
// // // //       textContent = fs.readFileSync(filePath, 'utf8')
// // // //     }

// // // //     // 3. Chunk document into RAG pieces
// // // //     const chunks = chunkingService.chunkDoc(textContent, originalname)

// // // //     // 4. Upsert to Pinecone
// // // //     await ragService.upsert(chunks)

// // // //     // 5. Record in SQLite
// // // //     const db = getDb()
// // // //     const insertStmt = db.prepare(`
// // // //       INSERT INTO knowledge (source_file, chunk_id, chunk_type, summary)
// // // //       VALUES (?, ?, ?, ?)
// // // //     `)
// // // //     const insertMany = db.transaction((items) => {
// // // //       for (const chunk of items) {
// // // //         insertStmt.run(originalname, chunk.id, chunk.metadata.type, chunk.text.slice(0, 300))
// // // //       }
// // // //     })
// // // //     insertMany(chunks)

// // // //     const row = db.prepare('SELECT id FROM knowledge WHERE source_file = ? ORDER BY id ASC LIMIT 1')
// // // //                   .get(originalname)

// // // //     // Clean up
// // // //     fs.unlink(filePath, () => {})

// // // //     res.json({
// // // //       success: true,
// // // //       id:      row?.id,
// // // //       name:    originalname,
// // // //       type:    'doc',
// // // //       chunks:  chunks.length,
// // // //       date:    'Just now',
// // // //     })
// // // //   } catch (err) {
// // // //     next(err)
// // // //   }
// // // // }

// // // // // ── Minimal PDF text extraction (no extra deps) ───────────────────────────────
// // // // async function extractPdfText(filePath) {
// // // //   // Returns raw text extracted from PDF bytes using basic stream parsing.
// // // //   // For production quality, swap in pdf-parse or pdfjs-dist.
// // // //   const buf = fs.readFileSync(filePath)
// // // //   const str = buf.toString('latin1')
// // // //   const textChunks = []
// // // //   const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
// // // //   let match
// // // //   while ((match = streamRegex.exec(str)) !== null) {
// // // //     // Extract readable ASCII characters from stream data
// // // //     const readable = match[1].replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
// // // //     if (readable.length > 20) textChunks.push(readable)
// // // //   }
// // // //   return textChunks.join('\n\n') || '[Could not extract PDF text]'
// // // // }

// // // // module.exports = { ingestMidi, ingestDoc }












// // // 'use strict'
// // // // backend/controllers/ingestController.js
// // // //
// // // // KEY CHANGES:
// // // //   1. Auto-detects MIDI JSON in .txt/.json files → routes to chunkMidi() (deep analysis)
// // // //   2. Stores EXACT untouched JSON in SQLite tracks table via ragService.storeExactJson()
// // // //      This enables "give exact gibran alcocer idea 10" queries to work perfectly
// // // //   3. Also stores full text summary of each chunk in SQLite knowledge table
// // // //      This enables getAll() to work without hitting Pinecone

// // // const fs   = require('fs')
// // // const path = require('path')

// // // const { uploadMidi, uploadDoc, multerPromise } = require('../middleware/upload')
// // // const midiToJson      = require('../services/converters/midiToJson')
// // // const chunkingService = require('../services/chunkingService')
// // // const ragService      = require('../services/ragService')
// // // const { getDb }       = require('../db/database')

// // // // ── Detect if a text string contains MIDI JSON ────────────────────────────────
// // // function detectMidiJson(text) {
// // //   try {
// // //     const trimmed = text.trim()
// // //     if (!trimmed.startsWith('{')) return null
// // //     const json = JSON.parse(trimmed)
// // //     // Must have bars array with at least one entry
// // //     if (!Array.isArray(json.bars) || json.bars.length === 0) return null
// // //     // Must have at least one musical metadata field
// // //     if (!json.tempo && !json.time_signature && !json.key) return null
// // //     return json
// // //   } catch {
// // //     return null
// // //   }
// // // }

// // // // ── POST /api/ingest/midi ─────────────────────────────────────────────────────
// // // // Accepts binary .mid / .midi files
// // // async function ingestMidi(req, res, next) {
// // //   try {
// // //     await multerPromise(uploadMidi)(req, res)
// // //     if (!req.file) return res.status(400).json({ error: 'No MIDI file uploaded' })

// // //     const { path: filePath, originalname } = req.file
// // //     const fileBuffer = fs.readFileSync(filePath)
// // //     const json = midiToJson.convert(fileBuffer)

// // //     // Store exact JSON in tracks table
// // //     ragService.storeExactJson(originalname, JSON.stringify(json), {
// // //       key:   json.key,
// // //       tempo: json.tempo,
// // //       bars:  json.bars?.length,
// // //     })

// // //     // Deep musical analysis → chunks
// // //     const chunks = chunkingService.chunkMidi(json, originalname)

// // //     // Store in Pinecone
// // //     await ragService.upsert(chunks)

// // //     // Store chunk summaries in SQLite knowledge table (for getAll())
// // //     const db = getDb()
// // //     const insertStmt = db.prepare(`
// // //       INSERT INTO knowledge (source_file, chunk_id, chunk_type, summary)
// // //       VALUES (?, ?, ?, ?)
// // //     `)
// // //     db.transaction((items) => {
// // //       for (const chunk of items) {
// // //         // Store full chunk text (not just 300 chars) so getAll() is useful
// // //         insertStmt.run(originalname, chunk.id, chunk.metadata.type, chunk.text)
// // //       }
// // //     })(chunks)

// // //     const row = db.prepare('SELECT id FROM knowledge WHERE source_file = ? ORDER BY id ASC LIMIT 1').get(originalname)
// // //     fs.unlink(filePath, () => {})

// // //     res.json({
// // //       success: true,
// // //       id:      row?.id,
// // //       name:    originalname,
// // //       type:    'midi',
// // //       key:     json.key   || 'C',
// // //       tempo:   json.tempo || 120,
// // //       chunks:  chunks.length,
// // //       date:    'Just now',
// // //     })
// // //   } catch (err) {
// // //     next(err)
// // //   }
// // // }

// // // // ── POST /api/ingest/doc ──────────────────────────────────────────────────────
// // // // Accepts .pdf / .txt / .md / .json
// // // // Auto-detects MIDI JSON inside text files → routes to chunkMidi()
// // // async function ingestDoc(req, res, next) {
// // //   try {
// // //     await multerPromise(uploadDoc)(req, res)
// // //     if (!req.file) return res.status(400).json({ error: 'No document uploaded' })

// // //     const { path: filePath, originalname } = req.file
// // //     const ext = path.extname(originalname).toLowerCase()

// // //     let chunks
// // //     let responseExtra = {}

// // //     if (ext === '.pdf') {
// // //       // Plain PDF text extraction
// // //       const textContent = await extractPdfText(filePath)
// // //       chunks = chunkingService.chunkDoc(textContent, originalname)

// // //     } else {
// // //       const textContent = fs.readFileSync(filePath, 'utf8')
// // //       const midiJson    = detectMidiJson(textContent)

// // //       if (midiJson) {
// // //         // ✅ MIDI JSON detected — use deep analysis
// // //         console.log(`[ingest] MIDI JSON detected in "${originalname}" → chunkMidi()`)

// // //         // Store EXACT original JSON in tracks table (untouched)
// // //         ragService.storeExactJson(originalname, textContent.trim(), {
// // //           key:   midiJson.key,
// // //           tempo: midiJson.tempo,
// // //           bars:  midiJson.bars?.length,
// // //         })

// // //         chunks = chunkingService.chunkMidi(midiJson, originalname)
// // //         responseExtra = {
// // //           type:  'midi',
// // //           key:   midiJson.key   || 'C',
// // //           tempo: midiJson.tempo || 120,
// // //         }
// // //       } else {
// // //         // Plain text / markdown
// // //         console.log(`[ingest] Plain text detected in "${originalname}" → chunkDoc()`)
// // //         chunks = chunkingService.chunkDoc(textContent, originalname)
// // //       }
// // //     }

// // //     // Store in Pinecone
// // //     await ragService.upsert(chunks)

// // //     // Store full chunk text in SQLite knowledge table (enables getAll())
// // //     const db = getDb()
// // //     const insertStmt = db.prepare(`
// // //       INSERT INTO knowledge (source_file, chunk_id, chunk_type, summary)
// // //       VALUES (?, ?, ?, ?)
// // //     `)
// // //     db.transaction((items) => {
// // //       for (const chunk of items) {
// // //         // Store full chunk text (not truncated) so getAll() returns complete context
// // //         insertStmt.run(originalname, chunk.id, chunk.metadata.type, chunk.text)
// // //       }
// // //     })(chunks)

// // //     const row = db.prepare('SELECT id FROM knowledge WHERE source_file = ? ORDER BY id ASC LIMIT 1').get(originalname)
// // //     fs.unlink(filePath, () => {})

// // //     res.json({
// // //       success: true,
// // //       id:      row?.id,
// // //       name:    originalname,
// // //       type:    responseExtra.type || 'doc',
// // //       chunks:  chunks.length,
// // //       date:    'Just now',
// // //       ...responseExtra,
// // //     })
// // //   } catch (err) {
// // //     next(err)
// // //   }
// // // }

// // // // ── Minimal PDF text extraction ────────────────────────────────────────────────
// // // async function extractPdfText(filePath) {
// // //   const buf = fs.readFileSync(filePath)
// // //   const str = buf.toString('latin1')
// // //   const textChunks = []
// // //   const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
// // //   let match
// // //   while ((match = streamRegex.exec(str)) !== null) {
// // //     const readable = match[1].replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
// // //     if (readable.length > 20) textChunks.push(readable)
// // //   }
// // //   return textChunks.join('\n\n') || '[Could not extract PDF text]'
// // // }

// // // module.exports = { ingestMidi, ingestDoc }










// // 'use strict'
// // // backend/controllers/ingestController.js
// // // Uses knowledgeService (Turso) instead of ragService (Pinecone)

// // const fs   = require('fs')
// // const path = require('path')

// // const { uploadMidi, uploadDoc, multerPromise } = require('../middleware/upload')
// // const midiToJson         = require('../services/converters/midiToJson')
// // const chunkingService    = require('../services/chunkingService')
// // const knowledgeService   = require('../services/knowledgeService')
// // const { getDb }          = require('../db/database')

// // // Detect MIDI JSON in text files
// // function detectMidiJson(text) {
// //   try {
// //     const trimmed = text.trim()
// //     if (!trimmed.startsWith('{')) return null
// //     const json = JSON.parse(trimmed)
// //     if (!Array.isArray(json.bars) || json.bars.length === 0) return null
// //     if (!json.tempo && !json.time_signature && !json.key) return null
// //     return json
// //   } catch { return null }
// // }

// // // ── POST /api/ingest/midi ─────────────────────────────────────────────────────
// // async function ingestMidi(req, res, next) {
// //   try {
// //     await multerPromise(uploadMidi)(req, res)
// //     if (!req.file) return res.status(400).json({ error: 'No MIDI file uploaded' })

// //     const { path: filePath, originalname } = req.file
// //     const fileBuffer = fs.readFileSync(filePath)
// //     const json       = midiToJson.convert(fileBuffer)

// //     // Store exact JSON
// //     await knowledgeService.saveExactJson(originalname, JSON.stringify(json), {
// //       key: json.key, tempo: json.tempo, bars: json.bars?.length,
// //     })

// //     // Deep analysis → chunks
// //     const chunks = chunkingService.chunkMidi(json, originalname)

// //     // Save to Turso
// //     await knowledgeService.saveChunks(chunks, originalname)

// //     // Record in history table for UI
// //     const db     = getDb()
// //     const result = await db.prepare(`
// //       INSERT INTO knowledge (source_file, chunk_id, chunk_type, summary)
// //       VALUES (?, ?, ?, ?)
// //       ON CONFLICT(chunk_id) DO NOTHING
// //     `).run(originalname, `${originalname}_meta`, 'exact_ref', `Key:${json.key} Tempo:${json.tempo} Bars:${json.bars?.length}`)

// //     fs.unlink(filePath, () => {})

// //     res.json({
// //       success: true,
// //       id:      result.lastInsertRowid,
// //       name:    originalname,
// //       type:    'midi',
// //       key:     json.key   || 'C',
// //       tempo:   json.tempo || 120,
// //       chunks:  chunks.length,
// //       date:    'Just now',
// //     })
// //   } catch (err) { next(err) }
// // }

// // // ── POST /api/ingest/doc ──────────────────────────────────────────────────────
// // async function ingestDoc(req, res, next) {
// //   try {
// //     await multerPromise(uploadDoc)(req, res)
// //     if (!req.file) return res.status(400).json({ error: 'No document uploaded' })

// //     const { path: filePath, originalname } = req.file
// //     const ext = path.extname(originalname).toLowerCase()

// //     let chunks
// //     let responseExtra = {}

// //     if (ext === '.pdf') {
// //       const text = await extractPdfText(filePath)
// //       chunks = chunkingService.chunkDoc(text, originalname)
// //     } else {
// //       const text      = fs.readFileSync(filePath, 'utf8')
// //       const midiJson  = detectMidiJson(text)

// //       if (midiJson) {
// //         console.log(`[ingest] MIDI JSON in "${originalname}" → deep analysis`)

// //         // Store exact untouched JSON
// //         await knowledgeService.saveExactJson(originalname, text.trim(), {
// //           key: midiJson.key, tempo: midiJson.tempo, bars: midiJson.bars?.length,
// //         })

// //         chunks = chunkingService.chunkMidi(midiJson, originalname)
// //         responseExtra = { type: 'midi', key: midiJson.key || 'C', tempo: midiJson.tempo || 120 }
// //       } else {
// //         chunks = chunkingService.chunkDoc(text, originalname)
// //       }
// //     }

// //     // Save all chunks to Turso knowledge table
// //     await knowledgeService.saveChunks(chunks, originalname)

// //     fs.unlink(filePath, () => {})

// //     res.json({
// //       success: true,
// //       name:    originalname,
// //       type:    responseExtra.type || 'doc',
// //       chunks:  chunks.length,
// //       date:    'Just now',
// //       ...responseExtra,
// //     })
// //   } catch (err) { next(err) }
// // }

// // async function extractPdfText(filePath) {
// //   const buf = fs.readFileSync(filePath)
// //   const str = buf.toString('latin1')
// //   const out = []
// //   const re  = /stream\r?\n([\s\S]*?)\r?\nendstream/g
// //   let m
// //   while ((m = re.exec(str)) !== null) {
// //     const readable = m[1].replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
// //     if (readable.length > 20) out.push(readable)
// //   }
// //   return out.join('\n\n') || '[Could not extract PDF text]'
// // }

// // module.exports = { ingestMidi, ingestDoc }








// 'use strict'
// // backend/controllers/ingestController.js  — RAG VERSION
// //
// // ── WHAT CHANGED ──────────────────────────────────────────────────────────────
// //  BEFORE: chunks saved to SQLite (Turso) only
// //  NOW:    chunks saved to SQLite (Turso) + Pinecone embeddings (Voyage AI)
// //
// //  On every ingest:
// //    1. chunkMidi() / chunkDoc()     — same as before
// //    2. knowledgeService.saveChunks  — saves text to Turso (for exact JSON lookup)
// //    3. ragService.upsert(chunks)    — embeds chunks with Voyage AI → Pinecone
// //
// //  Both stores must stay in sync. Turso = text store. Pinecone = vector store.
// //  Compose uses Pinecone for semantic search. Exact playback uses Turso.
// //
// //  Required env vars:
// //    VOYAGE_API_KEY     — from https://www.voyageai.com (50M free tokens/month)
// //    PINECONE_API_KEY   — from https://pinecone.io (free tier)
// //    PINECONE_INDEX     — your index name (must be dim=1024, metric=cosine)
// // ─────────────────────────────────────────────────────────────────────────────

// const fs   = require('fs')
// const path = require('path')

// const { uploadMidi, uploadDoc, multerPromise } = require('../middleware/upload')
// const midiToJson       = require('../services/converters/midiToJson')
// const chunkingService  = require('../services/chunkingService')
// const knowledgeService = require('../services/knowledgeService')
// const ragService       = require('../services/ragService')
// const { getDb }        = require('../db/database')

// // ── Detect MIDI JSON in text files ────────────────────────────────────────────
// function detectMidiJson(text) {
//   try {
//     const trimmed = text.trim()
//     if (!trimmed.startsWith('{')) return null
//     const json = JSON.parse(trimmed)
//     if (!Array.isArray(json.bars) || json.bars.length === 0) return null
//     if (!json.tempo && !json.time_signature && !json.key) return null
//     return json
//   } catch { return null }
// }

// // ── Save to both stores ───────────────────────────────────────────────────────
// // Always saves to Turso first (fast, reliable fallback).
// // Then attempts Pinecone upsert. If Pinecone fails, logs warning but does NOT
// // fail the whole ingest — Turso still has the data for keyword fallback.
// async function saveToBothStores(chunks, sourceName) {
//   // 1. Always save to Turso (text store — used for exact JSON lookup + keyword fallback)
//   await knowledgeService.saveChunks(chunks, sourceName)

//   // 2. Try to save to Pinecone (vector store — used for semantic search in compose)
//   try {
//     await ragService.upsert(chunks)
//     console.log(`[ingest] ✔ Pinecone upserted ${chunks.length} vectors for "${sourceName}"`)
//   } catch (e) {
//     // Non-fatal — compose will fall back to keyword scoring via Turso
//     console.warn(`[ingest] ⚠ Pinecone upsert failed for "${sourceName}": ${e.message}`)
//     console.warn(`[ingest]   Compose will use keyword fallback. Check VOYAGE_API_KEY and PINECONE_API_KEY.`)
//   }
// }

// // ── POST /api/ingest/midi ─────────────────────────────────────────────────────
// async function ingestMidi(req, res, next) {
//   try {
//     await multerPromise(uploadMidi)(req, res)
//     if (!req.file) return res.status(400).json({ error: 'No MIDI file uploaded' })

//     const { path: filePath, originalname } = req.file
//     const fileBuffer = fs.readFileSync(filePath)
//     const json       = midiToJson.convert(fileBuffer)

//     // Store exact JSON in Turso tracks table (for exact playback retrieval)
//     await knowledgeService.saveExactJson(originalname, JSON.stringify(json), {
//       key: json.key, tempo: json.tempo, bars: json.bars?.length,
//     })

//     // Build analytical chunks
//     const chunks = chunkingService.chunkMidi(json, originalname)

//     // Save to BOTH stores (Turso + Pinecone)
//     await saveToBothStores(chunks, originalname)

//     // Record in knowledge table for UI list
//     const db     = getDb()
//     const result = await db.prepare(`
//       INSERT INTO knowledge (source_file, chunk_id, chunk_type, summary)
//       VALUES (?, ?, ?, ?)
//       ON CONFLICT(chunk_id) DO NOTHING
//     `).run(originalname, `${originalname}_meta`, 'exact_ref', `Key:${json.key} Tempo:${json.tempo} Bars:${json.bars?.length}`)

//     fs.unlink(filePath, () => {})

//     res.json({
//       success: true,
//       id:      result.lastInsertRowid,
//       name:    originalname,
//       type:    'midi',
//       key:     json.key   || 'C',
//       tempo:   json.tempo || 120,
//       chunks:  chunks.length,
//       date:    'Just now',
//     })
//   } catch (err) { next(err) }
// }

// // ── POST /api/ingest/doc ──────────────────────────────────────────────────────
// async function ingestDoc(req, res, next) {
//   try {
//     await multerPromise(uploadDoc)(req, res)
//     if (!req.file) return res.status(400).json({ error: 'No document uploaded' })

//     const { path: filePath, originalname } = req.file
//     const ext = path.extname(originalname).toLowerCase()

//     let chunks
//     let responseExtra = {}

//     if (ext === '.pdf') {
//       const text = await extractPdfText(filePath)
//       chunks = chunkingService.chunkDoc(text, originalname)
//     } else {
//       const text     = fs.readFileSync(filePath, 'utf8')
//       const midiJson = detectMidiJson(text)

//       if (midiJson) {
//         console.log(`[ingest] MIDI JSON in "${originalname}" → deep analysis`)

//         // Store exact untouched JSON in Turso tracks table
//         await knowledgeService.saveExactJson(originalname, text.trim(), {
//           key: midiJson.key, tempo: midiJson.tempo, bars: midiJson.bars?.length,
//         })

//         chunks = chunkingService.chunkMidi(midiJson, originalname)
//         responseExtra = { type: 'midi', key: midiJson.key || 'C', tempo: midiJson.tempo || 120 }
//       } else {
//         chunks = chunkingService.chunkDoc(text, originalname)
//       }
//     }

//     // Save to BOTH stores (Turso + Pinecone)
//     await saveToBothStores(chunks, originalname)

//     fs.unlink(filePath, () => {})

//     res.json({
//       success: true,
//       name:    originalname,
//       type:    responseExtra.type || 'doc',
//       chunks:  chunks.length,
//       date:    'Just now',
//       ...responseExtra,
//     })
//   } catch (err) { next(err) }
// }

// // ── PDF text extraction ───────────────────────────────────────────────────────
// async function extractPdfText(filePath) {
//   const buf = fs.readFileSync(filePath)
//   const str = buf.toString('latin1')
//   const out = []
//   const re  = /stream\r?\n([\s\S]*?)\r?\nendstream/g
//   let m
//   while ((m = re.exec(str)) !== null) {
//     const readable = m[1].replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
//     if (readable.length > 20) out.push(readable)
//   }
//   return out.join('\n\n') || '[Could not extract PDF text]'
// }

// module.exports = { ingestMidi, ingestDoc }
















'use strict'
// backend/controllers/ingestController.js  v3.0
//
// ── WHAT CHANGED ──────────────────────────────────────────────────────────────
//  midiToJson → midiToString
//    Both return a doc object structurally compatible with chunkingService.
//    midiToString returns { compactStr, doc } — we use doc for chunking,
//    and store compactStr as the canonical representation in the tracks table.
//    This means exact-playback retrieval now returns compact string which
//    composeController parses back to a doc for MIDI conversion.
//
//  ingestDoc text detection: updated to detect compact string format as well
//    as the old JSON format (backward compatible).
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs')
const path = require('path')

const { uploadMidi, uploadDoc, multerPromise } = require('../middleware/upload')
const midiToString     = require('../services/converters/midiToString')   // ← NEW
const chunkingService  = require('../services/chunkingService')
const knowledgeService = require('../services/knowledgeService')
const ragService       = require('../services/ragService')
const { getDb }        = require('../db/database')

// ── Detect MIDI JSON in text files ────────────────────────────────────────────
function detectMidiJson(text) {
  try {
    const trimmed = text.trim()
    if (!trimmed.startsWith('{')) return null
    const json = JSON.parse(trimmed)
    if (!Array.isArray(json.bars) || json.bars.length === 0) return null
    if (!json.tempo && !json.time_signature && !json.key) return null
    return json
  } catch { return null }
}

// ── Detect compact string format in text files ────────────────────────────────
function detectCompactString(text) {
  const trimmed = text.trim()
  if (!trimmed.match(/^H:\s*[\d.]+\|/)) return null
  try {
    const { parseCompactString } = require('../services/converters/stringToMidi')
    return parseCompactString(trimmed)
  } catch { return null }
}

// ── Save to both Turso + Pinecone ─────────────────────────────────────────────
async function saveToBothStores(chunks, sourceName) {
  await knowledgeService.saveChunks(chunks, sourceName)
  try {
    await ragService.upsert(chunks)
    console.log(`[ingest] ✔ Pinecone upserted ${chunks.length} vectors for "${sourceName}"`)
  } catch (e) {
    console.warn(`[ingest] ⚠ Pinecone upsert failed for "${sourceName}": ${e.message}`)
  }
}

// ── POST /api/ingest/midi ─────────────────────────────────────────────────────
async function ingestMidi(req, res, next) {
  try {
    await multerPromise(uploadMidi)(req, res)
    if (!req.file) return res.status(400).json({ error: 'No MIDI file uploaded' })

    const { path: filePath, originalname } = req.file
    const fileBuffer = fs.readFileSync(filePath)

    // Convert MIDI → compact string + doc
    const { compactStr, doc } = midiToString.convert(fileBuffer)   // ← NEW

    // Store compact string in tracks table (for exact playback)
    await knowledgeService.saveExactJson(originalname, compactStr, {
      key: doc.key, tempo: doc.tempo, bars: doc.bars?.length,
    })

    // Build analytical chunks from doc
    const chunks = chunkingService.chunkMidi(doc, originalname)

    await saveToBothStores(chunks, originalname)

    const db     = getDb()
    const result = await db.prepare(`
      INSERT INTO knowledge (source_file, chunk_id, chunk_type, summary)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(chunk_id) DO NOTHING
    `).run(originalname, `${originalname}_meta`, 'exact_ref',
      `Key:${doc.key} Tempo:${doc.tempo} Bars:${doc.bars?.length}`)

    fs.unlink(filePath, () => {})

    res.json({
      success: true,
      id:      result.lastInsertRowid,
      name:    originalname,
      type:    'midi',
      key:     doc.key   || 'C',
      tempo:   doc.tempo || 120,
      chunks:  chunks.length,
      date:    'Just now',
    })
  } catch (err) { next(err) }
}

// ── POST /api/ingest/doc ──────────────────────────────────────────────────────
async function ingestDoc(req, res, next) {
  try {
    await multerPromise(uploadDoc)(req, res)
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' })

    const { path: filePath, originalname } = req.file
    const ext = path.extname(originalname).toLowerCase()

    let chunks
    let responseExtra = {}

    if (ext === '.pdf') {
      const text = await extractPdfText(filePath)
      chunks = chunkingService.chunkDoc(text, originalname)
    } else {
      const text = fs.readFileSync(filePath, 'utf8')

      // Check for compact string format first (new), then JSON (old)
      const compactDoc = detectCompactString(text)
      if (compactDoc) {
        console.log(`[ingest] Compact string in "${originalname}" → deep analysis`)
        await knowledgeService.saveExactJson(originalname, text.trim(), {
          key: compactDoc.key, tempo: compactDoc.tempo, bars: compactDoc.bars?.length,
        })
        chunks = chunkingService.chunkMidi(compactDoc, originalname)
        responseExtra = { type: 'midi', key: compactDoc.key || 'C', tempo: compactDoc.tempo || 120 }
      } else {
        const midiJson = detectMidiJson(text)
        if (midiJson) {
          console.log(`[ingest] MIDI JSON in "${originalname}" → deep analysis`)
          await knowledgeService.saveExactJson(originalname, text.trim(), {
            key: midiJson.key, tempo: midiJson.tempo, bars: midiJson.bars?.length,
          })
          chunks = chunkingService.chunkMidi(midiJson, originalname)
          responseExtra = { type: 'midi', key: midiJson.key || 'C', tempo: midiJson.tempo || 120 }
        } else {
          chunks = chunkingService.chunkDoc(text, originalname)
        }
      }
    }

    await saveToBothStores(chunks, originalname)
    fs.unlink(filePath, () => {})

    res.json({
      success: true,
      name:    originalname,
      type:    responseExtra.type || 'doc',
      chunks:  chunks.length,
      date:    'Just now',
      ...responseExtra,
    })
  } catch (err) { next(err) }
}

// ── PDF text extraction ────────────────────────────────────────────────────────
async function extractPdfText(filePath) {
  const buf = fs.readFileSync(filePath)
  const str = buf.toString('latin1')
  const out = []
  const re  = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let m
  while ((m = re.exec(str)) !== null) {
    const readable = m[1].replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
    if (readable.length > 20) out.push(readable)
  }
  return out.join('\n\n') || '[Could not extract PDF text]'
}

module.exports = { ingestMidi, ingestDoc }