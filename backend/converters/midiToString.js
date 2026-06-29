'use strict'
// backend/services/converters/midiToString.js
// Converts MIDI binary → compact string format
// velocity is stripped — all notes fixed at 100 downstream
//
// Configurable tolerances:
//   snapToleranceTicks — how close to a grid line counts as "on the grid"
//   legatoGapTicks     — gap small enough to be treated as DAW retrigger padding

const MIDI_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function midiToPitch(n) {
  return MIDI_TO_NOTE[n % 12] + (Math.floor(n / 12) - 1)
}

function getSubsPerBar(ts) {
  const subs = ts.numerator * (16 / ts.denominator)
  if (!Number.isInteger(subs)) throw new Error(`Invalid time signature: ${ts.numerator}/${ts.denominator}`)
  return subs
}

// ── MIDI binary parser ────────────────────────────────────────────────────────
function parseMidiFile(buf) {
  const data = buf instanceof Buffer ? new Uint8Array(buf) : new Uint8Array(buf)

  const hdr   = data.slice(0, 14)
  const magic = String.fromCharCode(hdr[0], hdr[1], hdr[2], hdr[3])
  if (magic !== 'MThd') throw new Error('Invalid MIDI file format')

  const trackCount = (hdr[10] << 8) | hdr[11]
  const tpq        = (hdr[12] << 8) | hdr[13]
  let offset = 14

  const events = []
  let tempo  = 120
  let timeSig = { numerator: 4, denominator: 4 }

  for (let t = 0; t < trackCount; t++) {
    const th     = data.slice(offset, offset + 8)
    const tMagic = String.fromCharCode(th[0], th[1], th[2], th[3])
    if (tMagic !== 'MTrk') throw new Error('Invalid track header')
    const tLen   = (th[4] << 24) | (th[5] << 16) | (th[6] << 8) | th[7]
    offset += 8
    const td  = data.slice(offset, offset + tLen)
    let to = 0, ct = 0, rs = 0

    while (to < tLen) {
      let dt = 0, b
      do { b = td[to++]; dt = (dt << 7) | (b & 0x7F) } while (b & 0x80)
      ct += dt
      let sb = td[to]
      if (sb < 0x80) { sb = rs } else { to++; rs = sb }

      if (sb === 0xFF) {
        const mt = td[to++]; let ml = 0, lb
        do { lb = td[to++]; ml = (ml << 7) | (lb & 0x7F) } while (lb & 0x80)
        if (mt === 0x51 && ml === 3) {
          tempo = Math.round(60000000 / ((td[to] << 16) | (td[to + 1] << 8) | td[to + 2]))
        } else if (mt === 0x58 && ml >= 4) {
          timeSig.numerator   = td[to]
          timeSig.denominator = Math.pow(2, td[to + 1])
        }
        to += ml; rs = 0
      } else if ((sb & 0xF0) === 0x90) {
        const p = td[to++], v = td[to++]
        events.push({ tick: ct, type: v > 0 ? 'on' : 'off', pitch: p, velocity: v })
      } else if ((sb & 0xF0) === 0x80) {
        const p = td[to++]; to++
        events.push({ tick: ct, type: 'off', pitch: p, velocity: 0 })
      } else {
        if (sb >= 0xF0) break
        to += ((sb & 0xF0) === 0xC0 || (sb & 0xF0) === 0xD0) ? 1 : 2
      }
    }
    offset += tLen
  }

  events.sort((a, b) => a.tick - b.tick)
  return { events, tempo, timeSig, tpq }
}

// ── MIDI events → doc ─────────────────────────────────────────────────────────
function convertToDoc(midiData, snapToleranceTicks = 15, legatoGapTicks = 20) {
  const { events, tempo, timeSig, tpq } = midiData
  const spb              = getSubsPerBar(timeSig)
  const ticksPerBar      = tpq * timeSig.numerator * (4 / timeSig.denominator)
  const tpSub            = ticksPerBar / spb

  // Pair note-on / note-off
  const rawNotes = []
  const noteOnMap = new Map()
  for (const ev of events) {
    if (ev.type === 'on') {
      if (noteOnMap.has(ev.pitch)) {
        const prev = noteOnMap.get(ev.pitch)
        const dur  = ev.tick - prev.tick
        if (dur > 0) rawNotes.push({ pitch: ev.pitch, startTick: prev.tick, endTick: ev.tick })
      }
      noteOnMap.set(ev.pitch, ev)
    } else if (ev.type === 'off' && noteOnMap.has(ev.pitch)) {
      const on  = noteOnMap.get(ev.pitch)
      const dur = ev.tick - on.tick
      if (dur > 0) rawNotes.push({ pitch: ev.pitch, startTick: on.tick, endTick: ev.tick })
      noteOnMap.delete(ev.pitch)
    }
  }
  const maxTick = events.length > 0 ? Math.max(...events.map(e => e.tick)) : 0
  for (const [pitch, on] of noteOnMap.entries()) {
    const dur = maxTick - on.tick
    if (dur > 0) rawNotes.push({ pitch, startTick: on.tick, endTick: maxTick })
  }

  rawNotes.sort((a, b) => a.startTick - b.startTick)
  const allStartTicks = rawNotes.map(n => n.startTick).sort((a, b) => a - b)

  function nextNoteOnAfter(tick) {
    let lo = 0, hi = allStartTicks.length
    while (lo < hi) { const mid = (lo + hi) >> 1; if (allStartTicks[mid] <= tick) lo = mid + 1; else hi = mid }
    return lo < allStartTicks.length ? allStartTicks[lo] : null
  }

  function snapToGrid(tick) {
    const rawSub    = tick / tpSub
    const rounded   = Math.round(rawSub)
    const dist      = Math.abs(tick - rounded * tpSub)
    return dist <= snapToleranceTicks
      ? { subTotal: rounded, snapped: true }
      : { subTotal: Math.floor(rawSub), snapped: false }
  }

  const noteEntries = []

  for (const note of rawNotes) {
    const pitchName     = midiToPitch(note.pitch)
    const startSnap     = snapToGrid(note.startTick)
    const startSubTotal = startSnap.subTotal
    let   offsetPercent = 0
    if (!startSnap.snapped) {
      const off = note.startTick - startSubTotal * tpSub
      offsetPercent = Math.round((off / tpSub) * 100)
    }

    const nextOn      = nextNoteOnAfter(note.startTick)
    const gapToNext   = nextOn !== null ? nextOn - note.endTick : Infinity
    const isLegatoGap = gapToNext >= 0 && gapToNext <= legatoGapTicks

    let endSubTotal, endPercent
    if (isLegatoGap) {
      endSubTotal = Math.round(nextOn / tpSub)
      endPercent  = 0
    } else {
      const endSnap = snapToGrid(note.endTick)
      endSubTotal   = endSnap.subTotal
      endPercent    = endSnap.snapped ? 0
        : Math.round(((note.endTick - endSubTotal * tpSub) / tpSub) * 100)
    }

    const barNumber     = Math.floor(startSubTotal / spb) + 1
    const startSubInBar = startSubTotal % spb
    const durationSubs  = Math.max(0, endSubTotal - startSubTotal)
    const endCutoff     = (endPercent > 0 && endPercent < 100) ? endPercent : null

    const n = { p: pitchName, s: startSubInBar, d: durationSubs, o: 0, c: null }
    if (offsetPercent > 0) n.o = offsetPercent
    if (endCutoff !== null) n.c = endCutoff

    noteEntries.push({ bar_number: barNumber, note: n })
  }

  // Group into bars
  const barsMap = new Map()
  for (const entry of noteEntries) {
    if (!barsMap.has(entry.bar_number)) barsMap.set(entry.bar_number, [])
    barsMap.get(entry.bar_number).push(entry.note)
  }

  const bars = Array.from(barsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([bar_number, notes]) => ({ bar_number, notes }))

  // Fill gaps
  const filled = []
  if (bars.length > 0) {
    const lastBar  = bars[bars.length - 1].bar_number
    const barLookup = new Map(bars.map(b => [b.bar_number, b]))
    for (let i = 1; i <= lastBar; i++) {
      filled.push(barLookup.get(i) ?? { bar_number: i, notes: [] })
    }
  }

  return {
    tempo,
    time_signature:       `${timeSig.numerator}/${timeSig.denominator}`,
    key:                  'C',   // key detection not available from MIDI binary alone
    subdivisions_per_bar: spb,
    bars:                 filled,
  }
}

// ── Doc → compact string ──────────────────────────────────────────────────────
function serializeToCompactString(doc) {
  const lines = []
  lines.push(`H: ${doc.tempo}|${doc.time_signature}|${doc.key}|${doc.subdivisions_per_bar}`)
  for (const bar of doc.bars) {
    const bn = bar.bar_number
    if (!bar.notes || bar.notes.length === 0) {
      lines.push(`B${bn}:`)
      continue
    }
    const noteStrs = bar.notes.map(n => {
      let s = `${n.p},${n.s},${n.d}`
      if (n.o && n.o !== 0) s += `,o${n.o}`
      if (n.c !== null && n.c !== undefined) s += `,c${n.c}`
      return s
    })
    lines.push(`B${bn}: ${noteStrs.join('; ')}`)
  }
  return lines.join('\n')
}

// ── Public API ────────────────────────────────────────────────────────────────
// convert(buf, snap?, legato?) → { compactStr, doc }

function convert(buf, snapToleranceTicks = 15, legatoGapTicks = 20) {
  const midiData = parseMidiFile(buf)
  const doc      = convertToDoc(midiData, snapToleranceTicks, legatoGapTicks)
  return { compactStr: serializeToCompactString(doc), doc }
}

module.exports = { convert, parseMidiFile, convertToDoc, serializeToCompactString }