//E:\pro\midigenerator_v2\backend\services\converters\jsonToText.js

'use strict'

const NOTE_MAP = { 'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11 }

function getSubsPerBar(ts) {
  const [n, d] = ts.split('/').map(Number)
  const s = n * (16 / d)
  if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts}`)
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

function pitchToMidiNum(pitch) {
  const m = pitch.match(/^([A-G][#b]?)(-?\d+)$/i)
  if (!m) return 0
  const nn = m[1].toUpperCase()
  return (parseInt(m[2]) + 1) * 12 + (NOTE_MAP[nn] ?? 0)
}

function convert(json) {
  const { tempo, time_signature, key, bars } = json
  if (!bars || bars.length === 0) throw new Error('No bars found')

  const subs       = getSubsPerBar(time_signature)
  const globalNotes = []

  for (const bar of bars) {
    if (!bar.notes) continue
    const barOffset = (bar.bar_number - 1) * subs
    for (const note of bar.notes) {
      const startAbs = barOffset + (note.start_subdivision || 0)
      const endAbs   = startAbs + (note.duration_subdivisions || 1)
      globalNotes.push({
        pitch:    note.pitch,
        startAbs,
        endAbs,
        velocity: Math.min(127, Math.max(1, note.velocity || 100)),
      })
    }
  }

  const maxBarDeclared  = Math.max(...bars.map(b => b.bar_number))
  const maxSubFromNotes = globalNotes.length > 0 ? Math.max(...globalNotes.map(n => n.endAbs)) : 0
  const totalBars       = Math.max(maxBarDeclared, Math.ceil(maxSubFromNotes / subs))

  const barOutputs = []
  for (let barNum = 1; barNum <= totalBars; barNum++) {
    const barStart = (barNum - 1) * subs
    const barEnd   = barNum * subs
    const active   = globalNotes.filter(n => n.startAbs < barEnd && n.endAbs > barStart)
    const pitchSlots = new Map()

    for (const note of active) {
      if (!pitchSlots.has(note.pitch)) pitchSlots.set(note.pitch, new Array(subs).fill('.'))
      const slots = pitchSlots.get(note.pitch)
      const ls    = Math.max(note.startAbs - barStart, 0)
      const le    = Math.min(note.endAbs   - barStart, subs)
      for (let s = ls; s < le; s++) {
        if (s === ls) slots[s] = note.startAbs >= barStart
          ? (note.velocity === 100 ? 'X' : `X${note.velocity}`)
          : '~'
        else slots[s] = '~'
      }
    }
    barOutputs.push({ barNum, pitchSlots })
  }

  let out = `Tempo: ${tempo}\nTimeSig: ${time_signature}\nKey: ${key}`
  for (const { barNum, pitchSlots } of barOutputs) {
    out += `\n\nBar: ${barNum}`
    if (pitchSlots.size === 0) continue
    const sorted = Array.from(pitchSlots.keys()).sort((a, b) => pitchToMidiNum(a) - pitchToMidiNum(b))
    for (const pitch of sorted) {
      out += `\n${pitch}: ${compress(pitchSlots.get(pitch)).join(' ')}`
    }
  }
  return out.trim()
}

module.exports = { convert, getSubsPerBar, compress }
