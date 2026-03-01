//E:\pro\midigenerator_v2\backend\controllers\ingestController.js
'use strict'

const fs   = require('fs')
const path = require('path')

const { uploadMidi, uploadDoc, multerPromise } = require('../middleware/upload')
const midiToJson      = require('../services/converters/midiToJson')
const chunkingService = require('../services/chunkingService')
const ragService      = require('../services/ragService')
const { getDb }       = require('../db/database')

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ingest/midi
// ─────────────────────────────────────────────────────────────────────────────
async function ingestMidi(req, res, next) {
  try {
    // 1. Receive file via multer
    await multerPromise(uploadMidi)(req, res)

    if (!req.file) {
      return res.status(400).json({ error: 'No MIDI file uploaded' })
    }

    const { path: filePath, originalname } = req.file

    // 2. Convert MIDI → generation JSON
    const fileBuffer = fs.readFileSync(filePath)
    const json = midiToJson.convert(fileBuffer)

    // 3. Chunk into RAG-friendly pieces
    const chunks = chunkingService.chunkMidi(json, originalname)

    // 4. Upsert chunks into Pinecone
    await ragService.upsert(chunks)

    // 5. Record each chunk in SQLite knowledge table
    const db = getDb()
    const insertStmt = db.prepare(`
      INSERT INTO knowledge (source_file, chunk_id, chunk_type, summary)
      VALUES (?, ?, ?, ?)
    `)
    const insertMany = db.transaction((items) => {
      for (const chunk of items) {
        insertStmt.run(originalname, chunk.id, chunk.metadata.type, chunk.text)
      }
    })
    insertMany(chunks)

    // 6. Lookup the inserted rows to get the first row's id as the item id
    const row = db.prepare('SELECT id FROM knowledge WHERE source_file = ? ORDER BY id ASC LIMIT 1')
                  .get(originalname)

    res.json({
      success: true,
      id:      row?.id,
      name:    originalname,
      type:    'midi',
      key:     json.key   || 'C',
      tempo:   json.tempo || 120,
      chunks:  chunks.length,
      date:    'Just now',
    })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ingest/doc
// ─────────────────────────────────────────────────────────────────────────────
async function ingestDoc(req, res, next) {
  try {
    // 1. Receive file
    await multerPromise(uploadDoc)(req, res)

    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' })
    }

    const { path: filePath, originalname, mimetype } = req.file

    // 2. Read text content
    const ext = path.extname(originalname).toLowerCase()
    let textContent = ''

    if (ext === '.pdf') {
      // Basic PDF extraction (service layer will handle advanced parsing)
      textContent = await extractPdfText(filePath)
    } else {
      textContent = fs.readFileSync(filePath, 'utf8')
    }

    // 3. Chunk document into RAG pieces
    const chunks = chunkingService.chunkDoc(textContent, originalname)

    // 4. Upsert to Pinecone
    await ragService.upsert(chunks)

    // 5. Record in SQLite
    const db = getDb()
    const insertStmt = db.prepare(`
      INSERT INTO knowledge (source_file, chunk_id, chunk_type, summary)
      VALUES (?, ?, ?, ?)
    `)
    const insertMany = db.transaction((items) => {
      for (const chunk of items) {
        insertStmt.run(originalname, chunk.id, chunk.metadata.type, chunk.text.slice(0, 300))
      }
    })
    insertMany(chunks)

    const row = db.prepare('SELECT id FROM knowledge WHERE source_file = ? ORDER BY id ASC LIMIT 1')
                  .get(originalname)

    // Clean up
    fs.unlink(filePath, () => {})

    res.json({
      success: true,
      id:      row?.id,
      name:    originalname,
      type:    'doc',
      chunks:  chunks.length,
      date:    'Just now',
    })
  } catch (err) {
    next(err)
  }
}

// ── Minimal PDF text extraction (no extra deps) ───────────────────────────────
async function extractPdfText(filePath) {
  // Returns raw text extracted from PDF bytes using basic stream parsing.
  // For production quality, swap in pdf-parse or pdfjs-dist.
  const buf = fs.readFileSync(filePath)
  const str = buf.toString('latin1')
  const textChunks = []
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let match
  while ((match = streamRegex.exec(str)) !== null) {
    // Extract readable ASCII characters from stream data
    const readable = match[1].replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
    if (readable.length > 20) textChunks.push(readable)
  }
  return textChunks.join('\n\n') || '[Could not extract PDF text]'
}

module.exports = { ingestMidi, ingestDoc }