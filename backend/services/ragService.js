// // // // // // // // // // //E:\pro\midigenerator_v2\backend\services\ragService.js
// // // // // // // // // // 'use strict'

// // // // // // // // // // const fs   = require('fs')
// // // // // // // // // // const path = require('path')

// // // // // // // // // // // ── Terminal colours ───────────────────────────────────────────────────────────
// // // // // // // // // // const c = {
// // // // // // // // // //   reset:  '\x1b[0m',
// // // // // // // // // //   dim:    '\x1b[2m',
// // // // // // // // // //   green:  '\x1b[32m',
// // // // // // // // // //   yellow: '\x1b[33m',
// // // // // // // // // //   cyan:   '\x1b[36m',
// // // // // // // // // //   red:    '\x1b[31m',
// // // // // // // // // //   bold:   '\x1b[1m',
// // // // // // // // // //   gray:   '\x1b[90m',
// // // // // // // // // // }
// // // // // // // // // // const tag  = `${c.cyan}[RAG]${c.reset}`
// // // // // // // // // // const ok   = `${c.green}✔${c.reset}`
// // // // // // // // // // const warn = `${c.yellow}⚠${c.reset}`
// // // // // // // // // // const fail = `${c.red}✘${c.reset}`
// // // // // // // // // // const info = `${c.gray}•${c.reset}`

// // // // // // // // // // // ── Local disk-persisted vector store ─────────────────────────────────────────
// // // // // // // // // // const LOCAL_STORE_PATH = path.join(__dirname, '../db/localRag.json')
// // // // // // // // // // let _localStore = null

// // // // // // // // // // function loadLocalStore() {
// // // // // // // // // //   if (_localStore) return _localStore
// // // // // // // // // //   try {
// // // // // // // // // //     if (fs.existsSync(LOCAL_STORE_PATH)) {
// // // // // // // // // //       _localStore = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, 'utf8'))
// // // // // // // // // //       const count = Object.keys(_localStore).length
// // // // // // // // // //       console.log(`${tag} ${ok} Local store loaded — ${c.bold}${count} vectors${c.reset} from disk`)
// // // // // // // // // //     } else {
// // // // // // // // // //       _localStore = {}
// // // // // // // // // //       console.log(`${tag} ${info} Local store empty (no uploads yet)`)
// // // // // // // // // //     }
// // // // // // // // // //   } catch (e) {
// // // // // // // // // //     _localStore = {}
// // // // // // // // // //     console.log(`${tag} ${warn} Could not read local store, starting fresh: ${e.message}`)
// // // // // // // // // //   }
// // // // // // // // // //   return _localStore
// // // // // // // // // // }

// // // // // // // // // // function saveLocalStore() {
// // // // // // // // // //   try {
// // // // // // // // // //     const dir = path.dirname(LOCAL_STORE_PATH)
// // // // // // // // // //     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
// // // // // // // // // //     fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(_localStore))
// // // // // // // // // //   } catch (e) {
// // // // // // // // // //     console.error(`${tag} ${fail} Failed to save local store: ${e.message}`)
// // // // // // // // // //   }
// // // // // // // // // // }

// // // // // // // // // // // ── Cosine similarity ─────────────────────────────────────────────────────────
// // // // // // // // // // function cosineSim(a, b) {
// // // // // // // // // //   let dot = 0, na = 0, nb = 0
// // // // // // // // // //   for (let i = 0; i < a.length; i++) {
// // // // // // // // // //     dot += a[i] * b[i]
// // // // // // // // // //     na  += a[i] * a[i]
// // // // // // // // // //     nb  += b[i] * b[i]
// // // // // // // // // //   }
// // // // // // // // // //   return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
// // // // // // // // // // }

// // // // // // // // // // function localQuery(vector, topK) {
// // // // // // // // // //   const store   = loadLocalStore()
// // // // // // // // // //   const entries = Object.values(store)
// // // // // // // // // //   if (entries.length === 0) return []
// // // // // // // // // //   return entries
// // // // // // // // // //     .map(e => ({ ...e, score: cosineSim(vector, e.values) }))
// // // // // // // // // //     .sort((a, b) => b.score - a.score)
// // // // // // // // // //     .slice(0, topK)
// // // // // // // // // //     .map(e => ({
// // // // // // // // // //       id:     e.id,
// // // // // // // // // //       score:  e.score,
// // // // // // // // // //       text:   e.metadata?.text   || '',
// // // // // // // // // //       type:   e.metadata?.type   || 'unknown',
// // // // // // // // // //       source: e.metadata?.source || '',
// // // // // // // // // //       key:    e.metadata?.key    || null,
// // // // // // // // // //       tempo:  e.metadata?.tempo  || null,
// // // // // // // // // //     }))
// // // // // // // // // // }

// // // // // // // // // // function localUpsert(vectors) {
// // // // // // // // // //   const store = loadLocalStore()
// // // // // // // // // //   for (const v of vectors) store[v.id] = v
// // // // // // // // // //   saveLocalStore()
// // // // // // // // // // }

// // // // // // // // // // function localDeleteMany(ids) {
// // // // // // // // // //   const store = loadLocalStore()
// // // // // // // // // //   let removed = 0
// // // // // // // // // //   for (const id of ids) { if (store[id]) { delete store[id]; removed++ } }
// // // // // // // // // //   saveLocalStore()
// // // // // // // // // //   return removed
// // // // // // // // // // }

// // // // // // // // // // // ── Pinecone (optional cloud store) ───────────────────────────────────────────
// // // // // // // // // // let _pineconeIndex = null
// // // // // // // // // // let _pineconeOk    = null  // null=untested, true=working, false=disabled

// // // // // // // // // // function getPineconeIndex() {
// // // // // // // // // //   if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) return null
// // // // // // // // // //   if (_pineconeIndex) return _pineconeIndex
// // // // // // // // // //   try {
// // // // // // // // // //     const { Pinecone } = require('@pinecone-database/pinecone')
// // // // // // // // // //     _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
// // // // // // // // // //       .index(process.env.PINECONE_INDEX)
// // // // // // // // // //     return _pineconeIndex
// // // // // // // // // //   } catch (e) {
// // // // // // // // // //     console.log(`${tag} ${warn} Pinecone init failed: ${e.message?.slice(0, 60)}`)
// // // // // // // // // //     return null
// // // // // // // // // //   }
// // // // // // // // // // }

// // // // // // // // // // // ── Hash-based embedding (512-dim + bigrams) ──────────────────────────────────
// // // // // // // // // // async function embedText(text) {
// // // // // // // // // //   const DIM   = 1536  // matches Pinecone index dimension
// // // // // // // // // //   const vec   = new Float32Array(DIM)
// // // // // // // // // //   const str   = String(text).toLowerCase()
// // // // // // // // // //   const seeds = [31, 37, 41, 43, 47, 53, 59, 61]

// // // // // // // // // //   for (const seed of seeds) {
// // // // // // // // // //     for (let i = 0; i < str.length; i++) {
// // // // // // // // // //       const code = str.charCodeAt(i)
// // // // // // // // // //       vec[Math.abs((code * seed + i * 7 + seed * 13) % DIM)] += 1 / seeds.length
// // // // // // // // // //     }
// // // // // // // // // //   }
// // // // // // // // // //   // Bigrams
// // // // // // // // // //   for (let i = 0; i < str.length - 1; i++) {
// // // // // // // // // //     vec[Math.abs((str.charCodeAt(i) * 256 + str.charCodeAt(i + 1)) % DIM)] += 0.5
// // // // // // // // // //   }
// // // // // // // // // //   // Trigrams — richer signal for phrase matching
// // // // // // // // // //   for (let i = 0; i < str.length - 2; i++) {
// // // // // // // // // //     const tri = str.charCodeAt(i) * 65536 + str.charCodeAt(i+1) * 256 + str.charCodeAt(i+2)
// // // // // // // // // //     vec[Math.abs(tri % DIM)] += 0.3
// // // // // // // // // //   }

// // // // // // // // // //   const norm = Math.sqrt(Array.from(vec).reduce((s, v) => s + v * v, 0)) || 1
// // // // // // // // // //   return Array.from(vec).map(v => v / norm)
// // // // // // // // // // }

// // // // // // // // // // // ── PUBLIC API ────────────────────────────────────────────────────────────────

// // // // // // // // // // async function query(prompt, topK = 5) {
// // // // // // // // // //   const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
// // // // // // // // // //   console.log(`${tag} ${info} Query: "${c.dim}${preview}…${c.reset}" (top ${topK})`)

// // // // // // // // // //   const vector     = await embedText(prompt)
// // // // // // // // // //   const store      = loadLocalStore()
// // // // // // // // // //   const totalVecs  = Object.keys(store).length

// // // // // // // // // //   if (totalVecs === 0) {
// // // // // // // // // //     console.log(`${tag} ${warn} Local store is empty — upload MIDI or docs first for RAG context`)
// // // // // // // // // //     return []
// // // // // // // // // //   }

// // // // // // // // // //   // Try Pinecone first if it hasn't failed
// // // // // // // // // //   if (_pineconeOk !== false) {
// // // // // // // // // //     const index = getPineconeIndex()
// // // // // // // // // //     if (index) {
// // // // // // // // // //       try {
// // // // // // // // // //         const result  = await index.query({ vector, topK, includeMetadata: true })
// // // // // // // // // //         _pineconeOk   = true
// // // // // // // // // //         const matches = (result.matches || []).map(m => ({
// // // // // // // // // //           id:     m.id,
// // // // // // // // // //           score:  m.score,
// // // // // // // // // //           text:   m.metadata?.text   || '',
// // // // // // // // // //           type:   m.metadata?.type   || 'unknown',
// // // // // // // // // //           source: m.metadata?.source || '',
// // // // // // // // // //           key:    m.metadata?.key    || null,
// // // // // // // // // //           tempo:  m.metadata?.tempo  || null,
// // // // // // // // // //         }))
// // // // // // // // // //         // Also pull local-only chunks (Pinecone might be stale)
// // // // // // // // // //         const local  = localQuery(vector, topK)
// // // // // // // // // //         const allIds = new Set(matches.map(m => m.id))
// // // // // // // // // //         const extras = local.filter(l => !allIds.has(l.id))
// // // // // // // // // //         const final  = [...matches, ...extras].slice(0, topK)
// // // // // // // // // //         console.log(`${tag} ${ok} Pinecone: ${matches.length} hits  |  Local bonus: ${extras.length}`)
// // // // // // // // // //         _logChunks(final)
// // // // // // // // // //         return final
// // // // // // // // // //       } catch (err) {
// // // // // // // // // //         _pineconeOk = false
// // // // // // // // // //         console.log(`${tag} ${warn} Pinecone unreachable — switching to local store for this session`)
// // // // // // // // // //         console.log(`${tag} ${c.dim}  reason: ${err.message?.slice(0, 80)}${c.reset}`)
// // // // // // // // // //       }
// // // // // // // // // //     } else if (process.env.PINECONE_API_KEY) {
// // // // // // // // // //       console.log(`${tag} ${warn} Pinecone configured but index not reachable — using local store`)
// // // // // // // // // //     }
// // // // // // // // // //   }

// // // // // // // // // //   // Local fallback
// // // // // // // // // //   const results = localQuery(vector, topK)
// // // // // // // // // //   if (results.length === 0) {
// // // // // // // // // //     console.log(`${tag} ${warn} No matching chunks found (store has ${totalVecs} vectors but none matched)`)
// // // // // // // // // //   } else {
// // // // // // // // // //     console.log(`${tag} ${ok} Local store: ${results.length}/${totalVecs} chunks matched`)
// // // // // // // // // //     _logChunks(results)
// // // // // // // // // //   }
// // // // // // // // // //   return results
// // // // // // // // // // }

// // // // // // // // // // async function upsert(chunks) {
// // // // // // // // // //   if (!chunks || chunks.length === 0) return

// // // // // // // // // //   console.log(`${tag} ${info} Indexing ${c.bold}${chunks.length} chunks${c.reset}…`)

// // // // // // // // // //   // Embed all chunks
// // // // // // // // // //   const vectors = []
// // // // // // // // // //   for (const chunk of chunks) {
// // // // // // // // // //     vectors.push({
// // // // // // // // // //       id:     chunk.id,
// // // // // // // // // //       values: await embedText(chunk.text),
// // // // // // // // // //       metadata: {
// // // // // // // // // //         text:   chunk.text,
// // // // // // // // // //         type:   chunk.metadata?.type   || 'unknown',
// // // // // // // // // //         source: chunk.metadata?.source || '',
// // // // // // // // // //         key:    chunk.metadata?.key    || '',
// // // // // // // // // //         tempo:  chunk.metadata?.tempo  || 0,
// // // // // // // // // //       },
// // // // // // // // // //     })
// // // // // // // // // //   }

// // // // // // // // // //   // Always save to local store first
// // // // // // // // // //   localUpsert(vectors)
// // // // // // // // // //   const total = Object.keys(loadLocalStore()).length
// // // // // // // // // //   console.log(`${tag} ${ok} Local store updated — ${c.bold}${total} vectors${c.reset} total on disk`)

// // // // // // // // // //   // Log chunk breakdown
// // // // // // // // // //   const byType = {}
// // // // // // // // // //   for (const v of vectors) {
// // // // // // // // // //     const t = v.metadata.type
// // // // // // // // // //     byType[t] = (byType[t] || 0) + 1
// // // // // // // // // //   }
// // // // // // // // // //   const breakdown = Object.entries(byType).map(([t, n]) => `${t}×${n}`).join('  ')
// // // // // // // // // //   console.log(`${tag} ${info} Chunk types: ${c.dim}${breakdown}${c.reset}`)

// // // // // // // // // //   // Try Pinecone sync
// // // // // // // // // //   if (_pineconeOk !== false) {
// // // // // // // // // //     const index = getPineconeIndex()
// // // // // // // // // //     if (index) {
// // // // // // // // // //       try {
// // // // // // // // // //         const BATCH = 100
// // // // // // // // // //         for (let i = 0; i < vectors.length; i += BATCH) {
// // // // // // // // // //           await index.upsert(vectors.slice(i, i + BATCH))
// // // // // // // // // //         }
// // // // // // // // // //         _pineconeOk = true
// // // // // // // // // //         console.log(`${tag} ${ok} Pinecone synced — ${vectors.length} vectors uploaded`)
// // // // // // // // // //       } catch (err) {
// // // // // // // // // //         _pineconeOk = false
// // // // // // // // // //         console.log(`${tag} ${warn} Pinecone sync failed (local store is the source of truth)`)
// // // // // // // // // //         console.log(`${tag} ${c.dim}  reason: ${err.message?.slice(0, 80)}${c.reset}`)
// // // // // // // // // //       }
// // // // // // // // // //     }
// // // // // // // // // //   }
// // // // // // // // // // }

// // // // // // // // // // async function deleteMany(ids) {
// // // // // // // // // //   if (!ids || ids.length === 0) return

// // // // // // // // // //   const removed = localDeleteMany(ids)
// // // // // // // // // //   const total   = Object.keys(loadLocalStore()).length
// // // // // // // // // //   console.log(`${tag} ${ok} Deleted ${removed} vectors from local store (${total} remaining)`)

// // // // // // // // // //   if (_pineconeOk !== false) {
// // // // // // // // // //     const index = getPineconeIndex()
// // // // // // // // // //     if (index) {
// // // // // // // // // //       try {
// // // // // // // // // //         await index.deleteMany(ids)
// // // // // // // // // //         console.log(`${tag} ${ok} Pinecone delete synced`)
// // // // // // // // // //       } catch (err) {
// // // // // // // // // //         console.log(`${tag} ${warn} Pinecone delete failed (local store already cleaned)`)
// // // // // // // // // //       }
// // // // // // // // // //     }
// // // // // // // // // //   }
// // // // // // // // // // }

// // // // // // // // // // // ── Helper: log top chunk matches ─────────────────────────────────────────────
// // // // // // // // // // function _logChunks(chunks) {
// // // // // // // // // //   for (const ch of chunks) {
// // // // // // // // // //     const score  = (ch.score * 100).toFixed(1)
// // // // // // // // // //     const src    = ch.source?.split(/[/\\]/).pop() || 'unknown'
// // // // // // // // // //     const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
// // // // // // // // // //     console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
// // // // // // // // // //   }
// // // // // // // // // // }


// // // // // // // // // // async function deleteBySource(sourceName) {
// // // // // // // // // //   const store   = loadLocalStore()
// // // // // // // // // //   const toDelete = Object.values(store)
// // // // // // // // // //     .filter(v => v.metadata?.source === sourceName)
// // // // // // // // // //     .map(v => v.id)
// // // // // // // // // //   if (toDelete.length > 0) await deleteMany(toDelete)
// // // // // // // // // //   return toDelete.length
// // // // // // // // // // }
// // // // // // // // // // module.exports = { query, upsert, deleteMany, deleteBySource, embedText }










// // // // // // // // // 'use strict'
// // // // // // // // // // backend/services/ragService.js
// // // // // // // // // //
// // // // // // // // // // Change from original:
// // // // // // // // // //   embedText() now calls Google's text-embedding-004 model instead of
// // // // // // // // // //   the hash-based fake. Everything else (local store, Pinecone sync,
// // // // // // // // // //   cosine search, public API) is unchanged.
// // // // // // // // // //
// // // // // // // // // // Migration: delete backend/db/localRag.json and re-ingest your files.
// // // // // // // // // //   If you have a Pinecone index, recreate it with dimension=768.

// // // // // // // // // const fs   = require('fs')
// // // // // // // // // const path = require('path')
// // // // // // // // // const { GoogleGenerativeAI } = require('@google/generative-ai')

// // // // // // // // // // ── Terminal colours ───────────────────────────────────────────────────────────
// // // // // // // // // const c = {
// // // // // // // // //   reset:  '\x1b[0m', dim: '\x1b[2m',   green: '\x1b[32m',
// // // // // // // // //   yellow: '\x1b[33m', cyan: '\x1b[36m', red:   '\x1b[31m',
// // // // // // // // //   bold:   '\x1b[1m',  gray: '\x1b[90m',
// // // // // // // // // }
// // // // // // // // // const tag  = `${c.cyan}[RAG]${c.reset}`
// // // // // // // // // const ok   = `${c.green}✔${c.reset}`
// // // // // // // // // const warn = `${c.yellow}⚠${c.reset}`
// // // // // // // // // const fail = `${c.red}✘${c.reset}`
// // // // // // // // // const info = `${c.gray}•${c.reset}`

// // // // // // // // // // ── Embedding config ──────────────────────────────────────────────────────────
// // // // // // // // // const EMBED_MODEL = 'text-embedding-004'  // Google's best text embedding, 768-dim
// // // // // // // // // const EMBED_DIM   = 768                   // ← was 1536 (hash-based), now real 768-dim
// // // // // // // // // const EMBED_BATCH = 20                    // texts per batch API call (API max: 100)

// // // // // // // // // // ── Local disk-persisted vector store ─────────────────────────────────────────
// // // // // // // // // const LOCAL_STORE_PATH = path.join(__dirname, '../db/localRag.json')
// // // // // // // // // let _localStore = null

// // // // // // // // // function loadLocalStore() {
// // // // // // // // //   if (_localStore) return _localStore
// // // // // // // // //   try {
// // // // // // // // //     if (fs.existsSync(LOCAL_STORE_PATH)) {
// // // // // // // // //       _localStore = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, 'utf8'))
// // // // // // // // //       const count = Object.keys(_localStore).length

// // // // // // // // //       // ── Dimension mismatch guard ─────────────────────────────────────────────
// // // // // // // // //       // If the store has old 1536-dim hash vectors we can't mix them with real
// // // // // // // // //       // 768-dim embeddings — silently wipe and start fresh.
// // // // // // // // //       const first = Object.values(_localStore)[0]
// // // // // // // // //       if (first && first.values && first.values.length !== EMBED_DIM) {
// // // // // // // // //         console.log(`${tag} ${warn} Local store has ${first.values.length}-dim vectors but embedder produces ${EMBED_DIM}-dim.`)
// // // // // // // // //         console.log(`${tag} ${warn} Clearing stale store — please re-ingest your files.`)
// // // // // // // // //         _localStore = {}
// // // // // // // // //         saveLocalStore()
// // // // // // // // //       } else {
// // // // // // // // //         console.log(`${tag} ${ok} Local store loaded — ${c.bold}${count} vectors${c.reset} (${EMBED_DIM}-dim)`)
// // // // // // // // //       }
// // // // // // // // //     } else {
// // // // // // // // //       _localStore = {}
// // // // // // // // //       console.log(`${tag} ${info} Local store empty (no uploads yet)`)
// // // // // // // // //     }
// // // // // // // // //   } catch (e) {
// // // // // // // // //     _localStore = {}
// // // // // // // // //     console.log(`${tag} ${warn} Could not read local store, starting fresh: ${e.message}`)
// // // // // // // // //   }
// // // // // // // // //   return _localStore
// // // // // // // // // }

// // // // // // // // // function saveLocalStore() {
// // // // // // // // //   try {
// // // // // // // // //     const dir = path.dirname(LOCAL_STORE_PATH)
// // // // // // // // //     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
// // // // // // // // //     fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(_localStore))
// // // // // // // // //   } catch (e) {
// // // // // // // // //     console.error(`${tag} ${fail} Failed to save local store: ${e.message}`)
// // // // // // // // //   }
// // // // // // // // // }

// // // // // // // // // // ── Cosine similarity ─────────────────────────────────────────────────────────
// // // // // // // // // function cosineSim(a, b) {
// // // // // // // // //   let dot = 0, na = 0, nb = 0
// // // // // // // // //   for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i] }
// // // // // // // // //   return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
// // // // // // // // // }

// // // // // // // // // function localQuery(vector, topK) {
// // // // // // // // //   const store   = loadLocalStore()
// // // // // // // // //   const entries = Object.values(store)
// // // // // // // // //   if (entries.length === 0) return []
// // // // // // // // //   return entries
// // // // // // // // //     .map(e => ({ ...e, score: cosineSim(vector, e.values) }))
// // // // // // // // //     .sort((a, b) => b.score - a.score)
// // // // // // // // //     .slice(0, topK)
// // // // // // // // //     .map(e => ({
// // // // // // // // //       id:     e.id,
// // // // // // // // //       score:  e.score,
// // // // // // // // //       text:   e.metadata?.text   || '',
// // // // // // // // //       type:   e.metadata?.type   || 'unknown',
// // // // // // // // //       source: e.metadata?.source || '',
// // // // // // // // //       key:    e.metadata?.key    || null,
// // // // // // // // //       tempo:  e.metadata?.tempo  || null,
// // // // // // // // //     }))
// // // // // // // // // }

// // // // // // // // // function localUpsert(vectors) {
// // // // // // // // //   const store = loadLocalStore()
// // // // // // // // //   for (const v of vectors) store[v.id] = v
// // // // // // // // //   saveLocalStore()
// // // // // // // // // }

// // // // // // // // // function localDeleteMany(ids) {
// // // // // // // // //   const store = loadLocalStore()
// // // // // // // // //   let removed = 0
// // // // // // // // //   for (const id of ids) { if (store[id]) { delete store[id]; removed++ } }
// // // // // // // // //   saveLocalStore()
// // // // // // // // //   return removed
// // // // // // // // // }

// // // // // // // // // // ── Pinecone (optional cloud store) ───────────────────────────────────────────
// // // // // // // // // let _pineconeIndex = null
// // // // // // // // // let _pineconeOk    = null

// // // // // // // // // function getPineconeIndex() {
// // // // // // // // //   if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) return null
// // // // // // // // //   if (_pineconeIndex) return _pineconeIndex
// // // // // // // // //   try {
// // // // // // // // //     const { Pinecone } = require('@pinecone-database/pinecone')
// // // // // // // // //     _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
// // // // // // // // //       .index(process.env.PINECONE_INDEX)
// // // // // // // // //     return _pineconeIndex
// // // // // // // // //   } catch (e) {
// // // // // // // // //     console.log(`${tag} ${warn} Pinecone init failed: ${e.message?.slice(0, 60)}`)
// // // // // // // // //     return null
// // // // // // // // //   }
// // // // // // // // // }

// // // // // // // // // // ── Real semantic embedding via text-embedding-004 ────────────────────────────
// // // // // // // // // // Replaces the old hash-based embedText().
// // // // // // // // // // Batches up to EMBED_BATCH texts per API call to avoid rate limits.
// // // // // // // // // //
// // // // // // // // // // Falls back to the old hash-based method ONLY if the API is unreachable,
// // // // // // // // // // so ingest still works offline — the hash vectors are tagged so they don't
// // // // // // // // // // pollute real-embedding results when connectivity is restored.

// // // // // // // // // async function embedBatch(texts) {
// // // // // // // // //   if (!process.env.GEMINI_API_KEY) {
// // // // // // // // //     console.log(`${tag} ${warn} GEMINI_API_KEY not set — falling back to hash embeddings`)
// // // // // // // // //     return Promise.all(texts.map(t => embedHash(t)))
// // // // // // // // //   }

// // // // // // // // //   try {
// // // // // // // // //     const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
// // // // // // // // //     const model  = client.getGenerativeModel({ model: EMBED_MODEL }, { apiVersion: 'v1beta' })

// // // // // // // // //     const response = await model.batchEmbedContents({
// // // // // // // // //       requests: texts.map(text => ({
// // // // // // // // //         content: { parts: [{ text }] },
// // // // // // // // //         taskType: 'RETRIEVAL_DOCUMENT',
// // // // // // // // //       })),
// // // // // // // // //     })

// // // // // // // // //     return response.embeddings.map(e => e.values)
// // // // // // // // //   } catch (err) {
// // // // // // // // //     console.log(`${tag} ${warn} Embedding API error (${err.message?.slice(0, 60)}) — falling back to hash`)
// // // // // // // // //     return Promise.all(texts.map(t => embedHash(t)))
// // // // // // // // //   }
// // // // // // // // // }

// // // // // // // // // // Single text — used for query-time embedding
// // // // // // // // // async function embedText(text) {
// // // // // // // // //   if (!process.env.GEMINI_API_KEY) return embedHash(text)
// // // // // // // // //   try {
// // // // // // // // //     const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
// // // // // // // // //     const model  = client.getGenerativeModel({ model: EMBED_MODEL }, { apiVersion: 'v1beta' })
// // // // // // // // //     const result = await model.embedContent({
// // // // // // // // //       content:  { parts: [{ text }] },
// // // // // // // // //       taskType: 'RETRIEVAL_QUERY',   // query-side task type for better retrieval
// // // // // // // // //     })
// // // // // // // // //     return result.embedding.values
// // // // // // // // //   } catch (err) {
// // // // // // // // //     console.log(`${tag} ${warn} Query embedding failed (${err.message?.slice(0, 60)}) — using hash`)
// // // // // // // // //     return embedHash(text)
// // // // // // // // //   }
// // // // // // // // // }

// // // // // // // // // // ── Hash-based fallback (original algorithm, kept for offline resilience) ──────
// // // // // // // // // function embedHash(text) {
// // // // // // // // //   const DIM  = EMBED_DIM
// // // // // // // // //   const vec  = new Float32Array(DIM)
// // // // // // // // //   const str  = String(text).toLowerCase()
// // // // // // // // //   const seeds = [31, 37, 41, 43, 47, 53, 59, 61]
// // // // // // // // //   for (const seed of seeds)
// // // // // // // // //     for (let i = 0; i < str.length; i++)
// // // // // // // // //       vec[Math.abs((str.charCodeAt(i) * seed + i * 7 + seed * 13) % DIM)] += 1 / seeds.length
// // // // // // // // //   for (let i = 0; i < str.length - 1; i++)
// // // // // // // // //     vec[Math.abs((str.charCodeAt(i) * 256 + str.charCodeAt(i+1)) % DIM)] += 0.5
// // // // // // // // //   for (let i = 0; i < str.length - 2; i++) {
// // // // // // // // //     const tri = str.charCodeAt(i) * 65536 + str.charCodeAt(i+1) * 256 + str.charCodeAt(i+2)
// // // // // // // // //     vec[Math.abs(tri % DIM)] += 0.3
// // // // // // // // //   }
// // // // // // // // //   const norm = Math.sqrt(Array.from(vec).reduce((s, v) => s + v*v, 0)) || 1
// // // // // // // // //   return Array.from(vec).map(v => v / norm)
// // // // // // // // // }

// // // // // // // // // // ── PUBLIC API ────────────────────────────────────────────────────────────────

// // // // // // // // // async function query(prompt, topK = 5) {
// // // // // // // // //   const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
// // // // // // // // //   console.log(`${tag} ${info} Query: "${c.dim}${preview}…${c.reset}" (top ${topK})`)

// // // // // // // // //   const vector    = await embedText(prompt)  // RETRIEVAL_QUERY task
// // // // // // // // //   const store     = loadLocalStore()
// // // // // // // // //   const totalVecs = Object.keys(store).length

// // // // // // // // //   if (totalVecs === 0) {
// // // // // // // // //     console.log(`${tag} ${warn} Local store is empty — upload MIDI or docs first`)
// // // // // // // // //     return []
// // // // // // // // //   }

// // // // // // // // //   if (_pineconeOk !== false) {
// // // // // // // // //     const index = getPineconeIndex()
// // // // // // // // //     if (index) {
// // // // // // // // //       try {
// // // // // // // // //         const result  = await index.query({ vector, topK, includeMetadata: true })
// // // // // // // // //         _pineconeOk   = true
// // // // // // // // //         const matches = (result.matches || []).map(m => ({
// // // // // // // // //           id:     m.id,
// // // // // // // // //           score:  m.score,
// // // // // // // // //           text:   m.metadata?.text   || '',
// // // // // // // // //           type:   m.metadata?.type   || 'unknown',
// // // // // // // // //           source: m.metadata?.source || '',
// // // // // // // // //           key:    m.metadata?.key    || null,
// // // // // // // // //           tempo:  m.metadata?.tempo  || null,
// // // // // // // // //         }))
// // // // // // // // //         const local  = localQuery(vector, topK)
// // // // // // // // //         const allIds = new Set(matches.map(m => m.id))
// // // // // // // // //         const extras = local.filter(l => !allIds.has(l.id))
// // // // // // // // //         const final  = [...matches, ...extras].slice(0, topK)
// // // // // // // // //         console.log(`${tag} ${ok} Pinecone: ${matches.length} hits  |  Local bonus: ${extras.length}`)
// // // // // // // // //         _logChunks(final)
// // // // // // // // //         return final
// // // // // // // // //       } catch (err) {
// // // // // // // // //         _pineconeOk = false
// // // // // // // // //         console.log(`${tag} ${warn} Pinecone unreachable — using local store`)
// // // // // // // // //         console.log(`${tag} ${c.dim}  reason: ${err.message?.slice(0, 80)}${c.reset}`)
// // // // // // // // //       }
// // // // // // // // //     } else if (process.env.PINECONE_API_KEY) {
// // // // // // // // //       console.log(`${tag} ${warn} Pinecone configured but index not reachable — using local store`)
// // // // // // // // //     }
// // // // // // // // //   }

// // // // // // // // //   const results = localQuery(vector, topK)
// // // // // // // // //   if (results.length === 0) {
// // // // // // // // //     console.log(`${tag} ${warn} No matching chunks (store: ${totalVecs} vectors)`)
// // // // // // // // //   } else {
// // // // // // // // //     console.log(`${tag} ${ok} Local: ${results.length}/${totalVecs} chunks matched`)
// // // // // // // // //     _logChunks(results)
// // // // // // // // //   }
// // // // // // // // //   return results
// // // // // // // // // }

// // // // // // // // // async function upsert(chunks) {
// // // // // // // // //   if (!chunks || chunks.length === 0) return

// // // // // // // // //   console.log(`${tag} ${info} Embedding ${c.bold}${chunks.length} chunks${c.reset} via ${EMBED_MODEL}…`)

// // // // // // // // //   // ── Batch embed all chunk texts ────────────────────────────────────────────
// // // // // // // // //   const texts   = chunks.map(ch => ch.text)
// // // // // // // // //   const allVecs = []

// // // // // // // // //   for (let i = 0; i < texts.length; i += EMBED_BATCH) {
// // // // // // // // //     const batch = texts.slice(i, i + EMBED_BATCH)
// // // // // // // // //     const vecs  = await embedBatch(batch)
// // // // // // // // //     allVecs.push(...vecs)
// // // // // // // // //     if (texts.length > EMBED_BATCH)
// // // // // // // // //       process.stdout.write(`${tag} ${c.dim}  embedded ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length}…${c.reset}\r`)
// // // // // // // // //   }
// // // // // // // // //   if (texts.length > EMBED_BATCH) console.log()

// // // // // // // // //   // ── Build vector records ───────────────────────────────────────────────────
// // // // // // // // //   const vectors = chunks.map((chunk, i) => ({
// // // // // // // // //     id:     chunk.id,
// // // // // // // // //     values: allVecs[i],
// // // // // // // // //     metadata: {
// // // // // // // // //       text:   chunk.text,
// // // // // // // // //       type:   chunk.metadata?.type   || 'unknown',
// // // // // // // // //       source: chunk.metadata?.source || '',
// // // // // // // // //       key:    chunk.metadata?.key    || '',
// // // // // // // // //       tempo:  chunk.metadata?.tempo  || 0,
// // // // // // // // //     },
// // // // // // // // //   }))

// // // // // // // // //   localUpsert(vectors)
// // // // // // // // //   const total = Object.keys(loadLocalStore()).length
// // // // // // // // //   console.log(`${tag} ${ok} Local store — ${c.bold}${total} vectors${c.reset} total`)

// // // // // // // // //   const byType = {}
// // // // // // // // //   for (const v of vectors) { const t = v.metadata.type; byType[t] = (byType[t] || 0) + 1 }
// // // // // // // // //   console.log(`${tag} ${info} Types: ${c.dim}${Object.entries(byType).map(([t,n])=>`${t}×${n}`).join('  ')}${c.reset}`)

// // // // // // // // //   if (_pineconeOk !== false) {
// // // // // // // // //     const index = getPineconeIndex()
// // // // // // // // //     if (index) {
// // // // // // // // //       try {
// // // // // // // // //         const BATCH = 100
// // // // // // // // //         for (let i = 0; i < vectors.length; i += BATCH)
// // // // // // // // //           await index.upsert(vectors.slice(i, i + BATCH))
// // // // // // // // //         _pineconeOk = true
// // // // // // // // //         console.log(`${tag} ${ok} Pinecone synced — ${vectors.length} vectors`)
// // // // // // // // //       } catch (err) {
// // // // // // // // //         _pineconeOk = false
// // // // // // // // //         console.log(`${tag} ${warn} Pinecone sync failed (local is source of truth)`)
// // // // // // // // //         console.log(`${tag} ${c.dim}  reason: ${err.message?.slice(0, 80)}${c.reset}`)
// // // // // // // // //       }
// // // // // // // // //     }
// // // // // // // // //   }
// // // // // // // // // }

// // // // // // // // // async function deleteMany(ids) {
// // // // // // // // //   if (!ids || ids.length === 0) return
// // // // // // // // //   const removed = localDeleteMany(ids)
// // // // // // // // //   const total   = Object.keys(loadLocalStore()).length
// // // // // // // // //   console.log(`${tag} ${ok} Deleted ${removed} vectors (${total} remaining)`)

// // // // // // // // //   if (_pineconeOk !== false) {
// // // // // // // // //     const index = getPineconeIndex()
// // // // // // // // //     if (index) {
// // // // // // // // //       try { await index.deleteMany(ids); console.log(`${tag} ${ok} Pinecone delete synced`) }
// // // // // // // // //       catch (err) { console.log(`${tag} ${warn} Pinecone delete failed (local already cleaned)`) }
// // // // // // // // //     }
// // // // // // // // //   }
// // // // // // // // // }

// // // // // // // // // async function deleteBySource(sourceName) {
// // // // // // // // //   const store    = loadLocalStore()
// // // // // // // // //   const toDelete = Object.values(store)
// // // // // // // // //     .filter(v => v.metadata?.source === sourceName)
// // // // // // // // //     .map(v => v.id)
// // // // // // // // //   if (toDelete.length > 0) await deleteMany(toDelete)
// // // // // // // // //   return toDelete.length
// // // // // // // // // }

// // // // // // // // // function _logChunks(chunks) {
// // // // // // // // //   for (const ch of chunks) {
// // // // // // // // //     const score   = (ch.score * 100).toFixed(1)
// // // // // // // // //     const src     = ch.source?.split(/[/\\]/).pop() || 'unknown'
// // // // // // // // //     const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
// // // // // // // // //     console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
// // // // // // // // //   }
// // // // // // // // // }

// // // // // // // // // module.exports = { query, upsert, deleteMany, deleteBySource, embedText }










// // // // // // // // 'use strict'
// // // // // // // // // backend/services/ragService.js
// // // // // // // // //
// // // // // // // // // FIXES vs original:
// // // // // // // // //   1. _pineconeOk permanent-false removed → replaced with 60s retry cooldown
// // // // // // // // //      (one transient error used to kill Pinecone for the entire server lifetime)
// // // // // // // // //   2. _pineconeIndex reset to null on failure so next call re-inits cleanly
// // // // // // // // //   3. syncToPinecone() added — call once after deploy to push localRag → cloud
// // // // // // // // //   4. Pinecone env var check logged on first call for easier debugging
// // // // // // // // //   5. On production (NODE_ENV=production) Pinecone is preferred for query;
// // // // // // // // //      local is still the write-through cache

// // // // // // // // const fs   = require('fs')
// // // // // // // // const path = require('path')
// // // // // // // // const { GoogleGenerativeAI } = require('@google/generative-ai')

// // // // // // // // // ── Terminal colours ───────────────────────────────────────────────────────────
// // // // // // // // const c = {
// // // // // // // //   reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
// // // // // // // //   yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
// // // // // // // //   bold: '\x1b[1m', gray: '\x1b[90m',
// // // // // // // // }
// // // // // // // // const tag  = `${c.cyan}[RAG]${c.reset}`
// // // // // // // // const ok   = `${c.green}✔${c.reset}`
// // // // // // // // const warn = `${c.yellow}⚠${c.reset}`
// // // // // // // // const fail = `${c.red}✘${c.reset}`
// // // // // // // // const info = `${c.gray}•${c.reset}`

// // // // // // // // // ── Embedding config ──────────────────────────────────────────────────────────
// // // // // // // // const EMBED_MODEL = 'text-embedding-004'
// // // // // // // // const EMBED_DIM   = 768
// // // // // // // // const EMBED_BATCH = 20

// // // // // // // // // ── Local disk-persisted vector store ─────────────────────────────────────────
// // // // // // // // const LOCAL_STORE_PATH = path.join(__dirname, '../db/localRag.json')
// // // // // // // // let _localStore = null

// // // // // // // // function loadLocalStore() {
// // // // // // // //   if (_localStore) return _localStore
// // // // // // // //   try {
// // // // // // // //     if (fs.existsSync(LOCAL_STORE_PATH)) {
// // // // // // // //       _localStore = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, 'utf8'))
// // // // // // // //       const count = Object.keys(_localStore).length
// // // // // // // //       const first = Object.values(_localStore)[0]
// // // // // // // //       if (first && first.values && first.values.length !== EMBED_DIM) {
// // // // // // // //         console.log(`${tag} ${warn} Stale ${first.values.length}-dim store — clearing (re-ingest required)`)
// // // // // // // //         _localStore = {}
// // // // // // // //         saveLocalStore()
// // // // // // // //       } else {
// // // // // // // //         console.log(`${tag} ${ok} Local store — ${c.bold}${count} vectors${c.reset} (${EMBED_DIM}-dim)`)
// // // // // // // //       }
// // // // // // // //     } else {
// // // // // // // //       _localStore = {}
// // // // // // // //       console.log(`${tag} ${info} Local store empty`)
// // // // // // // //     }
// // // // // // // //   } catch (e) {
// // // // // // // //     _localStore = {}
// // // // // // // //     console.log(`${tag} ${warn} Local store unreadable, starting fresh: ${e.message}`)
// // // // // // // //   }
// // // // // // // //   return _localStore
// // // // // // // // }

// // // // // // // // function saveLocalStore() {
// // // // // // // //   try {
// // // // // // // //     const dir = path.dirname(LOCAL_STORE_PATH)
// // // // // // // //     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
// // // // // // // //     fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(_localStore))
// // // // // // // //   } catch (e) {
// // // // // // // //     console.error(`${tag} ${fail} Local store save failed: ${e.message}`)
// // // // // // // //   }
// // // // // // // // }

// // // // // // // // // ── Cosine similarity ─────────────────────────────────────────────────────────
// // // // // // // // function cosineSim(a, b) {
// // // // // // // //   let dot = 0, na = 0, nb = 0
// // // // // // // //   for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i] }
// // // // // // // //   return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
// // // // // // // // }

// // // // // // // // function localQuery(vector, topK) {
// // // // // // // //   const entries = Object.values(loadLocalStore())
// // // // // // // //   if (entries.length === 0) return []
// // // // // // // //   return entries
// // // // // // // //     .map(e => ({ ...e, score: cosineSim(vector, e.values) }))
// // // // // // // //     .sort((a, b) => b.score - a.score)
// // // // // // // //     .slice(0, topK)
// // // // // // // //     .map(e => ({
// // // // // // // //       id:     e.id,
// // // // // // // //       score:  e.score,
// // // // // // // //       text:   e.metadata?.text   || '',
// // // // // // // //       type:   e.metadata?.type   || 'unknown',
// // // // // // // //       source: e.metadata?.source || '',
// // // // // // // //       key:    e.metadata?.key    || null,
// // // // // // // //       tempo:  e.metadata?.tempo  || null,
// // // // // // // //     }))
// // // // // // // // }

// // // // // // // // function localUpsert(vectors) {
// // // // // // // //   const store = loadLocalStore()
// // // // // // // //   for (const v of vectors) store[v.id] = v
// // // // // // // //   saveLocalStore()
// // // // // // // // }

// // // // // // // // function localDeleteMany(ids) {
// // // // // // // //   const store = loadLocalStore()
// // // // // // // //   let removed = 0
// // // // // // // //   for (const id of ids) { if (store[id]) { delete store[id]; removed++ } }
// // // // // // // //   saveLocalStore()
// // // // // // // //   return removed
// // // // // // // // }

// // // // // // // // // ── Pinecone — retry cooldown, NOT permanent failure ──────────────────────────
// // // // // // // // //
// // // // // // // // // Original code set _pineconeOk = false permanently on any error, killing
// // // // // // // // // Pinecone for the entire server lifetime. On Render (which gets cold-started
// // // // // // // // // frequently) this means one transient failure → no Pinecone ever.
// // // // // // // // //
// // // // // // // // // New approach: track timestamp of last failure, retry after RETRY_MS.
// // // // // // // // // _pineconeIndex is also reset to null on failure so it re-inits cleanly.

// // // // // // // // let _pineconeIndex  = null
// // // // // // // // let _pineconeFailAt = null          // ms timestamp of last failure
// // // // // // // // const PINECONE_RETRY_MS = 60_000   // 60 seconds before retry

// // // // // // // // let _pineconeEnvLogged = false

// // // // // // // // function isPineconeConfigured() {
// // // // // // // //   const ok = !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX)
// // // // // // // //   if (!_pineconeEnvLogged) {
// // // // // // // //     _pineconeEnvLogged = true
// // // // // // // //     if (ok) {
// // // // // // // //       console.log(`${tag} ${info} Pinecone configured — index: ${c.cyan}${process.env.PINECONE_INDEX}${c.reset}`)
// // // // // // // //     } else {
// // // // // // // //       const missing = []
// // // // // // // //       if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
// // // // // // // //       if (!process.env.PINECONE_INDEX)   missing.push('PINECONE_INDEX')
// // // // // // // //       console.log(`${tag} ${warn} Pinecone disabled — missing env vars: ${missing.join(', ')}`)
// // // // // // // //       console.log(`${tag} ${warn} Set these in Render dashboard → Environment → Add variables`)
// // // // // // // //     }
// // // // // // // //   }
// // // // // // // //   return ok
// // // // // // // // }

// // // // // // // // function canTryPinecone() {
// // // // // // // //   if (!isPineconeConfigured()) return false
// // // // // // // //   if (_pineconeFailAt && (Date.now() - _pineconeFailAt) < PINECONE_RETRY_MS) {
// // // // // // // //     // Still in cooldown
// // // // // // // //     return false
// // // // // // // //   }
// // // // // // // //   return true
// // // // // // // // }

// // // // // // // // function getPineconeIndex() {
// // // // // // // //   if (!canTryPinecone()) return null
// // // // // // // //   if (_pineconeIndex) return _pineconeIndex
// // // // // // // //   try {
// // // // // // // //     const { Pinecone } = require('@pinecone-database/pinecone')
// // // // // // // //     _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
// // // // // // // //       .index(process.env.PINECONE_INDEX)
// // // // // // // //     console.log(`${tag} ${ok} Pinecone index handle created`)
// // // // // // // //     return _pineconeIndex
// // // // // // // //   } catch (e) {
// // // // // // // //     _pineconeFailAt = Date.now()
// // // // // // // //     console.log(`${tag} ${warn} Pinecone init failed (retry in ${PINECONE_RETRY_MS/1000}s): ${e.message?.slice(0, 80)}`)
// // // // // // // //     return null
// // // // // // // //   }
// // // // // // // // }

// // // // // // // // function onPineconeError(err) {
// // // // // // // //   _pineconeFailAt = Date.now()
// // // // // // // //   _pineconeIndex  = null  // force re-init on next attempt
// // // // // // // //   console.log(`${tag} ${warn} Pinecone error (retry in ${PINECONE_RETRY_MS/1000}s): ${err.message?.slice(0, 80)}`)
// // // // // // // // }

// // // // // // // // function onPineconeSuccess() {
// // // // // // // //   _pineconeFailAt = null  // clear cooldown on success
// // // // // // // // }

// // // // // // // // // ── Embedding ─────────────────────────────────────────────────────────────────
// // // // // // // // async function embedBatch(texts) {
// // // // // // // //   if (!process.env.GEMINI_API_KEY) {
// // // // // // // //     console.log(`${tag} ${warn} GEMINI_API_KEY not set — using hash fallback`)
// // // // // // // //     return Promise.all(texts.map(embedHash))
// // // // // // // //   }
// // // // // // // //   try {
// // // // // // // //     const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
// // // // // // // //     const model  = client.getGenerativeModel({ model: EMBED_MODEL }, { apiVersion: 'v1beta' })
// // // // // // // //     const response = await model.batchEmbedContents({
// // // // // // // //       requests: texts.map(text => ({
// // // // // // // //         content:  { parts: [{ text }] },
// // // // // // // //         taskType: 'RETRIEVAL_DOCUMENT',
// // // // // // // //       })),
// // // // // // // //     })
// // // // // // // //     return response.embeddings.map(e => e.values)
// // // // // // // //   } catch (err) {
// // // // // // // //     console.log(`${tag} ${warn} Embed API error — hash fallback: ${err.message?.slice(0, 60)}`)
// // // // // // // //     return Promise.all(texts.map(embedHash))
// // // // // // // //   }
// // // // // // // // }

// // // // // // // // async function embedText(text) {
// // // // // // // //   if (!process.env.GEMINI_API_KEY) return embedHash(text)
// // // // // // // //   try {
// // // // // // // //     const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
// // // // // // // //     const model  = client.getGenerativeModel({ model: EMBED_MODEL }, { apiVersion: 'v1beta' })
// // // // // // // //     const result = await model.embedContent({
// // // // // // // //       content:  { parts: [{ text }] },
// // // // // // // //       taskType: 'RETRIEVAL_QUERY',
// // // // // // // //     })
// // // // // // // //     return result.embedding.values
// // // // // // // //   } catch (err) {
// // // // // // // //     console.log(`${tag} ${warn} Query embed failed — hash fallback: ${err.message?.slice(0, 60)}`)
// // // // // // // //     return embedHash(text)
// // // // // // // //   }
// // // // // // // // }

// // // // // // // // function embedHash(text) {
// // // // // // // //   const vec  = new Float32Array(EMBED_DIM)
// // // // // // // //   const str  = String(text).toLowerCase()
// // // // // // // //   const seeds = [31, 37, 41, 43, 47, 53, 59, 61]
// // // // // // // //   for (const seed of seeds)
// // // // // // // //     for (let i = 0; i < str.length; i++)
// // // // // // // //       vec[Math.abs((str.charCodeAt(i) * seed + i * 7 + seed * 13) % EMBED_DIM)] += 1 / seeds.length
// // // // // // // //   for (let i = 0; i < str.length - 1; i++)
// // // // // // // //     vec[Math.abs((str.charCodeAt(i) * 256 + str.charCodeAt(i+1)) % EMBED_DIM)] += 0.5
// // // // // // // //   for (let i = 0; i < str.length - 2; i++) {
// // // // // // // //     const tri = str.charCodeAt(i) * 65536 + str.charCodeAt(i+1) * 256 + str.charCodeAt(i+2)
// // // // // // // //     vec[Math.abs(tri % EMBED_DIM)] += 0.3
// // // // // // // //   }
// // // // // // // //   const norm = Math.sqrt(Array.from(vec).reduce((s, v) => s + v*v, 0)) || 1
// // // // // // // //   return Array.from(vec).map(v => v / norm)
// // // // // // // // }

// // // // // // // // // ── PUBLIC API ─────────────────────────────────────────────────────────────────

// // // // // // // // function _logChunks(chunks) {
// // // // // // // //   for (const ch of chunks) {
// // // // // // // //     const score   = (ch.score * 100).toFixed(1)
// // // // // // // //     const src     = ch.source?.split(/[/\\]/).pop() || 'unknown'
// // // // // // // //     const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
// // // // // // // //     console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
// // // // // // // //   }
// // // // // // // // }

// // // // // // // // async function query(prompt, topK = 5) {
// // // // // // // //   const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
// // // // // // // //   console.log(`${tag} ${info} Query: "${c.dim}${preview}…${c.reset}" (top ${topK})`)

// // // // // // // //   const vector    = await embedText(prompt)
// // // // // // // //   const store     = loadLocalStore()
// // // // // // // //   const totalVecs = Object.keys(store).length

// // // // // // // //   if (totalVecs === 0 && !isPineconeConfigured()) {
// // // // // // // //     console.log(`${tag} ${warn} Both local store and Pinecone are empty — upload files first`)
// // // // // // // //     return []
// // // // // // // //   }

// // // // // // // //   const index = getPineconeIndex()
// // // // // // // //   if (index) {
// // // // // // // //     try {
// // // // // // // //       const result  = await index.query({ vector, topK, includeMetadata: true })
// // // // // // // //       onPineconeSuccess()
// // // // // // // //       const matches = (result.matches || []).map(m => ({
// // // // // // // //         id:     m.id,
// // // // // // // //         score:  m.score,
// // // // // // // //         text:   m.metadata?.text   || '',
// // // // // // // //         type:   m.metadata?.type   || 'unknown',
// // // // // // // //         source: m.metadata?.source || '',
// // // // // // // //         key:    m.metadata?.key    || null,
// // // // // // // //         tempo:  m.metadata?.tempo  || null,
// // // // // // // //       }))
// // // // // // // //       // Augment with local hits not already in Pinecone result
// // // // // // // //       if (totalVecs > 0) {
// // // // // // // //         const local  = localQuery(vector, topK)
// // // // // // // //         const allIds = new Set(matches.map(m => m.id))
// // // // // // // //         const extras = local.filter(l => !allIds.has(l.id))
// // // // // // // //         const final  = [...matches, ...extras].slice(0, topK)
// // // // // // // //         console.log(`${tag} ${ok} Pinecone: ${matches.length} hits  |  Local bonus: ${extras.length}`)
// // // // // // // //         _logChunks(final)
// // // // // // // //         return final
// // // // // // // //       }
// // // // // // // //       console.log(`${tag} ${ok} Pinecone: ${matches.length} hits`)
// // // // // // // //       _logChunks(matches)
// // // // // // // //       return matches
// // // // // // // //     } catch (err) {
// // // // // // // //       onPineconeError(err)
// // // // // // // //       console.log(`${tag} ${warn} Pinecone unreachable — falling back to local store`)
// // // // // // // //     }
// // // // // // // //   }

// // // // // // // //   if (totalVecs === 0) {
// // // // // // // //     console.log(`${tag} ${warn} Local store empty — no RAG context`)
// // // // // // // //     return []
// // // // // // // //   }

// // // // // // // //   const results = localQuery(vector, topK)
// // // // // // // //   if (results.length === 0) {
// // // // // // // //     console.log(`${tag} ${warn} No matching chunks (store: ${totalVecs} vectors)`)
// // // // // // // //   } else {
// // // // // // // //     console.log(`${tag} ${ok} Local: ${results.length}/${totalVecs} matched`)
// // // // // // // //     _logChunks(results)
// // // // // // // //   }
// // // // // // // //   return results
// // // // // // // // }

// // // // // // // // async function upsert(chunks) {
// // // // // // // //   if (!chunks || chunks.length === 0) return

// // // // // // // //   console.log(`${tag} ${info} Embedding ${c.bold}${chunks.length} chunks${c.reset}…`)

// // // // // // // //   const texts   = chunks.map(ch => ch.text)
// // // // // // // //   const allVecs = []
// // // // // // // //   for (let i = 0; i < texts.length; i += EMBED_BATCH) {
// // // // // // // //     const vecs = await embedBatch(texts.slice(i, i + EMBED_BATCH))
// // // // // // // //     allVecs.push(...vecs)
// // // // // // // //     if (texts.length > EMBED_BATCH)
// // // // // // // //       process.stdout.write(`${tag} ${c.dim}  ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length}…${c.reset}\r`)
// // // // // // // //   }
// // // // // // // //   if (texts.length > EMBED_BATCH) console.log()

// // // // // // // //   const vectors = chunks.map((chunk, i) => ({
// // // // // // // //     id:     chunk.id,
// // // // // // // //     values: allVecs[i],
// // // // // // // //     metadata: {
// // // // // // // //       text:   chunk.text,
// // // // // // // //       type:   chunk.metadata?.type   || 'unknown',
// // // // // // // //       source: chunk.metadata?.source || '',
// // // // // // // //       key:    chunk.metadata?.key    || '',
// // // // // // // //       tempo:  chunk.metadata?.tempo  || 0,
// // // // // // // //     },
// // // // // // // //   }))

// // // // // // // //   localUpsert(vectors)
// // // // // // // //   console.log(`${tag} ${ok} Local store — ${c.bold}${Object.keys(loadLocalStore()).length} vectors${c.reset} total`)

// // // // // // // //   const index = getPineconeIndex()
// // // // // // // //   if (index) {
// // // // // // // //     try {
// // // // // // // //       const BATCH = 100
// // // // // // // //       for (let i = 0; i < vectors.length; i += BATCH)
// // // // // // // //         await index.upsert(vectors.slice(i, i + BATCH))
// // // // // // // //       onPineconeSuccess()
// // // // // // // //       console.log(`${tag} ${ok} Pinecone synced — ${vectors.length} vectors`)
// // // // // // // //     } catch (err) {
// // // // // // // //       onPineconeError(err)
// // // // // // // //       console.log(`${tag} ${warn} Pinecone sync failed — data safe in local store`)
// // // // // // // //       console.log(`${tag} ${warn} Call POST /api/knowledge/sync-pinecone later to push to cloud`)
// // // // // // // //     }
// // // // // // // //   }
// // // // // // // // }

// // // // // // // // async function deleteMany(ids) {
// // // // // // // //   if (!ids || ids.length === 0) return
// // // // // // // //   const removed = localDeleteMany(ids)
// // // // // // // //   console.log(`${tag} ${ok} Deleted ${removed} vectors`)

// // // // // // // //   const index = getPineconeIndex()
// // // // // // // //   if (index) {
// // // // // // // //     try {
// // // // // // // //       await index.deleteMany(ids)
// // // // // // // //       onPineconeSuccess()
// // // // // // // //       console.log(`${tag} ${ok} Pinecone delete synced`)
// // // // // // // //     } catch (err) {
// // // // // // // //       onPineconeError(err)
// // // // // // // //       console.log(`${tag} ${warn} Pinecone delete failed (local already cleaned)`)
// // // // // // // //     }
// // // // // // // //   }
// // // // // // // // }

// // // // // // // // async function deleteBySource(sourceName) {
// // // // // // // //   const store    = loadLocalStore()
// // // // // // // //   const toDelete = Object.values(store)
// // // // // // // //     .filter(v => v.metadata?.source === sourceName)
// // // // // // // //     .map(v => v.id)
// // // // // // // //   if (toDelete.length > 0) await deleteMany(toDelete)
// // // // // // // //   return toDelete.length
// // // // // // // // }

// // // // // // // // // ── NEW: Force-push all local vectors to Pinecone ─────────────────────────────
// // // // // // // // // Use this via POST /api/knowledge/sync-pinecone after first deploy on Render.
// // // // // // // // // On Render, localRag.json is ephemeral (wiped on restart), so Pinecone must
// // // // // // // // // be kept in sync. Once Pinecone has the data, it survives restarts.
// // // // // // // // //
// // // // // // // // // Workflow:
// // // // // // // // //   1. Deploy on Render, set PINECONE_API_KEY + PINECONE_INDEX in env vars
// // // // // // // // //   2. On localhost, POST /api/knowledge/sync-pinecone → pushes local → cloud
// // // // // // // // //   3. From now on, Render queries Pinecone directly (survives restarts)

// // // // // // // // async function syncToPinecone() {
// // // // // // // //   if (!isPineconeConfigured()) {
// // // // // // // //     throw new Error('Pinecone env vars not set. Add PINECONE_API_KEY and PINECONE_INDEX to Render env vars.')
// // // // // // // //   }

// // // // // // // //   const index = getPineconeIndex()
// // // // // // // //   if (!index) throw new Error('Could not create Pinecone index handle — check API key and index name')

// // // // // // // //   const store   = loadLocalStore()
// // // // // // // //   const vectors = Object.values(store)
// // // // // // // //   if (vectors.length === 0) return { synced: 0, message: 'Local store is empty — ingest files first' }

// // // // // // // //   const BATCH = 100
// // // // // // // //   let synced = 0
// // // // // // // //   for (let i = 0; i < vectors.length; i += BATCH) {
// // // // // // // //     await index.upsert(vectors.slice(i, i + BATCH))
// // // // // // // //     synced += vectors.slice(i, i + BATCH).length
// // // // // // // //     if (vectors.length > BATCH)
// // // // // // // //       process.stdout.write(`${tag} ${c.dim}  sync ${synced}/${vectors.length}…${c.reset}\r`)
// // // // // // // //   }
// // // // // // // //   if (vectors.length > BATCH) console.log()

// // // // // // // //   onPineconeSuccess()
// // // // // // // //   console.log(`${tag} ${ok} Force-synced ${c.bold}${synced} vectors${c.reset} to Pinecone`)
// // // // // // // //   return { synced, index: process.env.PINECONE_INDEX }
// // // // // // // // }

// // // // // // // // module.exports = { query, upsert, deleteMany, deleteBySource, embedText, syncToPinecone }






























// // // // // // // 'use strict'
// // // // // // // // backend/services/ragService.js
// // // // // // // // Pinecone-only. No localRag.json. No local fallback.
// // // // // // // // Requires: GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX

// // // // // // // const { GoogleGenerativeAI } = require('@google/generative-ai')

// // // // // // // // ── Terminal colours ───────────────────────────────────────────────────────────
// // // // // // // const c = {
// // // // // // //   reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
// // // // // // //   yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
// // // // // // //   bold: '\x1b[1m', gray: '\x1b[90m',
// // // // // // // }
// // // // // // // const tag  = `${c.cyan}[RAG]${c.reset}`
// // // // // // // const ok   = `${c.green}✔${c.reset}`
// // // // // // // const warn = `${c.yellow}⚠${c.reset}`
// // // // // // // const fail = `${c.red}✘${c.reset}`
// // // // // // // const info = `${c.gray}•${c.reset}`

// // // // // // // // ── Embedding config ───────────────────────────────────────────────────────────
// // // // // // // const EMBED_MODEL = 'text-embedding-004'
// // // // // // // const EMBED_DIM   = 768   // must match your Pinecone index dimension
// // // // // // // const EMBED_BATCH = 20

// // // // // // // // ── Pinecone ───────────────────────────────────────────────────────────────────
// // // // // // // let _pineconeIndex  = null
// // // // // // // let _pineconeFailAt = null
// // // // // // // const PINECONE_RETRY_MS = 60_000
// // // // // // // let _envLogged = false

// // // // // // // function isPineconeConfigured() {
// // // // // // //   const configured = !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX)
// // // // // // //   if (!_envLogged) {
// // // // // // //     _envLogged = true
// // // // // // //     if (configured) {
// // // // // // //       console.log(`${tag} ${info} Pinecone index: ${c.cyan}${process.env.PINECONE_INDEX}${c.reset} (dim=${EMBED_DIM})`)
// // // // // // //     } else {
// // // // // // //       const missing = []
// // // // // // //       if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
// // // // // // //       if (!process.env.PINECONE_INDEX)   missing.push('PINECONE_INDEX')
// // // // // // //       console.log(`${tag} ${warn} Pinecone disabled — missing: ${missing.join(', ')}`)
// // // // // // //     }
// // // // // // //   }
// // // // // // //   return configured
// // // // // // // }

// // // // // // // function canTryPinecone() {
// // // // // // //   if (!isPineconeConfigured()) return false
// // // // // // //   if (_pineconeFailAt && (Date.now() - _pineconeFailAt) < PINECONE_RETRY_MS) return false
// // // // // // //   return true
// // // // // // // }

// // // // // // // function getPineconeIndex() {
// // // // // // //   if (!canTryPinecone()) return null
// // // // // // //   if (_pineconeIndex) return _pineconeIndex
// // // // // // //   try {
// // // // // // //     const { Pinecone } = require('@pinecone-database/pinecone')
// // // // // // //     _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
// // // // // // //       .index(process.env.PINECONE_INDEX)
// // // // // // //     console.log(`${tag} ${ok} Pinecone connected`)
// // // // // // //     return _pineconeIndex
// // // // // // //   } catch (e) {
// // // // // // //     _pineconeFailAt = Date.now()
// // // // // // //     _pineconeIndex  = null
// // // // // // //     console.log(`${tag} ${warn} Pinecone init failed (retry in 60s): ${e.message?.slice(0, 80)}`)
// // // // // // //     return null
// // // // // // //   }
// // // // // // // }

// // // // // // // function onPineconeError(err) {
// // // // // // //   _pineconeFailAt = Date.now()
// // // // // // //   _pineconeIndex  = null
// // // // // // //   console.log(`${tag} ${warn} Pinecone error (retry in 60s): ${err.message?.slice(0, 80)}`)
// // // // // // // }

// // // // // // // function onPineconeSuccess() {
// // // // // // //   _pineconeFailAt = null
// // // // // // // }

// // // // // // // // ── Gemini Embeddings ──────────────────────────────────────────────────────────
// // // // // // // async function embedBatch(texts, taskType = 'RETRIEVAL_DOCUMENT') {
// // // // // // //   if (!process.env.GEMINI_API_KEY) {
// // // // // // //     throw new Error('GEMINI_API_KEY is not set — cannot embed. Set it in your Render environment variables.')
// // // // // // //   }
// // // // // // //   try {
// // // // // // //     const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
// // // // // // //     const model  = client.getGenerativeModel({ model: EMBED_MODEL })
// // // // // // //     const response = await model.batchEmbedContents({
// // // // // // //       requests: texts.map(text => ({
// // // // // // //         content:  { parts: [{ text }] },
// // // // // // //         taskType,
// // // // // // //       })),
// // // // // // //     })
// // // // // // //     const vecs = response.embeddings.map(e => e.values)
// // // // // // //     // Validate dimensions on first call
// // // // // // //     if (vecs[0] && vecs[0].length !== EMBED_DIM) {
// // // // // // //       throw new Error(
// // // // // // //         `Embedding dimension mismatch: got ${vecs[0].length}, expected ${EMBED_DIM}. ` +
// // // // // // //         `Recreate your Pinecone index with dimension=${vecs[0].length}.`
// // // // // // //       )
// // // // // // //     }
// // // // // // //     return vecs
// // // // // // //   } catch (err) {
// // // // // // //     console.log(`${tag} ${fail} Gemini embed failed: ${err.message}`)
// // // // // // //     throw err
// // // // // // //   }
// // // // // // // }

// // // // // // // async function embedText(text) {
// // // // // // //   if (!process.env.GEMINI_API_KEY) {
// // // // // // //     throw new Error('GEMINI_API_KEY is not set.')
// // // // // // //   }
// // // // // // //   try {
// // // // // // //     const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
// // // // // // //     const model  = client.getGenerativeModel({ model: EMBED_MODEL })
// // // // // // //     const result = await model.embedContent({
// // // // // // //       content:  { parts: [{ text }] },
// // // // // // //       taskType: 'RETRIEVAL_QUERY',
// // // // // // //     })
// // // // // // //     return result.embedding.values
// // // // // // //   } catch (err) {
// // // // // // //     console.log(`${tag} ${fail} Gemini query embed failed: ${err.message}`)
// // // // // // //     throw err
// // // // // // //   }
// // // // // // // }

// // // // // // // // ── Logging helpers ────────────────────────────────────────────────────────────
// // // // // // // function _logChunks(chunks) {
// // // // // // //   for (const ch of chunks) {
// // // // // // //     const score   = (ch.score * 100).toFixed(1)
// // // // // // //     const src     = ch.source?.split(/[/\\]/).pop() || 'unknown'
// // // // // // //     const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
// // // // // // //     console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
// // // // // // //   }
// // // // // // // }

// // // // // // // // ── PUBLIC API ─────────────────────────────────────────────────────────────────

// // // // // // // /**
// // // // // // //  * Embed and upsert chunks into Pinecone.
// // // // // // //  * Throws if Pinecone is not configured or if embedding fails.
// // // // // // //  */
// // // // // // // async function upsert(chunks) {
// // // // // // //   if (!chunks || chunks.length === 0) return

// // // // // // //   if (!isPineconeConfigured()) {
// // // // // // //     throw new Error('Pinecone is not configured. Set PINECONE_API_KEY and PINECONE_INDEX in Render env vars.')
// // // // // // //   }

// // // // // // //   console.log(`${tag} ${info} Embedding ${c.bold}${chunks.length} chunks${c.reset}…`)

// // // // // // //   const texts   = chunks.map(ch => ch.text)
// // // // // // //   const allVecs = []
// // // // // // //   for (let i = 0; i < texts.length; i += EMBED_BATCH) {
// // // // // // //     const vecs = await embedBatch(texts.slice(i, i + EMBED_BATCH))
// // // // // // //     allVecs.push(...vecs)
// // // // // // //     if (texts.length > EMBED_BATCH)
// // // // // // //       process.stdout.write(`${tag} ${c.dim}  ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length}…${c.reset}\r`)
// // // // // // //   }
// // // // // // //   if (texts.length > EMBED_BATCH) console.log()

// // // // // // //   const vectors = chunks.map((chunk, i) => ({
// // // // // // //     id:     chunk.id,
// // // // // // //     values: allVecs[i],
// // // // // // //     metadata: {
// // // // // // //       text:   chunk.text,
// // // // // // //       type:   chunk.metadata?.type   || 'unknown',
// // // // // // //       source: chunk.metadata?.source || '',
// // // // // // //       key:    chunk.metadata?.key    || '',
// // // // // // //       tempo:  chunk.metadata?.tempo  || 0,
// // // // // // //     },
// // // // // // //   }))

// // // // // // //   const index = getPineconeIndex()
// // // // // // //   if (!index) throw new Error('Pinecone index unavailable. Check API key and index name.')

// // // // // // //   try {
// // // // // // //     const BATCH = 100
// // // // // // //     for (let i = 0; i < vectors.length; i += BATCH) {
// // // // // // //       await index.upsert(vectors.slice(i, i + BATCH))
// // // // // // //     }
// // // // // // //     onPineconeSuccess()
// // // // // // //     console.log(`${tag} ${ok} Pinecone — ${c.bold}${vectors.length} vectors stored${c.reset}`)
// // // // // // //   } catch (err) {
// // // // // // //     onPineconeError(err)
// // // // // // //     throw new Error(`Pinecone upsert failed: ${err.message}`)
// // // // // // //   }
// // // // // // // }

// // // // // // // /**
// // // // // // //  * Query Pinecone for top-K most relevant chunks.
// // // // // // //  * Returns [] if Pinecone is not configured or query fails.
// // // // // // //  */
// // // // // // // async function query(prompt, topK = 15) {
// // // // // // //   const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
// // // // // // //   console.log(`${tag} ${info} Query: "${c.dim}${preview}…${c.reset}" (top ${topK})`)

// // // // // // //   if (!isPineconeConfigured()) {
// // // // // // //     console.log(`${tag} ${warn} Pinecone not configured — no RAG context`)
// // // // // // //     return []
// // // // // // //   }

// // // // // // //   let vector
// // // // // // //   try {
// // // // // // //     vector = await embedText(prompt)
// // // // // // //   } catch (err) {
// // // // // // //     console.log(`${tag} ${warn} Embed failed — no RAG context: ${err.message}`)
// // // // // // //     return []
// // // // // // //   }

// // // // // // //   const index = getPineconeIndex()
// // // // // // //   if (!index) {
// // // // // // //     console.log(`${tag} ${warn} Pinecone unavailable — no RAG context`)
// // // // // // //     return []
// // // // // // //   }

// // // // // // //   try {
// // // // // // //     const result  = await index.query({ vector, topK, includeMetadata: true })
// // // // // // //     onPineconeSuccess()
// // // // // // //     const matches = (result.matches || []).map(m => ({
// // // // // // //       id:     m.id,
// // // // // // //       score:  m.score,
// // // // // // //       text:   m.metadata?.text   || '',
// // // // // // //       type:   m.metadata?.type   || 'unknown',
// // // // // // //       source: m.metadata?.source || '',
// // // // // // //       key:    m.metadata?.key    || null,
// // // // // // //       tempo:  m.metadata?.tempo  || null,
// // // // // // //     }))
// // // // // // //     console.log(`${tag} ${ok} Pinecone: ${matches.length} hits`)
// // // // // // //     _logChunks(matches)
// // // // // // //     return matches
// // // // // // //   } catch (err) {
// // // // // // //     onPineconeError(err)
// // // // // // //     console.log(`${tag} ${warn} Pinecone query failed — no RAG context`)
// // // // // // //     return []
// // // // // // //   }
// // // // // // // }

// // // // // // // /**
// // // // // // //  * Delete specific vectors by ID from Pinecone.
// // // // // // //  */
// // // // // // // async function deleteMany(ids) {
// // // // // // //   if (!ids || ids.length === 0) return

// // // // // // //   const index = getPineconeIndex()
// // // // // // //   if (!index) {
// // // // // // //     console.log(`${tag} ${warn} Pinecone unavailable — could not delete vectors`)
// // // // // // //     return
// // // // // // //   }

// // // // // // //   try {
// // // // // // //     await index.deleteMany(ids)
// // // // // // //     onPineconeSuccess()
// // // // // // //     console.log(`${tag} ${ok} Deleted ${ids.length} vectors from Pinecone`)
// // // // // // //   } catch (err) {
// // // // // // //     onPineconeError(err)
// // // // // // //     console.log(`${tag} ${warn} Pinecone delete failed: ${err.message}`)
// // // // // // //   }
// // // // // // // }

// // // // // // // /**
// // // // // // //  * Delete all vectors from a specific source file.
// // // // // // //  * Uses Pinecone metadata filter.
// // // // // // //  */
// // // // // // // async function deleteBySource(sourceName) {
// // // // // // //   const index = getPineconeIndex()
// // // // // // //   if (!index) {
// // // // // // //     console.log(`${tag} ${warn} Pinecone unavailable — could not delete by source`)
// // // // // // //     return 0
// // // // // // //   }

// // // // // // //   try {
// // // // // // //     // Pinecone serverless supports deleteMany with filter
// // // // // // //     await index.deleteMany({ filter: { source: { $eq: sourceName } } })
// // // // // // //     onPineconeSuccess()
// // // // // // //     console.log(`${tag} ${ok} Deleted vectors for source: ${sourceName}`)
// // // // // // //     return 1
// // // // // // //   } catch (err) {
// // // // // // //     // Fallback: if filter delete not supported, log warning
// // // // // // //     onPineconeError(err)
// // // // // // //     console.log(`${tag} ${warn} deleteBySource failed (filter delete may not be supported on your plan): ${err.message}`)
// // // // // // //     return 0
// // // // // // //   }
// // // // // // // }

// // // // // // // /**
// // // // // // //  * Delete ALL vectors in the index.
// // // // // // //  */
// // // // // // // async function deleteAll() {
// // // // // // //   const index = getPineconeIndex()
// // // // // // //   if (!index) throw new Error('Pinecone unavailable')

// // // // // // //   try {
// // // // // // //     await index.deleteAll()
// // // // // // //     onPineconeSuccess()
// // // // // // //     console.log(`${tag} ${ok} Pinecone index cleared`)
// // // // // // //   } catch (err) {
// // // // // // //     onPineconeError(err)
// // // // // // //     throw new Error(`Pinecone deleteAll failed: ${err.message}`)
// // // // // // //   }
// // // // // // // }

// // // // // // // /**
// // // // // // //  * Get vector count from Pinecone index stats.
// // // // // // //  */
// // // // // // // async function getStats() {
// // // // // // //   const index = getPineconeIndex()
// // // // // // //   if (!index) return { vectorCount: 0, configured: false }

// // // // // // //   try {
// // // // // // //     const stats = await index.describeIndexStats()
// // // // // // //     onPineconeSuccess()
// // // // // // //     return {
// // // // // // //       configured:  true,
// // // // // // //       vectorCount: stats.totalVectorCount || 0,
// // // // // // //       dimension:   EMBED_DIM,
// // // // // // //       indexName:   process.env.PINECONE_INDEX,
// // // // // // //     }
// // // // // // //   } catch (err) {
// // // // // // //     onPineconeError(err)
// // // // // // //     return { configured: true, vectorCount: 0, error: err.message }
// // // // // // //   }
// // // // // // // }

// // // // // // // module.exports = { query, upsert, deleteMany, deleteBySource, deleteAll, getStats, isPineconeConfigured }












// // // // // // 'use strict'
// // // // // // // backend/services/ragService.js
// // // // // // // Pinecone-only. No localRag.json. No local fallback.
// // // // // // // Requires: GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX

// // // // // // const { GoogleGenerativeAI } = require('@google/generative-ai')

// // // // // // // ── Terminal colours ───────────────────────────────────────────────────────────
// // // // // // const c = {
// // // // // //   reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
// // // // // //   yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
// // // // // //   bold: '\x1b[1m', gray: '\x1b[90m',
// // // // // // }
// // // // // // const tag  = `${c.cyan}[RAG]${c.reset}`
// // // // // // const ok   = `${c.green}✔${c.reset}`
// // // // // // const warn = `${c.yellow}⚠${c.reset}`
// // // // // // const fail = `${c.red}✘${c.reset}`
// // // // // // const info = `${c.gray}•${c.reset}`

// // // // // // // ── Embedding config ───────────────────────────────────────────────────────────
// // // // // // const EMBED_MODEL = 'text-embedding-004'
// // // // // // const EMBED_DIM   = 768   // must match your Pinecone index dimension
// // // // // // const EMBED_BATCH = 20

// // // // // // // ── Pinecone ───────────────────────────────────────────────────────────────────
// // // // // // let _pineconeIndex  = null
// // // // // // let _pineconeFailAt = null
// // // // // // const PINECONE_RETRY_MS = 60_000
// // // // // // let _envLogged = false

// // // // // // function isPineconeConfigured() {
// // // // // //   const configured = !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX)
// // // // // //   if (!_envLogged) {
// // // // // //     _envLogged = true
// // // // // //     if (configured) {
// // // // // //       console.log(`${tag} ${info} Pinecone index: ${c.cyan}${process.env.PINECONE_INDEX}${c.reset} (dim=${EMBED_DIM})`)
// // // // // //     } else {
// // // // // //       const missing = []
// // // // // //       if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
// // // // // //       if (!process.env.PINECONE_INDEX)   missing.push('PINECONE_INDEX')
// // // // // //       console.log(`${tag} ${warn} Pinecone disabled — missing: ${missing.join(', ')}`)
// // // // // //     }
// // // // // //   }
// // // // // //   return configured
// // // // // // }

// // // // // // function canTryPinecone() {
// // // // // //   if (!isPineconeConfigured()) return false
// // // // // //   if (_pineconeFailAt && (Date.now() - _pineconeFailAt) < PINECONE_RETRY_MS) return false
// // // // // //   return true
// // // // // // }

// // // // // // function getPineconeIndex() {
// // // // // //   if (!canTryPinecone()) return null
// // // // // //   if (_pineconeIndex) return _pineconeIndex
// // // // // //   try {
// // // // // //     const { Pinecone } = require('@pinecone-database/pinecone')
// // // // // //     _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
// // // // // //       .index(process.env.PINECONE_INDEX)
// // // // // //     console.log(`${tag} ${ok} Pinecone connected`)
// // // // // //     return _pineconeIndex
// // // // // //   } catch (e) {
// // // // // //     _pineconeFailAt = Date.now()
// // // // // //     _pineconeIndex  = null
// // // // // //     console.log(`${tag} ${warn} Pinecone init failed (retry in 60s): ${e.message?.slice(0, 80)}`)
// // // // // //     return null
// // // // // //   }
// // // // // // }

// // // // // // function onPineconeError(err) {
// // // // // //   _pineconeFailAt = Date.now()
// // // // // //   _pineconeIndex  = null
// // // // // //   console.log(`${tag} ${warn} Pinecone error (retry in 60s): ${err.message?.slice(0, 80)}`)
// // // // // // }

// // // // // // function onPineconeSuccess() {
// // // // // //   _pineconeFailAt = null
// // // // // // }

// // // // // // // ── Gemini Embeddings ──────────────────────────────────────────────────────────
// // // // // // async function embedBatch(texts, taskType = 'RETRIEVAL_DOCUMENT') {
// // // // // //   if (!process.env.GEMINI_API_KEY) {
// // // // // //     throw new Error('GEMINI_API_KEY is not set — cannot embed. Set it in your Render environment variables.')
// // // // // //   }
// // // // // //   try {
// // // // // //     const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
// // // // // //     const model  = client.getGenerativeModel({ model: EMBED_MODEL })
// // // // // //     const response = await model.batchEmbedContents({
// // // // // //       requests: texts.map(text => ({
// // // // // //         content:  { parts: [{ text }] },
// // // // // //         taskType,
// // // // // //       })),
// // // // // //     })
// // // // // //     const vecs = response.embeddings.map(e => e.values)
// // // // // //     // Validate dimensions on first call
// // // // // //     if (vecs[0] && vecs[0].length !== EMBED_DIM) {
// // // // // //       throw new Error(
// // // // // //         `Embedding dimension mismatch: got ${vecs[0].length}, expected ${EMBED_DIM}. ` +
// // // // // //         `Recreate your Pinecone index with dimension=${vecs[0].length}.`
// // // // // //       )
// // // // // //     }
// // // // // //     return vecs
// // // // // //   } catch (err) {
// // // // // //     console.log(`${tag} ${fail} Gemini embed failed: ${err.message}`)
// // // // // //     throw err
// // // // // //   }
// // // // // // }

// // // // // // async function embedText(text) {
// // // // // //   if (!process.env.GEMINI_API_KEY) {
// // // // // //     throw new Error('GEMINI_API_KEY is not set.')
// // // // // //   }
// // // // // //   try {
// // // // // //     const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
// // // // // //     const model  = client.getGenerativeModel({ model: EMBED_MODEL })
// // // // // //     const result = await model.embedContent({
// // // // // //       content:  { parts: [{ text }] },
// // // // // //       taskType: 'RETRIEVAL_QUERY',
// // // // // //     })
// // // // // //     return result.embedding.values
// // // // // //   } catch (err) {
// // // // // //     console.log(`${tag} ${fail} Gemini query embed failed: ${err.message}`)
// // // // // //     throw err
// // // // // //   }
// // // // // // }

// // // // // // // ── Logging helpers ────────────────────────────────────────────────────────────
// // // // // // function _logChunks(chunks) {
// // // // // //   for (const ch of chunks) {
// // // // // //     const score   = (ch.score * 100).toFixed(1)
// // // // // //     const src     = ch.source?.split(/[/\\]/).pop() || 'unknown'
// // // // // //     const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
// // // // // //     console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
// // // // // //   }
// // // // // // }

// // // // // // // ── PUBLIC API ─────────────────────────────────────────────────────────────────

// // // // // // /**
// // // // // //  * Embed and upsert chunks into Pinecone.
// // // // // //  * Throws if Pinecone is not configured or if embedding fails.
// // // // // //  */
// // // // // // async function upsert(chunks) {
// // // // // //   if (!chunks || chunks.length === 0) return

// // // // // //   if (!isPineconeConfigured()) {
// // // // // //     throw new Error('Pinecone is not configured. Set PINECONE_API_KEY and PINECONE_INDEX in Render env vars.')
// // // // // //   }

// // // // // //   console.log(`${tag} ${info} Embedding ${c.bold}${chunks.length} chunks${c.reset}…`)

// // // // // //   const texts   = chunks.map(ch => ch.text)
// // // // // //   const allVecs = []
// // // // // //   for (let i = 0; i < texts.length; i += EMBED_BATCH) {
// // // // // //     const vecs = await embedBatch(texts.slice(i, i + EMBED_BATCH))
// // // // // //     allVecs.push(...vecs)
// // // // // //     if (texts.length > EMBED_BATCH)
// // // // // //       process.stdout.write(`${tag} ${c.dim}  ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length}…${c.reset}\r`)
// // // // // //   }
// // // // // //   if (texts.length > EMBED_BATCH) console.log()

// // // // // //   const vectors = chunks.map((chunk, i) => ({
// // // // // //     id:     chunk.id,
// // // // // //     values: allVecs[i],
// // // // // //     metadata: {
// // // // // //       text:   chunk.text,
// // // // // //       type:   chunk.metadata?.type   || 'unknown',
// // // // // //       source: chunk.metadata?.source || '',
// // // // // //       key:    chunk.metadata?.key    || '',
// // // // // //       tempo:  chunk.metadata?.tempo  || 0,
// // // // // //     },
// // // // // //   }))

// // // // // //   const index = getPineconeIndex()
// // // // // //   if (!index) throw new Error('Pinecone index unavailable. Check API key and index name.')

// // // // // //   try {
// // // // // //     const BATCH = 100
// // // // // //     for (let i = 0; i < vectors.length; i += BATCH) {
// // // // // //       await index.upsert(vectors.slice(i, i + BATCH))
// // // // // //     }
// // // // // //     onPineconeSuccess()
// // // // // //     console.log(`${tag} ${ok} Pinecone — ${c.bold}${vectors.length} vectors stored${c.reset}`)
// // // // // //   } catch (err) {
// // // // // //     onPineconeError(err)
// // // // // //     throw new Error(`Pinecone upsert failed: ${err.message}`)
// // // // // //   }
// // // // // // }

// // // // // // /**
// // // // // //  * Query Pinecone for top-K most relevant chunks.
// // // // // //  * Returns [] if Pinecone is not configured or query fails.
// // // // // //  */
// // // // // // async function query(prompt, topK = 15) {
// // // // // //   const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
// // // // // //   console.log(`${tag} ${info} Query: "${c.dim}${preview}…${c.reset}" (top ${topK})`)

// // // // // //   if (!isPineconeConfigured()) {
// // // // // //     console.log(`${tag} ${warn} Pinecone not configured — no RAG context`)
// // // // // //     return []
// // // // // //   }

// // // // // //   let vector
// // // // // //   try {
// // // // // //     vector = await embedText(prompt)
// // // // // //   } catch (err) {
// // // // // //     console.log(`${tag} ${warn} Embed failed — no RAG context: ${err.message}`)
// // // // // //     return []
// // // // // //   }

// // // // // //   const index = getPineconeIndex()
// // // // // //   if (!index) {
// // // // // //     console.log(`${tag} ${warn} Pinecone unavailable — no RAG context`)
// // // // // //     return []
// // // // // //   }

// // // // // //   try {
// // // // // //     const result  = await index.query({ vector, topK, includeMetadata: true })
// // // // // //     onPineconeSuccess()
// // // // // //     const matches = (result.matches || []).map(m => ({
// // // // // //       id:     m.id,
// // // // // //       score:  m.score,
// // // // // //       text:   m.metadata?.text   || '',
// // // // // //       type:   m.metadata?.type   || 'unknown',
// // // // // //       source: m.metadata?.source || '',
// // // // // //       key:    m.metadata?.key    || null,
// // // // // //       tempo:  m.metadata?.tempo  || null,
// // // // // //     }))
// // // // // //     console.log(`${tag} ${ok} Pinecone: ${matches.length} hits`)
// // // // // //     _logChunks(matches)
// // // // // //     return matches
// // // // // //   } catch (err) {
// // // // // //     onPineconeError(err)
// // // // // //     console.log(`${tag} ${warn} Pinecone query failed — no RAG context`)
// // // // // //     return []
// // // // // //   }
// // // // // // }

// // // // // // /**
// // // // // //  * Delete specific vectors by ID from Pinecone.
// // // // // //  */
// // // // // // async function deleteMany(ids) {
// // // // // //   if (!ids || ids.length === 0) return

// // // // // //   const index = getPineconeIndex()
// // // // // //   if (!index) {
// // // // // //     console.log(`${tag} ${warn} Pinecone unavailable — could not delete vectors`)
// // // // // //     return
// // // // // //   }

// // // // // //   try {
// // // // // //     await index.deleteMany(ids)
// // // // // //     onPineconeSuccess()
// // // // // //     console.log(`${tag} ${ok} Deleted ${ids.length} vectors from Pinecone`)
// // // // // //   } catch (err) {
// // // // // //     onPineconeError(err)
// // // // // //     console.log(`${tag} ${warn} Pinecone delete failed: ${err.message}`)
// // // // // //   }
// // // // // // }

// // // // // // /**
// // // // // //  * Delete all vectors from a specific source file.
// // // // // //  * Uses Pinecone metadata filter.
// // // // // //  */
// // // // // // async function deleteBySource(sourceName) {
// // // // // //   const index = getPineconeIndex()
// // // // // //   if (!index) {
// // // // // //     console.log(`${tag} ${warn} Pinecone unavailable — could not delete by source`)
// // // // // //     return 0
// // // // // //   }

// // // // // //   try {
// // // // // //     // Pinecone serverless supports deleteMany with filter
// // // // // //     await index.deleteMany({ filter: { source: { $eq: sourceName } } })
// // // // // //     onPineconeSuccess()
// // // // // //     console.log(`${tag} ${ok} Deleted vectors for source: ${sourceName}`)
// // // // // //     return 1
// // // // // //   } catch (err) {
// // // // // //     // Fallback: if filter delete not supported, log warning
// // // // // //     onPineconeError(err)
// // // // // //     console.log(`${tag} ${warn} deleteBySource failed (filter delete may not be supported on your plan): ${err.message}`)
// // // // // //     return 0
// // // // // //   }
// // // // // // }

// // // // // // /**
// // // // // //  * Delete ALL vectors in the index.
// // // // // //  */
// // // // // // async function deleteAll() {
// // // // // //   const index = getPineconeIndex()
// // // // // //   if (!index) throw new Error('Pinecone unavailable')

// // // // // //   try {
// // // // // //     await index.deleteAll()
// // // // // //     onPineconeSuccess()
// // // // // //     console.log(`${tag} ${ok} Pinecone index cleared`)
// // // // // //   } catch (err) {
// // // // // //     onPineconeError(err)
// // // // // //     throw new Error(`Pinecone deleteAll failed: ${err.message}`)
// // // // // //   }
// // // // // // }

// // // // // // /**
// // // // // //  * Get vector count from Pinecone index stats.
// // // // // //  */
// // // // // // async function getStats() {
// // // // // //   const index = getPineconeIndex()
// // // // // //   if (!index) return { vectorCount: 0, configured: false }

// // // // // //   try {
// // // // // //     const stats = await index.describeIndexStats()
// // // // // //     onPineconeSuccess()
// // // // // //     return {
// // // // // //       configured:  true,
// // // // // //       vectorCount: stats.totalVectorCount || 0,
// // // // // //       dimension:   EMBED_DIM,
// // // // // //       indexName:   process.env.PINECONE_INDEX,
// // // // // //     }
// // // // // //   } catch (err) {
// // // // // //     onPineconeError(err)
// // // // // //     return { configured: true, vectorCount: 0, error: err.message }
// // // // // //   }
// // // // // // }

// // // // // // module.exports = { query, upsert, deleteMany, deleteBySource, deleteAll, getStats, isPineconeConfigured }











// // // // // 'use strict'
// // // // // // backend/services/ragService.js
// // // // // // Pinecone-only. No localRag.json. No local fallback.
// // // // // // Embeddings via direct REST fetch (bypasses SDK v1beta bug)

// // // // // // ── Terminal colours ───────────────────────────────────────────────────────────
// // // // // const c = {
// // // // //   reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
// // // // //   yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
// // // // //   bold: '\x1b[1m', gray: '\x1b[90m',
// // // // // }
// // // // // const tag  = `${c.cyan}[RAG]${c.reset}`
// // // // // const ok   = `${c.green}✔${c.reset}`
// // // // // const warn = `${c.yellow}⚠${c.reset}`
// // // // // const fail = `${c.red}✘${c.reset}`
// // // // // const info = `${c.gray}•${c.reset}`

// // // // // // ── Embedding config ───────────────────────────────────────────────────────────
// // // // // const EMBED_MODEL = 'text-embedding-004'
// // // // // const EMBED_DIM   = 768
// // // // // const EMBED_BATCH = 20

// // // // // // Direct REST URL — v1, not v1beta. Bypasses SDK version issues entirely.
// // // // // const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1/models/${EMBED_MODEL}`

// // // // // // ── Pinecone ───────────────────────────────────────────────────────────────────
// // // // // let _pineconeIndex  = null
// // // // // let _pineconeFailAt = null
// // // // // const PINECONE_RETRY_MS = 60_000
// // // // // let _envLogged = false

// // // // // function isPineconeConfigured() {
// // // // //   const configured = !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX)
// // // // //   if (!_envLogged) {
// // // // //     _envLogged = true
// // // // //     if (configured) {
// // // // //       console.log(`${tag} ${info} Pinecone index: ${c.cyan}${process.env.PINECONE_INDEX}${c.reset} (dim=${EMBED_DIM})`)
// // // // //     } else {
// // // // //       const missing = []
// // // // //       if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
// // // // //       if (!process.env.PINECONE_INDEX)   missing.push('PINECONE_INDEX')
// // // // //       console.log(`${tag} ${warn} Pinecone disabled — missing: ${missing.join(', ')}`)
// // // // //     }
// // // // //   }
// // // // //   return configured
// // // // // }

// // // // // function canTryPinecone() {
// // // // //   if (!isPineconeConfigured()) return false
// // // // //   if (_pineconeFailAt && (Date.now() - _pineconeFailAt) < PINECONE_RETRY_MS) return false
// // // // //   return true
// // // // // }

// // // // // function getPineconeIndex() {
// // // // //   if (!canTryPinecone()) return null
// // // // //   if (_pineconeIndex) return _pineconeIndex
// // // // //   try {
// // // // //     const { Pinecone } = require('@pinecone-database/pinecone')
// // // // //     _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
// // // // //       .index(process.env.PINECONE_INDEX)
// // // // //     console.log(`${tag} ${ok} Pinecone connected`)
// // // // //     return _pineconeIndex
// // // // //   } catch (e) {
// // // // //     _pineconeFailAt = Date.now()
// // // // //     _pineconeIndex  = null
// // // // //     console.log(`${tag} ${warn} Pinecone init failed (retry in 60s): ${e.message?.slice(0, 80)}`)
// // // // //     return null
// // // // //   }
// // // // // }

// // // // // function onPineconeError(err) {
// // // // //   _pineconeFailAt = Date.now()
// // // // //   _pineconeIndex  = null
// // // // //   console.log(`${tag} ${warn} Pinecone error (retry in 60s): ${err.message?.slice(0, 80)}`)
// // // // // }

// // // // // function onPineconeSuccess() {
// // // // //   _pineconeFailAt = null
// // // // // }

// // // // // // ── Gemini Embeddings — direct REST, bypasses SDK v1beta hardcoding ────────────
// // // // // async function embedBatch(texts, taskType = 'RETRIEVAL_DOCUMENT') {
// // // // //   if (!process.env.GEMINI_API_KEY) {
// // // // //     throw new Error('GEMINI_API_KEY is not set — add it to Render environment variables.')
// // // // //   }
// // // // //   const url = `${GEMINI_BASE}:batchEmbedContents?key=${process.env.GEMINI_API_KEY}`
// // // // //   const res = await fetch(url, {
// // // // //     method:  'POST',
// // // // //     headers: { 'Content-Type': 'application/json' },
// // // // //     body: JSON.stringify({
// // // // //       requests: texts.map(text => ({
// // // // //         model:    `models/${EMBED_MODEL}`,
// // // // //         content:  { parts: [{ text }] },
// // // // //         taskType,
// // // // //       })),
// // // // //     }),
// // // // //   })
// // // // //   if (!res.ok) {
// // // // //     const errText = await res.text()
// // // // //     throw new Error(`Gemini batchEmbed ${res.status}: ${errText.slice(0, 200)}`)
// // // // //   }
// // // // //   const data = await res.json()
// // // // //   const vecs = data.embeddings.map(e => e.values)
// // // // //   if (vecs[0] && vecs[0].length !== EMBED_DIM) {
// // // // //     throw new Error(
// // // // //       `Dimension mismatch: got ${vecs[0].length}, expected ${EMBED_DIM}. ` +
// // // // //       `Recreate your Pinecone index with dimension=${vecs[0].length}.`
// // // // //     )
// // // // //   }
// // // // //   return vecs
// // // // // }

// // // // // async function embedText(text) {
// // // // //   if (!process.env.GEMINI_API_KEY) {
// // // // //     throw new Error('GEMINI_API_KEY is not set.')
// // // // //   }
// // // // //   const url = `${GEMINI_BASE}:embedContent?key=${process.env.GEMINI_API_KEY}`
// // // // //   const res = await fetch(url, {
// // // // //     method:  'POST',
// // // // //     headers: { 'Content-Type': 'application/json' },
// // // // //     body: JSON.stringify({
// // // // //       model:    `models/${EMBED_MODEL}`,
// // // // //       content:  { parts: [{ text }] },
// // // // //       taskType: 'RETRIEVAL_QUERY',
// // // // //     }),
// // // // //   })
// // // // //   if (!res.ok) {
// // // // //     const errText = await res.text()
// // // // //     throw new Error(`Gemini embedContent ${res.status}: ${errText.slice(0, 200)}`)
// // // // //   }
// // // // //   const data = await res.json()
// // // // //   return data.embedding.values
// // // // // }

// // // // // // ── Logging ────────────────────────────────────────────────────────────────────
// // // // // function _logChunks(chunks) {
// // // // //   for (const ch of chunks) {
// // // // //     const score   = (ch.score * 100).toFixed(1)
// // // // //     const src     = ch.source?.split(/[/\\]/).pop() || 'unknown'
// // // // //     const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
// // // // //     console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
// // // // //   }
// // // // // }

// // // // // // ── PUBLIC API ─────────────────────────────────────────────────────────────────

// // // // // async function upsert(chunks) {
// // // // //   if (!chunks || chunks.length === 0) return

// // // // //   if (!isPineconeConfigured()) {
// // // // //     throw new Error('Pinecone is not configured. Set PINECONE_API_KEY and PINECONE_INDEX in Render env vars.')
// // // // //   }

// // // // //   console.log(`${tag} ${info} Embedding ${c.bold}${chunks.length} chunks${c.reset}...`)

// // // // //   const texts   = chunks.map(ch => ch.text)
// // // // //   const allVecs = []
// // // // //   for (let i = 0; i < texts.length; i += EMBED_BATCH) {
// // // // //     const vecs = await embedBatch(texts.slice(i, i + EMBED_BATCH))
// // // // //     allVecs.push(...vecs)
// // // // //     if (texts.length > EMBED_BATCH)
// // // // //       process.stdout.write(`${tag} ${c.dim}  ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length}...${c.reset}\r`)
// // // // //   }
// // // // //   if (texts.length > EMBED_BATCH) console.log()

// // // // //   const vectors = chunks.map((chunk, i) => ({
// // // // //     id:     chunk.id,
// // // // //     values: allVecs[i],
// // // // //     metadata: {
// // // // //       text:   chunk.text,
// // // // //       type:   chunk.metadata?.type   || 'unknown',
// // // // //       source: chunk.metadata?.source || '',
// // // // //       key:    chunk.metadata?.key    || '',
// // // // //       tempo:  chunk.metadata?.tempo  || 0,
// // // // //     },
// // // // //   }))

// // // // //   const index = getPineconeIndex()
// // // // //   if (!index) throw new Error('Pinecone index unavailable. Check API key and index name.')

// // // // //   try {
// // // // //     const BATCH = 100
// // // // //     for (let i = 0; i < vectors.length; i += BATCH) {
// // // // //       await index.upsert(vectors.slice(i, i + BATCH))
// // // // //     }
// // // // //     onPineconeSuccess()
// // // // //     console.log(`${tag} ${ok} Pinecone — ${c.bold}${vectors.length} vectors stored${c.reset}`)
// // // // //   } catch (err) {
// // // // //     onPineconeError(err)
// // // // //     throw new Error(`Pinecone upsert failed: ${err.message}`)
// // // // //   }
// // // // // }

// // // // // async function query(prompt, topK = 15) {
// // // // //   const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
// // // // //   console.log(`${tag} ${info} Query: "${c.dim}${preview}...${c.reset}" (top ${topK})`)

// // // // //   if (!isPineconeConfigured()) {
// // // // //     console.log(`${tag} ${warn} Pinecone not configured — no RAG context`)
// // // // //     return []
// // // // //   }

// // // // //   let vector
// // // // //   try {
// // // // //     vector = await embedText(prompt)
// // // // //   } catch (err) {
// // // // //     console.log(`${tag} ${warn} Embed failed — no RAG context: ${err.message}`)
// // // // //     return []
// // // // //   }

// // // // //   const index = getPineconeIndex()
// // // // //   if (!index) {
// // // // //     console.log(`${tag} ${warn} Pinecone unavailable — no RAG context`)
// // // // //     return []
// // // // //   }

// // // // //   try {
// // // // //     const result  = await index.query({ vector, topK, includeMetadata: true })
// // // // //     onPineconeSuccess()
// // // // //     const matches = (result.matches || []).map(m => ({
// // // // //       id:     m.id,
// // // // //       score:  m.score,
// // // // //       text:   m.metadata?.text   || '',
// // // // //       type:   m.metadata?.type   || 'unknown',
// // // // //       source: m.metadata?.source || '',
// // // // //       key:    m.metadata?.key    || null,
// // // // //       tempo:  m.metadata?.tempo  || null,
// // // // //     }))
// // // // //     console.log(`${tag} ${ok} Pinecone: ${matches.length} hits`)
// // // // //     _logChunks(matches)
// // // // //     return matches
// // // // //   } catch (err) {
// // // // //     onPineconeError(err)
// // // // //     console.log(`${tag} ${warn} Pinecone query failed — no RAG context`)
// // // // //     return []
// // // // //   }
// // // // // }

// // // // // async function deleteMany(ids) {
// // // // //   if (!ids || ids.length === 0) return
// // // // //   const index = getPineconeIndex()
// // // // //   if (!index) {
// // // // //     console.log(`${tag} ${warn} Pinecone unavailable — could not delete`)
// // // // //     return
// // // // //   }
// // // // //   try {
// // // // //     await index.deleteMany(ids)
// // // // //     onPineconeSuccess()
// // // // //     console.log(`${tag} ${ok} Deleted ${ids.length} vectors`)
// // // // //   } catch (err) {
// // // // //     onPineconeError(err)
// // // // //     console.log(`${tag} ${warn} Pinecone delete failed: ${err.message}`)
// // // // //   }
// // // // // }

// // // // // async function deleteBySource(sourceName) {
// // // // //   const index = getPineconeIndex()
// // // // //   if (!index) return 0
// // // // //   try {
// // // // //     await index.deleteMany({ filter: { source: { $eq: sourceName } } })
// // // // //     onPineconeSuccess()
// // // // //     console.log(`${tag} ${ok} Deleted vectors for: ${sourceName}`)
// // // // //     return 1
// // // // //   } catch (err) {
// // // // //     onPineconeError(err)
// // // // //     console.log(`${tag} ${warn} deleteBySource failed: ${err.message}`)
// // // // //     return 0
// // // // //   }
// // // // // }

// // // // // async function deleteAll() {
// // // // //   const index = getPineconeIndex()
// // // // //   if (!index) throw new Error('Pinecone unavailable')
// // // // //   try {
// // // // //     await index.deleteAll()
// // // // //     onPineconeSuccess()
// // // // //     console.log(`${tag} ${ok} Pinecone index cleared`)
// // // // //   } catch (err) {
// // // // //     onPineconeError(err)
// // // // //     throw new Error(`Pinecone deleteAll failed: ${err.message}`)
// // // // //   }
// // // // // }

// // // // // async function getStats() {
// // // // //   const index = getPineconeIndex()
// // // // //   if (!index) return { vectorCount: 0, configured: false }
// // // // //   try {
// // // // //     const stats = await index.describeIndexStats()
// // // // //     onPineconeSuccess()
// // // // //     return {
// // // // //       configured:  true,
// // // // //       vectorCount: stats.totalVectorCount || 0,
// // // // //       dimension:   EMBED_DIM,
// // // // //       indexName:   process.env.PINECONE_INDEX,
// // // // //     }
// // // // //   } catch (err) {
// // // // //     onPineconeError(err)
// // // // //     return { configured: true, vectorCount: 0, error: err.message }
// // // // //   }
// // // // // }

// // // // // module.exports = { query, upsert, deleteMany, deleteBySource, deleteAll, getStats, isPineconeConfigured }









// // // // 'use strict'
// // // // // backend/services/ragService.js
// // // // // Pinecone-only. No localRag.json. No local fallback.
// // // // // Embeddings via direct REST fetch (bypasses SDK v1beta bug)

// // // // // ── Terminal colours ───────────────────────────────────────────────────────────
// // // // const c = {
// // // //   reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
// // // //   yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
// // // //   bold: '\x1b[1m', gray: '\x1b[90m',
// // // // }
// // // // const tag  = `${c.cyan}[RAG]${c.reset}`
// // // // const ok   = `${c.green}✔${c.reset}`
// // // // const warn = `${c.yellow}⚠${c.reset}`
// // // // const fail = `${c.red}✘${c.reset}`
// // // // const info = `${c.gray}•${c.reset}`

// // // // // ── Embedding config ───────────────────────────────────────────────────────────
// // // // const EMBED_MODEL = 'text-embedding-004'
// // // // const EMBED_DIM   = 768
// // // // const EMBED_BATCH = 20

// // // // // Direct REST URL — v1, not v1beta. Bypasses SDK version issues entirely.
// // // // const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}`

// // // // // ── Pinecone ───────────────────────────────────────────────────────────────────
// // // // let _pineconeIndex  = null
// // // // let _pineconeFailAt = null
// // // // const PINECONE_RETRY_MS = 60_000
// // // // let _envLogged = false

// // // // function isPineconeConfigured() {
// // // //   const configured = !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX)
// // // //   if (!_envLogged) {
// // // //     _envLogged = true
// // // //     if (configured) {
// // // //       console.log(`${tag} ${info} Pinecone index: ${c.cyan}${process.env.PINECONE_INDEX}${c.reset} (dim=${EMBED_DIM})`)
// // // //     } else {
// // // //       const missing = []
// // // //       if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
// // // //       if (!process.env.PINECONE_INDEX)   missing.push('PINECONE_INDEX')
// // // //       console.log(`${tag} ${warn} Pinecone disabled — missing: ${missing.join(', ')}`)
// // // //     }
// // // //   }
// // // //   return configured
// // // // }

// // // // function canTryPinecone() {
// // // //   if (!isPineconeConfigured()) return false
// // // //   if (_pineconeFailAt && (Date.now() - _pineconeFailAt) < PINECONE_RETRY_MS) return false
// // // //   return true
// // // // }

// // // // function getPineconeIndex() {
// // // //   if (!canTryPinecone()) return null
// // // //   if (_pineconeIndex) return _pineconeIndex
// // // //   try {
// // // //     const { Pinecone } = require('@pinecone-database/pinecone')
// // // //     _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
// // // //       .index(process.env.PINECONE_INDEX)
// // // //     console.log(`${tag} ${ok} Pinecone connected`)
// // // //     return _pineconeIndex
// // // //   } catch (e) {
// // // //     _pineconeFailAt = Date.now()
// // // //     _pineconeIndex  = null
// // // //     console.log(`${tag} ${warn} Pinecone init failed (retry in 60s): ${e.message?.slice(0, 80)}`)
// // // //     return null
// // // //   }
// // // // }

// // // // function onPineconeError(err) {
// // // //   _pineconeFailAt = Date.now()
// // // //   _pineconeIndex  = null
// // // //   console.log(`${tag} ${warn} Pinecone error (retry in 60s): ${err.message?.slice(0, 80)}`)
// // // // }

// // // // function onPineconeSuccess() {
// // // //   _pineconeFailAt = null
// // // // }

// // // // // ── Gemini Embeddings — direct REST, bypasses SDK v1beta hardcoding ────────────
// // // // async function embedBatch(texts, taskType = 'RETRIEVAL_DOCUMENT') {
// // // //   if (!process.env.GEMINI_API_KEY) {
// // // //     throw new Error('GEMINI_API_KEY is not set — add it to Render environment variables.')
// // // //   }
// // // //   const url = `${GEMINI_BASE}:batchEmbedContents?key=${process.env.GEMINI_API_KEY}`
// // // //   const res = await fetch(url, {
// // // //     method:  'POST',
// // // //     headers: { 'Content-Type': 'application/json' },
// // // //     body: JSON.stringify({
// // // //       requests: texts.map(text => ({
// // // //         model:    `models/${EMBED_MODEL}`,
// // // //         content:  { parts: [{ text }] },
// // // //         taskType,
// // // //       })),
// // // //     }),
// // // //   })
// // // //   if (!res.ok) {
// // // //     const errText = await res.text()
// // // //     throw new Error(`Gemini batchEmbed ${res.status}: ${errText.slice(0, 200)}`)
// // // //   }
// // // //   const data = await res.json()
// // // //   const vecs = data.embeddings.map(e => e.values)
// // // //   if (vecs[0] && vecs[0].length !== EMBED_DIM) {
// // // //     throw new Error(
// // // //       `Dimension mismatch: got ${vecs[0].length}, expected ${EMBED_DIM}. ` +
// // // //       `Recreate your Pinecone index with dimension=${vecs[0].length}.`
// // // //     )
// // // //   }
// // // //   return vecs
// // // // }

// // // // async function embedText(text) {
// // // //   if (!process.env.GEMINI_API_KEY) {
// // // //     throw new Error('GEMINI_API_KEY is not set.')
// // // //   }
// // // //   const url = `${GEMINI_BASE}:embedContent?key=${process.env.GEMINI_API_KEY}`
// // // //   const res = await fetch(url, {
// // // //     method:  'POST',
// // // //     headers: { 'Content-Type': 'application/json' },
// // // //     body: JSON.stringify({
// // // //       model:    `models/${EMBED_MODEL}`,
// // // //       content:  { parts: [{ text }] },
// // // //       taskType: 'RETRIEVAL_QUERY',
// // // //     }),
// // // //   })
// // // //   if (!res.ok) {
// // // //     const errText = await res.text()
// // // //     throw new Error(`Gemini embedContent ${res.status}: ${errText.slice(0, 200)}`)
// // // //   }
// // // //   const data = await res.json()
// // // //   return data.embedding.values
// // // // }

// // // // // ── Logging ────────────────────────────────────────────────────────────────────
// // // // function _logChunks(chunks) {
// // // //   for (const ch of chunks) {
// // // //     const score   = (ch.score * 100).toFixed(1)
// // // //     const src     = ch.source?.split(/[/\\]/).pop() || 'unknown'
// // // //     const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
// // // //     console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
// // // //   }
// // // // }

// // // // // ── PUBLIC API ─────────────────────────────────────────────────────────────────

// // // // async function upsert(chunks) {
// // // //   if (!chunks || chunks.length === 0) return

// // // //   if (!isPineconeConfigured()) {
// // // //     throw new Error('Pinecone is not configured. Set PINECONE_API_KEY and PINECONE_INDEX in Render env vars.')
// // // //   }

// // // //   console.log(`${tag} ${info} Embedding ${c.bold}${chunks.length} chunks${c.reset}...`)

// // // //   const texts   = chunks.map(ch => ch.text)
// // // //   const allVecs = []
// // // //   for (let i = 0; i < texts.length; i += EMBED_BATCH) {
// // // //     const vecs = await embedBatch(texts.slice(i, i + EMBED_BATCH))
// // // //     allVecs.push(...vecs)
// // // //     if (texts.length > EMBED_BATCH)
// // // //       process.stdout.write(`${tag} ${c.dim}  ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length}...${c.reset}\r`)
// // // //   }
// // // //   if (texts.length > EMBED_BATCH) console.log()

// // // //   const vectors = chunks.map((chunk, i) => ({
// // // //     id:     chunk.id,
// // // //     values: allVecs[i],
// // // //     metadata: {
// // // //       text:   chunk.text,
// // // //       type:   chunk.metadata?.type   || 'unknown',
// // // //       source: chunk.metadata?.source || '',
// // // //       key:    chunk.metadata?.key    || '',
// // // //       tempo:  chunk.metadata?.tempo  || 0,
// // // //     },
// // // //   }))

// // // //   const index = getPineconeIndex()
// // // //   if (!index) throw new Error('Pinecone index unavailable. Check API key and index name.')

// // // //   try {
// // // //     const BATCH = 100
// // // //     for (let i = 0; i < vectors.length; i += BATCH) {
// // // //       await index.upsert(vectors.slice(i, i + BATCH))
// // // //     }
// // // //     onPineconeSuccess()
// // // //     console.log(`${tag} ${ok} Pinecone — ${c.bold}${vectors.length} vectors stored${c.reset}`)
// // // //   } catch (err) {
// // // //     onPineconeError(err)
// // // //     throw new Error(`Pinecone upsert failed: ${err.message}`)
// // // //   }
// // // // }

// // // // async function query(prompt, topK = 15) {
// // // //   const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
// // // //   console.log(`${tag} ${info} Query: "${c.dim}${preview}...${c.reset}" (top ${topK})`)

// // // //   if (!isPineconeConfigured()) {
// // // //     console.log(`${tag} ${warn} Pinecone not configured — no RAG context`)
// // // //     return []
// // // //   }

// // // //   let vector
// // // //   try {
// // // //     vector = await embedText(prompt)
// // // //   } catch (err) {
// // // //     console.log(`${tag} ${warn} Embed failed — no RAG context: ${err.message}`)
// // // //     return []
// // // //   }

// // // //   const index = getPineconeIndex()
// // // //   if (!index) {
// // // //     console.log(`${tag} ${warn} Pinecone unavailable — no RAG context`)
// // // //     return []
// // // //   }

// // // //   try {
// // // //     const result  = await index.query({ vector, topK, includeMetadata: true })
// // // //     onPineconeSuccess()
// // // //     const matches = (result.matches || []).map(m => ({
// // // //       id:     m.id,
// // // //       score:  m.score,
// // // //       text:   m.metadata?.text   || '',
// // // //       type:   m.metadata?.type   || 'unknown',
// // // //       source: m.metadata?.source || '',
// // // //       key:    m.metadata?.key    || null,
// // // //       tempo:  m.metadata?.tempo  || null,
// // // //     }))
// // // //     console.log(`${tag} ${ok} Pinecone: ${matches.length} hits`)
// // // //     _logChunks(matches)
// // // //     return matches
// // // //   } catch (err) {
// // // //     onPineconeError(err)
// // // //     console.log(`${tag} ${warn} Pinecone query failed — no RAG context`)
// // // //     return []
// // // //   }
// // // // }

// // // // async function deleteMany(ids) {
// // // //   if (!ids || ids.length === 0) return
// // // //   const index = getPineconeIndex()
// // // //   if (!index) {
// // // //     console.log(`${tag} ${warn} Pinecone unavailable — could not delete`)
// // // //     return
// // // //   }
// // // //   try {
// // // //     await index.deleteMany(ids)
// // // //     onPineconeSuccess()
// // // //     console.log(`${tag} ${ok} Deleted ${ids.length} vectors`)
// // // //   } catch (err) {
// // // //     onPineconeError(err)
// // // //     console.log(`${tag} ${warn} Pinecone delete failed: ${err.message}`)
// // // //   }
// // // // }

// // // // async function deleteBySource(sourceName) {
// // // //   const index = getPineconeIndex()
// // // //   if (!index) return 0
// // // //   try {
// // // //     await index.deleteMany({ filter: { source: { $eq: sourceName } } })
// // // //     onPineconeSuccess()
// // // //     console.log(`${tag} ${ok} Deleted vectors for: ${sourceName}`)
// // // //     return 1
// // // //   } catch (err) {
// // // //     onPineconeError(err)
// // // //     console.log(`${tag} ${warn} deleteBySource failed: ${err.message}`)
// // // //     return 0
// // // //   }
// // // // }

// // // // async function deleteAll() {
// // // //   const index = getPineconeIndex()
// // // //   if (!index) throw new Error('Pinecone unavailable')
// // // //   try {
// // // //     await index.deleteAll()
// // // //     onPineconeSuccess()
// // // //     console.log(`${tag} ${ok} Pinecone index cleared`)
// // // //   } catch (err) {
// // // //     onPineconeError(err)
// // // //     throw new Error(`Pinecone deleteAll failed: ${err.message}`)
// // // //   }
// // // // }

// // // // async function getStats() {
// // // //   const index = getPineconeIndex()
// // // //   if (!index) return { vectorCount: 0, configured: false }
// // // //   try {
// // // //     const stats = await index.describeIndexStats()
// // // //     onPineconeSuccess()
// // // //     return {
// // // //       configured:  true,
// // // //       vectorCount: stats.totalVectorCount || 0,
// // // //       dimension:   EMBED_DIM,
// // // //       indexName:   process.env.PINECONE_INDEX,
// // // //     }
// // // //   } catch (err) {
// // // //     onPineconeError(err)
// // // //     return { configured: true, vectorCount: 0, error: err.message }
// // // //   }
// // // // }

// // // // module.exports = { query, upsert, deleteMany, deleteBySource, deleteAll, getStats, isPineconeConfigured }








// // // 'use strict'
// // // // backend/services/ragService.js
// // // // Pinecone-only. No localRag.json. No local fallback.
// // // // Embeddings via direct REST fetch (bypasses SDK v1beta bug)

// // // // ── Terminal colours ───────────────────────────────────────────────────────────
// // // const c = {
// // //   reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
// // //   yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
// // //   bold: '\x1b[1m', gray: '\x1b[90m',
// // // }
// // // const tag  = `${c.cyan}[RAG]${c.reset}`
// // // const ok   = `${c.green}✔${c.reset}`
// // // const warn = `${c.yellow}⚠${c.reset}`
// // // const fail = `${c.red}✘${c.reset}`
// // // const info = `${c.gray}•${c.reset}`

// // // // ── Embedding config ───────────────────────────────────────────────────────────
// // // const EMBED_MODEL = 'text-embedding-004'
// // // const EMBED_DIM   = 768
// // // const EMBED_BATCH = 20

// // // // Direct REST URL — v1, not v1beta. Bypasses SDK version issues entirely.
// // // const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}`

// // // // ── Pinecone ───────────────────────────────────────────────────────────────────
// // // let _pineconeIndex  = null
// // // let _pineconeFailAt = null
// // // const PINECONE_RETRY_MS = 60_000
// // // let _envLogged = false

// // // function isPineconeConfigured() {
// // //   const configured = !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX)
// // //   if (!_envLogged) {
// // //     _envLogged = true
// // //     if (configured) {
// // //       console.log(`${tag} ${info} Pinecone index: ${c.cyan}${process.env.PINECONE_INDEX}${c.reset} (dim=${EMBED_DIM})`)
// // //     } else {
// // //       const missing = []
// // //       if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
// // //       if (!process.env.PINECONE_INDEX)   missing.push('PINECONE_INDEX')
// // //       console.log(`${tag} ${warn} Pinecone disabled — missing: ${missing.join(', ')}`)
// // //     }
// // //   }
// // //   return configured
// // // }

// // // function canTryPinecone() {
// // //   if (!isPineconeConfigured()) return false
// // //   if (_pineconeFailAt && (Date.now() - _pineconeFailAt) < PINECONE_RETRY_MS) return false
// // //   return true
// // // }

// // // function getPineconeIndex() {
// // //   if (!canTryPinecone()) return null
// // //   if (_pineconeIndex) return _pineconeIndex
// // //   try {
// // //     const { Pinecone } = require('@pinecone-database/pinecone')
// // //     _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
// // //       .index(process.env.PINECONE_INDEX)
// // //     console.log(`${tag} ${ok} Pinecone connected`)
// // //     return _pineconeIndex
// // //   } catch (e) {
// // //     _pineconeFailAt = Date.now()
// // //     _pineconeIndex  = null
// // //     console.log(`${tag} ${warn} Pinecone init failed (retry in 60s): ${e.message?.slice(0, 80)}`)
// // //     return null
// // //   }
// // // }

// // // function onPineconeError(err) {
// // //   _pineconeFailAt = Date.now()
// // //   _pineconeIndex  = null
// // //   console.log(`${tag} ${warn} Pinecone error (retry in 60s): ${err.message?.slice(0, 80)}`)
// // // }

// // // function onPineconeSuccess() {
// // //   _pineconeFailAt = null
// // // }

// // // // ── Gemini Embeddings — direct REST, individual embedContent calls ─────────────
// // // // batchEmbedContents is NOT supported for text-embedding-004.
// // // // We call embedContent once per text in parallel instead.
// // // async function embedOne(text, taskType) {
// // //   const url = `${GEMINI_BASE}:embedContent?key=${process.env.GEMINI_API_KEY}`
// // //   // NOTE: model goes in the URL only — NOT in the request body
// // //   const body = { content: { parts: [{ text }] } }
// // //   if (taskType) body.taskType = taskType
// // //   const res = await fetch(url, {
// // //     method:  'POST',
// // //     headers: { 'Content-Type': 'application/json' },
// // //     body: JSON.stringify(body),
// // //   })
// // //   if (!res.ok) {
// // //     const errText = await res.text()
// // //     throw new Error(`Gemini embedContent ${res.status}: ${errText.slice(0, 200)}`)
// // //   }
// // //   const data = await res.json()
// // //   return data.embedding.values
// // // }

// // // async function embedBatch(texts, taskType = 'RETRIEVAL_DOCUMENT') {
// // //   if (!process.env.GEMINI_API_KEY) {
// // //     throw new Error('GEMINI_API_KEY is not set — add it to Render environment variables.')
// // //   }
// // //   // Run in parallel but cap concurrency at 5 to avoid rate limits
// // //   const results = []
// // //   for (let i = 0; i < texts.length; i += 5) {
// // //     const batch = texts.slice(i, i + 5)
// // //     const vecs  = await Promise.all(batch.map(t => embedOne(t, taskType)))
// // //     results.push(...vecs)
// // //   }
// // //   if (results[0] && results[0].length !== EMBED_DIM) {
// // //     throw new Error(
// // //       `Dimension mismatch: got ${results[0].length}, expected ${EMBED_DIM}. ` +
// // //       `Recreate your Pinecone index with dimension=${results[0].length}.`
// // //     )
// // //   }
// // //   return results
// // // }

// // // async function embedText(text) {
// // //   if (!process.env.GEMINI_API_KEY) {
// // //     throw new Error('GEMINI_API_KEY is not set.')
// // //   }
// // //   const url = `${GEMINI_BASE}:embedContent?key=${process.env.GEMINI_API_KEY}`
// // //   const res = await fetch(url, {
// // //     method:  'POST',
// // //     headers: { 'Content-Type': 'application/json' },
// // //     // NOTE: model goes in the URL only — NOT in the request body
// // //     body: JSON.stringify({
// // //       content:  { parts: [{ text }] },
// // //       taskType: 'RETRIEVAL_QUERY',
// // //     }),
// // //   })
// // //   if (!res.ok) {
// // //     const errText = await res.text()
// // //     throw new Error(`Gemini embedContent ${res.status}: ${errText.slice(0, 200)}`)
// // //   }
// // //   const data = await res.json()
// // //   return data.embedding.values
// // // }

// // // // ── Logging ────────────────────────────────────────────────────────────────────
// // // function _logChunks(chunks) {
// // //   for (const ch of chunks) {
// // //     const score   = (ch.score * 100).toFixed(1)
// // //     const src     = ch.source?.split(/[/\\]/).pop() || 'unknown'
// // //     const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
// // //     console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
// // //   }
// // // }

// // // // ── PUBLIC API ─────────────────────────────────────────────────────────────────

// // // async function upsert(chunks) {
// // //   if (!chunks || chunks.length === 0) return

// // //   if (!isPineconeConfigured()) {
// // //     throw new Error('Pinecone is not configured. Set PINECONE_API_KEY and PINECONE_INDEX in Render env vars.')
// // //   }

// // //   console.log(`${tag} ${info} Embedding ${c.bold}${chunks.length} chunks${c.reset}...`)

// // //   const texts   = chunks.map(ch => ch.text)
// // //   const allVecs = []
// // //   for (let i = 0; i < texts.length; i += EMBED_BATCH) {
// // //     const vecs = await embedBatch(texts.slice(i, i + EMBED_BATCH))
// // //     allVecs.push(...vecs)
// // //     if (texts.length > EMBED_BATCH)
// // //       process.stdout.write(`${tag} ${c.dim}  ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length}...${c.reset}\r`)
// // //   }
// // //   if (texts.length > EMBED_BATCH) console.log()

// // //   const vectors = chunks.map((chunk, i) => ({
// // //     id:     chunk.id,
// // //     values: allVecs[i],
// // //     metadata: {
// // //       text:   chunk.text,
// // //       type:   chunk.metadata?.type   || 'unknown',
// // //       source: chunk.metadata?.source || '',
// // //       key:    chunk.metadata?.key    || '',
// // //       tempo:  chunk.metadata?.tempo  || 0,
// // //     },
// // //   }))

// // //   const index = getPineconeIndex()
// // //   if (!index) throw new Error('Pinecone index unavailable. Check API key and index name.')

// // //   try {
// // //     const BATCH = 100
// // //     for (let i = 0; i < vectors.length; i += BATCH) {
// // //       await index.upsert(vectors.slice(i, i + BATCH))
// // //     }
// // //     onPineconeSuccess()
// // //     console.log(`${tag} ${ok} Pinecone — ${c.bold}${vectors.length} vectors stored${c.reset}`)
// // //   } catch (err) {
// // //     onPineconeError(err)
// // //     throw new Error(`Pinecone upsert failed: ${err.message}`)
// // //   }
// // // }

// // // async function query(prompt, topK = 15) {
// // //   const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
// // //   console.log(`${tag} ${info} Query: "${c.dim}${preview}...${c.reset}" (top ${topK})`)

// // //   if (!isPineconeConfigured()) {
// // //     console.log(`${tag} ${warn} Pinecone not configured — no RAG context`)
// // //     return []
// // //   }

// // //   let vector
// // //   try {
// // //     vector = await embedText(prompt)
// // //   } catch (err) {
// // //     console.log(`${tag} ${warn} Embed failed — no RAG context: ${err.message}`)
// // //     return []
// // //   }

// // //   const index = getPineconeIndex()
// // //   if (!index) {
// // //     console.log(`${tag} ${warn} Pinecone unavailable — no RAG context`)
// // //     return []
// // //   }

// // //   try {
// // //     const result  = await index.query({ vector, topK, includeMetadata: true })
// // //     onPineconeSuccess()
// // //     const matches = (result.matches || []).map(m => ({
// // //       id:     m.id,
// // //       score:  m.score,
// // //       text:   m.metadata?.text   || '',
// // //       type:   m.metadata?.type   || 'unknown',
// // //       source: m.metadata?.source || '',
// // //       key:    m.metadata?.key    || null,
// // //       tempo:  m.metadata?.tempo  || null,
// // //     }))
// // //     console.log(`${tag} ${ok} Pinecone: ${matches.length} hits`)
// // //     _logChunks(matches)
// // //     return matches
// // //   } catch (err) {
// // //     onPineconeError(err)
// // //     console.log(`${tag} ${warn} Pinecone query failed — no RAG context`)
// // //     return []
// // //   }
// // // }

// // // async function deleteMany(ids) {
// // //   if (!ids || ids.length === 0) return
// // //   const index = getPineconeIndex()
// // //   if (!index) {
// // //     console.log(`${tag} ${warn} Pinecone unavailable — could not delete`)
// // //     return
// // //   }
// // //   try {
// // //     await index.deleteMany(ids)
// // //     onPineconeSuccess()
// // //     console.log(`${tag} ${ok} Deleted ${ids.length} vectors`)
// // //   } catch (err) {
// // //     onPineconeError(err)
// // //     console.log(`${tag} ${warn} Pinecone delete failed: ${err.message}`)
// // //   }
// // // }

// // // async function deleteBySource(sourceName) {
// // //   const index = getPineconeIndex()
// // //   if (!index) return 0
// // //   try {
// // //     await index.deleteMany({ filter: { source: { $eq: sourceName } } })
// // //     onPineconeSuccess()
// // //     console.log(`${tag} ${ok} Deleted vectors for: ${sourceName}`)
// // //     return 1
// // //   } catch (err) {
// // //     onPineconeError(err)
// // //     console.log(`${tag} ${warn} deleteBySource failed: ${err.message}`)
// // //     return 0
// // //   }
// // // }

// // // async function deleteAll() {
// // //   const index = getPineconeIndex()
// // //   if (!index) throw new Error('Pinecone unavailable')
// // //   try {
// // //     await index.deleteAll()
// // //     onPineconeSuccess()
// // //     console.log(`${tag} ${ok} Pinecone index cleared`)
// // //   } catch (err) {
// // //     onPineconeError(err)
// // //     throw new Error(`Pinecone deleteAll failed: ${err.message}`)
// // //   }
// // // }

// // // async function getStats() {
// // //   const index = getPineconeIndex()
// // //   if (!index) return { vectorCount: 0, configured: false }
// // //   try {
// // //     const stats = await index.describeIndexStats()
// // //     onPineconeSuccess()
// // //     return {
// // //       configured:  true,
// // //       vectorCount: stats.totalVectorCount || 0,
// // //       dimension:   EMBED_DIM,
// // //       indexName:   process.env.PINECONE_INDEX,
// // //     }
// // //   } catch (err) {
// // //     onPineconeError(err)
// // //     return { configured: true, vectorCount: 0, error: err.message }
// // //   }
// // // }

// // // module.exports = { query, upsert, deleteMany, deleteBySource, deleteAll, getStats, isPineconeConfigured }











// // 'use strict'
// // // backend/services/ragService.js  — FIXED VERSION
// // //
// // // CHANGES from original:
// // //   1. Switched embeddings from Gemini → Voyage AI (voyageai.com)
// // //      Free tier: 50M tokens/month — no daily quota problem
// // //      Dimension: 1024 (voyage-3)  ← recreate your Pinecone index at dim=1024
// // //      Install:   npm install voyageai
// // //      Env var:   VOYAGE_API_KEY   (add to Render environment variables)
// // //
// // //   2. Added detailed error logging so you can SEE failures in Render logs
// // //
// // //   3. Added startup connectivity check so cold-start issues are visible
// // //
// // // ─────────────────────────────────────────────────────────────────────────────

// // const VoyageAI = require('voyageai').default ?? require('voyageai')

// // // ── Terminal colours ───────────────────────────────────────────────────────────
// // const c = {
// //   reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
// //   yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
// //   bold: '\x1b[1m', gray: '\x1b[90m',
// // }
// // const tag  = `${c.cyan}[RAG]${c.reset}`
// // const ok   = `${c.green}✔${c.reset}`
// // const warn = `${c.yellow}⚠${c.reset}`
// // const fail = `${c.red}✘${c.reset}`
// // const info = `${c.gray}•${c.reset}`

// // // ── Embedding config ───────────────────────────────────────────────────────────
// // // voyage-3       → 1024 dims  (better quality, recommended)
// // // voyage-3-lite  → 512  dims  (faster, still great)
// // // IMPORTANT: your Pinecone index dimension MUST match this.
// // // If you change model, delete and recreate your Pinecone index.
// // const EMBED_MODEL = 'voyage-3'
// // const EMBED_DIM   = 1024
// // const EMBED_BATCH = 128   // Voyage supports up to 128 texts per call

// // // ── Pinecone ───────────────────────────────────────────────────────────────────
// // let _pineconeIndex  = null
// // let _pineconeFailAt = null
// // const PINECONE_RETRY_MS = 60_000
// // let _envLogged = false

// // function isPineconeConfigured() {
// //   const configured = !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX)
// //   if (!_envLogged) {
// //     _envLogged = true
// //     if (configured) {
// //       console.log(`${tag} ${info} Pinecone index: ${c.cyan}${process.env.PINECONE_INDEX}${c.reset} (dim=${EMBED_DIM})`)
// //     } else {
// //       const missing = []
// //       if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
// //       if (!process.env.PINECONE_INDEX)   missing.push('PINECONE_INDEX')
// //       console.log(`${tag} ${warn} Pinecone disabled — missing env vars: ${missing.join(', ')}`)
// //     }
// //   }
// //   return configured
// // }

// // function canTryPinecone() {
// //   if (!isPineconeConfigured()) return false
// //   if (_pineconeFailAt && (Date.now() - _pineconeFailAt) < PINECONE_RETRY_MS) return false
// //   return true
// // }

// // function getPineconeIndex() {
// //   if (!canTryPinecone()) return null
// //   if (_pineconeIndex) return _pineconeIndex
// //   try {
// //     const { Pinecone } = require('@pinecone-database/pinecone')
// //     _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
// //       .index(process.env.PINECONE_INDEX)
// //     console.log(`${tag} ${ok} Pinecone connected → ${process.env.PINECONE_INDEX}`)
// //     return _pineconeIndex
// //   } catch (e) {
// //     _pineconeFailAt = Date.now()
// //     _pineconeIndex  = null
// //     console.error(`${tag} ${fail} Pinecone init failed (retry in 60s): ${e.message}`)
// //     return null
// //   }
// // }

// // function onPineconeError(err) {
// //   _pineconeFailAt = Date.now()
// //   _pineconeIndex  = null
// //   console.error(`${tag} ${fail} Pinecone error (retry in 60s): ${err.message}`)
// // }

// // function onPineconeSuccess() {
// //   _pineconeFailAt = null
// // }

// // // ── Voyage AI Embeddings ───────────────────────────────────────────────────────

// // function getVoyageClient() {
// //   if (!process.env.VOYAGE_API_KEY) {
// //     throw new Error(
// //       'VOYAGE_API_KEY is not set. ' +
// //       'Sign up at voyageai.com (free), get an API key, ' +
// //       'and add VOYAGE_API_KEY to your Render environment variables.'
// //     )
// //   }
// //   return new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY })
// // }

// // async function embedBatch(texts, inputType = 'document') {
// //   const client = getVoyageClient()
// //   try {
// //     const response = await client.embed({
// //       input:      texts,
// //       model:      EMBED_MODEL,
// //       inputType,
// //     })
// //     const vecs = response.data.map(item => item.embedding)

// //     // Validate dimensions on first call
// //     if (vecs[0] && vecs[0].length !== EMBED_DIM) {
// //       throw new Error(
// //         `Embedding dimension mismatch: got ${vecs[0].length}, expected ${EMBED_DIM}. ` +
// //         `Delete and recreate your Pinecone index with dimension=${vecs[0].length}, ` +
// //         `or change EMBED_MODEL/EMBED_DIM in ragService.js to match.`
// //       )
// //     }
// //     return vecs
// //   } catch (err) {
// //     console.error(`${tag} ${fail} Voyage embed failed: ${err.message}`)
// //     throw err
// //   }
// // }

// // async function embedText(text) {
// //   const client = getVoyageClient()
// //   try {
// //     const response = await client.embed({
// //       input:     [text],
// //       model:     EMBED_MODEL,
// //       inputType: 'query',
// //     })
// //     return response.data[0].embedding
// //   } catch (err) {
// //     console.error(`${tag} ${fail} Voyage query embed failed: ${err.message}`)
// //     throw err
// //   }
// // }

// // // ── Logging helpers ────────────────────────────────────────────────────────────
// // function _logChunks(chunks) {
// //   for (const ch of chunks) {
// //     const score   = (ch.score * 100).toFixed(1)
// //     const src     = ch.source?.split(/[/\\]/).pop() || 'unknown'
// //     const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
// //     console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
// //   }
// // }

// // // ── PUBLIC API ─────────────────────────────────────────────────────────────────

// // /**
// //  * Embed and upsert chunks into Pinecone.
// //  * Throws if Pinecone is not configured or if embedding fails.
// //  */
// // async function upsert(chunks) {
// //   if (!chunks || chunks.length === 0) return

// //   if (!isPineconeConfigured()) {
// //     throw new Error(
// //       'Pinecone is not configured. ' +
// //       'Set PINECONE_API_KEY and PINECONE_INDEX in your Render environment variables.'
// //     )
// //   }

// //   console.log(`${tag} ${info} Embedding ${c.bold}${chunks.length} chunks${c.reset} via Voyage AI…`)

// //   const texts   = chunks.map(ch => ch.text)
// //   const allVecs = []

// //   for (let i = 0; i < texts.length; i += EMBED_BATCH) {
// //     const batch = texts.slice(i, i + EMBED_BATCH)
// //     const vecs  = await embedBatch(batch, 'document')
// //     allVecs.push(...vecs)
// //     if (texts.length > EMBED_BATCH) {
// //       process.stdout.write(
// //         `${tag} ${c.dim}  ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length} embedded…${c.reset}\r`
// //       )
// //     }
// //   }
// //   if (texts.length > EMBED_BATCH) console.log()

// //   const vectors = chunks.map((chunk, i) => ({
// //     id:     chunk.id,
// //     values: allVecs[i],
// //     metadata: {
// //       text:   chunk.text,
// //       type:   chunk.metadata?.type   || 'unknown',
// //       source: chunk.metadata?.source || '',
// //       key:    chunk.metadata?.key    || '',
// //       tempo:  chunk.metadata?.tempo  || 0,
// //     },
// //   }))

// //   const index = getPineconeIndex()
// //   if (!index) throw new Error('Pinecone index unavailable. Check API key and index name in Render env vars.')

// //   try {
// //     const BATCH = 100
// //     for (let i = 0; i < vectors.length; i += BATCH) {
// //       await index.upsert(vectors.slice(i, i + BATCH))
// //     }
// //     onPineconeSuccess()
// //     console.log(`${tag} ${ok} Pinecone — ${c.bold}${vectors.length} vectors stored${c.reset}`)
// //   } catch (err) {
// //     onPineconeError(err)
// //     throw new Error(`Pinecone upsert failed: ${err.message}`)
// //   }
// // }

// // /**
// //  * Query Pinecone for top-K most relevant chunks.
// //  * Returns [] if Pinecone is not configured or query fails.
// //  */
// // async function query(prompt, topK = 15) {
// //   const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
// //   console.log(`${tag} ${info} Query: "${c.dim}${preview}…${c.reset}" (top ${topK})`)

// //   if (!isPineconeConfigured()) {
// //     console.log(`${tag} ${warn} Pinecone not configured — no RAG context`)
// //     return []
// //   }

// //   let vector
// //   try {
// //     vector = await embedText(prompt)
// //   } catch (err) {
// //     console.log(`${tag} ${warn} Voyage embed failed — no RAG context: ${err.message}`)
// //     return []
// //   }

// //   const index = getPineconeIndex()
// //   if (!index) {
// //     console.log(`${tag} ${warn} Pinecone unavailable — no RAG context`)
// //     return []
// //   }

// //   try {
// //     const result  = await index.query({ vector, topK, includeMetadata: true })
// //     onPineconeSuccess()
// //     const matches = (result.matches || []).map(m => ({
// //       id:     m.id,
// //       score:  m.score,
// //       text:   m.metadata?.text   || '',
// //       type:   m.metadata?.type   || 'unknown',
// //       source: m.metadata?.source || '',
// //       key:    m.metadata?.key    || null,
// //       tempo:  m.metadata?.tempo  || null,
// //     }))
// //     console.log(`${tag} ${ok} Pinecone: ${matches.length} hits`)
// //     _logChunks(matches)
// //     return matches
// //   } catch (err) {
// //     onPineconeError(err)
// //     console.log(`${tag} ${warn} Pinecone query failed — no RAG context: ${err.message}`)
// //     return []
// //   }
// // }

// // /** Delete specific vectors by ID from Pinecone. */
// // async function deleteMany(ids) {
// //   if (!ids || ids.length === 0) return
// //   const index = getPineconeIndex()
// //   if (!index) {
// //     console.log(`${tag} ${warn} Pinecone unavailable — could not delete vectors`)
// //     return
// //   }
// //   try {
// //     await index.deleteMany(ids)
// //     onPineconeSuccess()
// //     console.log(`${tag} ${ok} Deleted ${ids.length} vectors from Pinecone`)
// //   } catch (err) {
// //     onPineconeError(err)
// //     console.log(`${tag} ${warn} Pinecone deleteMany failed: ${err.message}`)
// //   }
// // }

// // /** Delete all vectors for a specific source file using metadata filter. */
// // async function deleteBySource(sourceName) {
// //   const index = getPineconeIndex()
// //   if (!index) {
// //     console.log(`${tag} ${warn} Pinecone unavailable — could not delete by source`)
// //     return 0
// //   }
// //   try {
// //     await index.deleteMany({ filter: { source: { $eq: sourceName } } })
// //     onPineconeSuccess()
// //     console.log(`${tag} ${ok} Deleted vectors for source: ${sourceName}`)
// //     return 1
// //   } catch (err) {
// //     onPineconeError(err)
// //     console.log(`${tag} ${warn} deleteBySource failed: ${err.message}`)
// //     return 0
// //   }
// // }

// // /** Delete ALL vectors in the index. */
// // async function deleteAll() {
// //   const index = getPineconeIndex()
// //   if (!index) throw new Error('Pinecone unavailable')
// //   try {
// //     await index.deleteAll()
// //     onPineconeSuccess()
// //     console.log(`${tag} ${ok} Pinecone index cleared`)
// //   } catch (err) {
// //     onPineconeError(err)
// //     throw new Error(`Pinecone deleteAll failed: ${err.message}`)
// //   }
// // }

// // /** Get vector count from Pinecone index stats. */
// // async function getStats() {
// //   const index = getPineconeIndex()
// //   if (!index) return { vectorCount: 0, configured: false }
// //   try {
// //     const stats = await index.describeIndexStats()
// //     onPineconeSuccess()
// //     return {
// //       configured:  true,
// //       vectorCount: stats.totalRecordCount || stats.totalVectorCount || 0,
// //       dimension:   EMBED_DIM,
// //       model:       EMBED_MODEL,
// //     }
// //   } catch (err) {
// //     onPineconeError(err)
// //     return { configured: true, vectorCount: 0, error: err.message }
// //   }
// // }

// // module.exports = { upsert, query, deleteMany, deleteBySource, deleteAll, getStats }










// 'use strict'
// // backend/services/ragService.js  — FIXED VERSION
// // Switched embeddings: Gemini → Voyage AI
// // Install:  npm install voyageai   (in backend folder)
// // Env var:  VOYAGE_API_KEY         (add to .env and Render environment)

// const { VoyageAIClient } = require('voyageai')

// // ── Terminal colours ───────────────────────────────────────────────────────────
// const c = {
//   reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
//   yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
//   bold: '\x1b[1m', gray: '\x1b[90m',
// }
// const tag  = `${c.cyan}[RAG]${c.reset}`
// const ok   = `${c.green}✔${c.reset}`
// const warn = `${c.yellow}⚠${c.reset}`
// const fail = `${c.red}✘${c.reset}`
// const info = `${c.gray}•${c.reset}`

// // ── Embedding config ───────────────────────────────────────────────────────────
// // voyage-3      → 1024 dims  (recommended)
// // voyage-3-lite → 512  dims  (faster, smaller)
// // IMPORTANT: your Pinecone index dimension MUST match EMBED_DIM below.
// // If you change model, delete and recreate your Pinecone index.
// const EMBED_MODEL = 'voyage-3'
// const EMBED_DIM   = 1024
// const EMBED_BATCH = 128   // Voyage supports up to 128 texts per call

// // ── Pinecone ───────────────────────────────────────────────────────────────────
// let _pineconeIndex  = null
// let _pineconeFailAt = null
// const PINECONE_RETRY_MS = 60_000
// let _envLogged = false

// function isPineconeConfigured() {
//   const configured = !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX)
//   if (!_envLogged) {
//     _envLogged = true
//     if (configured) {
//       console.log(`${tag} ${info} Pinecone index: ${c.cyan}${process.env.PINECONE_INDEX}${c.reset} (dim=${EMBED_DIM})`)
//     } else {
//       const missing = []
//       if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
//       if (!process.env.PINECONE_INDEX)   missing.push('PINECONE_INDEX')
//       console.log(`${tag} ${warn} Pinecone disabled — missing env vars: ${missing.join(', ')}`)
//     }
//   }
//   return configured
// }

// function canTryPinecone() {
//   if (!isPineconeConfigured()) return false
//   if (_pineconeFailAt && (Date.now() - _pineconeFailAt) < PINECONE_RETRY_MS) return false
//   return true
// }

// function getPineconeIndex() {
//   if (!canTryPinecone()) return null
//   if (_pineconeIndex) return _pineconeIndex
//   try {
//     const { Pinecone } = require('@pinecone-database/pinecone')
//     _pineconeIndex = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
//       .index(process.env.PINECONE_INDEX)
//     console.log(`${tag} ${ok} Pinecone connected → ${process.env.PINECONE_INDEX}`)
//     return _pineconeIndex
//   } catch (e) {
//     _pineconeFailAt = Date.now()
//     _pineconeIndex  = null
//     console.error(`${tag} ${fail} Pinecone init failed (retry in 60s): ${e.message}`)
//     return null
//   }
// }

// function onPineconeError(err) {
//   _pineconeFailAt = Date.now()
//   _pineconeIndex  = null
//   console.error(`${tag} ${fail} Pinecone error (retry in 60s): ${err.message}`)
// }

// function onPineconeSuccess() {
//   _pineconeFailAt = null
// }

// // ── Voyage AI Embeddings ───────────────────────────────────────────────────────

// function getVoyageClient() {
//   if (!process.env.VOYAGE_API_KEY) {
//     throw new Error(
//       'VOYAGE_API_KEY is not set. ' +
//       'Sign up free at voyageai.com, get an API key, ' +
//       'and add VOYAGE_API_KEY to your .env file and Render environment variables.'
//     )
//   }
//   return new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY })
// }

// // Embed a batch of texts for storage (documents)
// async function embedBatch(texts, inputType = 'document') {
//   const client = getVoyageClient()
//   try {
//     const response = await client.embed({
//       input:      texts,
//       model:      EMBED_MODEL,
//       input_type: inputType,   // Voyage SDK uses snake_case, not camelCase
//     })
//     const vecs = response.data.map(item => item.embedding)

//     // Validate dimensions on first call
//     if (vecs[0] && vecs[0].length !== EMBED_DIM) {
//       throw new Error(
//         `Embedding dimension mismatch: got ${vecs[0].length}, expected ${EMBED_DIM}. ` +
//         `Delete and recreate your Pinecone index with dimension=${vecs[0].length}, ` +
//         `or update EMBED_DIM in ragService.js to match.`
//       )
//     }
//     return vecs
//   } catch (err) {
//     console.error(`${tag} ${fail} Voyage embedBatch failed: ${err.message}`)
//     throw err
//   }
// }

// // Embed a single query text for search
// async function embedText(text) {
//   const client = getVoyageClient()
//   try {
//     const response = await client.embed({
//       input:      [text],
//       model:      EMBED_MODEL,
//       input_type: 'query',    // Voyage SDK uses snake_case, not camelCase
//     })
//     return response.data[0].embedding
//   } catch (err) {
//     console.error(`${tag} ${fail} Voyage embedText failed: ${err.message}`)
//     throw err
//   }
// }

// // ── Logging helpers ────────────────────────────────────────────────────────────
// function _logChunks(chunks) {
//   for (const ch of chunks) {
//     const score   = (ch.score * 100).toFixed(1)
//     const src     = ch.source?.split(/[/\\]/).pop() || 'unknown'
//     const preview = ch.text?.slice(0, 60).replace(/\n/g, ' ') || ''
//     console.log(`${tag} ${c.dim}  [${ch.type}] ${src} (${score}%) — ${preview}…${c.reset}`)
//   }
// }

// // ── PUBLIC API ─────────────────────────────────────────────────────────────────

// /**
//  * Embed and upsert chunks into Pinecone.
//  * Throws if Pinecone is not configured or if embedding fails.
//  */
// async function upsert(chunks) {
//   if (!chunks || chunks.length === 0) return

//   if (!isPineconeConfigured()) {
//     throw new Error(
//       'Pinecone is not configured. ' +
//       'Set PINECONE_API_KEY and PINECONE_INDEX in your .env and Render environment variables.'
//     )
//   }

//   console.log(`${tag} ${info} Embedding ${c.bold}${chunks.length} chunks${c.reset} via Voyage AI…`)

//   const texts   = chunks.map(ch => ch.text)
//   const allVecs = []

//   for (let i = 0; i < texts.length; i += EMBED_BATCH) {
//     const batch = texts.slice(i, i + EMBED_BATCH)
//     const vecs  = await embedBatch(batch, 'document')
//     allVecs.push(...vecs)
//     if (texts.length > EMBED_BATCH) {
//       process.stdout.write(
//         `${tag} ${c.dim}  ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length} embedded…${c.reset}\r`
//       )
//     }
//   }
//   if (texts.length > EMBED_BATCH) console.log()

//   const vectors = chunks.map((chunk, i) => ({
//     id:     chunk.id,
//     values: allVecs[i],
//     metadata: {
//       text:   chunk.text,
//       type:   chunk.metadata?.type   || 'unknown',
//       source: chunk.metadata?.source || '',
//       key:    chunk.metadata?.key    || '',
//       tempo:  chunk.metadata?.tempo  || 0,
//     },
//   }))

//   const index = getPineconeIndex()
//   if (!index) throw new Error('Pinecone index unavailable. Check PINECONE_API_KEY and PINECONE_INDEX.')

//   try {
//     const BATCH = 100
//     for (let i = 0; i < vectors.length; i += BATCH) {
//       await index.upsert(vectors.slice(i, i + BATCH))
//     }
//     onPineconeSuccess()
//     console.log(`${tag} ${ok} Pinecone — ${c.bold}${vectors.length} vectors stored${c.reset}`)
//   } catch (err) {
//     onPineconeError(err)
//     throw new Error(`Pinecone upsert failed: ${err.message}`)
//   }
// }

// /**
//  * Query Pinecone for top-K most relevant chunks.
//  * Returns [] if Pinecone is not configured or query fails.
//  */
// async function query(prompt, topK = 15) {
//   const preview = prompt.slice(0, 50).replace(/\n/g, ' ')
//   console.log(`${tag} ${info} Query: "${c.dim}${preview}…${c.reset}" (top ${topK})`)

//   if (!isPineconeConfigured()) {
//     console.log(`${tag} ${warn} Pinecone not configured — no RAG context`)
//     return []
//   }

//   let vector
//   try {
//     vector = await embedText(prompt)
//   } catch (err) {
//     console.log(`${tag} ${warn} Voyage embed failed — no RAG context: ${err.message}`)
//     return []
//   }

//   const index = getPineconeIndex()
//   if (!index) {
//     console.log(`${tag} ${warn} Pinecone unavailable — no RAG context`)
//     return []
//   }

//   try {
//     const result  = await index.query({ vector, topK, includeMetadata: true })
//     onPineconeSuccess()
//     const matches = (result.matches || []).map(m => ({
//       id:     m.id,
//       score:  m.score,
//       text:   m.metadata?.text   || '',
//       type:   m.metadata?.type   || 'unknown',
//       source: m.metadata?.source || '',
//       key:    m.metadata?.key    || null,
//       tempo:  m.metadata?.tempo  || null,
//     }))
//     console.log(`${tag} ${ok} Pinecone: ${matches.length} hits`)
//     _logChunks(matches)
//     return matches
//   } catch (err) {
//     onPineconeError(err)
//     console.log(`${tag} ${warn} Pinecone query failed — no RAG context: ${err.message}`)
//     return []
//   }
// }

// /**
//  * Delete specific vectors by ID from Pinecone.
//  */
// async function deleteMany(ids) {
//   if (!ids || ids.length === 0) return

//   const index = getPineconeIndex()
//   if (!index) {
//     console.log(`${tag} ${warn} Pinecone unavailable — could not delete vectors`)
//     return
//   }

//   try {
//     await index.deleteMany(ids)
//     onPineconeSuccess()
//     console.log(`${tag} ${ok} Deleted ${ids.length} vectors from Pinecone`)
//   } catch (err) {
//     onPineconeError(err)
//     console.log(`${tag} ${warn} Pinecone deleteMany failed: ${err.message}`)
//   }
// }

// /**
//  * Delete all vectors for a specific source file using metadata filter.
//  */
// async function deleteBySource(sourceName) {
//   const index = getPineconeIndex()
//   if (!index) {
//     console.log(`${tag} ${warn} Pinecone unavailable — could not delete by source`)
//     return 0
//   }

//   try {
//     await index.deleteMany({ filter: { source: { $eq: sourceName } } })
//     onPineconeSuccess()
//     console.log(`${tag} ${ok} Deleted vectors for source: ${sourceName}`)
//     return 1
//   } catch (err) {
//     onPineconeError(err)
//     console.log(`${tag} ${warn} deleteBySource failed: ${err.message}`)
//     return 0
//   }
// }

// /**
//  * Delete ALL vectors in the index.
//  */
// async function deleteAll() {
//   const index = getPineconeIndex()
//   if (!index) throw new Error('Pinecone unavailable')

//   try {
//     await index.deleteAll()
//     onPineconeSuccess()
//     console.log(`${tag} ${ok} Pinecone index cleared`)
//   } catch (err) {
//     onPineconeError(err)
//     throw new Error(`Pinecone deleteAll failed: ${err.message}`)
//   }
// }

// /**
//  * Get vector count from Pinecone index stats.
//  */
// async function getStats() {
//   const index = getPineconeIndex()
//   if (!index) return { vectorCount: 0, configured: false }

//   try {
//     const stats = await index.describeIndexStats()
//     onPineconeSuccess()
//     return {
//       configured:  true,
//       vectorCount: stats.totalRecordCount || stats.totalVectorCount || 0,
//       dimension:   EMBED_DIM,
//       model:       EMBED_MODEL,
//     }
//   } catch (err) {
//     onPineconeError(err)
//     return { configured: true, vectorCount: 0, error: err.message }
//   }
// }

// module.exports = { upsert, query, deleteMany, deleteBySource, deleteAll, getStats }
















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