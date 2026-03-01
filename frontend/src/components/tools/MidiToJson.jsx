//E:\pro\midigenerator_v2\frontend\src\components\tools\MidiToJson.jsx

import { useState, useRef } from 'react'
import { Upload, Copy, Check, Activity } from '../shared/Icons.jsx'
import StatusBar from '../shared/StatusBar.jsx'
import ErrorDisplay from '../shared/ErrorDisplay.jsx'

const midiToNote = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

class Engine {
  static midiToPitch(n) { return midiToNote[n % 12] + (Math.floor(n / 12) - 1) }
  static getSubsPerBar(ts) {
    const s = ts.numerator * (16 / ts.denominator)
    if (!Number.isInteger(s)) throw new Error(`Invalid time signature`)
    return s
  }
  static parseMidiFile(buf) {
    const data = new Uint8Array(buf)
    let offset = 0
    const hdr = data.slice(0, 14)
    if (String.fromCharCode(...hdr.slice(0, 4)) !== 'MThd') throw new Error('Invalid MIDI file')
    const trackCount = (hdr[10] << 8) | hdr[11]
    const tpq = (hdr[12] << 8) | hdr[13]
    offset = 14
    const events = []; let tempo = 120, timeSig = { numerator: 4, denominator: 4 }
    for (let t = 0; t < trackCount; t++) {
      const th = data.slice(offset, offset + 8)
      if (String.fromCharCode(...th.slice(0, 4)) !== 'MTrk') throw new Error('Invalid track header')
      const tLen = (th[4] << 24) | (th[5] << 16) | (th[6] << 8) | th[7]
      offset += 8
      const td = data.slice(offset, offset + tLen)
      let to = 0, ct = 0, rs = 0
      while (to < tLen) {
        let dt = 0, b; do { b = td[to++]; dt = (dt << 7) | (b & 0x7F) } while (b & 0x80)
        ct += dt
        let sb = td[to]; if (sb < 0x80) sb = rs; else { to++; rs = sb }
        if (sb === 0xFF) {
          const mt = td[to++]; let ml = 0, lb; do { lb = td[to++]; ml = (ml << 7) | (lb & 0x7F) } while (lb & 0x80)
          if (mt === 0x51 && ml === 3) tempo = Math.round(60000000 / ((td[to] << 16) | (td[to+1] << 8) | td[to+2]))
          else if (mt === 0x58 && ml >= 4) { timeSig.numerator = td[to]; timeSig.denominator = Math.pow(2, td[to+1]) }
          to += ml; rs = 0
        } else if ((sb & 0xF0) === 0x90) {
          const p = td[to++], v = td[to++]; events.push({ tick: ct, type: v > 0 ? 'on' : 'off', pitch: p, velocity: v })
        } else if ((sb & 0xF0) === 0x80) {
          const p = td[to++]; to++; events.push({ tick: ct, type: 'off', pitch: p, velocity: 0 })
        } else { if (sb >= 0xF0) break; to += ((sb & 0xF0) === 0xC0 || (sb & 0xF0) === 0xD0) ? 1 : 2 }
      }
      offset += tLen
    }
    return { events: events.sort((a, b) => a.tick - b.tick), tempo, timeSig, tpq }
  }
  static convertToJson(midiData) {
    const { events, tempo, timeSig, tpq } = midiData
    const subs = this.getSubsPerBar(timeSig)
    const tpBar = tpq * timeSig.numerator * (4 / timeSig.denominator)
    const tpSub = tpBar / subs
    const rawNotes = []; const noteOnMap = new Map()
    for (const ev of events) {
      if (ev.type === 'on') {
        if (noteOnMap.has(ev.pitch)) { const prev = noteOnMap.get(ev.pitch); const d = ev.tick - prev.tick; if (d > 0) rawNotes.push({ pitch: ev.pitch, startTick: prev.tick, endTick: ev.tick, velocity: prev.velocity }) }
        noteOnMap.set(ev.pitch, ev)
      } else if (ev.type === 'off' && noteOnMap.has(ev.pitch)) {
        const on = noteOnMap.get(ev.pitch); const d = ev.tick - on.tick
        if (d > 0) rawNotes.push({ pitch: ev.pitch, startTick: on.tick, endTick: ev.tick, velocity: on.velocity })
        noteOnMap.delete(ev.pitch)
      }
    }
    const maxTick = events.length > 0 ? Math.max(...events.map(e => e.tick)) : 0
    for (const [pitch, on] of noteOnMap.entries()) { const d = maxTick - on.tick; if (d > 0) rawNotes.push({ pitch, startTick: on.tick, endTick: maxTick, velocity: on.velocity }) }
    const jsonNotes = []
    for (const note of rawNotes) {
      const pn = this.midiToPitch(note.pitch)
      const startSubTotal = Math.floor(note.startTick / tpSub)
      const offsetPct = Math.round(((note.startTick - startSubTotal * tpSub) / tpSub) * 100)
      const endSubTotal = Math.floor((note.endTick - 0.0001) / tpSub)
      const endPct = Math.round(((note.endTick - endSubTotal * tpSub) / tpSub) * 100)
      jsonNotes.push({ bar_number: Math.floor(startSubTotal / subs) + 1, pitch: pn, start_subdivision: startSubTotal % subs, offset_percent: offsetPct, duration_subdivisions: endSubTotal - startSubTotal, end_cutoff_percent: endPct < 100 ? endPct : null, velocity: note.velocity })
    }
    const barsMap = new Map()
    for (const note of jsonNotes) {
      if (!barsMap.has(note.bar_number)) barsMap.set(note.bar_number, [])
      barsMap.get(note.bar_number).push({ pitch: note.pitch, start_subdivision: note.start_subdivision, offset_percent: note.offset_percent, duration_subdivisions: note.duration_subdivisions, end_cutoff_percent: note.end_cutoff_percent, velocity: note.velocity })
    }
    return { tempo, time_signature: `${timeSig.numerator}/${timeSig.denominator}`, key: 'C', subdivisions_per_bar: subs, bars: Array.from(barsMap.entries()).sort(([a],[b]) => a-b).map(([bar_number, notes]) => ({ bar_number, notes })) }
  }
  static convert(buf) { const m = this.parseMidiFile(buf); return this.convertToJson(m) }
}

export default function MidiToJson() {
  const [file, setFile] = useState(null)
  const [output, setOutput] = useState('')
  const [errors, setErrors] = useState([])
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState(null)
  const ref = useRef(null)

  const handleConvert = async () => {
    if (!file) return
    setProcessing(true); setErrors([]); setOutput(''); setStats(null)
    try {
      const buf = await file.arrayBuffer()
      const json = Engine.convert(buf)
      setOutput(JSON.stringify(json, null, 2))
      setStats({ bars: json.bars.length, notes: json.bars.reduce((a, b) => a + b.notes.length, 0), tempo: json.tempo })
    } catch (e) { setErrors([e.message]) }
    finally { setProcessing(false) }
  }

  const handleCopy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>MIDI File</div>
        <div onClick={() => ref.current?.click()} style={{ border: `1.5px dashed ${file ? 'var(--accent)' : 'var(--border2)'}`, borderRadius: 'var(--radius)', padding: 24, textAlign: 'center', cursor: 'pointer', background: file ? 'rgba(200,240,96,0.02)' : 'var(--surface2)', transition: 'all 0.2s ease' }}>
          <input ref={ref} type="file" accept=".mid,.midi" style={{ display: 'none' }} onChange={e => { setFile(e.target.files[0]); setOutput(''); setErrors([]); setStats(null) }} />
          <Upload size={24} stroke={file ? 'var(--accent)' : 'var(--text3)'} />
          <div style={{ marginTop: 10, fontSize: 13, color: file ? 'var(--accent)' : 'var(--text2)' }}>{file ? file.name : 'Click to upload .mid file'}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>.mid · .midi</div>
        </div>
        <button onClick={handleConvert} disabled={!file || processing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: !file || processing ? 'var(--surface3)' : 'var(--accent)', color: !file || processing ? 'var(--text3)' : '#000', fontSize: 13, fontWeight: 700, cursor: !file || processing ? 'not-allowed' : 'pointer', border: 'none', fontFamily: 'var(--font)', alignSelf: 'flex-start' }}>
          <Activity size={14} />{processing ? 'Converting...' : 'Convert to JSON'}
        </button>
        <ErrorDisplay errors={errors} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>JSON Output</div>
          {output && <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: copied ? 'var(--accent)' : 'var(--text3)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>{copied ? <Check size={11} stroke="var(--accent)" /> : <Copy size={11} />}{copied ? 'Copied!' : 'Copy'}</button>}
        </div>
        <textarea readOnly value={output} placeholder="JSON output will appear here..." style={{ flex: 1, minHeight: 280, width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical', outline: 'none', lineHeight: 1.7 }} />
        {stats && <StatusBar status="ok" message={`${stats.bars} bars · ${stats.notes} notes · ${stats.tempo} BPM`} />}
      </div>
    </div>
  )
}
