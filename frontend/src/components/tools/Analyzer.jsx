// frontend/src/components/tools/Analyzer.jsx
// Works with MusicAnalyzerEngine v8.1
import { useState, useRef, useCallback, useEffect } from 'react'
import { Copy, Check } from '../shared/Icons.jsx'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─── CLIENT-SIDE MIDI PARSER ──────────────────────────────────────
const MIDI_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
function midiConvert(buf) {
  const data = new Uint8Array(buf); let offset = 0
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
        if (mt === 0x51 && ml === 3) tempo = Math.round(60000000 / ((td[to] << 16) | (td[to+1] << 8) | td[to+2]))
        else if (mt === 0x58 && ml >= 4) { timeSig.numerator = td[to]; timeSig.denominator = Math.pow(2, td[to+1]) }
        to += ml; rs = 0
      } else if ((sb & 0xF0) === 0x90) { const p = td[to++], v = td[to++]; events.push({ tick:ct, type:v>0?'on':'off', pitch:p, velocity:v }) }
      else if ((sb & 0xF0) === 0x80) { const p = td[to++]; to++; events.push({ tick:ct, type:'off', pitch:p, velocity:0 }) }
      else { if (sb >= 0xF0) break; to += ((sb & 0xF0) === 0xC0 || (sb & 0xF0) === 0xD0) ? 1 : 2 }
    }
    offset += tLen
  }
  events.sort((a, b) => a.tick - b.tick)
  const subs = timeSig.numerator * (16 / timeSig.denominator)
  const tpBar = tpq * timeSig.numerator * (4 / timeSig.denominator)
  const tpSub = tpBar / subs
  const rawNotes = []; const noteOnMap = new Map()
  for (const ev of events) {
    if (ev.type === 'on') {
      if (noteOnMap.has(ev.pitch)) { const prev = noteOnMap.get(ev.pitch); const d = ev.tick - prev.tick; if (d > 0) rawNotes.push({ pitch:ev.pitch, startTick:prev.tick, endTick:ev.tick }) }
      noteOnMap.set(ev.pitch, ev)
    } else if (ev.type === 'off' && noteOnMap.has(ev.pitch)) {
      const on = noteOnMap.get(ev.pitch); const d = on.tick === ev.tick ? 0 : ev.tick - on.tick
      if (d > 0) rawNotes.push({ pitch:ev.pitch, startTick:on.tick, endTick:ev.tick })
      noteOnMap.delete(ev.pitch)
    }
  }
  const maxTick = events.length > 0 ? Math.max(...events.map(e => e.tick)) : 0
  for (const [pitch, on] of noteOnMap.entries()) { const d = maxTick - on.tick; if (d > 0) rawNotes.push({ pitch, startTick:on.tick, endTick:maxTick }) }
  const jsonNotes = []
  for (const note of rawNotes) {
    const pn = MIDI_NOTES[note.pitch % 12] + (Math.floor(note.pitch / 12) - 1)
    const startSubTotal = Math.floor(note.startTick / tpSub)
    const offsetPct = Math.round(((note.startTick - startSubTotal * tpSub) / tpSub) * 100)
    const endSubTotal = Math.floor(note.endTick / tpSub)
    const endPct = Math.round(((note.endTick - endSubTotal * tpSub) / tpSub) * 100)
    const barNumber = Math.floor(startSubTotal / subs) + 1
    const startSubInBar = startSubTotal % subs
    const durSubs = endSubTotal - startSubTotal
    const endCutoff = (endPct > 0 && endPct < 100) ? endPct : null
    const compact = { p:pn, s:startSubInBar, d:durSubs }
    if (offsetPct > 0) compact.o = offsetPct
    if (endCutoff !== null) compact.c = endCutoff
    jsonNotes.push({ bn:barNumber, ...compact })
  }
  const barsMap = new Map()
  for (const note of jsonNotes) {
    if (!barsMap.has(note.bn)) barsMap.set(note.bn, [])
    const { bn, ...fields } = note; barsMap.get(note.bn).push(fields)
  }
  const bars = Array.from(barsMap.entries()).sort(([a],[b]) => a - b).map(([bn, notes]) => ({ bn, notes }))
  const filledBars = []
  if (bars.length > 0) {
    const lastBar = bars[bars.length - 1].bn
    const barLookup = new Map(bars.map(b => [b.bn, b]))
    for (let i = 1; i <= lastBar; i++) filledBars.push(barLookup.get(i) ?? { bn:i, notes:[] })
  }
  return { tempo, time_signature:`${timeSig.numerator}/${timeSig.denominator}`, key:'C', subdivisions_per_bar:subs, bars:filledBars }
}

// ─── PITCH HELPERS ────────────────────────────────────────────────
const NOTE_MAP = { 'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11 }
const MIDI_NOTES_DISP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
function p2m(pitch) {
  const m = String(pitch||'').match(/^([A-G][#Bb]?)(-?\d+)$/i); if (!m) return null
  const pc = NOTE_MAP[m[1].toUpperCase()]; return pc === undefined ? null : (parseInt(m[2]) + 1) * 12 + pc
}
function m2n(midi) { return MIDI_NOTES_DISP[midi % 12] + (Math.floor(midi / 12) - 1) }
function normNote(n) { return { pitch: n.pitch ?? n.p, start_subdivision: n.start_subdivision ?? n.s ?? 0, duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4 } }

// ─── DESIGN TOKENS ────────────────────────────────────────────────
const EMP_CLR = '#374151'
const UNQ_CLR = '#6b7280'
const CNT_CLR = '#4b5563'  // continuation bar colour (slightly lighter)
const BND_CLR = '#f97316'
const SECTION_TYPE_COLORS = {
  Exposition:  '#3b82f6',
  Main:        '#6366f1',
  Development: '#8b5cf6',
  Variation:   '#f59e0b',
  Reprise:     '#10b981',
  Coda:        '#f97316',
  Silence:     '#374151',
}

// ─── RESPONSE ADAPTER ─────────────────────────────────────────────
function colorStr(c) { if (!c) return UNQ_CLR; if (typeof c === 'string') return c; return c.bg || UNQ_CLR }

function adaptResponse(data) {
  const meta = data.metadata

  const normSections = (sections) => (sections || []).map(s => ({
    ...s, id: s.romanLabel, fullLabel: `${s.romanLabel} · ${s.type}`,
    color: colorStr(s.color),
    // cycleStr, motifStr, barRange already present from engine
  }))

  const normLabeled = (labeled) => (labeled || []).map(lb => ({
    ...lb,
    color: colorStr(lb.color),
    isUnique:       !!lb.isUnique,
    isContinuation: !!lb.isContinuation,
    isSurprise:     false,
  }))

  const normMotifs = (motifs) => (motifs || []).filter(m => m.label !== 'X').map(m => ({
    ...m,
    id:        `MOT_${m.label}`,
    type:       m.fp?.rhythmClass ?? '',
    windowSize: m.unitBars ?? 1,
    color:      colorStr(m.color),
    occurrences: (m.barNumbers || []).map(bn => ({ startBar:bn, endBar:bn, barRange:`${bn}`, w:1, variationType:null })),
  }))

  const rhMap = new Map((data.rightHand.labeled || []).map(lb => [lb.barNumber, lb]))
  const lhMap = new Map((data.leftHand.labeled  || []).map(lb => [lb.barNumber, lb]))
  const allBarNums = new Set([...rhMap.keys(), ...lhMap.keys()])
  const alignment = [...allBarNums].sort((a,b) => a - b).map(bn => ({
    barNumber: bn,
    rh: rhMap.has(bn) ? { ...rhMap.get(bn), color: colorStr(rhMap.get(bn).color) } : null,
    lh: lhMap.has(bn) ? { ...lhMap.get(bn), color: colorStr(lhMap.get(bn).color) } : null,
  }))

  return {
    meta,
    res: {
      rhPatterns: normMotifs(data.rightHand.motifs),
      lhPatterns: normMotifs(data.leftHand.motifs),
      rhLabeled:  normLabeled(data.rightHand.labeled),
      lhLabeled:  normLabeled(data.leftHand.labeled),
      rhSections: normSections(data.rightHand.sections),
      lhSections: normSections(data.leftHand.sections),
      alignment,
      split:      data.splitMidi ?? null,
      uniqueBars: (data.rightHand.labeled || []).filter(lb => lb.isUnique).map(lb => lb.barNumber),
      chordCycle: data.leftHand?.chordCycle ?? null,
    },
    yaml: data.yamlBlueprint,
  }
}

// ═══════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function SL({ children }) {
  return (
    <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
      color:'var(--tx-3)', fontFamily:'var(--mono)', marginBottom:10 }}>
      {children}
    </div>
  )
}

// ─── TRACK HEADER ─────────────────────────────────────────────────
function TrackHeader({ meta, res }) {
  const chips = [
    { v: `${meta.bars.length}`, u: 'bars' },
    { v: meta.time_signature,   u: 'time sig' },
    { v: `${meta.tempo}`,       u: 'BPM' },
    { v: meta.key,              u: 'key' },
    ...(res.split != null ? [{ v: m2n(res.split), u: 'split' }] : []),
  ]
  const stats = [
    { v: res.rhPatterns.length, u: 'RH motifs',   c: '#3b82f6' },
    { v: res.lhPatterns.length, u: 'LH motifs',   c: '#8b5cf6' },
    { v: res.rhSections.length, u: 'RH sections', c: '#10b981' },
    ...(res.uniqueBars.length > 0 ? [{ v: res.uniqueBars.length, u: 'unique bars', c: UNQ_CLR }] : []),
  ]
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
      padding:'12px 16px', background:'var(--surface2)',
      border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {chips.map(c => (
          <div key={c.u} style={{ display:'flex', flexDirection:'column', alignItems:'center',
            padding:'5px 12px', background:'var(--surface3)', borderRadius:6,
            border:'1px solid var(--border)' }}>
            <span style={{ fontSize:15, fontWeight:800, color:'var(--tx-1)', fontFamily:'var(--mono)', lineHeight:1 }}>{c.v}</span>
            <span style={{ fontSize:8, color:'var(--tx-3)', fontFamily:'var(--mono)', marginTop:2, letterSpacing:'0.05em' }}>{c.u}</span>
          </div>
        ))}
      </div>
      <div style={{ width:1, height:36, background:'var(--border)', flexShrink:0 }} />
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        {stats.map(s => (
          <div key={s.u} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:16, fontWeight:800, color:s.c, fontFamily:'var(--mono)', lineHeight:1 }}>{s.v}</span>
            <span style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{s.u}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SECTION FORM MAP ─────────────────────────────────────────────
// Shows each section as a proportional band.
// If the engine detected an inner repeating cycle (cycleStr), it's shown as a badge.
function SectionFormMap({ sections, totalBars, label }) {
  if (!sections || !sections.length) return null
  return (
    <div>
      <SL>{label}</SL>
      <div style={{ display:'flex', gap:2, width:'100%', minHeight:60 }}>
        {sections.map(sec => {
          const len = sec.endBar - sec.startBar + 1
          const pct = (len / totalBars) * 100
          const mc  = colorStr(sec.color)
          const tc  = SECTION_TYPE_COLORS[sec.type] || '#6b7280'
          return (
            <div key={sec.id} title={sec.cycleStr ? `Cycle: ${sec.cycleStr}` : undefined}
              style={{ flex:`0 0 calc(${pct}% - 2px)`, minWidth:0, minHeight:60,
                background:`${mc}12`, borderTop:`3px solid ${mc}`,
                border:`1px solid ${mc}28`, borderTopWidth:3,
                borderRadius:'0 0 5px 5px', padding:'7px 8px',
                overflow:'hidden', cursor:'default' }}>
              {/* Section ID + type */}
              <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, fontWeight:800, color:mc, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>{sec.id}</span>
                <span style={{ fontSize:8, padding:'1px 5px', borderRadius:3,
                  background:`${tc}22`, color:tc, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                  {sec.type}
                </span>
              </div>
              {/* Motifs */}
              <div style={{ fontSize:9, color:mc, fontFamily:'var(--mono)',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:2 }}>
                {sec.motifStr}
              </div>
              {/* Cycle badge (key new field) */}
              {sec.cycleStr && (
                <div style={{ fontSize:8, color:'var(--tx-3)', fontFamily:'var(--mono)',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  padding:'1px 4px', background:'var(--surface3)', borderRadius:3,
                  border:'1px solid var(--border)', display:'inline-block', marginTop:1 }}>
                  {sec.cycleStr}
                </div>
              )}
              {/* Bar range */}
              <div style={{ fontSize:8, color:'var(--tx-3)', fontFamily:'var(--mono)', marginTop:2 }}>
                {sec.startBar}–{sec.endBar}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── MOTIF LEGEND ─────────────────────────────────────────────────
function MotifLegend({ rhPatterns, lhPatterns, uniqueBars }) {
  const all = []
  rhPatterns.forEach(p => all.push({ ...p, hand: 'RH' }))
  lhPatterns.forEach(p => {
    if (!all.find(x => x.label === p.label && x.hand === 'RH')) all.push({ ...p, hand: 'LH' })
  })
  if (!all.length && !uniqueBars.length) return null
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:5, padding:'8px 12px',
      background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
      {all.map(p => (
        <div key={`${p.hand}-${p.label}`} style={{ display:'flex', alignItems:'center', gap:5,
          padding:'2px 8px', borderRadius:4,
          background:`${p.color}18`, border:`1px solid ${p.color}40` }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:p.color, flexShrink:0 }} />
          <span style={{ fontSize:10, fontWeight:700, color:p.color, fontFamily:'var(--mono)' }}>{p.label}</span>
          <span style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>
            {p.hand} · {p.count}×
            {p.windowSize > 1 && <span style={{ color:p.color, marginLeft:3 }}>{p.windowSize}-bar</span>}
          </span>
        </div>
      ))}
      {uniqueBars.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:5,
          padding:'2px 8px', borderRadius:4, background:`${UNQ_CLR}18`, border:`1px solid ${UNQ_CLR}40` }}>
          <div style={{ width:8, height:8, borderRadius:2, background:UNQ_CLR, flexShrink:0 }} />
          <span style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Unique · {uniqueBars.length}×</span>
        </div>
      )}
      {/* Legend items */}
      <div style={{ display:'flex', gap:8, marginLeft:'auto', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <div style={{ width:10, height:4, background:CNT_CLR, borderRadius:1, opacity:0.6 }} />
          <span style={{ fontSize:8, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>sustain</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <div style={{ width:2, height:10, background:BND_CLR, borderRadius:1 }} />
          <span style={{ fontSize:8, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>section end</span>
        </div>
      </div>
    </div>
  )
}

// ─── DUAL TIMELINE ────────────────────────────────────────────────
// RH + LH rows stacked per row of 16 bars.
// Continuation bars (sustained-note fill) appear at 40% opacity with a hatched overlay.
function DualTimeline({ rhLabeled, lhLabeled }) {
  const [hovBar, setHovBar] = useState(null)
  const timerRef = useRef(null)
  const onEnter  = useCallback((lb) => { clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setHovBar(lb), 30) }, [])
  const onLeave  = useCallback(() => { clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setHovBar(null), 80) }, [])
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const baseLabeled = rhLabeled.length ? rhLabeled : lhLabeled
  if (!baseLabeled.length) return null

  const ROW = 16
  const len   = Math.max(rhLabeled.length, lhLabeled.length)
  const rhPad = [...rhLabeled, ...Array(Math.max(0, len - rhLabeled.length)).fill(null)]
  const lhPad = [...lhLabeled, ...Array(Math.max(0, len - lhLabeled.length)).fill(null)]
  const rhRows = [], lhRows = []
  for (let i = 0; i < len; i += ROW) { rhRows.push(rhPad.slice(i, i+ROW)); lhRows.push(lhPad.slice(i, i+ROW)) }

  const hasRh = rhLabeled.length > 0
  const hasLh = lhLabeled.length > 0

  function cellBg(lb) {
    if (!lb) return 'transparent'
    if (lb.isContinuation) return CNT_CLR    // sustained
    if (lb.isEmpty)        return EMP_CLR
    if (lb.isBoundaryEnd)  return BND_CLR
    if (lb.isUnique)       return UNQ_CLR
    return lb.color || UNQ_CLR
  }

  function cellOpacity(lb) {
    if (!lb) return 0
    if (lb.isContinuation) return 0.35
    if (lb.isEmpty)        return 0.12
    if (lb.isUnique)       return 0.55
    return 1
  }

  function cellStyle(lb, hand, isHov) {
    return {
      flex: 1, height: 20,
      borderRadius: hand === 'rh' ? '3px 3px 0 0' : '0 0 3px 3px',
      background:   cellBg(lb),
      opacity:      cellOpacity(lb),
      boxShadow:    isHov ? 'inset 0 0 0 2px rgba(255,255,255,0.80)' : 'none',
      position:     'relative', cursor: lb ? 'default' : 'default',
      transition:   'box-shadow 0.05s ease',
    }
  }

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:8 }}>
        {hasRh && <span style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)', padding:'1px 6px', border:'1px solid var(--border)', borderRadius:3 }}>RH ↑</span>}
        {hasLh && <span style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)', padding:'1px 6px', border:'1px solid var(--border)', borderRadius:3 }}>LH ↓</span>}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {rhRows.map((rhRow, ri) => {
          const lhRow = lhRows[ri] || []
          const firstBar = (rhRow[0] || lhRow[0])?.barNumber ?? (ri * ROW + 1)
          return (
            <div key={ri} style={{ display:'flex', alignItems:'stretch', gap:3 }}>
              <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--tx-3)',
                width:24, textAlign:'right', flexShrink:0, paddingTop:4, lineHeight:1 }}>
                {firstBar}
              </span>
              <div style={{ flex:1 }}>
                {hasRh && (
                  <div style={{ display:'flex', gap:1, marginBottom:1 }}>
                    {rhRow.map((lb, ci) => {
                      const bn   = lb?.barNumber ?? (ri * ROW + ci + 1)
                      const isHov = hovBar?.barNumber === bn
                      return (
                        <div key={bn}
                          onMouseEnter={() => lb && onEnter(lb)}
                          onMouseLeave={onLeave}
                          style={cellStyle(lb, 'rh', isHov)}>
                          {lb?.isBoundaryEnd && (
                            <div style={{ position:'absolute', right:0, top:0, bottom:0, width:2,
                              background:'rgba(255,255,255,0.85)', borderRadius:1 }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {hasLh && (
                  <div style={{ display:'flex', gap:1 }}>
                    {rhRow.map((_, ci) => {
                      const lhBar = lhRow[ci]
                      const bn    = lhBar?.barNumber ?? (ri * ROW + ci + 1)
                      const isHov = hovBar?.barNumber === bn
                      return (
                        <div key={bn}
                          onMouseEnter={() => lhBar && onEnter(lhBar)}
                          onMouseLeave={onLeave}
                          style={cellStyle(lhBar, 'lh', isHov)} />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Hover tooltip */}
      <div style={{ marginTop:10, minHeight:44,
        opacity: hovBar ? 1 : 0, transition:'opacity 0.1s ease', pointerEvents:'none' }}>
        {hovBar && (() => {
          const mc = hovBar.isBoundaryEnd ? BND_CLR
            : hovBar.isUnique     ? UNQ_CLR
            : hovBar.isContinuation ? CNT_CLR
            : hovBar.isEmpty      ? 'var(--tx-3)'
            : hovBar.color
          const tc = hovBar.sectionType ? (SECTION_TYPE_COLORS[hovBar.sectionType] || '#6b7280') : null
          return (
            <div style={{ padding:'10px 14px', background:'var(--surface2)',
              border:`1px solid ${mc}40`, borderRadius:'var(--radius-sm)',
              display:'flex', flexWrap:'wrap', alignItems:'center', gap:10 }}>
              <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:13, color:'var(--tx-1)' }}>
                Bar {hovBar.barNumber}
              </span>
              <span style={{ color:mc, fontWeight:600, fontSize:11, fontFamily:'var(--mono)' }}>
                {hovBar.isContinuation ? 'Sustain (continuation)' : hovBar.patternLabel}
              </span>
              <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>
                {hovBar.noteCount} notes
              </span>
              {hovBar.rhythmClass && !hovBar.isContinuation && (
                <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4,
                  background:'var(--surface3)', color:'var(--tx-2)', fontFamily:'var(--mono)',
                  border:'1px solid var(--border)' }}>
                  {hovBar.rhythmClass}
                </span>
              )}
              {hovBar.sectionLabel && tc && (
                <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4,
                  background:`${tc}18`, color:tc, fontFamily:'var(--mono)',
                  border:`1px solid ${tc}40` }}>
                  §{hovBar.sectionLabel} · {hovBar.sectionType}
                </span>
              )}
              {hovBar.isUnique      && <span style={{ fontSize:9, color:UNQ_CLR, fontFamily:'var(--mono)' }}>unique bar</span>}
              {hovBar.isBoundaryEnd && <span style={{ fontSize:9, color:BND_CLR, fontFamily:'var(--mono)' }}>section boundary</span>}
              {hovBar.description && !hovBar.isContinuation && (
                <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)',
                  borderLeft:'1px solid var(--border)', paddingLeft:10 }}>
                  {hovBar.description}
                </span>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ─── MOTIF CARD ───────────────────────────────────────────────────
// Shows the piano-roll of the first occurrence, description, bar ranges.
// New: shows "2-bar unit" badge when windowSize > 1.
function MotifCard({ pat, meta, spb }) {
  const firstBarN = pat.occurrences[0]?.startBar
  const bar = meta.bars.find(b => (b.bar_number ?? b.bn) === firstBarN)
  const notes = bar ? [...(bar.notes||[])].map(normNote).sort((a,b) => a.start_subdivision - b.start_subdivision) : []
  const allMidis = notes.map(n => p2m(n.pitch)).filter(x => x !== null)
  const minM = allMidis.length ? Math.min(...allMidis) : 60
  const maxM = allMidis.length ? Math.max(...allMidis) : 72
  const range = Math.max(maxM - minM, 8)
  const c = colorStr(pat.color)
  const isMultiBar = (pat.windowSize ?? 1) > 1

  return (
    <div style={{ border:`1px solid ${c}30`, borderRadius:'var(--radius)',
      overflow:'hidden', background:`${c}08`, display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ padding:'10px 14px', background:`${c}16`,
        display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:c,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:14, fontWeight:900, color:'#fff', fontFamily:'var(--mono)', flexShrink:0 }}>
            {pat.label}
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--tx-1)' }}>Motif {pat.label}</span>
              {isMultiBar && (
                <span style={{ fontSize:8, padding:'1px 5px', borderRadius:3,
                  background:`${c}28`, color:c, fontFamily:'var(--mono)',
                  border:`1px solid ${c}50`, fontWeight:700 }}>
                  {pat.windowSize}-BAR UNIT
                </span>
              )}
            </div>
            <div style={{ fontSize:9, color:c, fontFamily:'var(--mono)', opacity:0.85, marginTop:1 }}>
              {pat.type || 'rhythm'}
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:20, fontWeight:900, color:c, fontFamily:'var(--mono)', lineHeight:1 }}>{pat.count}</div>
          <div style={{ fontSize:8, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'0.05em' }}>BARS</div>
        </div>
      </div>

      {/* Piano-roll preview of the first bar */}
      <div style={{ margin:'12px 14px 0', height:44, background:'var(--surface2)', borderRadius:4,
        position:'relative', overflow:'hidden', border:`1px solid ${c}20` }}>
        {[0,25,50,75].map(y => (
          <div key={y} style={{ position:'absolute', left:0, right:0, top:`${y}%`, height:1, background:'var(--border)', opacity:0.4 }} />
        ))}
        {notes.slice(0, 32).map((n, i) => {
          const mn = p2m(n.pitch); if (mn === null) return null
          const y  = ((maxM - mn) / range) * 88
          const x  = (n.start_subdivision / spb) * 100
          const w  = Math.max((n.duration_subdivisions / spb) * 100, 2.5)
          return (
            <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`,
              width:`${w}%`, height:'11%', minHeight:3,
              background:c, borderRadius:1, opacity:0.9 }} />
          )
        })}
        {!notes.length && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>
            no preview
          </div>
        )}
        <div style={{ position:'absolute', bottom:2, right:4, fontSize:7, color:`${c}99`, fontFamily:'var(--mono)' }}>
          bar {firstBarN}
        </div>
      </div>

      {/* Description and bar list */}
      <div style={{ padding:'10px 14px', flex:1, display:'flex', flexDirection:'column', gap:6 }}>
        {pat.description && (
          <div style={{ fontSize:10, color:'var(--tx-2)', fontFamily:'var(--mono)',
            lineHeight:1.6, borderLeft:`2px solid ${c}50`, paddingLeft:8 }}>
            {pat.description}
          </div>
        )}
        <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--tx-3)',
          padding:'5px 8px', background:'var(--surface2)', borderRadius:4,
          border:'1px solid var(--border)', lineHeight:1.7 }}>
          <span style={{ color:'var(--tx-3)' }}>bars </span>
          <span style={{ color:'var(--tx-1)' }}>{pat.barRanges || pat.occurrences.map(o => o.startBar).join(', ')}</span>
        </div>
      </div>
    </div>
  )
}

// ─── CHORD CYCLE PANEL ────────────────────────────────────────────
function ChordCyclePanel({ chordCycle }) {
  if (!chordCycle) return null
  const { cycle, periodBars, repeatCount } = chordCycle
  const amber = '#fbbf24'
  return (
    <div style={{ padding:'14px 16px', background:`${amber}08`,
      border:`1px solid ${amber}30`, borderRadius:'var(--radius)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <SL>Chord Cycle — Left Hand</SL>
        <span style={{ fontSize:10, color:amber, fontFamily:'var(--mono)',
          padding:'2px 8px', borderRadius:4, background:`${amber}18`, border:`1px solid ${amber}40` }}>
          {periodBars}-bar × {repeatCount} reps
        </span>
      </div>
      <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
        {cycle.map((chord, i) => (
          <span key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ padding:'5px 12px', borderRadius:6, fontWeight:700, fontSize:12,
              color:amber, fontFamily:'var(--mono)', background:`${amber}14`, border:`1px solid ${amber}30` }}>
              {chord}
            </span>
            {i < cycle.length - 1 && <span style={{ color:'var(--tx-3)', fontSize:11 }}>→</span>}
          </span>
        ))}
        <span style={{ color:'var(--tx-3)', fontSize:11 }}>→ …</span>
      </div>
    </div>
  )
}

// ─── HAND ALIGNMENT TABLE (collapsible) ───────────────────────────
function AlignmentTable({ alignment }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const PG    = 24
  const total = Math.ceil((alignment || []).length / PG)
  const slice = (alignment || []).slice(page * PG, (page + 1) * PG)
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 14px', background:'var(--surface2)', border:'none', cursor:'pointer',
        color:'var(--tx-2)', fontFamily:'var(--mono)', fontSize:11, fontWeight:600 }}>
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--tx-3)' }}>
            Hand Alignment
          </span>
          <span style={{ fontSize:9, color:'var(--tx-3)' }}>({(alignment||[]).length} bars)</span>
        </span>
        <span style={{ fontSize:10, color:'var(--tx-3)', transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'10px 14px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2rem 1fr 1fr', gap:4, marginBottom:6 }}>
            {['Bar','Right hand','Left hand'].map(h => (
              <span key={h} style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)', fontWeight:700, letterSpacing:'0.05em' }}>{h}</span>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {slice.map(aln => {
              const rhC = colorStr(aln.rh?.color) || EMP_CLR
              const lhC = colorStr(aln.lh?.color) || EMP_CLR
              return (
                <div key={aln.barNumber} style={{ display:'grid', gridTemplateColumns:'2rem 1fr 1fr', gap:4, alignItems:'center' }}>
                  <span style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)', textAlign:'right' }}>{aln.barNumber}</span>
                  <div style={{ padding:'2px 7px', borderRadius:3, fontSize:10, fontFamily:'var(--mono)',
                    background:`${rhC}18`, color:rhC, border:`1px solid ${rhC}30`,
                    overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                    {aln.rh ? (aln.rh.isContinuation ? `~${aln.rh.patternLabel}` : aln.rh.patternLabel) : '—'}
                    {aln.rh?.sectionType ? ` · ${aln.rh.sectionType}` : ''}
                  </div>
                  <div style={{ padding:'2px 7px', borderRadius:3, fontSize:10, fontFamily:'var(--mono)',
                    background:`${lhC}18`, color:lhC, border:`1px solid ${lhC}30`,
                    overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                    {aln.lh ? (aln.lh.isContinuation ? `~${aln.lh.patternLabel}` : aln.lh.patternLabel) : '—'}
                    {aln.lh?.sectionType ? ` · ${aln.lh.sectionType}` : ''}
                  </div>
                </div>
              )
            })}
          </div>
          {total > 1 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:10 }}>
              <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page===0}
                style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)',
                  background:'none', color:'var(--tx-2)', cursor:page===0?'not-allowed':'pointer',
                  opacity:page===0?0.4:1, fontSize:10, fontFamily:'var(--mono)' }}>←</button>
              <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--tx-3)' }}>{page+1}/{total}</span>
              <button onClick={() => setPage(p => Math.min(total-1, p+1))} disabled={page===total-1}
                style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)',
                  background:'none', color:'var(--tx-2)', cursor:page===total-1?'not-allowed':'pointer',
                  opacity:page===total-1?0.4:1, fontSize:10, fontFamily:'var(--mono)' }}>→</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── YAML PANEL (collapsible) ────────────────────────────────────
function YamlPanel({ yaml }) {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(yaml).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 14px', background:'var(--surface2)', border:'none', cursor:'pointer',
        color:'var(--tx-2)', fontFamily:'var(--mono)', fontSize:11, fontWeight:600 }}>
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--tx-3)' }}>
          YAML Blueprint
        </span>
        <span style={{ fontSize:10, color:'var(--tx-3)', transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'10px 14px' }}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
            <button onClick={copy} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px',
              borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none',
              color: copied ? 'var(--accent)' : 'var(--tx-2)', cursor:'pointer', fontSize:10,
              fontWeight:600, transition:'color 0.15s' }}>
              {copied ? <Check size={10} stroke="var(--accent)" /> : <Copy size={10} />}
              {copied ? 'Copied!' : 'Copy YAML'}
            </button>
          </div>
          <textarea readOnly value={yaml}
            style={{ width:'100%', minHeight:300, background:'var(--surface2)',
              border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:12,
              color:'var(--accent)', fontFamily:'var(--mono)', fontSize:10, resize:'vertical',
              outline:'none', lineHeight:1.75 }} />
        </div>
      )}
    </div>
  )
}

// ─── FILE DROP ZONE ───────────────────────────────────────────────
function FileDropZone({ label, sublabel, onFile, accept, busy }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const handleDrop = e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }
  const handleInput = e => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = '' }
  return (
    <div onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragEnter={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !busy && inputRef.current?.click()}
      style={{ border:`2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius:'var(--radius)', padding:'1.25rem 1rem', textAlign:'center',
        cursor: busy ? 'not-allowed' : 'pointer',
        background: dragging ? 'rgba(99,102,241,0.05)' : 'var(--surface2)',
        transition:'border-color 0.15s, background 0.15s', userSelect:'none' }}>
      <input ref={inputRef} type="file" accept={accept} style={{ display:'none' }} onChange={handleInput} />
      <div style={{ fontSize:20, marginBottom:6, opacity: busy ? 0.4 : 1 }}>♩</div>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--tx-1)', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{sublabel || 'drop or click · .mid .midi .json'}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function Analyzer() {
  const [rhFile, setRhFile] = useState(null)
  const [lhFile, setLhFile] = useState(null)
  const [result, setResult] = useState(null)
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState(null)

  const clear = () => { setRhFile(null); setLhFile(null); setResult(null); setError(null) }

  const parseFile = async (file) => {
    if (/\.(mid|midi)$/i.test(file.name)) { const buf = await file.arrayBuffer(); return midiConvert(buf) }
    return JSON.parse(await file.text())
  }

  const runAnalysis = async () => {
    if (!rhFile) { setError('Please select a right-hand (or full track) file.'); return }
    setBusy(true); setError(null)
    try {
      const innerPayload = lhFile ? { rh: rhFile.json, lh: lhFile.json } : { full: rhFile.json }
      const response = await fetch(`${BASE}/api/analyze`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ json: innerPayload }),
      })
      if (!response.ok) {
        let msg = `${response.status} ${response.statusText}`
        try { const b = await response.json(); msg = b.error || msg } catch (_) {}
        throw new Error(msg)
      }
      const { success, data, error: apiErr } = await response.json()
      if (!success || apiErr) throw new Error(apiErr || 'Analysis failed')
      setResult(adaptResponse(data))
    } catch (err) {
      setError(err.message || 'Analysis failed')
    } finally {
      setBusy(false)
    }
  }

  const handleRhFile = async (file) => {
    try { setRhFile({ name: file.name, json: await parseFile(file) }); setResult(null); setError(null) }
    catch (err) { setError(`Failed to parse file: ${err.message}`) }
  }
  const handleLhFile = async (file) => {
    try { setLhFile({ name: file.name, json: await parseFile(file) }); setResult(null); setError(null) }
    catch (err) { setError(`Failed to parse file: ${err.message}`) }
  }

  const { meta, res, yaml } = result || {}
  const totalBars = meta?.bars?.length || 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Upload ── */}
      {!result ? (
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <FileDropZone label={lhFile ? 'Right Hand' : 'Right Hand / Full Track'}
              sublabel="drop or click · .mid .midi .json"
              onFile={handleRhFile} accept=".mid,.midi,.json" busy={busy} />
            {rhFile && <div style={{ fontSize:10, marginTop:5, color:'var(--accent)', fontFamily:'var(--mono)' }}>✓ {rhFile.name}</div>}
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <FileDropZone label="Left Hand (optional)"
              sublabel="omit to auto-split full track"
              onFile={handleLhFile} accept=".mid,.midi,.json" busy={busy} />
            {lhFile && <div style={{ fontSize:10, marginTop:5, color:'var(--accent)', fontFamily:'var(--mono)' }}>✓ {lhFile.name}</div>}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
          background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
          fontSize:10, fontFamily:'var(--mono)', color:'var(--tx-3)' }}>
          <span style={{ color:'var(--accent)' }}>✓</span>
          <span>{rhFile?.name}</span>
          {lhFile && <><span style={{ color:'var(--border)' }}>·</span><span>{lhFile?.name}</span></>}
          <button onClick={clear} style={{ marginLeft:'auto', padding:'2px 8px', background:'none',
            border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
            color:'var(--tx-3)', fontSize:10, cursor:'pointer' }}>
            New file
          </button>
        </div>
      )}

      {/* Analyze button */}
      {rhFile && !result && (
        <button onClick={runAnalysis} disabled={busy} style={{
          padding:'9px 28px', borderRadius:'var(--radius-sm)', background:'var(--accent)',
          color:'#fff', border:'none', fontWeight:700,
          cursor: busy ? 'not-allowed' : 'pointer', fontSize:13,
          opacity: busy ? 0.6 : 1, transition:'opacity 0.2s', alignSelf:'center' }}>
          {busy ? 'Analyzing…' : 'Analyze'}
        </button>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize:11, color:'var(--rose)', background:'rgba(248,113,113,0.07)',
          border:'1px solid rgba(248,113,113,0.2)', borderRadius:'var(--radius-sm)',
          padding:'8px 12px', fontFamily:'var(--mono)' }}>
          {error}
        </div>
      )}

      {/* ══ RESULTS — single page, no inner tabs ══ */}
      {result && (
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

          {/* 1 · Track metadata */}
          <TrackHeader meta={meta} res={res} />

          {/* 2 · Musical Form — section bands */}
          {(res.rhSections.length > 0 || res.lhSections.length > 0) && (
            <div style={{ padding:'14px 16px', background:'var(--surface2)',
              border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
              {res.rhSections.length > 0 && (
                <SectionFormMap sections={res.rhSections} totalBars={totalBars} label="Musical Form — Right Hand" />
              )}
              {res.lhSections.length > 0 && (
                <div style={{ marginTop: res.rhSections.length > 0 ? 14 : 0 }}>
                  <SectionFormMap sections={res.lhSections} totalBars={totalBars} label="Musical Form — Left Hand" />
                </div>
              )}
            </div>
          )}

          {/* 3 · Timeline */}
          <div style={{ padding:'14px 16px', background:'var(--surface2)',
            border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
            <SL>Timeline — hover any bar for details</SL>
            <MotifLegend rhPatterns={res.rhPatterns} lhPatterns={res.lhPatterns} uniqueBars={res.uniqueBars} />
            <div style={{ marginTop:12 }}>
              <DualTimeline rhLabeled={res.rhLabeled} lhLabeled={res.lhLabeled} />
            </div>
          </div>

          {/* 4 · Motif Analysis */}
          {(res.rhPatterns.length > 0 || res.lhPatterns.length > 0) && (
            <div style={{ padding:'14px 16px', background:'var(--surface2)',
              border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
              <SL>Motif Analysis</SL>
              {res.rhPatterns.length > 0 && (
                <>
                  <div style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)',
                    marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ color:'#3b82f6' }}>●</span>
                    Right Hand — {res.rhPatterns.length} motif{res.rhPatterns.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10, marginBottom:14 }}>
                    {res.rhPatterns.map(p => <MotifCard key={p.id} pat={p} meta={meta} spb={meta.subdivisions_per_bar} />)}
                  </div>
                </>
              )}
              {res.lhPatterns.length > 0 && (
                <>
                  <div style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)',
                    marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ color:'#8b5cf6' }}>●</span>
                    Left Hand — {res.lhPatterns.length} motif{res.lhPatterns.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
                    {res.lhPatterns.map(p => <MotifCard key={p.id} pat={p} meta={meta} spb={meta.subdivisions_per_bar} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 5 · Chord Cycle */}
          {res.chordCycle && <ChordCyclePanel chordCycle={res.chordCycle} />}

          {/* 6 · Hand Alignment (collapsible) */}
          {res.alignment.length > 0 && <AlignmentTable alignment={res.alignment} />}

          {/* 7 · YAML Blueprint (collapsible) */}
          {yaml && <YamlPanel yaml={yaml} />}

        </div>
      )}
    </div>
  )
}