//E:\pro\midigenerator_v2\frontend\src\components\tools\MidiToText.jsx

import { useState, useRef } from 'react'
import { Upload, Copy, Check, Activity } from '../shared/Icons.jsx'
import StatusBar from '../shared/StatusBar.jsx'
import ErrorDisplay from '../shared/ErrorDisplay.jsx'

const noteMap = {
  'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3,
  'E': 4, 'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8,
  'A': 9, 'A#': 10, 'BB': 10, 'B': 11
}
const midiToNote = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

class Engine {
  static convertMidiToPitch(n) {
    return midiToNote[n % 12] + (Math.floor(n / 12) - 1)
  }
  static convertPitchToMidi(pitch, t = 0) {
    const m = pitch.match(/^([A-G][#Bb]?)(-?\d+)$/i)
    if (!m) throw new Error(`Invalid pitch: ${pitch}`)
    return (parseInt(m[2]) + 1) * 12 + noteMap[m[1].toUpperCase()] + t
  }
  static calculateSubdivisions(ts) {
    const s = ts.numerator * (16 / ts.denominator)
    if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts.numerator}/${ts.denominator}`)
    return s
  }
  static parseMidiFile(buf) {
    const data = new Uint8Array(buf)
    let offset = 0
    const hdr = data.slice(0, 14)
    if (String.fromCharCode(...hdr.slice(0, 4)) !== 'MThd') throw new Error('Invalid MIDI file')
    const trackCount = (hdr[10] << 8) | hdr[11]
    const ticksPerQuarter = (hdr[12] << 8) | hdr[13]
    offset = 14
    const events = []
    let tempo = 120
    let timeSig = { numerator: 4, denominator: 4 }
    for (let t = 0; t < trackCount; t++) {
      const th = data.slice(offset, offset + 8)
      if (String.fromCharCode(...th.slice(0, 4)) !== 'MTrk') throw new Error('Invalid track header')
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
          if (mt === 0x51 && ml === 3) tempo = Math.round(60000000 / ((td[to] << 16) | (td[to+1] << 8) | td[to+2]))
          else if (mt === 0x58 && ml >= 4) { timeSig.numerator = td[to]; timeSig.denominator = Math.pow(2, td[to+1]) }
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
    return { events: events.sort((a, b) => a.tick - b.tick), tempo, timeSig, ticksPerQuarter }
  }
  static compressPattern(pat) {
    const out = []; let i = 0
    while (i < pat.length) {
      const cur = pat[i]; let cnt = 1
      while (i + cnt < pat.length && pat[i + cnt] === cur) cnt++
      if (cnt >= 3) out.push(`${cur}(${cnt})`)
      else for (let j = 0; j < cnt; j++) out.push(cur)
      i += cnt
    }
    return out
  }
  static convertMidiToText(midiData) {
    const { events, tempo, timeSig, ticksPerQuarter } = midiData
    const notes = [], noteOnEvents = new Map()
    events.forEach(ev => {
      if (ev.type === 'on') {
        if (noteOnEvents.has(ev.pitch)) {
          const prev = noteOnEvents.get(ev.pitch)
          const dur = ev.tick - prev.tick
          if (dur > 0) notes.push({ pitch: ev.pitch, startTick: prev.tick, endTick: ev.tick, velocity: prev.velocity, duration: dur })
        }
        noteOnEvents.set(ev.pitch, ev)
      } else if (ev.type === 'off' && noteOnEvents.has(ev.pitch)) {
        const on = noteOnEvents.get(ev.pitch)
        const dur = ev.tick - on.tick
        if (dur > 0) notes.push({ pitch: ev.pitch, startTick: on.tick, endTick: ev.tick, velocity: on.velocity, duration: dur })
        noteOnEvents.delete(ev.pitch)
      }
    })
    const subs = this.calculateSubdivisions(timeSig)
    const tpBar = ticksPerQuarter * timeSig.numerator * (4 / timeSig.denominator)
    const tpSub = tpBar / subs
    const maxTick = Math.max(...notes.map(n => n.endTick), 0)
    const maxBar = Math.ceil((maxTick + 1) / tpBar) || 1
    const pitchTracks = new Map()
    notes.forEach(note => {
      const pn = this.convertMidiToPitch(note.pitch)
      if (!pitchTracks.has(pn)) pitchTracks.set(pn, new Map())
      const startSubTotal = Math.floor(note.startTick / tpSub)
      const offsetPct = Math.round(((note.startTick - startSubTotal * tpSub) / tpSub) * 100)
      const endSubTotal = Math.floor((note.endTick - 0.0001) / tpSub)
      const endPct = Math.round(((note.endTick - endSubTotal * tpSub) / tpSub) * 100)
      for (let cur = startSubTotal; cur <= endSubTotal; cur++) {
        const barNum = Math.floor(cur / subs) + 1
        const subInBar = cur % subs
        if (!pitchTracks.get(pn).has(barNum)) pitchTracks.get(pn).set(barNum, new Array(subs).fill('.'))
        const pat = pitchTracks.get(pn).get(barNum)
        let sym = ''
        if (cur === startSubTotal) {
          sym = 'X'
          if (note.velocity !== 100) sym += note.velocity
          if (offsetPct > 0) sym += `XR${offsetPct}`
          if (startSubTotal === endSubTotal) {
            if (offsetPct === 0 && endPct < 100) sym += `E${endPct}`
            else if (offsetPct > 0 && endPct < 100) { const d = endPct - offsetPct; if (d > 0) sym = `XO${offsetPct}XE${d}` }
          }
        } else {
          sym = '~'
          if (cur === endSubTotal && endPct < 100) sym += endPct
        }
        if (sym && sym !== '.') pat[subInBar] = sym
      }
    })
    let out = `Tempo: ${tempo}\nTimeSig: ${timeSig.numerator}/${timeSig.denominator}\nKey: C\n\n`
    const sorted = Array.from(pitchTracks.keys()).sort((a, b) => this.convertPitchToMidi(a) - this.convertPitchToMidi(b))
    for (let b = 1; b <= maxBar; b++) {
      out += `Bar: ${b}\n`
      sorted.forEach(p => {
        const bd = pitchTracks.get(p)
        if (bd && bd.has(b)) out += `${p}: ${this.compressPattern(bd.get(b)).join(' ')}\n`
      })
      if (b < maxBar) out += '\n'
    }
    return out
  }
}

export default function MidiToText() {
  const [file, setFile] = useState(null)
  const [output, setOutput] = useState('')
  const [errors, setErrors] = useState([])
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  const handleConvert = async () => {
    if (!file) return
    setProcessing(true); setErrors([])
    try {
      const buf = await file.arrayBuffer()
      const midi = Engine.parseMidiFile(buf)
      setOutput(Engine.convertMidiToText(midi))
    } catch (e) {
      setErrors([e.message])
    } finally {
      setProcessing(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>MIDI File</div>
        <div
          onClick={() => ref.current?.click()}
          style={{
            border: `1.5px dashed ${file ? 'var(--accent)' : 'var(--border2)'}`,
            borderRadius: 'var(--radius)',
            padding: 24, textAlign: 'center', cursor: 'pointer',
            background: file ? 'rgba(200,240,96,0.02)' : 'var(--surface2)',
            transition: 'all 0.2s ease',
          }}
        >
          <input ref={ref} type="file" accept=".mid,.midi" style={{ display: 'none' }} onChange={e => { setFile(e.target.files[0]); setOutput(''); setErrors([]) }} />
          <Upload size={24} stroke={file ? 'var(--accent)' : 'var(--text3)'} />
          <div style={{ marginTop: 10, fontSize: 13, color: file ? 'var(--accent)' : 'var(--text2)' }}>{file ? file.name : 'Click to upload .mid file'}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>.mid · .midi</div>
        </div>
        <button
          onClick={handleConvert}
          disabled={!file || processing}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 'var(--radius-sm)',
            background: !file || processing ? 'var(--surface3)' : 'var(--accent)',
            color: !file || processing ? 'var(--text3)' : '#000',
            fontSize: 13, fontWeight: 700, cursor: !file || processing ? 'not-allowed' : 'pointer',
            border: 'none', fontFamily: 'var(--font)', alignSelf: 'flex-start',
          }}
        >
          <Activity size={14} />
          {processing ? 'Converting...' : 'Convert'}
        </button>
        <ErrorDisplay errors={errors} />
      </div>
      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Text Notation</div>
          {output && (
            <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: copied ? 'var(--accent)' : 'var(--text3)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>
              {copied ? <Check size={11} stroke="var(--accent)" /> : <Copy size={11} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
        <textarea readOnly value={output} placeholder="Text notation will appear here..." style={{ flex: 1, minHeight: 280, width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical', outline: 'none', lineHeight: 1.7 }} />
        {output && <StatusBar status="ok" message="Conversion complete" />}
      </div>
    </div>
  )
}
