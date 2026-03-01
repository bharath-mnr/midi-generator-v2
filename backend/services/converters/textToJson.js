//E:\pro\midigenerator_v2\backend\services\converters\textToJson.js

'use strict'

function getSubsPerBar(ts) {
  const [n, d] = ts.split('/').map(Number)
  const s = n * (16 / d)
  if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts}`)
  return s
}

function expandCompression(symbols) {
  const out = []
  for (const sym of symbols) {
    const m = sym.match(/^(.+?)\((\d+)\)$/)
    if (m) for (let i = 0; i < parseInt(m[2]); i++) out.push(m[1])
    else out.push(sym)
  }
  return out
}

function parseSymbol(sym) {
  if (sym === '.') return { type: 'rest' }
  if (/^~/.test(sym)) {
    const c = sym.match(/^~(\d+)$/)
    return { type: 'sustain', sustainCutoff: c ? parseInt(c[1]) : null }
  }
  if (!sym.startsWith('X')) return { type: 'rest' }

  let s = sym.toUpperCase(), vel = 100, dp = null
  const vm = s.match(/^X(\d+)/); if (vm) { vel = Math.min(127, Math.max(1, parseInt(vm[1]))); s = s.slice(vm[0].length) } else s = s.slice(1)
  const dm = s.match(/E(\d+)/);  if (dm) dp = Math.min(100, parseInt(dm[1]))
  return { type: 'note', velocity: vel, durationPercent: dp }
}

function convert(text) {
  const lines = text.trim().split('\n')
  let tempo = 120, timeSigStr = '4/4', key = 'C'

  for (const line of lines) {
    const t  = line.trim()
    const tm = t.match(/^Tempo:\s*(\d+)/i);            if (tm) { tempo = parseInt(tm[1]); continue }
    const ts = t.match(/^TimeSig:\s*(\d+\/\d+)/i);     if (ts) { timeSigStr = ts[1]; continue }
    const km = t.match(/^Key:\s*([A-G][#b]?[m]?)/i);   if (km) { key = km[1]; continue }
  }

  const subs    = getSubsPerBar(timeSigStr)
  const rawBars = []; let currentBar = null

  for (const line of lines) {
    const t  = line.trim(); if (!t) continue
    const bm = t.match(/^Bar:\s*(\d+)$/i)
    if (bm) { currentBar = { barNumber: parseInt(bm[1]), pitches: new Map() }; rawBars.push(currentBar); continue }
    if (!currentBar) continue
    const nm = t.match(/^([A-G][#b]?-?\d+):\s*(.+)$/i)
    if (!nm) continue
    const expanded = expandCompression(nm[2].trim().split(/\s+/).filter(Boolean))
    if (expanded.length !== subs) throw new Error(`Bar ${currentBar.barNumber} ${nm[1]}: expected ${subs} subdivisions, got ${expanded.length}`)
    currentBar.pitches.set(nm[1], expanded)
  }

  const totalBars   = rawBars.length
  const activeNotes = new Map()
  const resolved    = []

  for (let bi = 0; bi < totalBars; bi++) {
    const bar           = rawBars[bi]
    const barAbsOffset  = bi * subs
    const allPitches    = new Set([...bar.pitches.keys(), ...activeNotes.keys()])

    for (const pitch of allPitches) {
      const symbols = bar.pitches.get(pitch)
      if (!symbols) {
        if (activeNotes.has(pitch)) {
          const a = activeNotes.get(pitch)
          resolved.push({ pitch, startBarNumber: a.startBarNumber, startSub: a.startSub, durationSubdivisions: barAbsOffset - a.startAbsSub, velocity: a.velocity })
          activeNotes.delete(pitch)
        }
        continue
      }

      let active = activeNotes.get(pitch) || null
      for (let s = 0; s < symbols.length; s++) {
        const p = parseSymbol(symbols[s])
        if (p.type === 'rest') {
          if (active) {
            resolved.push({ pitch, startBarNumber: active.startBarNumber, startSub: active.startSub, durationSubdivisions: barAbsOffset + s - active.startAbsSub, velocity: active.velocity })
            activeNotes.delete(pitch); active = null
          }
        } else if (p.type === 'sustain') {
          if (active && p.sustainCutoff !== null) {
            resolved.push({ pitch, startBarNumber: active.startBarNumber, startSub: active.startSub, durationSubdivisions: barAbsOffset + s - active.startAbsSub, velocity: active.velocity })
            activeNotes.delete(pitch); active = null
          }
        } else if (p.type === 'note') {
          if (active) {
            resolved.push({ pitch, startBarNumber: active.startBarNumber, startSub: active.startSub, durationSubdivisions: barAbsOffset + s - active.startAbsSub, velocity: active.velocity })
            activeNotes.delete(pitch); active = null
          }
          if (p.durationPercent !== null && p.durationPercent !== undefined) {
            resolved.push({ pitch, startBarNumber: bar.barNumber, startSub: s % subs, durationSubdivisions: 1, velocity: p.velocity })
          } else {
            active = { startBarNumber: bar.barNumber, startSub: s % subs, startAbsSub: barAbsOffset + s, velocity: p.velocity }
            activeNotes.set(pitch, active)
          }
        }
      }
    }
  }

  for (const [pitch, active] of activeNotes.entries()) {
    const d = totalBars * subs - active.startAbsSub
    if (d > 0) resolved.push({ pitch, startBarNumber: active.startBarNumber, startSub: active.startSub, durationSubdivisions: d, velocity: active.velocity })
  }

  const barsMap = new Map()
  for (const bar of rawBars) barsMap.set(bar.barNumber, { bar_number: bar.barNumber, notes: [] })
  for (const note of resolved) {
    if (!barsMap.has(note.startBarNumber)) barsMap.set(note.startBarNumber, { bar_number: note.startBarNumber, notes: [] })
    barsMap.get(note.startBarNumber).notes.push({
      pitch:                 note.pitch,
      start_subdivision:     note.startSub,
      duration_subdivisions: note.durationSubdivisions,
      velocity:              note.velocity,
    })
  }

  return {
    tempo,
    time_signature: timeSigStr,
    key,
    bars: Array.from(barsMap.values()).sort((a, b) => a.bar_number - b.bar_number),
  }
}

module.exports = { convert, getSubsPerBar, expandCompression }
