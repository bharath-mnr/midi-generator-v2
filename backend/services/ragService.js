//E:\pro\midigenerator_v2\backend\services\ragService.js
'use strict'

const fs   = require('fs')
const path = require('path')

// ── Terminal colours ───────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m',
  gray:   '\x1b[90m',
}
const tag  = `${c.cyan}[RAG]${c.reset}`
const ok   = `${c.green}✔${c.reset}`
const warn = `${c.yellow}⚠${c.reset}`
const fail = `${c.red}✘${c.reset}`
const info = `${c.gray}•${c.reset}`

// ── Local disk-persisted vector store ─────────────────────────────────────────
const LOCAL_STORE_PATH = path.join(__dirname, '../db/localRag.json')
let _localStore = null

function loadLocalStore() {
  if (_localStore) return _localStore
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      _localStore = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, 'utf8'))
      const count = Object.keys(_localStore).length
      console.log(`${tag} ${ok} Local store loaded — ${c.bold}${count} vectors${c.reset} from disk`)
    } else {
      _localStore = {}
      console.log(`${tag} ${info} Local store empty (no uploads yet)`)
    }
  } catch (e) {
    _localStore = {}
    console.log(`${tag} ${warn} Could not read local store, starting fresh: ${e.message}`)
  }
  return _localStore
}

function saveLocalStore() {
  try {
    const dir = path.dirname(LOCAL_STORE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(_localStore))
  } catch (e) {
    console.error(`${tag} ${fail} Failed to save local store: ${e.message}`)
  }
}

// ── Cosine similarity ─────────────────────────────────────────────────────────
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na  += a[i] * a[i]
    nb  += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

function localQuery(vector, topK) {
  const store   = loadLocalStore()
  const entries = Object.values(store)
  if (entries.length === 0) return []
  return entries
    .map(e => ({ ...e, score: cosineSim(vector, e.values) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(e => ({
      id:     e.id,
      score:  e.score,
      text:   e.metadata?.text   || '',
      type:   e.metadata?.type   || 'unknown',
      source: e.metadata?.source || '',
      key:    e.metadata?.key    || null,
      tempo:  e.metadata?.tempo  || null,
    }))
}

function localUpsert(vectors) {
  const store = loadLocalStore()
  for (const v of vectors) store[v.id] = v
  saveLocalStore()
}

function localDeleteMany(ids) {
  const store = loadLocalStore()
  let removed = 0
  for (const id of ids) { if (store[id]) { delete store[id]; removed++ } }
  saveLocalStore()
  return removed
}

// ── Pinecone (optional cloud store) ───────────────────────────────────────────
let _pineconeIndex = null
let _pineconeOk    = null  // null=untested, true=working, false=disabled

function getPineconeIndex() {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) return null
  if (_pineconeIndex) return _pineconeIndex
  try {
    const { Pinecone } = require('@pinecone-database/pinecone')
    _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
      .index(process.env.PINECONE_INDEX)
    return _pineconeIndex
  } catch (e) {
    console.log(`${tag} ${warn} Pinecone init failed: ${e.message?.slice(0, 60)}`)
    return null
  }
}

// ── Hash-based embedding (512-dim + bigrams) ──────────────────────────────────
async function embedText(text) {
  const DIM   = 1536  // matches Pinecone index dimension
  const vec   = new Float32Array(DIM)
  const str   = String(text).toLowerCase()
  const seeds = [31, 37, 41, 43, 47, 53, 59, 61]

  for (const seed of seeds) {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      vec[Math.abs((code * seed + i * 7 + seed * 13) % DIM)] += 1 / seeds.length
    }
  }
  // Bigrams
  for (let i = 0; i < str.length - 1; i++) {
    vec[Math.abs((str.charCodeAt(i) * 256 + str.charCodeAt(i + 1)) % DIM)] += 0.5
  }
  // Trigrams — richer signal for phrase matching
  for (let i = 0; i < str.length - 2; i++) {
    const tri = str.charCodeAt(i) * 65536 + str.charCodeAt(i+1) * 256 + str.charCodeAt(i+2)
    vec[Math.abs(tri % DIM)] += 0.3
  }

  const norm = Math.sqrt(Array.from(vec).reduce((s, v) => s + v * v, 0)) || 1
  return Array.from(vec).map(v => v / norm)
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

async function query(prompt, topK = 5) {
  const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
  console.log(`${tag} ${info} Query: "${c.dim}${preview}…${c.reset}" (top ${topK})`)

  const vector     = await embedText(prompt)
  const store      = loadLocalStore()
  const totalVecs  = Object.keys(store).length

  if (totalVecs === 0) {
    console.log(`${tag} ${warn} Local store is empty — upload MIDI or docs first for RAG context`)
    return []
  }

  // Try Pinecone first if it hasn't failed
  if (_pineconeOk !== false) {
    const index = getPineconeIndex()
    if (index) {
      try {
        const result  = await index.query({ vector, topK, includeMetadata: true })
        _pineconeOk   = true
        const matches = (result.matches || []).map(m => ({
          id:     m.id,
          score:  m.score,
          text:   m.metadata?.text   || '',
          type:   m.metadata?.type   || 'unknown',
          source: m.metadata?.source || '',
          key:    m.metadata?.key    || null,
          tempo:  m.metadata?.tempo  || null,
        }))
        // Also pull local-only chunks (Pinecone might be stale)
        const local  = localQuery(vector, topK)
        const allIds = new Set(matches.map(m => m.id))
        const extras = local.filter(l => !allIds.has(l.id))
        const final  = [...matches, ...extras].slice(0, topK)
        console.log(`${tag} ${ok} Pinecone: ${matches.length} hits  |  Local bonus: ${extras.length}`)
        _logChunks(final)
        return final
      } catch (err) {
        _pineconeOk = false
        console.log(`${tag} ${warn} Pinecone unreachable — switching to local store for this session`)
        console.log(`${tag} ${c.dim}  reason: ${err.message?.slice(0, 80)}${c.reset}`)
      }
    } else if (process.env.PINECONE_API_KEY) {
      console.log(`${tag} ${warn} Pinecone configured but index not reachable — using local store`)
    }
  }

  // Local fallback
  const results = localQuery(vector, topK)
  if (results.length === 0) {
    console.log(`${tag} ${warn} No matching chunks found (store has ${totalVecs} vectors but none matched)`)
  } else {
    console.log(`${tag} ${ok} Local store: ${results.length}/${totalVecs} chunks matched`)
    _logChunks(results)
  }
  return results
}

async function upsert(chunks) {
  if (!chunks || chunks.length === 0) return

  console.log(`${tag} ${info} Indexing ${c.bold}${chunks.length} chunks${c.reset}…`)

  // Embed all chunks
  const vectors = []
  for (const chunk of chunks) {
    vectors.push({
      id:     chunk.id,
      values: await embedText(chunk.text),
      metadata: {
        text:   chunk.text,
        type:   chunk.metadata?.type   || 'unknown',
        source: chunk.metadata?.source || '',
        key:    chunk.metadata?.key    || '',
        tempo:  chunk.metadata?.tempo  || 0,
      },
    })
  }

  // Always save to local store first
  localUpsert(vectors)
  const total = Object.keys(loadLocalStore()).length
  console.log(`${tag} ${ok} Local store updated — ${c.bold}${total} vectors${c.reset} total on disk`)

  // Log chunk breakdown
  const byType = {}
  for (const v of vectors) {
    const t = v.metadata.type
    byType[t] = (byType[t] || 0) + 1
  }
  const breakdown = Object.entries(byType).map(([t, n]) => `${t}×${n}`).join('  ')
  console.log(`${tag} ${info} Chunk types: ${c.dim}${breakdown}${c.reset}`)

  // Try Pinecone sync
  if (_pineconeOk !== false) {
    const index = getPineconeIndex()
    if (index) {
      try {
        const BATCH = 100
        for (let i = 0; i < vectors.length; i += BATCH) {
          await index.upsert(vectors.slice(i, i + BATCH))
        }
        _pineconeOk = true
        console.log(`${tag} ${ok} Pinecone synced — ${vectors.length} vectors uploaded`)
      } catch (err) {
        _pineconeOk = false
        console.log(`${tag} ${warn} Pinecone sync failed (local store is the source of truth)`)
        console.log(`${tag} ${c.dim}  reason: ${err.message?.slice(0, 80)}${c.reset}`)
      }
    }
  }
}

async function deleteMany(ids) {
  if (!ids || ids.length === 0) return

  const removed = localDeleteMany(ids)
  const total   = Object.keys(loadLocalStore()).length
  console.log(`${tag} ${ok} Deleted ${removed} vectors from local store (${total} remaining)`)

  if (_pineconeOk !== false) {
    const index = getPineconeIndex()
    if (index) {
      try {
        await index.deleteMany(ids)
        console.log(`${tag} ${ok} Pinecone delete synced`)
      } catch (err) {
        console.log(`${tag} ${warn} Pinecone delete failed (local store already cleaned)`)
      }
    }
  }
}

// ── Helper: log top chunk matches ─────────────────────────────────────────────
function _logChunks(chunks) {
  for (const ch of chunks) {
    const score  = (ch.score * 100).toFixed(1)
    const src    = ch.source?.split(/[/\\]/).pop() || 'unknown'
    const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
    console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
  }
}


async function deleteBySource(sourceName) {
  const store   = loadLocalStore()
  const toDelete = Object.values(store)
    .filter(v => v.metadata?.source === sourceName)
    .map(v => v.id)
  if (toDelete.length > 0) await deleteMany(toDelete)
  return toDelete.length
}
module.exports = { query, upsert, deleteMany, deleteBySource, embedText }