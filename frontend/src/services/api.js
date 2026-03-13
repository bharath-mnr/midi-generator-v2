// // //E:\pro\midigenerator_v2\frontend\src\services\api.js
// const BASE = `${import.meta.env.VITE_API_URL || ''}/api`

// async function request(path, options = {}) {
//   const res = await fetch(`${BASE}${path}`, options)
//   if (!res.ok) {
//     const err = await res.json().catch(() => ({ error: res.statusText }))
//     throw new Error(err.error || `HTTP ${res.status}`)
//   }
//   return res.json()
// }

// export async function compose({ prompt, section }) {
//   return request('/compose', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ prompt, section }),
//   })
// }

// export async function ingestMidi(file) {
//   const form = new FormData()
//   form.append('file', file)
//   return request('/ingest/midi', { method: 'POST', body: form })
// }

// export async function ingestDoc(file) {
//   const form = new FormData()
//   form.append('file', file)
//   return request('/ingest/doc', { method: 'POST', body: form })
// }

// export async function getHistory() {
//   return request('/history')
// }

// export async function getHistoryItem(id) {
//   return request(`/history/${id}`)
// }

// export async function getKnowledge() {
//   return request('/knowledge')
// }

// // DELETE /api/knowledge/:id — original backend route
// export async function deleteKnowledge(id) {
//   return request(`/knowledge/${id}`, { method: 'DELETE' })
// }

// export async function alterMidi(file, prompt) {
//   const form = new FormData()
//   form.append('file', file)
//   form.append('prompt', prompt)
//   return request('/alter', { method: 'POST', body: form })
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

// ── Compose ───────────────────────────────────────────────────────────────────
// model: 'aria' (Gemini, default) | 'opus' (Claude)
export function compose({ prompt, section, model = 'aria' }) {
  return request('/api/compose', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, section, model }),
  })
}

// ── Alter ─────────────────────────────────────────────────────────────────────
// model: 'aria' | 'opus' — passed as a form field alongside the file
export function alterMidi(file, prompt, model = 'aria') {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('prompt', prompt)
  fd.append('model', model)
  return request('/api/alter', { method: 'POST', body: fd })
}

// ── History ───────────────────────────────────────────────────────────────────
export function getHistory()       { return request('/api/history') }
export function getHistoryItem(id) { return request(`/api/history/${id}`) }

// ── Knowledge ─────────────────────────────────────────────────────────────────
export function getKnowledge()     { return request('/api/knowledge') }

export function deleteKnowledge(id) {
  return request(`/api/knowledge/${id}`, { method: 'DELETE' })
}

// ── Ingest ────────────────────────────────────────────────────────────────────
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