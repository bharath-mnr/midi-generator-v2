// //E:\pro\midigenerator_v2\frontend\src\services\api.js

// const BASE = '/api'

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

// export async function getHistory() { return request('/history') }
// export async function getHistoryItem(id) { return request(`/history/${id}`) }
// export async function getKnowledge() { return request('/knowledge') }
// export async function deleteKnowledge(id) { return request(`/knowledge/${id}`, { method: 'DELETE' }) }









const BASE = `${import.meta.env.VITE_API_URL || ''}/api`

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function compose({ prompt, section }) {
  return request('/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, section }),
  })
}

export async function ingestMidi(file) {
  const form = new FormData()
  form.append('file', file)
  return request('/ingest/midi', { method: 'POST', body: form })
}

export async function ingestDoc(file) {
  const form = new FormData()
  form.append('file', file)
  return request('/ingest/doc', { method: 'POST', body: form })
}

export async function getHistory() {
  return request('/history')
}

export async function getHistoryItem(id) {
  return request(`/history/${id}`)
}

export async function getKnowledge() {
  return request('/knowledge')
}

// DELETE /api/knowledge/:id — original backend route
export async function deleteKnowledge(id) {
  return request(`/knowledge/${id}`, { method: 'DELETE' })
}

export async function alterMidi(file, prompt) {
  const form = new FormData()
  form.append('file', file)
  form.append('prompt', prompt)
  return request('/alter', { method: 'POST', body: form })
}