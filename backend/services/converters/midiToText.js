//E:\pro\midigenerator_v2\backend\services\converters\midiToText.js

'use strict'

const MIDI_TO_NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function midiToPitch(n) { return MIDI_TO_NOTE[n % 12] + (Math.floor(n / 12) - 1) }

function getSubsPerBar(ts) {
  const s = ts.numerator * (16 / ts.denominator)
  if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts.numerator}/${ts.denominator}`)
  return s
}

function compress(slots) {
  const out = []; let i = 0
  while (i < slots.length) {
    const cur = slots[i]; let cnt = 1
    while (i + cnt < slots.length && slots[i + cnt] === cur) cnt++
    if (cnt >= 3) out.push(`${cur}(${cnt})`)
    else for (let j = 0; j < cnt; j++) out.push(cur)
    i += cnt
  }
  return out
}

function parseMidiFile(buf) {
  const data = buf instanceof Buffer ? new Uint8Array(buf) : new Uint8Array(buf)
  let offset = 0
  const hdr = data.slice(0, 14)
  if (String.fromCharCode(hdr[0],hdr[1],hdr[2],hdr[3]) !== 'MThd') throw new Error('Invalid MIDI file')
  const trackCount = (hdr[10] << 8) | hdr[11]
  const tpq        = (hdr[12] << 8) | hdr[13]
  offset = 14
  const events = []; let tempo = 120; let timeSig = { numerator: 4, denominator: 4 }

  for (let t = 0; t < trackCount; t++) {
    const th = data.slice(offset, offset + 8)
    if (String.fromCharCode(th[0],th[1],th[2],th[3]) !== 'MTrk') throw new Error('Invalid track')
    const tLen = (th[4]<<24)|(th[5]<<16)|(th[6]<<8)|th[7]
    offset += 8
    const td = data.slice(offset, offset + tLen)
    let to = 0, ct = 0, rs = 0
    while (to < tLen) {
      let dt = 0, b
      do { b = td[to++]; dt = (dt<<7)|(b&0x7F) } while (b & 0x80)
      ct += dt
      let sb = td[to]; if (sb < 0x80) sb = rs; else { to++; rs = sb }
      if (sb === 0xFF) {
        const mt = td[to++]; let ml = 0, lb
        do { lb = td[to++]; ml = (ml<<7)|(lb&0x7F) } while (lb & 0x80)
        if (mt === 0x51 && ml === 3) tempo = Math.round(60000000/((td[to]<<16)|(td[to+1]<<8)|td[to+2]))
        else if (mt === 0x58 && ml >= 4) { timeSig.numerator = td[to]; timeSig.denominator = Math.pow(2, td[to+1]) }
        to += ml; rs = 0
      } else if ((sb & 0xF0) === 0x90) {
        const p = td[to++], v = td[to++]
        events.push({ tick: ct, type: v > 0 ? 'on' : 'off', pitch: p, velocity: v })
      } else if ((sb & 0xF0) === 0x80) {
        const p = td[to++]; to++
        events.push({ tick: ct, type: 'off', pitch: p, velocity: 0 })
      } else { if (sb >= 0xF0) break; to += ((sb&0xF0)===0xC0||(sb&0xF0)===0xD0)?1:2 }
    }
    offset += tLen
  }
  events.sort((a,b) => a.tick - b.tick)
  return { events, tempo, timeSig, tpq }
}

function convert(buf) {
  const { events, tempo, timeSig, tpq } = parseMidiFile(buf)
  const subs   = getSubsPerBar(timeSig)
  const tpBar  = tpq * timeSig.numerator * (4 / timeSig.denominator)
  const tpSub  = tpBar / subs

  // Pair notes
  const notes = []; const noteOnMap = new Map()
  for (const ev of events) {
    if (ev.type === 'on') {
      if (noteOnMap.has(ev.pitch)) {
        const prev = noteOnMap.get(ev.pitch)
        const d = ev.tick - prev.tick
        if (d > 0) notes.push({ pitch: ev.pitch, startTick: prev.tick, endTick: ev.tick, velocity: prev.velocity })
      }
      noteOnMap.set(ev.pitch, ev)
    } else if (ev.type === 'off' && noteOnMap.has(ev.pitch)) {
      const on = noteOnMap.get(ev.pitch)
      const d  = ev.tick - on.tick
      if (d > 0) notes.push({ pitch: ev.pitch, startTick: on.tick, endTick: ev.tick, velocity: on.velocity })
      noteOnMap.delete(ev.pitch)
    }
  }

  const maxTick = events.length > 0 ? Math.max(...events.map(e => e.tick)) : 0
  const maxBar  = Math.ceil((maxTick + 1) / tpBar) || 1
  const pitchTracks = new Map()

  for (const note of notes) {
    const pn = midiToPitch(note.pitch)
    if (!pitchTracks.has(pn)) pitchTracks.set(pn, new Map())

    const startSubTotal = Math.floor(note.startTick / tpSub)
    const offsetPct     = Math.round(((note.startTick - startSubTotal * tpSub) / tpSub) * 100)
    const endSubTotal   = Math.floor((note.endTick - 0.0001) / tpSub)
    const endPct        = Math.round(((note.endTick - endSubTotal * tpSub) / tpSub) * 100)

    for (let cur = startSubTotal; cur <= endSubTotal; cur++) {
      const barNum    = Math.floor(cur / subs) + 1
      const subInBar  = cur % subs
      if (!pitchTracks.get(pn).has(barNum)) {
        pitchTracks.get(pn).set(barNum, new Array(subs).fill('.'))
      }
      const pat = pitchTracks.get(pn).get(barNum)
      let sym = ''
      if (cur === startSubTotal) {
        sym = 'X'
        if (note.velocity !== 100) sym += note.velocity
        if (offsetPct > 0) sym += `XR${offsetPct}`
        if (startSubTotal === endSubTotal && endPct < 100) {
          sym += offsetPct > 0 ? `XE${endPct - offsetPct}` : `E${endPct}`
        }
      } else {
        sym = '~'
        if (cur === endSubTotal && endPct < 100) sym += endPct
      }
      if (sym && sym !== '.') pat[subInBar] = sym
    }
  }

  // Build output string
  const sorted = Array.from(pitchTracks.keys()).sort((a, b) => {
    const noteMap = {
      'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
      'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
      'A':9,'A#':10,'BB':10,'B':11
    }
    const ma = a.match(/^([A-G][#b]?)(-?\d+)$/i)
    const mb = b.match(/^([A-G][#b]?)(-?\d+)$/i)
    if (!ma || !mb) return 0
    return (parseInt(ma[2])*12 + (noteMap[ma[1].toUpperCase()]||0))
         - (parseInt(mb[2])*12 + (noteMap[mb[1].toUpperCase()]||0))
  })

  let out = `Tempo: ${tempo}\nTimeSig: ${timeSig.numerator}/${timeSig.denominator}\nKey: C\n\n`
  for (let b = 1; b <= maxBar; b++) {
    out += `Bar: ${b}\n`
    for (const p of sorted) {
      const bd = pitchTracks.get(p)
      if (bd && bd.has(b)) out += `${p}: ${compress(bd.get(b)).join(' ')}\n`
    }
    if (b < maxBar) out += '\n'
  }
  return out.trim()
}

module.exports = { convert, parseMidiFile }
