//E:\pro\midigenerator_v2\frontend\src\components\tools\JsonToText.jsx

import { useState } from 'react'
import { Activity, Copy, Check } from '../shared/Icons.jsx'
import StatusBar from '../shared/StatusBar.jsx'
import ErrorDisplay from '../shared/ErrorDisplay.jsx'

const noteMap = { 'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11 }

function getSubsPerBar(ts) {
  const [n, d] = ts.split('/').map(Number)
  const s = n * (16 / d)
  if (!Number.isInteger(s)) throw new Error(`Invalid time signature ${ts}`)
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

function pitchToMidi(pitch) {
  const m = pitch.match(/^([A-G][#b]?)(-?\d+)$/i)
  if (!m) return 0
  return (parseInt(m[2]) + 1) * 12 + (noteMap[m[1].toUpperCase()] ?? 0)
}

class Engine {
  static convert(json) {
    const { tempo, time_signature, key, bars } = json
    if (!bars || bars.length === 0) throw new Error('No bars found in JSON')
    const subs = getSubsPerBar(time_signature)
    const globalNotes = []
    for (const bar of bars) {
      if (!bar.notes) continue
      const barOffset = (bar.bar_number - 1) * subs
      for (const note of bar.notes) {
        const startAbs = barOffset + (note.start_subdivision || 0)
        const endAbs = startAbs + (note.duration_subdivisions || 1)
        globalNotes.push({ pitch: note.pitch, startAbs, endAbs, velocity: Math.min(127, Math.max(1, note.velocity || 100)) })
      }
    }
    const maxBarDeclared = Math.max(...bars.map(b => b.bar_number))
    const maxSubFromNotes = globalNotes.length > 0 ? Math.max(...globalNotes.map(n => n.endAbs)) : 0
    const totalBars = Math.max(maxBarDeclared, Math.ceil(maxSubFromNotes / subs))
    const barOutputs = []
    for (let barNum = 1; barNum <= totalBars; barNum++) {
      const barStart = (barNum - 1) * subs, barEnd = barNum * subs
      const active = globalNotes.filter(n => n.startAbs < barEnd && n.endAbs > barStart)
      const pitchSlots = new Map()
      for (const note of active) {
        if (!pitchSlots.has(note.pitch)) pitchSlots.set(note.pitch, new Array(subs).fill('.'))
        const slots = pitchSlots.get(note.pitch)
        const ls = Math.max(note.startAbs - barStart, 0)
        const le = Math.min(note.endAbs - barStart, subs)
        for (let s = ls; s < le; s++) {
          if (s === ls) slots[s] = note.startAbs >= barStart ? (note.velocity === 100 ? 'X' : `X${note.velocity}`) : '~'
          else slots[s] = '~'
        }
      }
      barOutputs.push({ barNum, pitchSlots })
    }
    let out = `Tempo: ${tempo}\nTimeSig: ${time_signature}\nKey: ${key}`
    for (const { barNum, pitchSlots } of barOutputs) {
      out += `\n\nBar: ${barNum}`
      if (pitchSlots.size === 0) continue
      const sorted = Array.from(pitchSlots.keys()).sort((a, b) => pitchToMidi(a) - pitchToMidi(b))
      for (const pitch of sorted) out += `\n${pitch}: ${compress(pitchSlots.get(pitch)).join(' ')}`
    }
    return out.trim()
  }
}

const SAMPLE = JSON.stringify({
  tempo: 85, time_signature: "4/4", key: "Dm",
  bars: [
    { bar_number: 1, notes: [
      { pitch: "D2", start_subdivision: 0, duration_subdivisions: 16, velocity: 40 },
      { pitch: "A4", start_subdivision: 8, duration_subdivisions: 8,  velocity: 75 },
    ]},
    { bar_number: 3, notes: [
      { pitch: "A4", start_subdivision: 4, duration_subdivisions: 12, velocity: 90 }
    ]}
  ]
}, null, 2)

export default function JsonToText() {
  const [input, setInput] = useState(SAMPLE)
  const [output, setOutput] = useState('')
  const [errors, setErrors] = useState([])
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [jsonValid, setJsonValid] = useState(true)

  const handleInputChange = (v) => {
    setInput(v)
    try { JSON.parse(v); setJsonValid(true) } catch { setJsonValid(false) }
  }

  const handleConvert = () => {
    setProcessing(true); setErrors([]); setOutput('')
    setTimeout(() => {
      try { setOutput(Engine.convert(JSON.parse(input))) }
      catch (e) { setErrors([e.message]) }
      finally { setProcessing(false) }
    }, 0)
  }

  const handleCopy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000) }

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
          <Activity size={14} />{processing ? 'Converting...' : 'Convert to Text'}
        </button>
        <ErrorDisplay errors={errors} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Text Notation Output</div>
          {output && <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: copied ? 'var(--accent)' : 'var(--text3)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>{copied ? <Check size={11} stroke="var(--accent)" /> : <Copy size={11} />}{copied ? 'Copied!' : 'Copy'}</button>}
        </div>
        <textarea readOnly value={output} placeholder="Text notation output will appear here..." style={{ flex: 1, minHeight: 280, width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical', outline: 'none', lineHeight: 1.7 }} />
        {output && <StatusBar status="ok" message="Conversion complete — ready for MIDI converter" />}
      </div>
    </div>
  )
}
