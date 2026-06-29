'use strict'
// backend/services/converters/stringToMidi.js
// Parses compact string format → doc object → MIDI binary
//
// FORMAT:
//   H: tempo|time_signature|key|spb
//   B<n>: p,s,d[,oNN][,cNN] ; p,s,d ...
//   B<n>:                          ← empty / continuation bar
//
// velocity is always 100 — never appears in the format

const NOTE_MAP = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
  'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
  'A':9,'A#':10,'BB':10,'B':11,
}

// ── Parse compact string → doc ────────────────────────────────────────────────
function parseCompactString(str) {
  str = str.trim()

  const headerMatch = str.match(/^H:\s*(.*?)(?=\s*B\d+:|\s*$)/)
  if (!headerMatch) throw new Error('Missing header line (H: ...)')
  const headerRaw = headerMatch[1].trim()
  const headerParts = headerRaw.split('|')
  if (headerParts.length !== 4) throw new Error(`Malformed header: "${headerRaw}"`)

  const [tempoStr, time_signature, key, spbStr] = headerParts
  const header = {
    tempo:                parseFloat(tempoStr),
    time_signature:       time_signature.trim(),
    key:                  key.trim(),
    subdivisions_per_bar: parseInt(spbStr, 10),
  }
  if (isNaN(header.tempo))               throw new Error(`Invalid tempo: "${tempoStr}"`)
  if (isNaN(header.subdivisions_per_bar)) throw new Error(`Invalid spb: "${spbStr}"`)

  // Extract all B<n>: markers
  const barRegex = /B(\d+):/g
  let m
  const matches = []
  while ((m = barRegex.exec(str)) !== null) {
    matches.push({ barNumber: parseInt(m[1], 10), startIndex: m.index, endIndex: m.index + m[0].length })
  }
  if (matches.length === 0) throw new Error('No bars found')

  const bars = []
  for (let i = 0; i < matches.length; i++) {
    const current  = matches[i]
    const next     = matches[i + 1]
    const content  = str.substring(current.endIndex, next ? next.startIndex : str.length).trim()

    const notes = []
    if (content.length > 0) {
      for (const noteStr of content.split(';').map(s => s.trim()).filter(Boolean)) {
        const fields = noteStr.split(',').map(f => f.trim())
        if (fields.length < 3) throw new Error(`Bar ${current.barNumber}: missing p,s,d in "${noteStr}"`)
        const [p, sStr, dStr, ...rest] = fields
        const s = parseInt(sStr, 10)
        const d = parseInt(dStr, 10)
        if (isNaN(s) || isNaN(d)) throw new Error(`Bar ${current.barNumber}: invalid s/d in "${noteStr}"`)
        const note = { p, s, d, o: 0, c: null }
        for (const tok of rest) {
          if (/^o-?\d+$/i.test(tok))  note.o = parseInt(tok.slice(1), 10)
          else if (/^c\d+$/i.test(tok)) note.c = parseInt(tok.slice(1), 10)
          else throw new Error(`Bar ${current.barNumber}: unrecognized token "${tok}"`)
        }
        notes.push(note)
      }
    }
    bars.push({ bar_number: current.barNumber, notes })
  }

  // Sort and fill gaps with empty bars
  bars.sort((a, b) => a.bar_number - b.bar_number)
  const maxBar   = bars[bars.length - 1].bar_number
  const barMap   = new Map(bars.map(b => [b.bar_number, b]))
  const filled   = []
  for (let i = 1; i <= maxBar; i++) {
    filled.push(barMap.get(i) ?? { bar_number: i, notes: [] })
  }

  return { ...header, bars: filled }
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function pitchToMidi(pitch) {
  const m = pitch.match(/^([A-G][#Bb]?)(-?\d+)$/i)
  if (!m) throw new Error(`Invalid pitch: ${pitch}`)
  const nn = m[1].toUpperCase()
  if (!(nn in NOTE_MAP)) throw new Error(`Unknown note: ${nn}`)
  return (parseInt(m[2]) + 1) * 12 + NOTE_MAP[nn]
}

function getSubsPerBar(timeSigStr) {
  const [num, den] = timeSigStr.split('/').map(Number)
  const subs = num * (16 / den)
  if (!Number.isInteger(subs)) throw new Error(`Invalid time signature: ${timeSigStr}`)
  return subs
}

function writeVL(value) {
  let buf = value & 0x7F
  const bytes = []
  while ((value >>= 7) > 0) { buf <<= 8; buf |= (value & 0x7F) | 0x80 }
  while (true) { bytes.push(buf & 0xFF); if (buf & 0x80) buf >>= 8; else break }
  return bytes
}

// ── Doc → MIDI events ─────────────────────────────────────────────────────────
function docToMidiEvents(doc) {
  const { tempo, time_signature, bars } = doc
  const [tn, td]          = time_signature.split('/').map(Number)
  const tpq               = 480
  const spb               = getSubsPerBar(time_signature)
  const barTicks          = tpq * tn * (4 / td)
  const tpSub             = barTicks / spb
  const midiEvents        = []

  for (const bar of bars) {
    if (!bar.notes || bar.notes.length === 0) continue
    const barBase = (bar.bar_number - 1) * barTicks

    for (const note of bar.notes) {
      const mp  = pitchToMidi(note.p)
      const vel = 100

      const startTick = barBase
        + note.s * tpSub
        + ((note.o || 0) / 100) * tpSub

      let durTicks
      if (note.d === 0) {
        durTicks = ((note.c || 50) / 100) * tpSub
      } else {
        durTicks = note.d * tpSub
        if (note.c !== null && note.c !== undefined) {
          durTicks = (note.d - 1) * tpSub + (note.c / 100) * tpSub
        }
      }

      if (durTicks <= 0) continue
      midiEvents.push({ tick: startTick,             type: 'on',  pitch: mp, velocity: vel })
      midiEvents.push({ tick: startTick + durTicks,  type: 'off', pitch: mp, velocity: 0   })
    }
  }

  midiEvents.sort((a, b) => {
    if (a.tick !== b.tick)  return a.tick - b.tick
    if (a.type === 'off' && b.type === 'on')  return -1
    if (a.type === 'on'  && b.type === 'off') return  1
    return a.pitch - b.pitch
  })

  return { midiEvents, tempo, timeSig: { numerator: tn, denominator: td }, tpq }
}

// ── MIDI event list → binary ───────────────────────────────────────────────────
function generateMidiBytes(midiEvents, tempo, timeSig, tpq) {
  const data = []
  const wb = (bytes) => bytes.forEach(b => data.push(b & 0xFF))
  const wi = (v, n) => { for (let i = n - 1; i >= 0; i--) data.push((v >> (8 * i)) & 0xFF) }

  wb([0x4D, 0x54, 0x68, 0x64]); wi(6, 4); wi(0, 2); wi(1, 2); wi(tpq, 2)

  const td = []
  td.push(...writeVL(0)); td.push(0xFF, 0x51, 0x03)
  const us = Math.round(60000000 / tempo)
  td.push((us >> 16) & 0xFF, (us >> 8) & 0xFF, us & 0xFF)

  td.push(...writeVL(0)); td.push(0xFF, 0x58, 0x04)
  td.push(timeSig.numerator, Math.log2(timeSig.denominator), 24, 8)

  td.push(...writeVL(0)); td.push(0xC0, 0x00)

  let last = 0
  for (const ev of midiEvents) {
    const dt = Math.max(0, Math.round(ev.tick - last))
    td.push(...writeVL(dt))
    if (ev.type === 'on') td.push(0x90, ev.pitch & 0x7F, ev.velocity & 0x7F)
    else                  td.push(0x80, ev.pitch & 0x7F, 0x40)
    last += dt
  }

  td.push(...writeVL(0)); td.push(0xFF, 0x2F, 0x00)

  wb([0x4D, 0x54, 0x72, 0x6B]); wi(td.length, 4); wb(td)
  return new Uint8Array(data)
}

// ── Public API ────────────────────────────────────────────────────────────────
// convert(str)   — compact string → { bytes, doc }
// convertDoc(doc)— already-parsed doc → Uint8Array bytes
// parseCompactString(str) — compact string → doc object
// pitchToMidi / getSubsPerBar — utilities

function convert(compactStr) {
  const doc = parseCompactString(compactStr)
  if (!doc.bars || doc.bars.length === 0) throw new Error('No bars found')
  if (!doc.time_signature) throw new Error('Missing time_signature')
  if (!doc.tempo)          throw new Error('Missing tempo')
  const { midiEvents, tempo, timeSig, tpq } = docToMidiEvents(doc)
  return { bytes: generateMidiBytes(midiEvents, tempo, timeSig, tpq), doc }
}

function convertDoc(doc) {
  if (!doc.bars || doc.bars.length === 0) throw new Error('No bars found')
  const { midiEvents, tempo, timeSig, tpq } = docToMidiEvents(doc)
  return generateMidiBytes(midiEvents, tempo, timeSig, tpq)
}

module.exports = { convert, convertDoc, parseCompactString, pitchToMidi, getSubsPerBar }