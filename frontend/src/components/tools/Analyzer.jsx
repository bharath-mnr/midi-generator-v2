
// frontend/src/components/tools/Analyzer.jsx
//
// Added: MIDI file upload → client-side conversion → auto-analyze
// Everything else unchanged from original.

import { useState, useRef, useCallback } from 'react'
import { Upload, Copy, Check, Activity } from '../shared/Icons.jsx'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─── CLIENT-SIDE MIDI PARSER ──────────────────────────────────────
// Same engine used by MidiToJson.jsx — no backend call needed.
const MIDI_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function midiConvert(buf) {
  const data = new Uint8Array(buf)
  let offset = 0
  const hdr = data.slice(0, 14)
  if (String.fromCharCode(...hdr.slice(0, 4)) !== 'MThd') throw new Error('Invalid MIDI file')
  const trackCount = (hdr[10] << 8) | hdr[11]
  const tpq        = (hdr[12] << 8) | hdr[13]
  offset = 14

  const events = []; let tempo = 120; let timeSig = { numerator: 4, denominator: 4 }

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
      let sb = td[to]; if (sb < 0x80) sb = rs; else { to++; rs = sb }

      if (sb === 0xFF) {
        const mt = td[to++]; let ml = 0, lb
        do { lb = td[to++]; ml = (ml << 7) | (lb & 0x7F) } while (lb & 0x80)
        if (mt === 0x51 && ml === 3)
          tempo = Math.round(60000000 / ((td[to] << 16) | (td[to+1] << 8) | td[to+2]))
        else if (mt === 0x58 && ml >= 4) {
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

  const subs  = timeSig.numerator * (16 / timeSig.denominator)
  const tpBar = tpq * timeSig.numerator * (4 / timeSig.denominator)
  const tpSub = tpBar / subs

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
      const d  = on.tick === ev.tick ? 0 : ev.tick - on.tick
      if (d > 0) rawNotes.push({ pitch: ev.pitch, startTick: on.tick, endTick: ev.tick })
      noteOnMap.delete(ev.pitch)
    }
  }
  const maxTick = events.length > 0 ? Math.max(...events.map(e => e.tick)) : 0
  for (const [pitch, on] of noteOnMap.entries()) {
    const d = maxTick - on.tick
    if (d > 0) rawNotes.push({ pitch, startTick: on.tick, endTick: maxTick })
  }

  const jsonNotes = []
  for (const note of rawNotes) {
    const pn            = MIDI_NOTES[note.pitch % 12] + (Math.floor(note.pitch / 12) - 1)
    const startSubTotal = Math.floor(note.startTick / tpSub)
    const offsetPct     = Math.round(((note.startTick - startSubTotal * tpSub) / tpSub) * 100)
    const endSubTotal   = Math.floor(note.endTick / tpSub)
    const endPct        = Math.round(((note.endTick - endSubTotal * tpSub) / tpSub) * 100)
    const barNumber     = Math.floor(startSubTotal / subs) + 1
    const startSubInBar = startSubTotal % subs
    const durSubs       = endSubTotal - startSubTotal
    const endCutoff     = (endPct > 0 && endPct < 100) ? endPct : null
    const compact       = { p: pn, s: startSubInBar, d: durSubs }
    if (offsetPct > 0)      compact.o = offsetPct
    if (endCutoff !== null) compact.c = endCutoff
    jsonNotes.push({ bn: barNumber, ...compact })
  }

  const barsMap = new Map()
  for (const note of jsonNotes) {
    if (!barsMap.has(note.bn)) barsMap.set(note.bn, [])
    const { bn, ...fields } = note
    barsMap.get(note.bn).push(fields)
  }
  const bars = Array.from(barsMap.entries()).sort(([a],[b]) => a - b).map(([bn, notes]) => ({ bn, notes }))

  const filledBars = []
  if (bars.length > 0) {
    const lastBar   = bars[bars.length - 1].bn
    const barLookup = new Map(bars.map(b => [b.bn, b]))
    for (let i = 1; i <= lastBar; i++) filledBars.push(barLookup.get(i) ?? { bn: i, notes: [] })
  }

  return { tempo, time_signature: `${timeSig.numerator}/${timeSig.denominator}`, key: 'C', subdivisions_per_bar: subs, bars: filledBars }
}

// ─── PITCH HELPERS (used in PatternCard mini-roll) ────────────────
const NOTE_MAP = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,
  'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11,
}
const MIDI_NOTES_DISP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function p2m(pitch) {
  const m = String(pitch || '').match(/^([A-G][#Bb]?)(-?\d+)$/i)
  if (!m) return null
  const pc = NOTE_MAP[m[1].toUpperCase()]
  return pc === undefined ? null : (parseInt(m[2]) + 1) * 12 + pc
}
function m2n(midi) {
  return MIDI_NOTES_DISP[midi % 12] + (Math.floor(midi / 12) - 1)
}

// ─── COMPACT NORMALISER (PatternCard display) ─────────────────────
function normNote(n) {
  return {
    pitch:                 n.pitch ?? n.p,
    start_subdivision:     n.start_subdivision ?? n.s ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
  }
}
function normBar(b) {
  return { bar_number: b.bar_number ?? b.bn, notes: (b.notes ?? []).map(normNote) }
}
function normJson(j) {
  const ts = j.time_signature || '4/4'
  const [n, d] = ts.split('/').map(Number)
  return {
    tempo: j.tempo || 120, time_signature: ts, key: j.key || 'C',
    subdivisions_per_bar: j.subdivisions_per_bar || (n * (16 / d)),
    bars: (j.bars || []).map(normBar),
  }
}

// ─── COLORS ──────────────────────────────────────────────────────
const EMP_CLR = '#374151'
const SUR_CLR = '#ef4444'
const BND_CLR = '#f97316'

// ═══════════════════════════════════════════════════════════════
// RESPONSE ADAPTER
// ═══════════════════════════════════════════════════════════════

function adaptResponse(data) {
  const meta = data.metadata
  const rhFamilies = data.rightHand.families || data.rightHand.patterns || []
  const lhFamilies = data.leftHand.families  || data.leftHand.patterns  || []
  const patColorMap = new Map()
  patColorMap.set('EMPTY',    EMP_CLR)
  patColorMap.set('SURPRISE', SUR_CLR)
  const colorFrom = (fam) => fam?.color?.bg || fam?.color || '#6b7280'
  rhFamilies.forEach(f => patColorMap.set(f.id, colorFrom(f)))
  lhFamilies.forEach(f => patColorMap.set(f.id, colorFrom(f)))
  const normLabeled = (labeled) => (labeled || []).map(lb => ({
    ...lb,
    color: lb.isBoundaryEnd ? BND_CLR : (patColorMap.get(lb.patternId) || SUR_CLR),
    alternating: lb.alternating ?? null,
  }))
  const normSections = (sections, families) => (sections || []).map(s => {
    const fam = families.find(f => f.id === s.patternId)
    return { ...s, pid: s.patternId, color: colorFrom(fam) || (s.patternId === 'MIXED' ? '#6b7280' : SUR_CLR) }
  })
  const normPatterns = (families) => (families || []).map(f => ({
    ...f,
    color: colorFrom(f),
    windowSize: f.windowSize,
    occurrences: (f.occurrences || []).map(o => ({
      startBar: o.startBar, endBar: o.endBar, barRange: o.barRange, w: o.w ?? f.windowSize,
    })),
  }))
  const res = {
    rhPatterns:  normPatterns(rhFamilies),
    lhPatterns:  normPatterns(lhFamilies),
    rhLabeled:   normLabeled(data.rightHand.labeled),
    lhLabeled:   normLabeled(data.leftHand.labeled),
    rhSections:  normSections(data.rightHand.sections, rhFamilies),
    lhSections:  normSections(data.leftHand.sections,  lhFamilies),
    rhGraph:     data.rightHand.graph,
    alignment:   (data.alignment || []).map(aln => ({
      ...aln,
      rh: aln.rh ? { ...aln.rh, color: patColorMap.get(aln.rh.patternId) || SUR_CLR } : null,
      lh: aln.lh ? { ...aln.lh, color: patColorMap.get(aln.lh.patternId) || SUR_CLR } : null,
    })),
    split:       data.splitMidi,
    boundaries:  data.rightHand.boundaries || [],
    windowSizes: data.summary?.windowSizes || [],
    surpriseBars: data.summary?.surpriseBars || [],
  }
  return { meta, res, yaml: data.yamlBlueprint }
}

// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS — all unchanged
// ═══════════════════════════════════════════════════════════════

function TimelineRow({ labeled, sections, title }) {
  const [hov, setHov] = useState(null)
  if (!labeled || !labeled.some(b => !b.isEmpty)) return null
  const secMap = new Map(sections.map(s => [s.pid, s]))
  const ROW = 16
  const rows = []
  for (let i = 0; i < labeled.length; i += ROW) rows.push(labeled.slice(i, i + ROW))
  function cellBg(lb) {
    if (lb.isEmpty)       return EMP_CLR
    if (lb.isSurprise)    return SUR_CLR
    if (lb.isBoundaryEnd) return BND_CLR
    const sec = secMap.get(lb.patternId)
    return sec ? sec.color : lb.color
  }
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>{title}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
        {sections.map(sec => (
          <div key={sec.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:sec.color+'18', border:`1px solid ${sec.color}44`, fontSize:10, fontFamily:'var(--mono)' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:sec.color, display:'inline-block' }} />
            <span style={{ color:sec.color, fontWeight:600 }}>{sec.fullLabel}</span>
            <span style={{ color:'var(--tx-3)' }}>{sec.startBar}–{sec.endBar}</span>
          </div>
        ))}
        {labeled.some(b => b.isSurprise) && (
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:SUR_CLR+'18', border:`1px solid ${SUR_CLR}44`, fontSize:10, fontFamily:'var(--mono)' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:SUR_CLR, display:'inline-block' }} />
            <span style={{ color:SUR_CLR, fontWeight:600 }}>Surprise</span>
          </div>
        )}
        {labeled.some(b => b.isBoundaryEnd) && (
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:BND_CLR+'18', border:`1px solid ${BND_CLR}44`, fontSize:10, fontFamily:'var(--mono)' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:BND_CLR, display:'inline-block' }} />
            <span style={{ color:BND_CLR, fontWeight:600 }}>Boundary</span>
          </div>
        )}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display:'flex', alignItems:'center', gap:3, marginBottom:2 }}>
          <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--tx-3)', width:20, textAlign:'right', flexShrink:0 }}>{row[0].barNumber}</span>
          <div style={{ display:'flex', gap:1, flex:1 }}>
            {row.map(lb => (
              <div key={lb.barNumber} onMouseEnter={() => setHov(lb)} onMouseLeave={() => setHov(null)}
                style={{ flex:1, height:22, borderRadius:2, background: cellBg(lb), opacity: lb.isEmpty ? 0.2 : 1, cursor:'default', outline: hov?.barNumber === lb.barNumber ? '2px solid var(--tx-1)' : 'none', position:'relative', transition:'outline 0.08s' }}>
                {lb.isSustain    && <div style={{ position:'absolute', inset:'40% 0', height:2, background:'rgba(255,255,255,0.6)', borderRadius:1 }} />}
                {lb.alternating  && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', gap:1 }}>{[0,1,2].map(i => <div key={i} style={{ width:1, height:'55%', background:'rgba(255,255,255,0.45)', borderRadius:1 }} />)}</div>}
                {lb.isBoundaryEnd && <div style={{ position:'absolute', right:0, top:0, bottom:0, width:2, background:'rgba(255,255,255,0.8)', borderRadius:1 }} />}
              </div>
            ))}
          </div>
        </div>
      ))}
      {hov && (
        <div style={{ marginTop:8, padding:'8px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:11, fontFamily:'var(--mono)', color:'var(--text2)' }}>
          <span style={{ color:'var(--tx-1)', fontWeight:600 }}>Bar {hov.barNumber}</span>{' · '}
          <span style={{ color: hov.isBoundaryEnd ? BND_CLR : hov.isSurprise ? SUR_CLR : hov.isEmpty ? 'var(--tx-3)' : hov.color }}>{hov.patternLabel}</span>
          {' · '}{hov.noteCount} notes
          {hov.variationType   && <span style={{ color:'var(--mint)', marginLeft:8 }}>var:{hov.variationType}</span>}
          {hov.bestScaleName   && <span style={{ color:'var(--tx-3)', marginLeft:8 }}>scale:{hov.bestScaleName}</span>}
          {hov.alternating     && <span style={{ color:'var(--accent)', marginLeft:8 }}>pedal:{hov.alternating.pedal}</span>}
          {hov.isSustain       && <span style={{ color:'var(--sky)', marginLeft:8 }}>sustain</span>}
          {hov.isBoundaryEnd   && <span style={{ color:BND_CLR, marginLeft:8 }}>boundary:{hov.boundaryType}</span>}
          {hov.isSurprise      && <span style={{ color:SUR_CLR, marginLeft:8 }}>unique</span>}
          {hov.noveltyScore > 0 && <span style={{ color:'var(--tx-3)', marginLeft:8 }}>novelty:{hov.noveltyScore?.toFixed(2)}</span>}
        </div>
      )}
    </div>
  )
}

function PatternCard({ pat, meta, spb }) {
  const occ   = pat.occurrences[0]
  const bar   = meta.bars.find(b => (b.bar_number ?? b.bn) === occ.startBar)
  const notes = bar ? [...bar.notes].map(normNote).sort((a, b) => a.start_subdivision - b.start_subdivision) : []
  const allMidis = notes.map(n => p2m(n.pitch)).filter(x => x !== null)
  const minM = allMidis.length ? Math.min(...allMidis) : 60
  const maxM = allMidis.length ? Math.max(...allMidis) : 72
  const range = Math.max(maxM - minM, 8)
  const color = typeof pat.color === 'string' ? pat.color : pat.color?.bg || '#6b7280'
  return (
    <div style={{ border:`1px solid ${color}33`, borderRadius:'var(--radius)', overflow:'hidden', background:`${color}0d` }}>
      <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:color+'1a' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:color, display:'inline-block' }} />
          <span style={{ fontWeight:700, color:'var(--tx-1)', fontSize:13 }}>{pat.label}</span>
          <span style={{ fontSize:9, fontFamily:'var(--mono)', padding:'1px 6px', borderRadius:3, background:color+'28', color }}>{pat.matchLevel ?? pat.type}</span>
        </div>
        <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{pat.occurrences.length}× · {pat.windowSize}bar</span>
      </div>
      <div style={{ padding:'10px 14px' }}>
        <div style={{ height:52, background:'var(--surface2)', borderRadius:'var(--radius-sm)', marginBottom:10, position:'relative', overflow:'hidden', border:'1px solid var(--border)' }}>
          {notes.slice(0, 24).map((n, i) => {
            const mn = p2m(n.pitch); if (mn === null) return null
            const y = ((maxM - mn) / range) * 88
            const x = (n.start_subdivision / spb) * 100
            const w = Math.max((n.duration_subdivisions / spb) * 100, 2)
            return <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:`${w}%`, height:'10%', minHeight:3, background:color, borderRadius:1, opacity:0.9 }} />
          })}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:10, fontFamily:'var(--mono)' }}>
          <div style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'6px 8px', border:'1px solid var(--border)' }}>
            <div style={{ color:'var(--tx-3)', marginBottom:2 }}>Bars</div>
            <div style={{ color:'var(--tx-1)', fontSize:11 }}>{pat.occurrences.map(o => o.startBar).join(', ')}</div>
          </div>
          <div style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'6px 8px', border:'1px solid var(--border)' }}>
            <div style={{ color:'var(--tx-3)', marginBottom:2 }}>Variations</div>
            <div style={{ color:'var(--tx-1)' }}>{[...new Set(pat.occurrences.map(o => o.variationType).filter(Boolean))].slice(0,2).join(', ') || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GraphView({ graph }) {
  const { nodes, edges } = graph || { nodes: [], edges: [] }
  if (!nodes.length) return <div style={{ color:'var(--tx-3)', fontSize:12, fontFamily:'var(--mono)' }}>No transitions detected</div>
  const maxW = Math.max(...edges.map(e => e.weight), 1)
  const cx = 260, cy = 180, r = 130
  const pos = {}
  nodes.forEach((nd, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2
    pos[nd.id] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
  return (
    <div>
      <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', marginBottom:12 }}>
        <svg width="100%" viewBox="0 0 520 360">
          <defs><marker id="ar" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4b5563" /></marker></defs>
          {edges.slice(0, 16).map((e, i) => {
            const f = pos[e.from], t = pos[e.to]; if (!f || !t) return null
            const sw = Math.max(1, (e.weight / maxW) * 3.5)
            const dx = t.x - f.x, dy = t.y - f.y
            const mx = (f.x + t.x) / 2 - dy * 0.15, my = (f.y + t.y) / 2 + dx * 0.15
            const nd = nodes.find(n => n.id === e.from)
            const clr = typeof nd?.color === 'string' ? nd.color : nd?.color?.bg || '#4b5563'
            return (
              <g key={i}>
                <path d={`M${f.x},${f.y} Q${mx},${my} ${t.x},${t.y}`} fill="none" stroke={e.weight >= maxW * 0.6 ? clr : '#374151'} strokeWidth={sw} strokeOpacity={0.55} markerEnd="url(#ar)" />
                <text x={mx} y={my - 3} textAnchor="middle" fill="#6b7280" fontSize="8">{e.weight}</text>
              </g>
            )
          })}
          {nodes.map(nd => {
            const p = pos[nd.id]; if (!p) return null
            const nr  = Math.max(18, Math.min(30, 14 + nd.count * 1.2))
            const clr = typeof nd.color === 'string' ? nd.color : nd.color?.bg || '#6b7280'
            return (
              <g key={nd.id}>
                <circle cx={p.x} cy={p.y} r={nr} fill={clr} fillOpacity={0.18} stroke={clr} strokeWidth={1.5} />
                <text x={p.x} y={p.y - 3} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">{nd.id}</text>
                <text x={p.x} y={p.y + 9} textAnchor="middle" fill="#94a3b8" fontSize="8">{nd.count}b</text>
              </g>
            )
          })}
        </svg>
      </div>
      <div style={{ fontSize:11, fontFamily:'var(--mono)', display:'flex', flexDirection:'column', gap:4 }}>
        {edges.slice(0, 6).map((e, i) => {
          const fnd = nodes.find(n => n.id === e.from), tnd = nodes.find(n => n.id === e.to)
          const fc = typeof fnd?.color === 'string' ? fnd.color : fnd?.color?.bg || 'var(--tx-2)'
          const tc = typeof tnd?.color === 'string' ? tnd.color : tnd?.color?.bg || 'var(--tx-2)'
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color: fc, width:80 }}>{e.from}</span>
              <span style={{ color:'var(--tx-3)' }}>→</span>
              <span style={{ color: tc, width:80 }}>{e.to}</span>
              <div style={{ flex:1, height:3, background:'var(--surface3)', borderRadius:2 }}>
                <div style={{ height:'100%', borderRadius:2, background:'var(--accent3)', width:`${(e.weight / maxW) * 100}%` }} />
              </div>
              <span style={{ color:'var(--tx-3)', width:14, textAlign:'right' }}>{e.weight}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HandTable({ alignment }) {
  const [page, setPage] = useState(0)
  const PG    = 20
  const total = Math.ceil((alignment || []).length / PG)
  const slice = (alignment || []).slice(page * PG, (page + 1) * PG)
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'2rem 1fr 1fr', gap:4, marginBottom:6 }}>
        <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Bar</span>
        <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Right hand</span>
        <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Left hand</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {slice.map(aln => {
          const rhC = aln.rh?.color || EMP_CLR, lhC = aln.lh?.color || EMP_CLR
          return (
            <div key={aln.barNumber} style={{ display:'grid', gridTemplateColumns:'2rem 1fr 1fr', gap:4, alignItems:'center' }}>
              <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)', textAlign:'right' }}>{aln.barNumber}</span>
              <div style={{ padding:'3px 8px', borderRadius:4, fontSize:10, fontFamily:'var(--mono)', background:rhC+'22', color:rhC, border:`1px solid ${rhC}33`, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                {aln.rh?.patternLabel || '—'}{aln.rh?.alternating && ' ⟳'}{aln.rh?.isSustain && ' ▬'}{aln.rh?.variationType ? ` (${aln.rh.variationType})` : ''}
              </div>
              <div style={{ padding:'3px 8px', borderRadius:4, fontSize:10, fontFamily:'var(--mono)', background:lhC+'22', color:lhC, border:`1px solid ${lhC}33`, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                {aln.lh?.patternLabel || '—'}{aln.lh?.alternating && ' ⟳'}
              </div>
            </div>
          )
        })}
      </div>
      {total > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:10 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:page===0?'not-allowed':'pointer', opacity:page===0?0.4:1, fontSize:11, fontFamily:'var(--mono)' }}>←</button>
          <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--tx-3)' }}>{page + 1} / {total}</span>
          <button onClick={() => setPage(p => Math.min(total - 1, p + 1))} disabled={page === total - 1} style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:page===total-1?'not-allowed':'pointer', opacity:page===total-1?0.4:1, fontSize:11, fontFamily:'var(--mono)' }}>→</button>
        </div>
      )}
    </div>
  )
}

function YamlPanel({ yaml }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(yaml).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
        <button onClick={copy} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color: copied?'var(--accent)':'var(--tx-2)', cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.15s' }}>
          {copied ? <Check size={11} stroke="var(--accent)" /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy YAML'}
        </button>
      </div>
      <textarea readOnly value={yaml} style={{ width:'100%', minHeight:320, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:12, color:'var(--accent)', fontFamily:'var(--mono)', fontSize:11, resize:'vertical', outline:'none', lineHeight:1.7 }} />
    </div>
  )
}

function BoundariesPanel({ boundaries, windowSizes }) {
  if (!boundaries || boundaries.length === 0)
    return <div style={{ color:'var(--tx-3)', fontSize:12, fontFamily:'var(--mono)' }}>No boundaries detected</div>
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--tx-3)', marginBottom:4 }}>Natural window sizes: [{windowSizes.join(', ')}]</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:8 }}>
        {boundaries.map((b, i) => (
          <div key={i} style={{ padding:'8px 12px', borderRadius:'var(--radius-sm)', border:`1px solid ${BND_CLR}44`, background:BND_CLR+'0d', fontSize:11, fontFamily:'var(--mono)' }}>
            <div style={{ color:BND_CLR, fontWeight:600, marginBottom:4 }}>After bar {b.afterBarNumber} — {b.type}</div>
            <div style={{ color:'var(--tx-3)', fontSize:10 }}>novelty: {b.noveltyScore?.toFixed(3)}</div>
            {b.dims && (
              <div style={{ marginTop:4, display:'flex', gap:4, flexWrap:'wrap' }}>
                {Object.entries(b.dims).map(([dim, val]) => (
                  <span key={dim} style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:'var(--surface3)', color:'var(--tx-2)' }}>{dim}:{val.toFixed(2)}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const INNER_TABS = ['Timeline', 'Patterns', 'Graph', 'Hands', 'Boundaries', 'YAML']

export default function Analyzer() {
  const [input,       setInput]       = useState('')
  const [jsonOk,      setJsonOk]      = useState(true)
  const [result,      setResult]      = useState(null)
  const [running,     setRunning]     = useState(false)
  const [converting,  setConverting]  = useState(false)   // ← NEW: MIDI conversion state
  const [midiName,    setMidiName]    = useState('')       // ← NEW: show filename after convert
  const [error,       setError]       = useState(null)
  const [inner,       setInner]       = useState('Timeline')
  const fileRef = useRef(null)
  const midiRef = useRef(null)                             // ← NEW: separate MIDI input ref

  const handleChange = v => {
    setInput(v)
    setMidiName('')  // clear MIDI label if user edits JSON manually
    try { JSON.parse(v); setJsonOk(true) } catch { setJsonOk(false) }
  }

  // ── Load JSON file (.json / .txt) — unchanged ────────────────────
  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = ev => handleChange(ev.target.result)
    reader.readAsText(f)
    e.target.value = ''
  }

  // ── NEW: Load MIDI file → convert client-side → populate textarea ─
  const handleMidiFile = async e => {
    const f = e.target.files[0]; if (!f) return
    e.target.value = ''
    setConverting(true); setError(null); setResult(null)
    try {
      const buf = await f.arrayBuffer()
      const json = midiConvert(buf)
      const str  = JSON.stringify(json, null, 2)
      setInput(str)
      setJsonOk(true)
      setMidiName(f.name)
      // Auto-run analysis immediately after conversion
      await runAnalyzeWith(json)
    } catch (err) {
      setError(`MIDI conversion failed: ${err.message}`)
    } finally {
      setConverting(false)
    }
  }

  // ── Internal analyze that accepts parsed JSON directly ───────────
  const runAnalyzeWith = async (parsedJson) => {
    setRunning(true); setError(null)
    try {
      const response = await fetch(`${BASE}/api/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ json: parsedJson }),
      })
      if (!response.ok) {
        let msg = `${response.status} ${response.statusText}`
        try { const b = await response.json(); msg = b.error || msg } catch (_) {}
        throw new Error(msg)
      }
      const { success, data, error: apiErr } = await response.json()
      if (!success || apiErr) throw new Error(apiErr || 'Analysis failed')
      setResult(adaptResponse(data))
      setInner('Timeline')
    } catch (e) {
      setError(e.message || 'Analysis failed')
    } finally {
      setRunning(false)
    }
  }

  // ── Analyze from textarea (original flow) ────────────────────────
  const runAnalyze = useCallback(async () => {
    if (!input.trim() || !jsonOk) return
    try { await runAnalyzeWith(JSON.parse(input)) } catch (_) {}
  }, [input, jsonOk])

  const busy = running || converting
  const { meta, res, yaml } = result || {}

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Input section ──────────────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>

        {/* Header row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--tx-2)', letterSpacing:'0.5px', textTransform:'uppercase', fontFamily:'var(--mono)' }}>
            {midiName ? `Converted from: ${midiName}` : 'JSON input'}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* JSON validity badge */}
            <span style={{ fontSize:10, fontFamily:'var(--mono)', padding:'2px 7px', borderRadius:4,
              background: !input.trim() ? 'var(--surface3)' : jsonOk ? 'rgba(184,245,74,0.07)' : 'rgba(245,85,74,0.07)',
              color:      !input.trim() ? 'var(--tx-3)'     : jsonOk ? 'var(--lime)'            : 'var(--rose)',
              border:     `1px solid ${!input.trim() ? 'var(--border)' : jsonOk ? 'rgba(184,245,74,0.2)' : 'rgba(245,85,74,0.2)'}` }}>
              {!input.trim() ? 'empty' : jsonOk ? '✓ valid' : '✗ invalid'}
            </span>

            {/* Load JSON file */}
            <input ref={fileRef} type="file" accept=".json,.txt" style={{ display:'none' }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} disabled={busy}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color: busy ? 'var(--tx-3)' : 'var(--tx-2)', cursor: busy ? 'not-allowed' : 'pointer', fontSize:11, fontWeight:600, opacity: busy ? 0.5 : 1 }}>
              <Upload size={11} /> Load JSON
            </button>

            {/* ── NEW: Upload MIDI file ─────────────────────────────── */}
            <input ref={midiRef} type="file" accept=".mid,.midi" style={{ display:'none' }} onChange={handleMidiFile} />
            <button onClick={() => midiRef.current?.click()} disabled={busy}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background: busy ? 'var(--surface3)' : 'var(--surface2)', color: busy ? 'var(--tx-3)' : 'var(--sky)', cursor: busy ? 'not-allowed' : 'pointer', fontSize:11, fontWeight:600, transition:'all 0.15s',
                ...(busy ? {} : { borderColor:'rgba(74,184,245,0.35)' }) }}>
              {converting
                ? <div style={{ width:11, height:11, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'var(--sky)', animation:'spin 0.65s linear infinite' }} />
                : <Upload size={11} />
              }
              {converting ? 'Converting…' : 'Upload MIDI'}
            </button>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={input}
          onChange={e => handleChange(e.target.value)}
          spellCheck={false}
          disabled={busy}
          placeholder={'Paste MIDI JSON here…\n{"tempo":120,"time_signature":"4/4","key":"C","subdivisions_per_bar":16,"bars":[…]}\n\nOr use "Upload MIDI" to convert a .mid file directly.'}
          style={{ width:'100%', minHeight:160, background:'var(--surface2)', border:`1px solid ${!input.trim()||jsonOk ? 'var(--border)' : 'rgba(245,85,74,0.35)'}`, borderRadius:'var(--radius-sm)', padding:12, color:'var(--text)', fontFamily:'var(--mono)', fontSize:12, resize:'vertical', outline:'none', lineHeight:1.7, transition:'border-color 0.2s', opacity: busy ? 0.6 : 1 }}
        />

        {/* Error */}
        {error && (
          <div style={{ fontSize:12, color:'var(--rose)', background:'rgba(245,85,74,0.07)', border:'1px solid rgba(245,85,74,0.2)', borderRadius:'var(--radius-sm)', padding:'8px 12px', fontFamily:'var(--mono)' }}>
            {error}
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={runAnalyze}
          disabled={busy || !input.trim() || !jsonOk}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 18px', borderRadius:'var(--radius-sm)', background: busy||!input.trim()||!jsonOk ? 'var(--surface3)' : 'var(--accent)', color: busy||!input.trim()||!jsonOk ? 'var(--tx-3)' : '#000', fontSize:12, fontWeight:700, cursor: busy||!input.trim()||!jsonOk ? 'not-allowed' : 'pointer', border:'none', transition:'all 0.15s ease', alignSelf:'flex-start' }}>
          <Activity size={13} />
          {running ? 'Analyzing…' : converting ? 'Converting MIDI…' : 'Analyze'}
        </button>
      </div>

      {/* ── Results — completely unchanged ────────────────────────── */}
      {result && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'10px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:11, fontFamily:'var(--mono)' }}>
            {[
              [`${meta.bars.length} bars`,                      'var(--tx-2)'],
              [`${res.rhPatterns.length} RH patterns`,          'var(--accent)'],
              [`${res.lhPatterns.length} LH patterns`,          'var(--sky)'],
              [`${res.rhSections.length} sections`,             'var(--mint)'],
              [`${res.boundaries.length} boundaries`,           '#f97316'],
              [`windows [${res.windowSizes.join(',')}]`,        'var(--tx-3)'],
              [`${res.surpriseBars.length} unique bars`,        'var(--rose)'],
              [`split ${m2n(res.split)}`,                       'var(--tx-3)'],
            ].map(([label, color]) => (
              <span key={label} style={{ color, padding:'1px 7px', borderRadius:4, background:'var(--surface3)', border:'1px solid var(--border)' }}>{label}</span>
            ))}
          </div>
          <div style={{ display:'flex', gap:2 }}>
            {INNER_TABS.map(t => {
              const on = inner === t
              return (
                <button key={t} onClick={() => setInner(t)} style={{ padding:'4px 12px', borderRadius:'var(--radius-sm)', border: on ? '1px solid var(--border2)' : '1px solid transparent', background: on ? 'var(--surface2)' : 'transparent', color: on ? 'var(--tx-1)' : 'var(--tx-3)', fontSize:11, fontWeight: on ? 600 : 400, cursor:'pointer', transition:'all 0.12s', fontFamily:'var(--mono)' }}>
                  {t}
                </button>
              )
            })}
          </div>
          <div>
            {inner === 'Timeline'   && <div style={{ display:'flex', flexDirection:'column', gap:20 }}><TimelineRow labeled={res.rhLabeled} sections={res.rhSections} title="Right hand" /><TimelineRow labeled={res.lhLabeled} sections={res.lhSections} title="Left hand" /></div>}
            {inner === 'Patterns'   && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {res.rhPatterns.length > 0 && (<><div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase' }}>Right hand — {res.rhPatterns.length} pattern families</div><div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>{res.rhPatterns.map(p => <PatternCard key={p.id} pat={p} meta={meta} spb={meta.subdivisions_per_bar} />)}</div></>)}
                {res.lhPatterns.length > 0 && (<><div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginTop:8 }}>Left hand — {res.lhPatterns.length} pattern families</div><div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>{res.lhPatterns.map(p => <PatternCard key={p.id} pat={p} meta={meta} spb={meta.subdivisions_per_bar} />)}</div></>)}
                {res.rhPatterns.length === 0 && res.lhPatterns.length === 0 && <div style={{ color:'var(--tx-3)', fontSize:12, fontFamily:'var(--mono)' }}>No repeating patterns detected</div>}
              </div>
            )}
            {inner === 'Graph'      && <GraphView graph={res.rhGraph} />}
            {inner === 'Hands'      && <HandTable alignment={res.alignment} />}
            {inner === 'Boundaries' && <BoundariesPanel boundaries={res.boundaries} windowSizes={res.windowSizes} />}
            {inner === 'YAML'       && <YamlPanel yaml={yaml} />}
          </div>
        </div>
      )}
    </div>
  )
}