// //E:\pro\midigenerator_v2\backend\services\converters\midiToJson.js

// 'use strict'

// const MIDI_TO_NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

// function midiToPitch(n) {
//   return MIDI_TO_NOTE[n % 12] + (Math.floor(n / 12) - 1)
// }

// function getSubsPerBar(ts) {
//   const s = ts.numerator * (16 / ts.denominator)
//   if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts.numerator}/${ts.denominator}`)
//   return s
// }

// function parseMidiFile(arrayBuffer) {
//   // Accept Node.js Buffer or ArrayBuffer
//   const data = arrayBuffer instanceof Buffer
//     ? new Uint8Array(arrayBuffer)
//     : new Uint8Array(arrayBuffer)

//   let offset = 0
//   const hdr = data.slice(0, 14)
//   const magic = String.fromCharCode(hdr[0], hdr[1], hdr[2], hdr[3])
//   if (magic !== 'MThd') throw new Error('Invalid MIDI file format')

//   const trackCount = (hdr[10] << 8) | hdr[11]
//   const tpq        = (hdr[12] << 8) | hdr[13]
//   offset = 14

//   const events = []; let tempo = 120; let timeSig = { numerator: 4, denominator: 4 }

//   for (let t = 0; t < trackCount; t++) {
//     const th = data.slice(offset, offset + 8)
//     const tMagic = String.fromCharCode(th[0], th[1], th[2], th[3])
//     if (tMagic !== 'MTrk') throw new Error('Invalid track header')
//     const tLen = (th[4] << 24) | (th[5] << 16) | (th[6] << 8) | th[7]
//     offset += 8
//     const td = data.slice(offset, offset + tLen)
//     let to = 0, ct = 0, rs = 0

//     while (to < tLen) {
//       let dt = 0, b
//       do { b = td[to++]; dt = (dt << 7) | (b & 0x7F) } while (b & 0x80)
//       ct += dt
//       let sb = td[to]
//       if (sb < 0x80) { sb = rs } else { to++; rs = sb }

//       if (sb === 0xFF) {
//         const mt = td[to++]; let ml = 0, lb
//         do { lb = td[to++]; ml = (ml << 7) | (lb & 0x7F) } while (lb & 0x80)
//         if (mt === 0x51 && ml === 3) {
//           tempo = Math.round(60000000 / ((td[to] << 16) | (td[to+1] << 8) | td[to+2]))
//         } else if (mt === 0x58 && ml >= 4) {
//           timeSig.numerator   = td[to]
//           timeSig.denominator = Math.pow(2, td[to+1])
//         }
//         to += ml; rs = 0
//       } else if ((sb & 0xF0) === 0x90) {
//         const p = td[to++], v = td[to++]
//         events.push({ tick: ct, type: v > 0 ? 'on' : 'off', pitch: p, velocity: v })
//       } else if ((sb & 0xF0) === 0x80) {
//         const p = td[to++]; to++
//         events.push({ tick: ct, type: 'off', pitch: p, velocity: 0 })
//       } else {
//         if (sb >= 0xF0) break
//         to += ((sb & 0xF0) === 0xC0 || (sb & 0xF0) === 0xD0) ? 1 : 2
//       }
//     }
//     offset += tLen
//   }

//   events.sort((a, b) => a.tick - b.tick)
//   return { events, tempo, timeSig, tpq }
// }

// function convertToJson(midiData) {
//   const { events, tempo, timeSig, tpq } = midiData
//   const subs   = getSubsPerBar(timeSig)
//   const tpBar  = tpq * timeSig.numerator * (4 / timeSig.denominator)
//   const tpSub  = tpBar / subs

//   // Pair note-on / note-off
//   const rawNotes = []; const noteOnMap = new Map()
//   for (const ev of events) {
//     if (ev.type === 'on') {
//       if (noteOnMap.has(ev.pitch)) {
//         const prev = noteOnMap.get(ev.pitch)
//         const d = ev.tick - prev.tick
//         if (d > 0) rawNotes.push({ pitch: ev.pitch, startTick: prev.tick, endTick: ev.tick, velocity: prev.velocity })
//       }
//       noteOnMap.set(ev.pitch, ev)
//     } else if (ev.type === 'off' && noteOnMap.has(ev.pitch)) {
//       const on = noteOnMap.get(ev.pitch)
//       const d  = ev.tick - on.tick
//       if (d > 0) rawNotes.push({ pitch: ev.pitch, startTick: on.tick, endTick: ev.tick, velocity: on.velocity })
//       noteOnMap.delete(ev.pitch)
//     }
//   }
//   const maxTick = events.length > 0 ? Math.max(...events.map(e => e.tick)) : 0
//   for (const [pitch, on] of noteOnMap.entries()) {
//     const d = maxTick - on.tick
//     if (d > 0) rawNotes.push({ pitch, startTick: on.tick, endTick: maxTick, velocity: on.velocity })
//   }

//   // Convert to JSON notes
//   const barsMap = new Map()
//   for (const note of rawNotes) {
//     const pn = midiToPitch(note.pitch)
//     const startSubTotal = Math.floor(note.startTick / tpSub)
//     const offsetPct     = Math.round(((note.startTick - startSubTotal * tpSub) / tpSub) * 100)
//     const endSubTotal   = Math.floor((note.endTick - 0.0001) / tpSub)
//     const endPct        = Math.round(((note.endTick - endSubTotal * tpSub) / tpSub) * 100)
//     const barNumber     = Math.floor(startSubTotal / subs) + 1
//     const startSubInBar = startSubTotal % subs
//     const durSubs       = endSubTotal - startSubTotal

//     const jsonNote = {
//       pitch:                  pn,
//       start_subdivision:      startSubInBar,
//       offset_percent:         offsetPct,
//       duration_subdivisions:  durSubs,
//       end_cutoff_percent:     endPct < 100 ? endPct : null,
//       velocity:               note.velocity,
//     }
//     if (!barsMap.has(barNumber)) barsMap.set(barNumber, [])
//     barsMap.get(barNumber).push(jsonNote)
//   }

//   const bars = Array.from(barsMap.entries())
//     .sort(([a], [b]) => a - b)
//     .map(([bar_number, notes]) => ({ bar_number, notes }))

//   return {
//     tempo,
//     time_signature:       `${timeSig.numerator}/${timeSig.denominator}`,
//     key:                  'C',
//     subdivisions_per_bar: subs,
//     bars,
//   }
// }

// function convert(buf) {
//   const midiData = parseMidiFile(buf)
//   return convertToJson(midiData)
// }

// module.exports = { convert, parseMidiFile, convertToJson }












'use strict'
// backend/services/converters/midiToJson.js
// Outputs compact shorthand p/s/d format · velocity stripped · defaults omitted

const MIDI_TO_NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function midiToPitch(n) {
  return MIDI_TO_NOTE[n % 12] + (Math.floor(n / 12) - 1)
}

function getSubsPerBar(ts) {
  const s = ts.numerator * (16 / ts.denominator)
  if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts.numerator}/${ts.denominator}`)
  return s
}

function parseMidiFile(arrayBuffer) {
  const data = arrayBuffer instanceof Buffer
    ? new Uint8Array(arrayBuffer)
    : new Uint8Array(arrayBuffer)

  let offset = 0
  const hdr   = data.slice(0, 14)
  const magic = String.fromCharCode(hdr[0], hdr[1], hdr[2], hdr[3])
  if (magic !== 'MThd') throw new Error('Invalid MIDI file format')

  const trackCount = (hdr[10] << 8) | hdr[11]
  const tpq        = (hdr[12] << 8) | hdr[13]
  offset = 14

  const events = []; let tempo = 120; let timeSig = { numerator: 4, denominator: 4 }

  for (let t = 0; t < trackCount; t++) {
    const th     = data.slice(offset, offset + 8)
    const tMagic = String.fromCharCode(th[0], th[1], th[2], th[3])
    if (tMagic !== 'MTrk') throw new Error('Invalid track header')
    const tLen = (th[4] << 24) | (th[5] << 16) | (th[6] << 8) | th[7]
    offset += 8
    const td = data.slice(offset, offset + tLen)
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
          tempo = Math.round(60000000 / ((td[to] << 16) | (td[to+1] << 8) | td[to+2]))
        } else if (mt === 0x58 && ml >= 4) {
          timeSig.numerator   = td[to]
          timeSig.denominator = Math.pow(2, td[to+1])
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

function convertToJson(midiData) {
  const { events, tempo, timeSig, tpq } = midiData
  const subs   = getSubsPerBar(timeSig)
  const tpBar  = tpq * timeSig.numerator * (4 / timeSig.denominator)
  const tpSub  = tpBar / subs

  // Pair note-on / note-off — velocity NOT carried forward
  const rawNotes = []; const noteOnMap = new Map()
  for (const ev of events) {
    if (ev.type === 'on') {
      if (noteOnMap.has(ev.pitch)) {
        const prev = noteOnMap.get(ev.pitch)
        const d = ev.tick - prev.tick
        if (d > 0) rawNotes.push({ pitch: ev.pitch, startTick: prev.tick, endTick: ev.tick })
      }
      noteOnMap.set(ev.pitch, ev)
    } else if (ev.type === 'off' && noteOnMap.has(ev.pitch)) {
      const on = noteOnMap.get(ev.pitch)
      const d  = ev.tick - on.tick
      if (d > 0) rawNotes.push({ pitch: ev.pitch, startTick: on.tick, endTick: ev.tick })
      noteOnMap.delete(ev.pitch)
    }
  }
  const maxTick = events.length > 0 ? Math.max(...events.map(e => e.tick)) : 0
  for (const [pitch, on] of noteOnMap.entries()) {
    const d = maxTick - on.tick
    if (d > 0) rawNotes.push({ pitch, startTick: on.tick, endTick: maxTick })
  }

  // Build compact notes — velocity omitted, optional fields omitted at defaults
  const jsonNotes = []
  for (const note of rawNotes) {
    const pn = midiToPitch(note.pitch)

    const startSubTotal = Math.floor(note.startTick / tpSub)
    const offsetPct     = Math.round(((note.startTick - startSubTotal * tpSub) / tpSub) * 100)

    const endSubTotal = Math.floor(note.endTick / tpSub)
    const endPct      = Math.round(((note.endTick - endSubTotal * tpSub) / tpSub) * 100)

    const barNumber     = Math.floor(startSubTotal / subs) + 1
    const startSubInBar = startSubTotal % subs
    const durSubs       = endSubTotal - startSubTotal
    const endCutoff     = (endPct > 0 && endPct < 100) ? endPct : null

    // Compact note — omit optional fields when at default value
    const compactNote = { p: pn, s: startSubInBar, d: durSubs }
    if (offsetPct > 0)      compactNote.o = offsetPct
    if (endCutoff !== null) compactNote.c = endCutoff
    // velocity omitted — client always uses 100

    jsonNotes.push({ bn: barNumber, ...compactNote })
  }

  // Group into bars using compact bn key
  const barsMap = new Map()
  for (const note of jsonNotes) {
    if (!barsMap.has(note.bn)) barsMap.set(note.bn, [])
    const { bn, ...noteFields } = note
    barsMap.get(note.bn).push(noteFields)
  }

  const bars = Array.from(barsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([bn, notes]) => ({ bn, notes }))

  // Fill gaps so every bar between 1 and last is present
  const filledBars = []
  if (bars.length > 0) {
    const lastBar   = bars[bars.length - 1].bn
    const barLookup = new Map(bars.map(b => [b.bn, b]))
    for (let i = 1; i <= lastBar; i++) {
      filledBars.push(barLookup.get(i) ?? { bn: i, notes: [] })
    }
  }

  return {
    tempo,
    time_signature:       `${timeSig.numerator}/${timeSig.denominator}`,
    key:                  'C',
    subdivisions_per_bar: subs,
    bars:                 filledBars,
  }
}

function convert(buf) {
  const midiData = parseMidiFile(buf)
  return convertToJson(midiData)
}

module.exports = { convert, parseMidiFile, convertToJson }