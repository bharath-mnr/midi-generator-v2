//E:\pro\midigenerator_v2\frontend\src\components\tools\TextToJson.jsx

import { useState } from 'react'
import { Activity, Copy, Check } from '../shared/Icons.jsx'
import StatusBar from '../shared/StatusBar.jsx'
import ErrorDisplay from '../shared/ErrorDisplay.jsx'

function getSubsPerBar(ts) {
  const [n, d] = ts.split('/').map(Number)
  const s = n * (16 / d)
  if (!Number.isInteger(s)) throw new Error(`Invalid time signature ${ts}`)
  return s
}

function expandCompression(symbols) {
  const out = []
  for (const sym of symbols) {
    const m = sym.match(/^(.+?)\((\d+)\)$/)
    if (m) for (let i = 0; i < parseInt(m[2]); i++) out.push(m[1])
    else out.push(sym)
  }
  return out
}

function parseSymbol(sym) {
  if (sym === '.') return { type: 'rest' }
  if (sym.startsWith('~')) { const c = sym.match(/^~(\d+)$/); return { type: 'sustain', sustainCutoff: c ? parseInt(c[1]) : null } }
  if (!sym.startsWith('X')) return { type: 'rest' }
  let s = sym.toUpperCase(), vel = 100, dp = null
  const vm = s.match(/^X(\d+)/); if (vm) { vel = Math.min(127, Math.max(1, parseInt(vm[1]))); s = s.slice(vm[0].length) } else s = s.slice(1)
  const dm = s.match(/E(\d+)/); if (dm) dp = Math.min(100, Math.max(0, parseInt(dm[1])))
  return { type: 'note', velocity: vel, durationPercent: dp }
}

class Engine {
  static convert(text) {
    const lines = text.trim().split('\n')
    let tempo = 120, timeSigStr = '4/4', key = 'C'
    for (const line of lines) {
      const t = line.trim()
      const tm = t.match(/^Tempo:\s*(\d+)/i); if (tm) { tempo = parseInt(tm[1]); continue }
      const ts = t.match(/^TimeSig:\s*(\d+\/\d+)/i); if (ts) { timeSigStr = ts[1]; continue }
      const km = t.match(/^Key:\s*([A-G][#b]?[m]?)/i); if (km) { key = km[1]; continue }
    }
    const subs = getSubsPerBar(timeSigStr)
    const rawBars = []; let currentBar = null
    for (const line of lines) {
      const t = line.trim(); if (!t) continue
      const bm = t.match(/^Bar:\s*(\d+)$/i)
      if (bm) { currentBar = { barNumber: parseInt(bm[1]), pitches: new Map() }; rawBars.push(currentBar); continue }
      if (!currentBar) continue
      const nm = t.match(/^([A-G][#b]?-?\d+):\s*(.+)$/i)
      if (!nm) continue
      const expanded = expandCompression(nm[2].trim().split(/\s+/).filter(Boolean))
      if (expanded.length !== subs) throw new Error(`Bar ${currentBar.barNumber} ${nm[1]}: expected ${subs} subdivisions, got ${expanded.length}`)
      currentBar.pitches.set(nm[1], expanded)
    }
    const activeNotes = new Map(), resolvedNotes = [], totalBars = rawBars.length
    for (let bi = 0; bi < totalBars; bi++) {
      const bar = rawBars[bi], barAbsOffset = bi * subs
      const allPitches = new Set([...bar.pitches.keys(), ...activeNotes.keys()])
      for (const pitch of allPitches) {
        const symbols = bar.pitches.get(pitch)
        if (!symbols) {
          if (activeNotes.has(pitch)) { const a = activeNotes.get(pitch); resolvedNotes.push({ pitch, startBarNumber: a.startBarNumber, startSub: a.startSub, durationSubdivisions: barAbsOffset - a.startAbsSub, velocity: a.velocity }); activeNotes.delete(pitch) }
          continue
        }
        let active = activeNotes.get(pitch) || null
        for (let s = 0; s < symbols.length; s++) {
          const p = parseSymbol(symbols[s])
          if (p.type === 'rest') {
            if (active) { resolvedNotes.push({ pitch, startBarNumber: active.startBarNumber, startSub: active.startSub, durationSubdivisions: barAbsOffset + s - active.startAbsSub, velocity: active.velocity }); activeNotes.delete(pitch); active = null }
          } else if (p.type === 'sustain') {
            if (active && p.sustainCutoff !== null) { resolvedNotes.push({ pitch, startBarNumber: active.startBarNumber, startSub: active.startSub, durationSubdivisions: barAbsOffset + s - active.startAbsSub, velocity: active.velocity }); activeNotes.delete(pitch); active = null }
          } else if (p.type === 'note') {
            if (active) { resolvedNotes.push({ pitch, startBarNumber: active.startBarNumber, startSub: active.startSub, durationSubdivisions: barAbsOffset + s - active.startAbsSub, velocity: active.velocity }); activeNotes.delete(pitch); active = null }
            if (p.durationPercent !== null) { resolvedNotes.push({ pitch, startBarNumber: bar.barNumber, startSub: s % subs, durationSubdivisions: 1, velocity: p.velocity }) }
            else { active = { startBarNumber: bar.barNumber, startSub: s % subs, startAbsSub: barAbsOffset + s, velocity: p.velocity }; activeNotes.set(pitch, active) }
          }
        }
      }
    }
    for (const [pitch, active] of activeNotes.entries()) {
      const d = totalBars * subs - active.startAbsSub
      if (d > 0) resolvedNotes.push({ pitch, startBarNumber: active.startBarNumber, startSub: active.startSub, durationSubdivisions: d, velocity: active.velocity })
    }
    const barsMap = new Map()
    for (const bar of rawBars) barsMap.set(bar.barNumber, { bar_number: bar.barNumber, notes: [] })
    for (const note of resolvedNotes) {
      if (!barsMap.has(note.startBarNumber)) barsMap.set(note.startBarNumber, { bar_number: note.startBarNumber, notes: [] })
      barsMap.get(note.startBarNumber).notes.push({ pitch: note.pitch, start_subdivision: note.startSub, duration_subdivisions: note.durationSubdivisions, velocity: note.velocity })
    }
    return { tempo, time_signature: timeSigStr, key, bars: Array.from(barsMap.values()).sort((a, b) => a.bar_number - b.bar_number) }
  }
}

const SAMPLE = `Tempo: 85
TimeSig: 4/4
Key: Dm

Bar: 1
D2: X40 ~(15)
A4: .(8) X75 ~(7)

Bar: 2
D2: ~(16)
A4: ~(16)`

export default function TextToJson() {
  const [input, setInput] = useState(SAMPLE)
  const [output, setOutput] = useState('')
  const [errors, setErrors] = useState([])
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState(null)

  const handleConvert = () => {
    setProcessing(true); setErrors([]); setOutput(''); setStats(null)
    setTimeout(() => {
      try {
        const json = Engine.convert(input)
        setOutput(JSON.stringify(json, null, 2))
        setStats({ bars: json.bars.length, notes: json.bars.reduce((a, b) => a + b.notes.length, 0) })
      } catch (e) { setErrors([e.message]) }
      finally { setProcessing(false) }
    }, 0)
  }

  const handleCopy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Text Notation Input</div>
        <textarea value={input} onChange={e => { setInput(e.target.value); setOutput(''); setStats(null) }} style={{ flex: 1, minHeight: 280, width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical', outline: 'none', lineHeight: 1.7 }} />
        <button onClick={handleConvert} disabled={processing || !input.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: processing || !input.trim() ? 'var(--surface3)' : 'var(--accent)', color: processing || !input.trim() ? 'var(--text3)' : '#000', fontSize: 13, fontWeight: 700, cursor: processing || !input.trim() ? 'not-allowed' : 'pointer', border: 'none', fontFamily: 'var(--font)', alignSelf: 'flex-start' }}>
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
        {stats && <StatusBar status="ok" message={`${stats.bars} bars · ${stats.notes} notes`} />}
      </div>
    </div>
  )
}
