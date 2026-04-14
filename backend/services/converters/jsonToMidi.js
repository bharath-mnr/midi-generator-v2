'use strict'
// backend/services/converters/jsonToMidi.js
// Accepts both full field names AND compact shorthand (p/s/d/bn/o/c).
// velocity is always 100 — never read from note data.

const NOTE_MAP = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
  'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
  'A':9,'A#':10,'BB':10,'B':11,
}

function pitchToMidi(pitch) {
  const m = pitch.match(/^([A-G][#Bb]?)(-?\d+)$/i)
  if (!m) throw new Error(`Invalid pitch format: ${pitch}`)
  const nn = m[1].toUpperCase()
  if (!(nn in NOTE_MAP)) throw new Error(`Unknown note: ${nn}`)
  return (parseInt(m[2]) + 1) * 12 + NOTE_MAP[nn]
}

function getSubsPerBar(ts) {
  const [n, d] = ts.split('/').map(Number)
  const s = n * (16 / d)
  if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts}`)
  return s
}

function writeVL(v) {
  let buf = v & 0x7F
  const bytes = []
  while ((v >>= 7) > 0) { buf <<= 8; buf |= (v & 0x7F) | 0x80 }
  while (true) { bytes.push(buf & 0xFF); if (buf & 0x80) buf >>= 8; else break }
  return bytes
}

// ── Normalise a note from compact or full format ──────────────────────────────
function normaliseNote(n) {
  return {
    pitch:                 n.pitch                ?? n.p,
    start_subdivision:     n.start_subdivision    ?? n.s ?? 0,
    offset_percent:        n.offset_percent       ?? n.o ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
    end_cutoff_percent:    n.end_cutoff_percent   ?? n.c ?? null,
  }
}

function jsonToMidiEvents(json) {
  const { tempo, time_signature, bars } = json
  const [tn, td] = time_signature.split('/').map(Number)
  const tpq = 480
  const subs = getSubsPerBar(time_signature)
  const barTicks = tpq * tn * (4 / td)
  const tpSub = barTicks / subs
  const midiEvents = []

  for (const bar of bars) {
    if (!bar.notes) continue
    const barBase = ((bar.bar_number ?? bar.bn) - 1) * barTicks
    for (const rawNote of bar.notes) {
      const note = normaliseNote(rawNote)
      const mp   = pitchToMidi(note.pitch)
      const vel  = 100  // always fixed

      const startTick = barBase
        + note.start_subdivision * tpSub
        + ((note.offset_percent || 0) / 100) * tpSub

      let durTicks
      if (note.duration_subdivisions === 0) {
        durTicks = ((note.end_cutoff_percent || 50) / 100) * tpSub
      } else {
        durTicks = note.duration_subdivisions * tpSub
        if (note.end_cutoff_percent !== null && note.end_cutoff_percent !== undefined) {
          durTicks = (note.duration_subdivisions - 1) * tpSub
            + (note.end_cutoff_percent / 100) * tpSub
        }
      }

      if (durTicks <= 0) continue
      midiEvents.push({ tick: startTick,            type: 'on',  pitch: mp, velocity: vel })
      midiEvents.push({ tick: startTick + durTicks, type: 'off', pitch: mp, velocity: 0   })
    }
  }

  midiEvents.sort((a, b) =>
    a.tick !== b.tick ? a.tick - b.tick : a.type === 'off' ? -1 : 1
  )
  return { midiEvents, tempo, timeSig: { numerator: tn, denominator: td }, tpq }
}

function generateMidiBytes(midiEvents, tempo, timeSig, tpq) {
  const data = []
  const wb = (bytes) => bytes.forEach(b => data.push(b & 0xFF))
  const wi = (v, n) => { for (let i = n - 1; i >= 0; i--) data.push((v >> (8 * i)) & 0xFF) }

  wb([0x4D,0x54,0x68,0x64]); wi(6,4); wi(0,2); wi(1,2); wi(tpq,2)

  const td = []
  td.push(...writeVL(0)); td.push(0xFF,0x51,0x03)
  const us = Math.round(60000000 / tempo)
  td.push((us>>16)&0xFF, (us>>8)&0xFF, us&0xFF)
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

function convert(json) {
  if (!json.bars || json.bars.length === 0) throw new Error('No bars found in JSON')
  if (!json.time_signature) throw new Error('Missing time_signature')
  if (!json.tempo)          throw new Error('Missing tempo')
  const { midiEvents, tempo, timeSig, tpq } = jsonToMidiEvents(json)
  return generateMidiBytes(midiEvents, tempo, timeSig, tpq)
}

module.exports = { convert, pitchToMidi, getSubsPerBar }
