// // // //E:\pro\midigenerator_v2\frontend\src\services\api.js
// // const BASE = `${import.meta.env.VITE_API_URL || ''}/api`

// // async function request(path, options = {}) {
// //   const res = await fetch(`${BASE}${path}`, options)
// //   if (!res.ok) {
// //     const err = await res.json().catch(() => ({ error: res.statusText }))
// //     throw new Error(err.error || `HTTP ${res.status}`)
// //   }
// //   return res.json()
// // }

// // export async function compose({ prompt, section }) {
// //   return request('/compose', {
// //     method: 'POST',
// //     headers: { 'Content-Type': 'application/json' },
// //     body: JSON.stringify({ prompt, section }),
// //   })
// // }

// // export async function ingestMidi(file) {
// //   const form = new FormData()
// //   form.append('file', file)
// //   return request('/ingest/midi', { method: 'POST', body: form })
// // }

// // export async function ingestDoc(file) {
// //   const form = new FormData()
// //   form.append('file', file)
// //   return request('/ingest/doc', { method: 'POST', body: form })
// // }

// // export async function getHistory() {
// //   return request('/history')
// // }

// // export async function getHistoryItem(id) {
// //   return request(`/history/${id}`)
// // }

// // export async function getKnowledge() {
// //   return request('/knowledge')
// // }

// // // DELETE /api/knowledge/:id — original backend route
// // export async function deleteKnowledge(id) {
// //   return request(`/knowledge/${id}`, { method: 'DELETE' })
// // }

// // export async function alterMidi(file, prompt) {
// //   const form = new FormData()
// //   form.append('file', file)
// //   form.append('prompt', prompt)
// //   return request('/alter', { method: 'POST', body: form })
// // }










// // frontend/src/services/api.js
// // Central fetch layer — all backend calls go through here

// const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// async function request(path, options = {}) {
//   const res = await fetch(`${BASE}${path}`, options)
//   if (!res.ok) {
//     let msg = `${res.status} ${res.statusText}`
//     try { const body = await res.json(); msg = body.error || msg } catch (_) {}
//     throw new Error(msg)
//   }
//   return res.json()
// }

// // ── Compose ───────────────────────────────────────────────────────────────────
// // model: 'aria' (Gemini, default) | 'opus' (Claude)
// export function compose({ prompt, section, model = 'aria' }) {
//   return request('/api/compose', {
//     method:  'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body:    JSON.stringify({ prompt, section, model }),
//   })
// }

// // ── Alter ─────────────────────────────────────────────────────────────────────
// // model: 'aria' | 'opus' — passed as a form field alongside the file
// export function alterMidi(file, prompt, model = 'aria') {
//   const fd = new FormData()
//   fd.append('file', file)
//   fd.append('prompt', prompt)
//   fd.append('model', model)
//   return request('/api/alter', { method: 'POST', body: fd })
// }

// // ── History ───────────────────────────────────────────────────────────────────
// export function getHistory()       { return request('/api/history') }
// export function getHistoryItem(id) { return request(`/api/history/${id}`) }

// // ── Knowledge ─────────────────────────────────────────────────────────────────
// export function getKnowledge()     { return request('/api/knowledge') }

// export function deleteKnowledge(id) {
//   return request(`/api/knowledge/${id}`, { method: 'DELETE' })
// }

// // ── Ingest ────────────────────────────────────────────────────────────────────
// export function ingestMidi(file) {
//   const fd = new FormData()
//   fd.append('file', file)
//   return request('/api/ingest/midi', { method: 'POST', body: fd })
// }

// export function ingestDoc(file) {
//   const fd = new FormData()
//   fd.append('file', file)
//   return request('/api/ingest/doc', { method: 'POST', body: fd })
// }







// frontend/src/services/api.js
// Central fetch layer — all backend calls go through here

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try { const body = await res.json(); msg = body.error || msg } catch (_) {}
    throw new Error(msg)
  }
  return res.json()
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYZE — Music Analyzer Engine v3.0
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Full analysis: features, boundaries, families, variations, sections, graph
 * @param {Object} json - MIDI JSON object
 * @param {number} [splitMidi] - optional hand split point (MIDI note)
 * @returns {Promise<{success, data}>} Full analysis result
 */
export function analyze(json, splitMidi) {
  return request('/api/analyze', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ json, options: { splitMidi } }),
  })
}

/**
 * Quick pattern discovery (lightweight)
 * @param {Object} json - MIDI JSON object
 * @param {number} [splitMidi] - optional hand split point
 * @returns {Promise<{success, families, windowSizes, boundaries}>}
 */
export function analyzeFamilies(json, splitMidi) {
  return request('/api/analyze/families', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ json, options: { splitMidi } }),
  })
}

/**
 * Detect structural boundaries with novelty scoring
 * @param {Object} json - MIDI JSON object
 * @param {number} [splitMidi] - optional hand split point
 * @returns {Promise<{success, boundaries, noveltyScores, totalBars}>}
 */
export function analyzeBoundaries(json, splitMidi) {
  return request('/api/analyze/boundaries', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ json, options: { splitMidi } }),
  })
}

/**
 * Extract per-bar feature vectors
 * @param {Object} json - MIDI JSON object
 * @param {number} [splitMidi] - optional hand split point
 * @returns {Promise<{success, features, barCount}>}
 */
export function analyzeFeatures(json, splitMidi) {
  return request('/api/analyze/features', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ json, options: { splitMidi } }),
  })
}

/**
 * Compute n×n pairwise similarity matrix
 * @param {Object} json - MIDI JSON object
 * @param {number} [splitMidi] - optional hand split point
 * @returns {Promise<{success, matrix, barCount, dimensions}>}
 */
export function analyzeSimilarity(json, splitMidi) {
  return request('/api/analyze/similarity', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ json, options: { splitMidi } }),
  })
}

/**
 * Variation classification for each pattern occurrence
 * @param {Object} json - MIDI JSON object
 * @param {number} [splitMidi] - optional hand split point
 * @returns {Promise<{success, variations, familyCount, occurrenceCount}>}
 */
export function analyzeVariations(json, splitMidi) {
  return request('/api/analyze/variations', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ json, options: { splitMidi } }),
  })
}

/**
 * Generate YAML blueprint (composition generation template)
 * @param {Object} json - MIDI JSON object
 * @param {number} [splitMidi] - optional hand split point
 * @returns {Promise<{success, yaml}>}
 */
export function analyzeYaml(json, splitMidi) {
  return request('/api/analyze/yaml', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ json, options: { splitMidi } }),
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSE — LLM-based composition
// ══════════════════════════════════════════════════════════════════════════════

// model: 'aria' (Gemini, default) | 'opus' (Claude)
export function compose({ prompt, section, model = 'aria' }) {
  return request('/api/compose', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, section, model }),
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// ALTER — MIDI transformation
// ══════════════════════════════════════════════════════════════════════════════

// model: 'aria' | 'opus' — passed as a form field alongside the file
export function alterMidi(file, prompt, model = 'aria') {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('prompt', prompt)
  fd.append('model', model)
  return request('/api/alter', { method: 'POST', body: fd })
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORY — Session & generation history
// ══════════════════════════════════════════════════════════════════════════════

export function getHistory() {
  return request('/api/history')
}

export function getHistoryItem(id) {
  return request(`/api/history/${id}`)
}

// ══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE — Musical knowledge base
// ══════════════════════════════════════════════════════════════════════════════

export function getKnowledge() {
  return request('/api/knowledge')
}

export function deleteKnowledge(id) {
  return request(`/api/knowledge/${id}`, { method: 'DELETE' })
}

// ══════════════════════════════════════════════════════════════════════════════
// INGEST — File ingestion
// ══════════════════════════════════════════════════════════════════════════════

export function ingestMidi(file) {
  const fd = new FormData()
  fd.append('file', file)
  return request('/api/ingest/midi', { method: 'POST', body: fd })
}

export function ingestDoc(file) {
  const fd = new FormData()
  fd.append('file', file)
  return request('/api/ingest/doc', { method: 'POST', body: fd })
}