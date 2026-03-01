//E:\pro\midigenerator_v2\frontend\src\components\tools\TextToMidi.jsx

import { useState } from 'react'
import { Activity } from '../shared/Icons.jsx'
import StatusBar from '../shared/StatusBar.jsx'
import ErrorDisplay from '../shared/ErrorDisplay.jsx'

const noteMap = { 'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11 }

class Engine {
  static calculateSubdivisions(ts) {
    const s = ts.numerator * (16 / ts.denominator)
    if (!Number.isInteger(s)) throw new Error(`Invalid time signature`)
    return s
  }
  static expandCompression(symbols) {
    const out = []
    for (const sym of symbols) {
      const m = sym.match(/^(.+?)\((\d+)\)$/)
      if (m) for (let i = 0; i < parseInt(m[2]); i++) out.push(m[1])
      else out.push(sym)
    }
    return out
  }
  static convertPitchToMidi(pitch, t = 0) {
    const m = pitch.match(/^([A-G][#Bb]?)(-?\d+)$/i)
    if (!m) throw new Error(`Invalid pitch: ${pitch}`)
    return (parseInt(m[2]) + 1) * 12 + noteMap[m[1].toUpperCase()] + t
  }
  static validateVelocity(v) { return Math.max(1, Math.min(127, Math.round(v))) }
  static parseNoteSymbol(sym, defVel = 100) {
    if (sym === '.') return { isNoteOn: false, velocity: defVel, timingOffset: 0, durationPercent: null, isSustain: false, isRest: true, sustainCutoff: null }
    const sm = sym.match(/^~(\d+)?$/)
    if (sm) return { isNoteOn: false, velocity: defVel, timingOffset: 0, durationPercent: null, isSustain: true, isRest: false, sustainCutoff: sm[1] ? parseInt(sm[1]) : null }
    const pm = sym.match(/^XO(\d+)XE(\d+)$/)
    if (pm) {
      let ro = parseInt(pm[1]), rd = parseInt(pm[2])
      if (ro > 100) ro = 100; if (rd > 100) rd = 100; if (ro + rd > 100) rd = 100 - ro
      return { isNoteOn: true, velocity: 100, timingOffset: ro, durationPercent: rd, isSustain: false, isRest: false, sustainCutoff: null }
    }
    if (!sym.startsWith('X')) return { isNoteOn: false, velocity: defVel, timingOffset: 0, durationPercent: null, isSustain: false, isRest: true, sustainCutoff: null }
    let s = sym.toUpperCase(), vel = defVel, to = 0, dp = null
    const vm = s.match(/^X(\d+)/); if (vm) { vel = Math.min(127, Math.max(1, parseInt(vm[1]))); s = s.slice(vm[0].length) } else s = s.slice(1)
    const rm = s.match(/XR(\d+)/); if (rm) { to = Math.min(100, Math.max(0, parseInt(rm[1]))); s = s.replace(/XR\d+/, '') }
    const dm = s.match(/E(\d+)/); if (dm) { dp = Math.min(100, Math.max(0, parseInt(dm[1]))) }
    return { isNoteOn: true, velocity: this.validateVelocity(vel), timingOffset: to, durationPercent: dp, isSustain: false, isRest: false, sustainCutoff: null }
  }
  static parseTextToMidi(text) {
    const lines = text.trim().split('\n')
    let tempo = 120, timeSig = { numerator: 4, denominator: 4 }
    const bars = []; let currentBar = null
    lines.forEach(line => {
      line = line.trim(); if (!line) return
      const tm = line.match(/Tempo:\s*(\d+)/); if (tm) { tempo = parseInt(tm[1]); return }
      const ts = line.match(/TimeSig:\s*(\d+)\/(\d+)/); if (ts) { timeSig.numerator = parseInt(ts[1]); timeSig.denominator = parseInt(ts[2]); return }
      const bm = line.match(/Bar:\s*(\d+)/); if (bm) { currentBar = { number: parseInt(bm[1]), pitches: new Map() }; bars.push(currentBar); return }
      if (currentBar && line.match(/^[A-G][#b]?-?\d+:/i)) {
        const [pitch, ...rest] = line.split(':')
        const syms = rest.join(':').trim().split(/\s+/).filter(s => s)
        currentBar.pitches.set(pitch.trim(), this.expandCompression(syms))
      }
    })
    return { bars, metadata: { tempo, timeSig }, errors: [] }
  }
  static convertToMidiEvents(parsed) {
    const { bars, metadata } = parsed
    const tpq = 480
    const subs = this.calculateSubdivisions(metadata.timeSig)
    const barTicks = tpq * metadata.timeSig.numerator * (4 / metadata.timeSig.denominator)
    const tpSub = barTicks / subs
    const noteEvents = [], activeNotes = new Map()
    bars.forEach(bar => {
      const baseBarTick = (bar.number - 1) * barTicks
      bar.pitches.forEach((patterns, pitch) => {
        let cur = null; const nid = `${bar.number}-${pitch}`
        patterns.forEach((sym, si) => {
          try {
            const ps = this.parseNoteSymbol(sym)
            const baseTick = baseBarTick + si * tpSub
            const actualTick = baseTick + (ps.timingOffset / 100) * tpSub
            const midiPitch = this.convertPitchToMidi(pitch)
            if (ps.isNoteOn) {
              if (cur) { const d = actualTick - cur.startTick; if (d > 0) noteEvents.push({ type: 'note', pitch: cur.pitch, velocity: cur.velocity, startTick: cur.startTick, durationTicks: d }); cur = null }
              cur = { startTick: actualTick, pitch: midiPitch, velocity: ps.velocity }
              if (ps.durationPercent !== null) { noteEvents.push({ type: 'note', pitch: midiPitch, velocity: ps.velocity, startTick: actualTick, durationTicks: (ps.durationPercent / 100) * tpSub }); cur = null }
            } else if (ps.isSustain) {
              if (cur && ps.sustainCutoff !== null) { const endTick = baseTick + (ps.sustainCutoff / 100) * tpSub; const d = endTick - cur.startTick; if (d > 0) noteEvents.push({ type: 'note', pitch: cur.pitch, velocity: cur.velocity, startTick: cur.startTick, durationTicks: d }); cur = null }
            } else if (ps.isRest) {
              if (cur) { const d = baseTick - cur.startTick; if (d > 0) noteEvents.push({ type: 'note', pitch: cur.pitch, velocity: cur.velocity, startTick: cur.startTick, durationTicks: d }); cur = null }
            }
          } catch (e) { /* skip bad symbols */ }
        })
        if (cur) { const d = baseBarTick + barTicks - cur.startTick; if (d > 0) noteEvents.push({ type: 'note', pitch: cur.pitch, velocity: cur.velocity, startTick: cur.startTick, durationTicks: d }) }
      })
    })
    const midiEvents = []
    noteEvents.forEach(ev => {
      midiEvents.push({ tick: ev.startTick, type: 'on', pitch: ev.pitch, velocity: ev.velocity })
      midiEvents.push({ tick: ev.startTick + ev.durationTicks, type: 'off', pitch: ev.pitch, velocity: 0 })
    })
    return midiEvents.sort((a, b) => a.tick !== b.tick ? a.tick - b.tick : a.type === 'off' ? -1 : 1)
  }
  static writeVL(v) {
    let buf = v & 0x7F; const bytes = []
    while ((v >>= 7) > 0) { buf <<= 8; buf |= (v & 0x7F) | 0x80 }
    while (true) { bytes.push(buf & 0xFF); if (buf & 0x80) buf >>= 8; else break }
    return bytes
  }
  static generateMidi(events, meta) {
    const data = []
    const wb = (bytes) => bytes.forEach(b => data.push(b & 0xFF))
    const wi = (v, n) => { for (let i = n - 1; i >= 0; i--) data.push((v >> (8 * i)) & 0xFF) }
    wb([0x4D,0x54,0x68,0x64]); wi(6,4); wi(0,2); wi(1,2); wi(480,2)
    const td = []
    td.push(...this.writeVL(0)); td.push(0xFF,0x51,0x03)
    const us = Math.round(60000000 / meta.tempo)
    td.push((us>>16)&0xFF,(us>>8)&0xFF,us&0xFF)
    td.push(...this.writeVL(0)); td.push(0xFF,0x58,0x04)
    td.push(meta.timeSig.numerator, Math.log2(meta.timeSig.denominator), 24, 8)
    td.push(...this.writeVL(0)); td.push(0xC0,0x00)
    let last = 0
    events.forEach(ev => {
      const dt = Math.max(0, Math.round(ev.tick - last))
      td.push(...this.writeVL(dt))
      if (ev.type === 'on') td.push(0x90, ev.pitch & 0x7F, ev.velocity & 0x7F)
      else td.push(0x80, ev.pitch & 0x7F, 0x40)
      last += dt
    })
    td.push(...this.writeVL(0)); td.push(0xFF,0x2F,0x00)
    wb([0x4D,0x54,0x72,0x6B]); wi(td.length,4); wb(td)
    return new Uint8Array(data)
  }
  static validateSubdivisions(text) {
    const errors = []
    const lines = text.trim().split('\n')
    const tsLine = lines.find(l => l.toLowerCase().startsWith('timesig:'))
    if (!tsLine) { errors.push('Missing TimeSig'); return errors }
    const tm = tsLine.match(/TimeSig:\s*(\d+)\/(\d+)/i)
    if (!tm) { errors.push('Invalid TimeSig format'); return errors }
    const expectedSubs = parseInt(tm[1]) * (16 / parseInt(tm[2]))
    let barNum = null, barPitches = new Map()
    const checkBar = () => {
      if (barNum === null) return
      barPitches.forEach((count, pitch) => {
        if (count !== expectedSubs) errors.push(`Bar ${barNum} ${pitch}: expected ${expectedSubs} subdivisions, got ${count}`)
      })
    }
    for (const line of lines) {
      const t = line.trim()
      const bm = t.match(/^Bar:\s*(\d+)$/i)
      if (bm) { checkBar(); barNum = parseInt(bm[1]); barPitches = new Map(); continue }
      if (barNum !== null && t.match(/^[A-G][#b]?-?\d+:/i)) {
        const [pitch, ...rest] = t.split(':')
        const syms = rest.join(':').trim().split(/\s+/).filter(s => s)
        barPitches.set(pitch.trim(), this.expandCompression(syms).length)
      }
    }
    checkBar()
    return errors
  }
}

const SAMPLE = `Tempo: 120
TimeSig: 4/4
Key: C

Bar: 1
C4: X .(3) X50 .(3) X80 .(2) X .(3) X .(2)
E4: .(4) X .(11)
G4: .(8) X80 ~(7)`

export default function TextToMidi() {
  const [input, setInput] = useState(SAMPLE)
  const [errors, setErrors] = useState([])
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)

  const handleConvert = () => {
    setProcessing(true); setErrors([]); setDone(false)
    setTimeout(() => {
      try {
        const valErrors = Engine.validateSubdivisions(input)
        if (valErrors.length > 0) { setErrors(valErrors); setProcessing(false); return }
        const parsed = Engine.parseTextToMidi(input)
        const events = Engine.convertToMidiEvents(parsed)
        const bytes = Engine.generateMidi(events, parsed.metadata)
        const blob = new Blob([bytes], { type: 'audio/midi' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'output.mid'
        document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a)
        setDone(true)
      } catch (e) {
        setErrors([e.message])
      } finally {
        setProcessing(false)
      }
    }, 0)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Text Notation</div>
        <textarea value={input} onChange={e => { setInput(e.target.value); setDone(false) }} style={{ flex: 1, minHeight: 280, width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical', outline: 'none', lineHeight: 1.7 }} />
        <button onClick={handleConvert} disabled={processing || !input.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: processing || !input.trim() ? 'var(--surface3)' : 'var(--accent)', color: processing || !input.trim() ? 'var(--text3)' : '#000', fontSize: 13, fontWeight: 700, cursor: processing || !input.trim() ? 'not-allowed' : 'pointer', border: 'none', fontFamily: 'var(--font)', alignSelf: 'flex-start' }}>
          <Activity size={14} />{processing ? 'Converting...' : 'Convert & Download'}
        </button>
        <ErrorDisplay errors={errors} />
        {done && <StatusBar status="ok" message="MIDI downloaded successfully" />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Format Reference</div>
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', lineHeight: 2 }}>
          {[['X','Note on (velocity 100)'],['X80','Note on velocity 80'],['~','Sustain previous note'],['~50','Sustain, cut at 50%'],['.',  'Rest'],['.(4)','4 rests (compressed)'],['~(8)','8 sustains (compressed)'],['X(3)','3 note-ons (compressed)']].map(([sym, desc]) => (
            <div key={sym} style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: 'var(--accent)', width: 80, flexShrink: 0 }}>{sym}</span>
              <span style={{ color: 'var(--text3)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
