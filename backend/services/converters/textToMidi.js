//E:\pro\midigenerator_v2\backend\services\converters\textToMidi.js

'use strict'

const NOTE_MAP = { 'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11 }

function getSubsPerBar(ts) {
  const s = ts.numerator * (16 / ts.denominator)
  if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts.numerator}/${ts.denominator}`)
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

function pitchToMidi(pitch) {
  const m = pitch.match(/^([A-G][#Bb]?)(-?\d+)$/i)
  if (!m) throw new Error(`Invalid pitch: ${pitch}`)
  const nn = m[1].toUpperCase()
  if (!(nn in NOTE_MAP)) throw new Error(`Unknown note: ${nn}`)
  return (parseInt(m[2]) + 1) * 12 + NOTE_MAP[nn]
}

function parseSymbol(sym, defVel = 100) {
  if (sym === '.') return { isRest: true }
  if (/^~/.test(sym)) {
    const c = sym.match(/^~(\d+)$/)
    return { isSustain: true, sustainCutoff: c ? parseInt(c[1]) : null }
  }
  if (!sym.startsWith('X')) return { isRest: true }

  let s = sym.toUpperCase(), vel = defVel, to = 0, dp = null
  const vm = s.match(/^X(\d+)/); if (vm) { vel = Math.min(127, Math.max(1, parseInt(vm[1]))); s = s.slice(vm[0].length) } else s = s.slice(1)
  const rm = s.match(/XR(\d+)/); if (rm) { to = Math.min(100, parseInt(rm[1])); s = s.replace(/XR\d+/, '') }
  const dm = s.match(/E(\d+)/);  if (dm) dp = Math.min(100, parseInt(dm[1]))

  return { isNoteOn: true, velocity: vel, timingOffset: to, durationPercent: dp }
}

function validateSubdivisions(text) {
  const errors = []
  const lines  = text.trim().split('\n')
  const tsLine = lines.find(l => /^timesig:/i.test(l.trim()))
  if (!tsLine) return ['Missing TimeSig']
  const tm = tsLine.match(/TimeSig:\s*(\d+)\/(\d+)/i)
  if (!tm) return ['Invalid TimeSig format']
  const expectedSubs = parseInt(tm[1]) * (16 / parseInt(tm[2]))
  let barNum = null, barPitches = new Map()

  const checkBar = () => {
    if (barNum === null) return
    barPitches.forEach((count, pitch) => {
      if (count !== expectedSubs) errors.push(`Bar ${barNum} ${pitch}: expected ${expectedSubs} subdivisions, got ${count}`)
    })
  }

  for (const line of lines) {
    const t  = line.trim()
    const bm = t.match(/^Bar:\s*(\d+)$/i)
    if (bm) { checkBar(); barNum = parseInt(bm[1]); barPitches = new Map(); continue }
    if (barNum !== null && /^[A-G][#b]?-?\d+:/i.test(t)) {
      const [pitch, ...rest] = t.split(':')
      const syms = rest.join(':').trim().split(/\s+/).filter(Boolean)
      barPitches.set(pitch.trim(), expandCompression(syms).length)
    }
  }
  checkBar()
  return errors
}

function parse(text) {
  const lines  = text.trim().split('\n')
  let tempo    = 120, timeSig = { numerator: 4, denominator: 4 }
  const bars   = []; let currentBar = null

  for (const line of lines) {
    const t = line.trim(); if (!t) continue
    const tm = t.match(/^Tempo:\s*(\d+)/i);           if (tm) { tempo = parseInt(tm[1]); continue }
    const ts = t.match(/^TimeSig:\s*(\d+)\/(\d+)/i);  if (ts) { timeSig.numerator = parseInt(ts[1]); timeSig.denominator = parseInt(ts[2]); continue }
    const bm = t.match(/^Bar:\s*(\d+)$/i);             if (bm) { currentBar = { number: parseInt(bm[1]), pitches: new Map() }; bars.push(currentBar); continue }
    if (currentBar && /^[A-G][#b]?-?\d+:/i.test(t)) {
      const [pitch, ...rest] = t.split(':')
      currentBar.pitches.set(pitch.trim(), expandCompression(rest.join(':').trim().split(/\s+/).filter(Boolean)))
    }
  }
  return { bars, metadata: { tempo, timeSig } }
}

function toMidiEvents(parsed) {
  const { bars, metadata } = parsed
  const { tempo, timeSig } = metadata
  const tpq    = 480
  const subs   = getSubsPerBar(timeSig)
  const barTks = tpq * timeSig.numerator * (4 / timeSig.denominator)
  const tpSub  = barTks / subs
  const noteEvents = []

  bars.forEach(bar => {
    const baseBarTick = (bar.number - 1) * barTks
    bar.pitches.forEach((patterns, pitch) => {
      let cur = null
      patterns.forEach((sym, si) => {
        try {
          const ps       = parseSymbol(sym)
          const baseTick = baseBarTick + si * tpSub
          const actTick  = baseTick + ((ps.timingOffset || 0) / 100) * tpSub
          const mp       = pitchToMidi(pitch)

          if (ps.isNoteOn) {
            if (cur) { const d = actTick - cur.startTick; if (d > 0) noteEvents.push({ ...cur, durationTicks: d }); cur = null }
            cur = { startTick: actTick, pitch: mp, velocity: ps.velocity }
            if (ps.durationPercent !== null && ps.durationPercent !== undefined) {
              noteEvents.push({ startTick: actTick, pitch: mp, velocity: ps.velocity, durationTicks: (ps.durationPercent / 100) * tpSub })
              cur = null
            }
          } else if (ps.isSustain) {
            if (cur && ps.sustainCutoff !== null) {
              const endTick = baseTick + (ps.sustainCutoff / 100) * tpSub
              const d       = endTick - cur.startTick
              if (d > 0) noteEvents.push({ ...cur, durationTicks: d })
              cur = null
            }
          } else if (ps.isRest) {
            if (cur) { const d = baseTick - cur.startTick; if (d > 0) noteEvents.push({ ...cur, durationTicks: d }); cur = null }
          }
        } catch (_) {}
      })
      if (cur) { const d = baseBarTick + barTks - cur.startTick; if (d > 0) noteEvents.push({ ...cur, durationTicks: d }) }
    })
  })

  const midiEvents = []
  noteEvents.forEach(ev => {
    midiEvents.push({ tick: ev.startTick, type: 'on',  pitch: ev.pitch, velocity: ev.velocity })
    midiEvents.push({ tick: ev.startTick + ev.durationTicks, type: 'off', pitch: ev.pitch, velocity: 0 })
  })
  midiEvents.sort((a, b) => a.tick !== b.tick ? a.tick - b.tick : a.type === 'off' ? -1 : 1)
  return { midiEvents, tempo, timeSig, tpq }
}

function writeVL(v) {
  let buf = v & 0x7F; const bytes = []
  while ((v >>= 7) > 0) { buf <<= 8; buf |= (v & 0x7F) | 0x80 }
  while (true) { bytes.push(buf & 0xFF); if (buf & 0x80) buf >>= 8; else break }
  return bytes
}

function generateBytes(midiEvents, tempo, timeSig, tpq) {
  const data = []
  const wb = (bytes) => bytes.forEach(b => data.push(b & 0xFF))
  const wi = (v, n) => { for (let i = n-1; i >= 0; i--) data.push((v >> (8*i)) & 0xFF) }
  wb([0x4D,0x54,0x68,0x64]); wi(6,4); wi(0,2); wi(1,2); wi(tpq,2)
  const td = []
  td.push(...writeVL(0)); td.push(0xFF,0x51,0x03)
  const us = Math.round(60000000/tempo)
  td.push((us>>16)&0xFF,(us>>8)&0xFF,us&0xFF)
  td.push(...writeVL(0)); td.push(0xFF,0x58,0x04)
  td.push(timeSig.numerator, Math.log2(timeSig.denominator), 24, 8)
  td.push(...writeVL(0)); td.push(0xC0,0x00)
  let last = 0
  for (const ev of midiEvents) {
    const dt = Math.max(0, Math.round(ev.tick - last))
    td.push(...writeVL(dt))
    if (ev.type === 'on') td.push(0x90, ev.pitch & 0x7F, ev.velocity & 0x7F)
    else                  td.push(0x80, ev.pitch & 0x7F, 0x40)
    last += dt
  }
  td.push(...writeVL(0)); td.push(0xFF,0x2F,0x00)
  wb([0x4D,0x54,0x72,0x6B]); wi(td.length,4); wb(td)
  return new Uint8Array(data)
}

function convert(text) {
  const valErrors = validateSubdivisions(text)
  if (valErrors.length > 0) throw new Error(`Subdivision errors:\n${valErrors.join('\n')}`)
  const parsed = parse(text)
  const { midiEvents, tempo, timeSig, tpq } = toMidiEvents(parsed)
  return generateBytes(midiEvents, tempo, timeSig, tpq)
}

module.exports = { convert, validateSubdivisions, parse }
