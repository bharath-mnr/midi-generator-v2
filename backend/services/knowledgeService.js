'use strict'
// backend/services/knowledgeService.js
//
// THE CORE SERVICE THAT BEATS NOTEBOOKLM
//
// Architecture change:
//   OLD: Upload → Pinecone vectors → query topK=80 → AI sees 7% of knowledge
//   NEW: Upload → Turso DB → getAll() → AI sees 100% of knowledge
//
// NotebookLM wins because it puts everything in context.
// This service does the same — but with DEEP musical analysis chunks
// instead of raw JSON text, which makes the AI output far better.
//
// No Pinecone. No Voyage AI. No embeddings. No topK.
// Just Turso (free hosted DB) + full context every request.
//
// Functions:
//   saveChunks(chunks, sourceName)  — store analysis chunks in Turso
//   saveExactJson(sourceName, json) — store untouched JSON for exact retrieval
//   getAllContext()                 — load ALL chunks for full-context compose
//   findExactTrack(prompt)          — fuzzy match prompt → stored track
//   getExactJson(sourceName)        — retrieve untouched JSON
//   deleteSource(sourceName)        — remove all data for a file
//   deleteAll()                     — clear everything
//   getStats()                      — counts for UI

const { getDb } = require('../db/database')

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', bold: '\x1b[1m', gray: '\x1b[90m', red: '\x1b[31m',
}
const tag  = `${c.cyan}[KS]${c.reset}`
const ok   = `${c.green}✔${c.reset}`
const warn = `${c.yellow}⚠${c.reset}`
const fail = `${c.red}✘${c.reset}`

// ── Save analytical chunks to Turso knowledge table ───────────────────────────
async function saveChunks(chunks, sourceName) {
  if (!chunks || chunks.length === 0) return
  const db = getDb()

  // Delete existing chunks for this source (re-upload = update)
  await db.prepare('DELETE FROM knowledge WHERE source_file = ?').run(sourceName)

  // Insert all chunks
  for (const chunk of chunks) {
    await db.prepare(`
      INSERT INTO knowledge (source_file, chunk_id, chunk_type, summary)
      VALUES (?, ?, ?, ?)
    `).run(
      sourceName,
      chunk.id,
      chunk.metadata?.type || 'unknown',
      chunk.text,  // store FULL text (not truncated) so getAll() returns complete context
    )
  }
  console.log(`${tag} ${ok} Saved ${c.bold}${chunks.length}${c.reset} chunks for "${sourceName}"`)
}

// ── Save exact untouched JSON to tracks table ─────────────────────────────────
async function saveExactJson(sourceName, jsonString, meta = {}) {
  const db = getDb()
  await db.prepare(`
    INSERT INTO tracks (source_file, json_data, key, tempo, bars)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(source_file) DO UPDATE SET
      json_data = excluded.json_data,
      key       = excluded.key,
      tempo     = excluded.tempo,
      bars      = excluded.bars
  `).run(
    sourceName,
    jsonString,
    meta.key   || null,
    meta.tempo || null,
    meta.bars  || null,
  )
  console.log(`${tag} ${ok} Exact JSON stored → "${sourceName}" (${jsonString.length} chars)`)
}

// ── Load ALL analytical chunks from Turso ─────────────────────────────────────
// This is the function that beats NotebookLM.
// Gives AI 100% of musical knowledge on every compose request.
//
// With 87 tracks × 7 chunks:
//   ~609 chunks × ~500 chars = ~304K chars = ~76K tokens
//   Well within Gemini 1.5 Pro (1M tokens) and Claude (200K tokens)
//
// Returns formatted string ready to inject into compose prompt.
async function getAllContext() {
  const db = getDb()
  const rows = await db.prepare(`
    SELECT summary, chunk_type, source_file
    FROM knowledge
    WHERE summary IS NOT NULL AND length(summary) > 10
    ORDER BY source_file, id
  `).all()

  if (!rows || rows.length === 0) {
    console.log(`${tag} ${warn} No knowledge chunks found in DB`)
    return ''
  }

  // Group by source file for readable context
  const bySource = new Map()
  for (const row of rows) {
    if (!bySource.has(row.source_file)) bySource.set(row.source_file, [])
    bySource.get(row.source_file).push(row)
  }

  const parts = []
  for (const [source, chunks] of bySource) {
    // Put style + exact_ref chunks first (most useful for composition)
    const ordered = [
      ...chunks.filter(c => c.chunk_type === 'exact_ref'),
      ...chunks.filter(c => c.chunk_type === 'style'),
      ...chunks.filter(c => c.chunk_type === 'blueprint'),
      ...chunks.filter(c => c.chunk_type === 'patterns_rh'),
      ...chunks.filter(c => c.chunk_type === 'patterns_lh'),
      ...chunks.filter(c => c.chunk_type === 'harmony'),
      ...chunks.filter(c => c.chunk_type === 'structure'),
      ...chunks.filter(c => !['exact_ref','style','blueprint','patterns_rh','patterns_lh','harmony','structure'].includes(c.chunk_type)),
    ]
    parts.push(`\n=== ${source} ===\n${ordered.map(c => c.summary).join('\n\n')}`)
  }

  const context = parts.join('\n\n' + '─'.repeat(40))
  console.log(`${tag} ${ok} getAllContext() → ${c.bold}${rows.length} chunks${c.reset} from ${bySource.size} tracks (${Math.round(context.length / 1000)}KB)`)
  return context
}

// ── Fuzzy match prompt → stored track name ────────────────────────────────────
// Returns source_file name if >= 50% of filename tokens appear in prompt
async function findExactTrack(prompt) {
  const db = getDb()
  const rows = await db.prepare('SELECT source_file FROM tracks').all()
  if (!rows || !rows.length) return null

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

    if (score > bestScore) { bestScore = score; bestMatch = source_file }
  }

  if (bestScore >= 0.5) {
    console.log(`${tag} ${ok} Track match: "${c.cyan}${bestMatch}${c.reset}" (${(bestScore * 100).toFixed(0)}%)`)
    return bestMatch
  }
  return null
}

// ── Retrieve exact JSON for a named track ─────────────────────────────────────
async function getExactJson(sourceName) {
  const db  = getDb()
  const row = await db.prepare('SELECT json_data FROM tracks WHERE source_file = ?').get(sourceName)
  if (row?.json_data) {
    console.log(`${tag} ${ok} Exact JSON: ${c.cyan}${sourceName}${c.reset} (${row.json_data.length} chars)`)
  }
  return row?.json_data || null
}

// ── Delete all data for a source file ─────────────────────────────────────────
async function deleteSource(sourceName) {
  const db = getDb()
  await db.prepare('DELETE FROM knowledge WHERE source_file = ?').run(sourceName)
  await db.prepare('DELETE FROM tracks   WHERE source_file = ?').run(sourceName)
  console.log(`${tag} ${ok} Deleted all data for: "${sourceName}"`)
}

// ── Delete all knowledge ───────────────────────────────────────────────────────
async function deleteAll() {
  const db = getDb()
  await db.prepare('DELETE FROM knowledge').run()
  await db.prepare('DELETE FROM tracks').run()
  console.log(`${tag} ${ok} All knowledge cleared`)
}

// ── Stats for UI ───────────────────────────────────────────────────────────────
async function getStats() {
  const db = getDb()
  const chunkCount = (await db.prepare('SELECT COUNT(*) AS cnt FROM knowledge').get())?.cnt || 0
  const trackCount = (await db.prepare('SELECT COUNT(*) AS cnt FROM tracks').get())?.cnt    || 0
  const sources    = await db.prepare('SELECT DISTINCT source_file FROM knowledge').all()
  return {
    chunkCount,
    trackCount,
    sourceCount: sources?.length || 0,
  }
}

// ── List all ingested sources (for knowledge page UI) ─────────────────────────
async function listSources() {
  const db   = getDb()
  const rows = await db.prepare(`
    SELECT
      MIN(k.id)          AS id,
      k.source_file      AS name,
      k.chunk_type       AS type_hint,
      COUNT(*)           AS chunks,
      MIN(k.created_at)  AS created_at,
      t.key,
      t.tempo,
      t.bars
    FROM knowledge k
    LEFT JOIN tracks t ON t.source_file = k.source_file
    GROUP BY k.source_file
    ORDER BY MIN(k.created_at) DESC
  `).all()

  if (!rows) return []

  return rows.map(row => {
    const ext  = row.name?.split('.').pop()?.toLowerCase() || ''
    const type = ['mid','midi'].includes(ext) ? 'midi' :
                  row.chunk_type?.includes('exact_ref') ? 'midi' : 'doc'
    return {
      id:     row.id,
      name:   row.name,
      type,
      chunks: row.chunks,
      key:    row.key   || null,
      tempo:  row.tempo || null,
      bars:   row.bars  || null,
      date:   formatRelative(row.created_at),
    }
  })
}

function formatRelative(iso) {
  if (!iso) return 'Unknown'
  const diff = Date.now() - new Date(iso)
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 172_800_000) return 'Yesterday'
  return new Date(iso).toLocaleDateString()
}

module.exports = {
  saveChunks,
  saveExactJson,
  getAllContext,
  findExactTrack,
  getExactJson,
  deleteSource,
  deleteAll,
  getStats,
  listSources,
}