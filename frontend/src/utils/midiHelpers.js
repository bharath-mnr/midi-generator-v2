
//E:\pro\midigenerator_v2\frontend\src\utils\midiHelpers.js

// Shared pitch / tick math used across converters

const NOTE_MAP = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
  'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
  'A':9,'A#':10,'BB':10,'B':11
}
const MIDI_TO_NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export function pitchToMidi(pitch, transposition = 0) {
  const m = pitch.match(/^([A-G][#Bb]?)(-?\d+)$/i)
  if (!m) throw new Error(`Invalid pitch format: ${pitch}`)
  const nn = m[1].toUpperCase()
  if (!(nn in NOTE_MAP)) throw new Error(`Unknown note: ${nn}`)
  return (parseInt(m[2]) + 1) * 12 + NOTE_MAP[nn] + transposition
}

export function midiToPitch(midiNumber) {
  return MIDI_TO_NOTE[midiNumber % 12] + (Math.floor(midiNumber / 12) - 1)
}

export function getSubdivisionsPerBar(timeSigStr) {
  const [n, d] = timeSigStr.split('/').map(Number)
  const s = n * (16 / d)
  if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${timeSigStr}`)
  return s
}

export function ticksPerBar(tpq, numerator, denominator) {
  return tpq * numerator * (4 / denominator)
}

export function compressPattern(slots) {
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

export function expandCompression(symbols) {
  const out = []
  for (const sym of symbols) {
    const m = sym.match(/^(.+?)\((\d+)\)$/)
    if (m) for (let i = 0; i < parseInt(m[2]); i++) out.push(m[1])
    else out.push(sym)
  }
  return out
}

export function writeVariableLength(value) {
  let buffer = value & 0x7F
  const bytes = []
  while ((value >>= 7) > 0) { buffer <<= 8; buffer |= (value & 0x7F) | 0x80 }
  while (true) { bytes.push(buffer & 0xFF); if (buffer & 0x80) buffer >>= 8; else break }
  return bytes
}

export function formatDate(isoString) {
  const d = new Date(isoString)
  const now = new Date()
  const diff = now - d
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 172800000) return 'Yesterday'
  return d.toLocaleDateString()
}
