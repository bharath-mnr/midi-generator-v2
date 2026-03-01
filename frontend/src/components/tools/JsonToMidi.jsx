//E:\pro\midigenerator_v2\frontend\src\components\tools\JsonToMidi.jsx

import { useState } from 'react'
import { Activity, Download } from '../shared/Icons.jsx'
import StatusBar from '../shared/StatusBar.jsx'
import ErrorDisplay from '../shared/ErrorDisplay.jsx'

const noteMap = { 'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11 }

class Engine {
  static getSubsPerBar(ts) {
    const [n, d] = ts.split('/').map(Number)
    const s = n * (16 / d)
    if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts}`)
    return s
  }
  static pitchToMidi(pitch) {
    const m = pitch.match(/^([A-G][#Bb]?)(-?\d+)$/i)
    if (!m) throw new Error(`Invalid pitch: ${pitch}`)
    const nn = m[1].toUpperCase()
    if (!(nn in noteMap)) throw new Error(`Unknown note: ${nn}`)
    return (parseInt(m[2]) + 1) * 12 + noteMap[nn]
  }
  static writeVL(v) {
    let buf = v & 0x7F; const bytes = []
    while ((v >>= 7) > 0) { buf <<= 8; buf |= (v & 0x7F) | 0x80 }
    while (true) { bytes.push(buf & 0xFF); if (buf & 0x80) buf >>= 8; else break }
    return bytes
  }
  static jsonToMidiEvents(json) {
    const { tempo, time_signature, bars } = json
    const [tn, td] = time_signature.split('/').map(Number)
    const tpq = 480
    const subs = this.getSubsPerBar(time_signature)
    const barTicks = tpq * tn * (4 / td)
    const tpSub = barTicks / subs
    const midiEvents = []
    for (const bar of bars) {
      if (!bar.notes) continue
      const barBase = (bar.bar_number - 1) * barTicks
      for (const note of bar.notes) {
        const mp = this.pitchToMidi(note.pitch)
        const vel = Math.min(127, Math.max(1, note.velocity || 100))
        const startTick = barBase + note.start_subdivision * tpSub + ((note.offset_percent || 0) / 100) * tpSub
        let durTicks
        if (note.duration_subdivisions === 0) {
          durTicks = ((note.end_cutoff_percent || 50) / 100) * tpSub
        } else {
          durTicks = note.duration_subdivisions * tpSub
          if (note.end_cutoff_percent !== null && note.end_cutoff_percent !== undefined) {
            durTicks = (note.duration_subdivisions - 1) * tpSub + (note.end_cutoff_percent / 100) * tpSub
          }
        }
        if (durTicks <= 0) continue
        midiEvents.push({ tick: startTick, type: 'on', pitch: mp, velocity: vel })
        midiEvents.push({ tick: startTick + durTicks, type: 'off', pitch: mp, velocity: 0 })
      }
    }
    midiEvents.sort((a, b) => a.tick !== b.tick ? a.tick - b.tick : a.type === 'off' ? -1 : 1)
    return { midiEvents, tempo, timeSig: { numerator: tn, denominator: td }, tpq }
  }
  static generateMidi(midiEvents, tempo, timeSig, tpq) {
    const data = []
    const wb = (bytes) => bytes.forEach(b => data.push(b & 0xFF))
    const wi = (v, n) => { for (let i = n - 1; i >= 0; i--) data.push((v >> (8 * i)) & 0xFF) }
    wb([0x4D,0x54,0x68,0x64]); wi(6,4); wi(0,2); wi(1,2); wi(tpq,2)
    const td = []
    td.push(...this.writeVL(0)); td.push(0xFF,0x51,0x03)
    const us = Math.round(60000000 / tempo)
    td.push((us>>16)&0xFF,(us>>8)&0xFF,us&0xFF)
    td.push(...this.writeVL(0)); td.push(0xFF,0x58,0x04)
    td.push(timeSig.numerator, Math.log2(timeSig.denominator), 24, 8)
    td.push(...this.writeVL(0)); td.push(0xC0,0x00)
    let last = 0
    for (const ev of midiEvents) {
      const dt = Math.max(0, Math.round(ev.tick - last))
      td.push(...this.writeVL(dt))
      if (ev.type === 'on') td.push(0x90, ev.pitch & 0x7F, ev.velocity & 0x7F)
      else td.push(0x80, ev.pitch & 0x7F, 0x40)
      last += dt
    }
    td.push(...this.writeVL(0)); td.push(0xFF,0x2F,0x00)
    wb([0x4D,0x54,0x72,0x6B]); wi(td.length,4); wb(td)
    return new Uint8Array(data)
  }
  static convert(jsonStr) {
    const json = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
    if (!json.bars || json.bars.length === 0) throw new Error('No bars found')
    if (!json.time_signature) throw new Error('Missing time_signature')
    if (!json.tempo) throw new Error('Missing tempo')
    const { midiEvents, tempo, timeSig, tpq } = this.jsonToMidiEvents(json)
    return this.generateMidi(midiEvents, tempo, timeSig, tpq)
  }
}

const SAMPLE = JSON.stringify({
  tempo: 85, time_signature: "4/4", key: "Dm",
  bars: [
    { bar_number: 1, notes: [
      { pitch: "D2",  start_subdivision: 0, offset_percent: 0, duration_subdivisions: 16, end_cutoff_percent: null, velocity: 40 },
      { pitch: "F4",  start_subdivision: 4, offset_percent: 0, duration_subdivisions: 4,  end_cutoff_percent: null, velocity: 65 },
      { pitch: "A4",  start_subdivision: 8, offset_percent: 0, duration_subdivisions: 8,  end_cutoff_percent: null, velocity: 75 },
    ]},
    { bar_number: 2, notes: [
      { pitch: "D2",  start_subdivision: 0, offset_percent: 0, duration_subdivisions: 16, end_cutoff_percent: null, velocity: 40 },
      { pitch: "A4",  start_subdivision: 0, offset_percent: 0, duration_subdivisions: 8,  end_cutoff_percent: null, velocity: 90 },
    ]}
  ]
}, null, 2)

export default function JsonToMidi() {
  const [input, setInput] = useState(SAMPLE)
  const [errors, setErrors] = useState([])
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState(null)
  const [jsonValid, setJsonValid] = useState(true)

  const handleInputChange = (v) => {
    setInput(v); setDone(false)
    try { JSON.parse(v); setJsonValid(true) } catch { setJsonValid(false) }
  }

  const handleConvert = () => {
    setProcessing(true); setErrors([]); setDone(false); setStats(null)
    setTimeout(() => {
      try {
        const json = JSON.parse(input)
        const bytes = Engine.convert(json)
        const blob = new Blob([bytes], { type: 'audio/midi' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url
        a.download = `${json.key || 'output'}_${json.tempo}bpm.mid`
        document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a)
        setStats({ bars: json.bars.length, notes: json.bars.reduce((a, b) => a + (b.notes?.length || 0), 0), size: `${(bytes.length / 1024).toFixed(1)} KB` })
        setDone(true)
      } catch (e) { setErrors([e.message]) }
      finally { setProcessing(false) }
    }, 0)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>JSON Input</div>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--mono)', border: `1px solid ${jsonValid ? 'rgba(200,240,96,0.2)' : 'rgba(240,96,96,0.2)'}`, color: jsonValid ? 'var(--accent)' : 'var(--danger)', background: jsonValid ? 'rgba(200,240,96,0.05)' : 'rgba(240,96,96,0.05)' }}>
            {jsonValid ? '✓ valid' : '✗ invalid'}
          </span>
        </div>
        <textarea value={input} onChange={e => handleInputChange(e.target.value)} style={{ flex: 1, minHeight: 280, width: '100%', background: 'var(--surface2)', border: `1px solid ${jsonValid ? 'var(--border)' : 'rgba(240,96,96,0.3)'}`, borderRadius: 'var(--radius-sm)', padding: 12, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical', outline: 'none', lineHeight: 1.7 }} />
        <button onClick={handleConvert} disabled={processing || !input.trim() || !jsonValid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: processing || !input.trim() || !jsonValid ? 'var(--surface3)' : 'var(--accent)', color: processing || !input.trim() || !jsonValid ? 'var(--text3)' : '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: 'var(--font)', alignSelf: 'flex-start' }}>
          <Download size={14} />{processing ? 'Generating...' : 'Convert & Download'}
        </button>
        <ErrorDisplay errors={errors} />
        {done && stats && <StatusBar status="ok" message={`Downloaded · ${stats.bars} bars · ${stats.notes} notes · ${stats.size}`} />}
      </div>
      {/* Field reference */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Field Reference</div>
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 2 }}>
          {[
            ['tempo','number','BPM'],
            ['time_signature','string','"4/4", "3/4", "6/8"'],
            ['key','string','"Dm", "C", "Am"'],
            ['bar_number','number','starts at 1'],
            ['pitch','string','"D2", "A4"'],
            ['start_subdivision','number','0–15 for 4/4'],
            ['offset_percent','number','0–100 (0 = on beat)'],
            ['duration_subdivisions','number','full subdivisions spanned'],
            ['end_cutoff_percent','number|null','partial end, null = full'],
            ['velocity','number','1–127'],
          ].map(([f, t, d]) => (
            <div key={f} style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--accent)', width: 160, flexShrink: 0 }}>{f}</span>
              <span style={{ color: 'var(--text3)', width: 80, flexShrink: 0 }}>{t}</span>
              <span style={{ color: 'var(--text3)' }}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
