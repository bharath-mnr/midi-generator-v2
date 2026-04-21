
'use strict'
// backend/services/ragService.js
//
// KEY ADDITIONS over original:
//   getAll()            — returns ALL chunks from SQLite (full-context like NotebookLM)
//   findMatchingTrack() — fuzzy-matches prompt text against stored track filenames
//   getExactJson()      — fetches raw untouched JSON from SQLite tracks table
//   storeExactJson()    — saves exact JSON (called by ingestController)
//   query() topK = 80   — up from 5 (10× better coverage)
//
// Embedding: Voyage AI (not Gemini) — 50M free tokens/month, no daily quota

const { VoyageAIClient } = require('voyageai')
const { getDb }          = require('../db/database')

const c = {
  reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
  bold: '\x1b[1m', gray: '\x1b[90m',
}
const tag  = `${c.cyan}[RAG]${c.reset}`
const ok   = `${c.green}✔${c.reset}`
const warn = `${c.yellow}⚠${c.reset}`
const fail = `${c.red}✘${c.reset}`
const info = `${c.gray}•${c.reset}`

const EMBED_MODEL = 'voyage-3'
const EMBED_DIM   = 1024
const EMBED_BATCH = 128

let _pineconeIndex  = null
let _pineconeFailAt = null
const PINECONE_RETRY_MS = 60_000
let _envLogged = false

function isPineconeConfigured() {
  const ok2 = !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX)
  if (!_envLogged) {
    _envLogged = true
    if (ok2) {
      console.log(`${tag} ${info} Pinecone index: ${c.cyan}${process.env.PINECONE_INDEX}${c.reset} (dim=${EMBED_DIM})`)
    } else {
      const missing = []
      if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
      if (!process.env.PINECONE_INDEX)   missing.push('PINECONE_INDEX')
      console.log(`${tag} ${warn} Pinecone disabled — missing: ${missing.join(', ')}`)
    }
  }
  return ok2
}

function canTryPinecone() {
  if (!isPineconeConfigured()) return false
  if (_pineconeFailAt && (Date.now() - _pineconeFailAt) < PINECONE_RETRY_MS) return false
  return true
}

function getPineconeIndex() {
  if (!canTryPinecone()) return null
  if (_pineconeIndex) return _pineconeIndex
  try {
    const { Pinecone } = require('@pinecone-database/pinecone')
    _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
      .index(process.env.PINECONE_INDEX)
    console.log(`${tag} ${ok} Pinecone connected → ${process.env.PINECONE_INDEX}`)
    return _pineconeIndex
  } catch (e) {
    _pineconeFailAt = Date.now()
    _pineconeIndex  = null
    console.error(`${tag} ${fail} Pinecone init failed: ${e.message}`)
    return null
  }
}

function onPineconeError(err) {
  _pineconeFailAt = Date.now()
  _pineconeIndex  = null
  console.error(`${tag} ${fail} Pinecone error: ${err.message}`)
}

function onPineconeSuccess() { _pineconeFailAt = null }

// ── Voyage embeddings ──────────────────────────────────────────────────────────

function getVoyageClient() {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY not set — add to .env and Render environment variables.')
  }
  return new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY })
}

async function embedBatch(texts, inputType = 'document') {
  const client = getVoyageClient()
  try {
    const res  = await client.embed({ input: texts, model: EMBED_MODEL, input_type: inputType })
    const vecs = res.data.map(item => item.embedding)
    if (vecs[0] && vecs[0].length !== EMBED_DIM) {
      throw new Error(`Dimension mismatch: got ${vecs[0].length}, need ${EMBED_DIM}. Recreate Pinecone index at dim=${vecs[0].length}.`)
    }
    return vecs
  } catch (err) {
    console.error(`${tag} ${fail} Voyage embedBatch: ${err.message}`)
    throw err
  }
}

async function embedText(text) {
  const client = getVoyageClient()
  try {
    const res = await client.embed({ input: [text], model: EMBED_MODEL, input_type: 'query' })
    return res.data[0].embedding
  } catch (err) {
    console.error(`${tag} ${fail} Voyage embedText: ${err.message}`)
    throw err
  }
}

function _logChunks(chunks) {
  for (const ch of chunks) {
    const score   = (ch.score * 100).toFixed(1)
    const src     = ch.source?.split(/[/\\]/).pop() || '?'
    const preview = ch.text?.slice(0, 55).replace(/\n/g, ' ') || ''
    console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PINECONE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function upsert(chunks) {
  if (!chunks || chunks.length === 0) return
  if (!isPineconeConfigured()) {
    throw new Error('Pinecone not configured. Set PINECONE_API_KEY and PINECONE_INDEX.')
  }

  console.log(`${tag} ${info} Embedding ${c.bold}${chunks.length}${c.reset} chunks via Voyage AI…`)

  const texts   = chunks.map(ch => ch.text)
  const allVecs = []
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const vecs = await embedBatch(texts.slice(i, i + EMBED_BATCH), 'document')
    allVecs.push(...vecs)
  }

  const vectors = chunks.map((chunk, i) => ({
    id:     chunk.id,
    values: allVecs[i],
    metadata: {
      text:   chunk.text,
      type:   chunk.metadata?.type   || 'unknown',
      source: chunk.metadata?.source || '',
      key:    chunk.metadata?.key    || '',
      tempo:  chunk.metadata?.tempo  || 0,
    },
  }))

  const index = getPineconeIndex()
  if (!index) throw new Error('Pinecone unavailable.')

  try {
    for (let i = 0; i < vectors.length; i += 100) {
      await index.upsert(vectors.slice(i, i + 100))
    }
    onPineconeSuccess()
    console.log(`${tag} ${ok} Pinecone — ${c.bold}${vectors.length} vectors stored${c.reset}`)
  } catch (err) {
    onPineconeError(err)
    throw new Error(`Pinecone upsert failed: ${err.message}`)
  }
}

/**
 * query() — Semantic search in Pinecone.
 * topK now defaults to 80 (was 5) — covers ~11% of 696 chunks for 87 tracks.
 * Pass topK=200 for even more coverage if context window allows.
 */
async function query(prompt, topK = 80) {
  const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
  console.log(`${tag} ${info} Query: "${c.dim}${preview}…${c.reset}" (top ${topK})`)

  if (!isPineconeConfigured()) {
    console.log(`${tag} ${warn} Pinecone not configured`)
    return []
  }

  let vector
  try { vector = await embedText(prompt) }
  catch (err) {
    console.log(`${tag} ${warn} Embed failed: ${err.message}`)
    return []
  }

  const index = getPineconeIndex()
  if (!index) { console.log(`${tag} ${warn} Pinecone unavailable`); return [] }

  try {
    const result  = await index.query({ vector, topK, includeMetadata: true })
    onPineconeSuccess()
    const matches = (result.matches || []).map(m => ({
      id:     m.id,
      score:  m.score,
      text:   m.metadata?.text   || '',
      type:   m.metadata?.type   || 'unknown',
      source: m.metadata?.source || '',
      key:    m.metadata?.key    || null,
      tempo:  m.metadata?.tempo  || null,
    }))
    console.log(`${tag} ${ok} Pinecone: ${c.bold}${matches.length} hits${c.reset}`)
    _logChunks(matches.slice(0, 4))
    return matches
  } catch (err) {
    onPineconeError(err)
    console.log(`${tag} ${warn} Pinecone query failed: ${err.message}`)
    return []
  }
}

async function deleteMany(ids) {
  if (!ids || ids.length === 0) return
  const index = getPineconeIndex()
  if (!index) return
  try { await index.deleteMany(ids); onPineconeSuccess() }
  catch (err) { onPineconeError(err) }
}

async function deleteBySource(sourceName) {
  const index = getPineconeIndex()
  if (!index) return 0
  try {
    await index.deleteMany({ filter: { source: { $eq: sourceName } } })
    onPineconeSuccess()
    // Also remove from tracks table
    try { const db = getDb(); db.prepare('DELETE FROM tracks WHERE source_file = ?').run(sourceName) } catch (_) {}
    console.log(`${tag} ${ok} Deleted vectors + exact JSON for: ${sourceName}`)
    return 1
  } catch (err) { onPineconeError(err); return 0 }
}

async function deleteAll() {
  const index = getPineconeIndex()
  if (!index) throw new Error('Pinecone unavailable')
  try {
    await index.deleteAll()
    onPineconeSuccess()
    try { const db = getDb(); db.prepare('DELETE FROM tracks').run() } catch (_) {}
    console.log(`${tag} ${ok} Pinecone cleared + tracks table cleared`)
  } catch (err) {
    onPineconeError(err)
    throw new Error(`deleteAll failed: ${err.message}`)
  }
}

async function getStats() {
  const index = getPineconeIndex()
  if (!index) return { vectorCount: 0, configured: false }
  try {
    const stats = await index.describeIndexStats()
    onPineconeSuccess()
    let trackCount = 0
    try {
      const db = getDb()
      const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='tracks'`).get()
      if (tableExists) trackCount = db.prepare('SELECT COUNT(*) AS cnt FROM tracks').get()?.cnt || 0
    } catch (_) {}
    return {
      configured:  true,
      vectorCount: stats.totalRecordCount || stats.totalVectorCount || 0,
      trackCount,
      dimension:   EMBED_DIM,
      model:       EMBED_MODEL,
    }
  } catch (err) {
    onPineconeError(err)
    return { configured: true, vectorCount: 0, error: err.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SQLITE DIRECT ACCESS — for exact retrieval and full-context mode
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * getAll() — Returns ALL analytical chunks from SQLite knowledge table.
 *
 * Full-context mode: gives Gemini 100% of your knowledge instead of top-K subset.
 * With 87 tracks × 7 chunks ≈ 609 rows × ~400 chars ≈ 240K chars ≈ 60K tokens.
 * This is within Gemini 1.5 Pro (1M tokens) and Claude (200K tokens).
 *
 * Use in composeController instead of query() for maximum style accuracy.
 */
function getAll() {
  try {
    const db   = getDb()
    const rows = db.prepare(`
      SELECT summary, chunk_type, source_file
      FROM knowledge
      WHERE summary IS NOT NULL AND length(summary) > 10
      ORDER BY source_file, id
    `).all()

    const chunks = rows.map(r => ({
      text:   r.summary,
      type:   r.chunk_type,
      source: r.source_file,
      score:  1.0,
    }))
    console.log(`${tag} ${ok} getAll() → ${c.bold}${chunks.length} chunks${c.reset} from SQLite`)
    return chunks
  } catch (err) {
    console.error(`${tag} ${fail} getAll() failed: ${err.message}`)
    return []
  }
}

/**
 * findMatchingTrack(prompt) — Fuzzy filename match against tracks table.
 *
 * Tokenizes both the prompt and each filename, returns the best match
 * if >= 50% of the filename tokens appear in the prompt.
 *
 * Examples:
 *   "give me exact gibran alcocer idea 10"
 *     → matches "gibran_alcocer_idea10.txt" (score 100%)  ✔
 *
 *   "compose something like idea 5"
 *     → matches "gibran_alcocer_idea5.txt" (score ~40%)   ✗ (below 50% threshold)
 *     → use query() for style similarity instead
 */
function findMatchingTrack(prompt) {
  try {
    const db = getDb()
    const tableExists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='tracks'`
    ).get()
    if (!tableExists) return null

    const rows = db.prepare('SELECT source_file FROM tracks').all()
    if (!rows.length) return null

    const promptLower  = prompt.toLowerCase()
    const promptTokens = new Set(
      promptLower.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(t => t.length >= 2)
    )

    let bestMatch = null, bestScore = 0

    for (const { source_file } of rows) {
      const fileTokens = source_file.toLowerCase()
        .replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(t => t.length >= 2)
      if (!fileTokens.length) continue

      const matchCount = fileTokens.filter(t => promptTokens.has(t) || promptLower.includes(t)).length
      const score = matchCount / fileTokens.length

      if (score > bestScore) {
        bestScore = score
        bestMatch = source_file
      }
    }

    if (bestScore >= 0.5) {
      console.log(`${tag} ${ok} Exact track match: "${c.cyan}${bestMatch}${c.reset}" (${(bestScore * 100).toFixed(0)}%)`)
      return bestMatch
    }
    return null
  } catch (err) {
    console.error(`${tag} ${fail} findMatchingTrack: ${err.message}`)
    return null
  }
}

/**
 * getExactJson(sourceName) — Fetch full untouched JSON string from SQLite.
 */
function getExactJson(sourceName) {
  try {
    const db = getDb()
    const tableExists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='tracks'`
    ).get()
    if (!tableExists) return null

    const row = db.prepare('SELECT json_data FROM tracks WHERE source_file = ?').get(sourceName)
    if (row?.json_data) {
      console.log(`${tag} ${ok} Exact JSON fetched: ${c.cyan}${sourceName}${c.reset} (${row.json_data.length} chars)`)
    }
    return row?.json_data || null
  } catch (err) {
    console.error(`${tag} ${fail} getExactJson: ${err.message}`)
    return null
  }
}

/**
 * storeExactJson(sourceName, jsonString, meta) — Save to SQLite tracks table.
 * Called by ingestController after MIDI JSON is detected and validated.
 * Uses UPSERT so re-uploading the same file just updates it.
 */
function storeExactJson(sourceName, jsonString, meta = {}) {
  try {
    const db = getDb()
    // Check table exists (schema might not have been updated yet)
    const tableExists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='tracks'`
    ).get()
    if (!tableExists) {
      // Create it if schema.sql hasn't been applied yet
      db.exec(`
        CREATE TABLE IF NOT EXISTS tracks (
          id          INTEGER  PRIMARY KEY AUTOINCREMENT,
          source_file TEXT     NOT NULL UNIQUE,
          json_data   TEXT     NOT NULL,
          key         TEXT,
          tempo       INTEGER,
          bars        INTEGER,
          created_at  DATETIME DEFAULT (datetime('now'))
        )
      `)
    }
    db.prepare(`
      INSERT INTO tracks (source_file, json_data, key, tempo, bars)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(source_file) DO UPDATE SET
        json_data = excluded.json_data,
        key       = excluded.key,
        tempo     = excluded.tempo,
        bars      = excluded.bars
    `).run(sourceName, jsonString, meta.key || null, meta.tempo || null, meta.bars || null)
    console.log(`${tag} ${ok} Exact JSON stored → "${sourceName}" (${jsonString.length} chars)`)
  } catch (err) {
    console.error(`${tag} ${fail} storeExactJson: ${err.message}`)
  }
}

module.exports = {
  // Pinecone
  upsert, query, deleteMany, deleteBySource, deleteAll, getStats,
  // SQLite direct
  getAll, findMatchingTrack, getExactJson, storeExactJson,
}