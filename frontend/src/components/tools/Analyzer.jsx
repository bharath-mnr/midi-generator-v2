// frontend/src/components/tools/Analyzer.jsx
// Music pattern analyzer — fits inside Tools.jsx tab panel.
// Design: matches existing tool design system exactly.
//   CSS vars: --surface, --surface2, --surface3, --border, --border2,
//             --text, --text2, --text3, --accent, --accent2, --accent3,
//             --mono, --font, --radius, --radius-sm, --danger, --lime,
//             --sky, --rose, --mint
// No Tailwind — pure inline styles only.

import { useState, useRef, useCallback } from 'react'
import { Upload, Copy, Check, Activity } from '../shared/Icons.jsx'

// ─── PITCH HELPERS ───────────────────────────────────────────────
const NOTE_MAP = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,
  'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11
}
const MIDI_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function p2m(pitch) {
  const m = String(pitch || '').match(/^([A-G][#Bb]?)(-?\d+)$/i)
  if (!m) return null
  const pc = NOTE_MAP[m[1].toUpperCase()]
  return pc === undefined ? null : (parseInt(m[2]) + 1) * 12 + pc
}

function m2n(midi) {
  return MIDI_NOTES[midi % 12] + (Math.floor(midi / 12) - 1)
}

// ─── COMPACT NORMALISER ──────────────────────────────────────────
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
    bars: (j.bars || []).map(normBar)
  }
}

// ─── PATTERN COLORS (accent-safe, uses CSS var names as fallback) ─
const PAT_COLORS = [
  '#06b6d4','#8b5cf6','#f59e0b','#10b981',
  '#f43f5e','#3b82f6','#a855f7','#ec4899',
]
const SUR_CLR = '#ef4444'
const EMP_CLR = '#374151'

// ─── HAND SPLIT ──────────────────────────────────────────────────
function detectSplit(bars) {
  const ps = new Set()
  for (const b of bars) for (const n of b.notes) { const m = p2m(n.pitch); if (m !== null) ps.add(m) }
  if (ps.size < 2) return 60
  const sorted = [...ps].sort((a, b) => a - b)
  let bestW = -1, split = 60
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1]
    const mid = (sorted[i] + sorted[i - 1]) / 2
    const w   = gap * (mid >= 48 && mid <= 72 ? 3.0 : 0.7)
    if (w > bestW) { bestW = w; split = Math.round(mid) }
  }
  return split
}

// ─── FINGERPRINTS ────────────────────────────────────────────────
function ord(bar) { return [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision) }
function fpR(bar) { return ord(bar).map(n => `${n.start_subdivision}:${n.duration_subdivisions}`).join('|') || 'empty' }
function fpC(bar) {
  const s = ord(bar)
  if (!s.length) return 'empty'
  if (s.length < 2) return `1:${s[0].duration_subdivisions}`
  const iv = []
  for (let i = 1; i < s.length; i++) { const a = p2m(s[i-1].pitch), b = p2m(s[i].pitch); iv.push(a!==null&&b!==null ? b-a : '?') }
  return iv.join(',')
}
function fpE(bar) { return ord(bar).map(n => `${n.pitch}@${n.start_subdivision}:${n.duration_subdivisions}`).join('|') || 'empty' }
function fpT(bar) {
  const nn = bar.notes
  if (!nn.length) return 'empty'
  const dc = {}; for (const x of nn) dc[x.duration_subdivisions] = (dc[x.duration_subdivisions]||0)+1
  const dd = Object.entries(dc).sort((a,b)=>b[1]-a[1])[0][0]
  return `n${nn.length}_d${dd}_max${Math.max(...nn.map(x=>x.duration_subdivisions))}`
}

// ─── ALTERNATING DETECTOR ────────────────────────────────────────
function detAlt(bar) {
  const s = ord(bar); if (s.length < 4) return null
  const same = s.every(n => n.duration_subdivisions === s[0].duration_subdivisions)
  const ev = s.filter((_,i) => i%2===0), od = s.filter((_,i) => i%2===1)
  const ep = new Set(ev.map(n=>n.pitch)), op = new Set(od.map(n=>n.pitch))
  if (op.size===1 && ep.size>1 && same) return { pedal: [...op][0], melody: ev.map(n=>n.pitch), notesPerBar: s.length, dur: s[0].duration_subdivisions }
  if (ep.size===1 && op.size>1 && same) return { pedal: [...ep][0], melody: od.map(n=>n.pitch), notesPerBar: s.length, dur: s[0].duration_subdivisions }
  return null
}

// ─── PATTERN DETECTION ──────────────────────────────────────────
function detectPatterns(bars, spb) {
  if (!bars.length) return []
  const maps = { e: new Map(), r: new Map(), c: new Map(), t: new Map(), w: new Map() }
  const hp = (m, k, e) => { if (!m.has(k)) m.set(k,[]); m.get(k).push(e) }

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i], e = { barIdx: i, startBar: b.bar_number, w: 1 }
    hp(maps.e, fpE(b), e); hp(maps.r, fpR(b), e); hp(maps.c, fpC(b), e); hp(maps.t, fpT(b), e)
  }
  for (const w of [2,4,8].filter(w => w <= bars.length)) {
    for (let i = 0; i <= bars.length - w; i++) {
      const sl = bars.slice(i, i+w)
      const rk = sl.map((b,j) => `[${j}:${fpR(b)}]`).join('')
      const ck = sl.map((b,j) => `[${j}:${fpC(b)}]`).join('')
      const e  = { barIdx: i, startBar: bars[i].bar_number, w }
      hp(maps.w, `R${w}:${rk}`, e); hp(maps.w, `C${w}:${rk}~~${ck}`, e)
    }
  }

  const cands = []
  const addC = (m, type, q) => { for (const [fp, oc] of m) { if (oc.length < 2) continue; cands.push({ fingerprint: fp, type, windowSize: oc[0].w, occurrences: oc, score: oc.length*oc[0].w*q }) } }
  addC(maps.e,'exact',3.0); addC(maps.r,'rhythmic',2.0); addC(maps.c,'melodic',1.8); addC(maps.t,'textural',1.0); addC(maps.w,'window',2.5)
  cands.sort((a,b) => b.score - a.score)

  const covered = new Set(), finals = []
  for (const c of cands) {
    const nw = []; for (const o of c.occurrences) for (let j=0; j<c.windowSize; j++) { const bn=o.startBar+j; if (!covered.has(bn)) nw.push(bn) }
    if (nw.length >= 2 || finals.length < 2) { finals.push(c); for (const bn of nw) covered.add(bn) }
    if (finals.length >= 8) break
  }
  finals.forEach((p,i) => { p.id=`P${String.fromCharCode(65+i)}`; p.label=`Pattern ${String.fromCharCode(65+i)}`; p.color=PAT_COLORS[i]||'#6b7280' })
  return finals
}

// ─── BAR LABELER ────────────────────────────────────────────────
function labelBars(bars, patterns, spb) {
  const lookup = new Map()
  for (const pat of patterns) for (const occ of pat.occurrences) for (let j=0; j<pat.windowSize; j++) {
    const bn = occ.startBar+j; if (!lookup.has(bn)) lookup.set(bn,[]); lookup.get(bn).push(pat)
  }
  return bars.map(bar => {
    const bn = bar.bar_number, isEmpty = !bar.notes.length
    const isSustain = bar.notes.length===1 && bar.notes[0].duration_subdivisions >= spb-1
    const alt = isEmpty ? null : detAlt(bar)
    const matches = lookup.get(bn) || []
    const best = matches.sort((a,b) => b.score-a.score)[0] || null
    return {
      barNumber: bn, notes: bar.notes,
      patternId:    isEmpty ? 'EMPTY' : (best?.id || 'SURPRISE'),
      patternLabel: isEmpty ? 'Empty' : (best?.label || 'Surprise'),
      color:        isEmpty ? EMP_CLR : (best?.color || SUR_CLR),
      isSurprise: !isEmpty && !best, isEmpty, isSustain,
      noteCount: bar.notes.length, alternating: alt,
      maxDuration: bar.notes.length ? Math.max(...bar.notes.map(n=>n.duration_subdivisions)) : 0,
    }
  })
}

// ─── SECTION DETECTOR ───────────────────────────────────────────
function detectSections(labeled, patterns) {
  const raw = []; let cur = null
  for (const lb of labeled) {
    const pid = lb.patternId
    if (!cur || cur.pid !== pid) {
      if (cur && pid==='SURPRISE') { cur.bars.push(lb); cur.surprises.push(lb.barNumber); continue }
      cur = { pid, label: lb.patternLabel, color: lb.color, bars: [lb], surprises: [] }; raw.push(cur)
    } else cur.bars.push(lb)
  }
  const merged = []
  for (let i=0; i<raw.length; i++) {
    const g = raw[i]
    if (g.bars.length===1 && merged.length>0) { const p=merged[merged.length-1]; p.bars.push(...g.bars); p.surprises.push(g.bars[0].barNumber) }
    else merged.push(g)
  }
  const lm = new Map(); let nl = 0
  return merged.map((g, idx) => {
    const fb=g.bars[0].barNumber, lb2=g.bars[g.bars.length-1].barNumber
    if (!lm.has(g.pid)) lm.set(g.pid, String.fromCharCode(65+nl++))
    const letter = lm.get(g.pid)
    const isRepeat = idx>0 && merged.slice(0,idx).some(p=>p.pid===g.pid)
    const rc = merged.slice(0,idx).filter(p=>p.pid===g.pid).length
    return {
      id: idx, startBar: fb, endBar: lb2, barCount: g.bars.length,
      pid: g.pid, label: g.label, color: g.color, letter, isRepeat, repeatCount: rc,
      fullLabel: isRepeat ? `${letter}${rc>1?rc:"'"}` : letter,
      bars: g.bars, surprises: g.surprises,
    }
  })
}

// ─── GRAPH BUILDER ──────────────────────────────────────────────
function buildGraph(labeled, patterns) {
  const nm = new Map()
  for (const lb of labeled) {
    if (!nm.has(lb.patternId)) nm.set(lb.patternId, { id: lb.patternId, label: lb.patternLabel, color: lb.color, count: 0 })
    nm.get(lb.patternId).count++
  }
  const em = new Map()
  for (let i=0; i<labeled.length-1; i++) {
    const f=labeled[i].patternId, t=labeled[i+1].patternId
    if (f===t) continue; const k=`${f}|||${t}`; em.set(k,(em.get(k)||0)+1)
  }
  const edges = []; for (const [k,w] of em) { const [f,t]=k.split('|||'); edges.push({from:f,to:t,weight:w}) }
  return { nodes:[...nm.values()], edges: edges.sort((a,b)=>b.weight-a.weight) }
}

// ─── YAML GENERATOR ─────────────────────────────────────────────
function genYaml(analysis, metadata) {
  const { rhPatterns, rhLabeled, rhSections, rhGraph, lhPatterns, split } = analysis

  const motifs = rhPatterns.map(p => {
    const occ = p.occurrences[0]
    const bar = metadata.bars.find(b => b.bar_number === occ.startBar)
    const sample = bar ? ord({ notes: bar.notes.map(normNote) }).slice(0,5).map(n=>`${n.pitch}@s${n.start_subdivision}:d${n.duration_subdivisions}`).join(', ') : ''
    return `  ${p.id}:\n    type: "${p.type}"\n    occurrences: ${p.occurrences.length}\n    window: ${p.windowSize}\n    bars: [${p.occurrences.map(o=>o.startBar).join(', ')}]\n    sample: [${sample}]`
  }).join('\n\n') || '  # none'

  const secs = rhSections.map(s =>
    `  - label: "${s.fullLabel}"  bars: [${s.startBar}, ${s.endBar}]  pattern: "${s.label}"  repeat: ${s.isRepeat}`
  ).join('\n') || '  # none'

  const edges = (rhGraph.edges||[]).slice(0,6).map(e=>`    - "${e.from}" → "${e.to}" (${e.weight}×)`).join('\n') || '    # none'
  const surprises = rhLabeled.filter(b=>b.isSurprise).map(b=>b.barNumber).join(', ') || 'none'
  const sustains  = rhLabeled.filter(b=>b.isSustain).map(b=>b.barNumber).join(', ')  || 'none'
  const order     = rhSections.map(s=>s.fullLabel).join(' → ') || 'N/A'

  return `# MIDI ANALYSIS BLUEPRINT — MidiGen Analyzer
composition:
  key: "${metadata.key}"
  tempo: ${metadata.tempo}
  time_signature: "${metadata.time_signature}"
  total_bars: ${metadata.bars.length}
  subdivisions_per_bar: ${metadata.subdivisions_per_bar}
  hand_split_midi: ${split}

motifs:
${motifs}

sections:
${secs}

graph:
${edges}

generation_rules:
  - "Section order: ${order}"
  - "Surprise/cadence bars: [${surprises}]"
  - "Sustain bars: [${sustains}]"
  - "RH patterns: ${rhPatterns.length}  LH patterns: ${lhPatterns.length}"
`
}

// ─── MAIN ANALYSIS RUNNER ───────────────────────────────────────
function runAnalysis(rawJson) {
  const meta = normJson(rawJson)
  const spb  = meta.subdivisions_per_bar
  const split = detectSplit(meta.bars)

  const rhBars = meta.bars.map(b => ({ ...b, notes: b.notes.filter(n => (p2m(n.pitch)??0) >= split) }))
  const lhBars = meta.bars.map(b => ({ ...b, notes: b.notes.filter(n => (p2m(n.pitch)??0) <  split) }))

  const rhNE = rhBars.filter(b=>b.notes.length>0)
  const lhNE = lhBars.filter(b=>b.notes.length>0)

  const rhPatterns = detectPatterns(rhNE, spb)
  const lhPatterns = detectPatterns(lhNE, spb)
  const rhLabeled  = labelBars(rhBars, rhPatterns, spb)
  const lhLabeled  = labelBars(lhBars, lhPatterns, spb)
  const rhSections = detectSections(rhLabeled, rhPatterns)
  const lhSections = detectSections(lhLabeled, lhPatterns)
  const rhGraph    = buildGraph(rhLabeled, rhPatterns)

  const allBNs = new Set([...rhLabeled.map(b=>b.barNumber), ...lhLabeled.map(b=>b.barNumber)])
  const rhM    = new Map(rhLabeled.map(b=>[b.barNumber,b]))
  const lhM    = new Map(lhLabeled.map(b=>[b.barNumber,b]))
  const alignment = [...allBNs].sort((a,b)=>a-b).map(bn=>({
    barNumber:bn, rh:rhM.get(bn)||null, lh:lhM.get(bn)||null
  }))

  const result = { rhPatterns, lhPatterns, rhLabeled, lhLabeled, rhSections, lhSections, rhGraph, alignment, split }
  return { meta, result, yaml: genYaml(result, meta) }
}


// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS — all inline styles, CSS vars from existing system
// ═══════════════════════════════════════════════════════════════

// ─── TIMELINE ROW ───────────────────────────────────────────────
function TimelineRow({ labeled, sections, title }) {
  const [hov, setHov] = useState(null)
  if (!labeled || !labeled.some(b=>!b.isEmpty)) return null

  const secMap = new Map(sections.map(s => [s.pid, s]))

  const ROW = 16
  const rows = []
  for (let i=0; i<labeled.length; i+=ROW) rows.push(labeled.slice(i,i+ROW))

  function cellBg(lb) {
    if (lb.isEmpty) return EMP_CLR
    if (lb.isSurprise) return SUR_CLR
    const sec = secMap.get(lb.patternId)
    return sec ? sec.color : lb.color
  }

  return (
    <div>
      <div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>
        {title}
      </div>

      {/* Section legend */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
        {sections.map(sec => (
          <div key={sec.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:sec.color+'18', border:`1px solid ${sec.color}44`, fontSize:10, fontFamily:'var(--mono)' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:sec.color, display:'inline-block' }} />
            <span style={{ color:sec.color, fontWeight:600 }}>{sec.fullLabel}</span>
            <span style={{ color:'var(--tx-3)' }}>{sec.startBar}–{sec.endBar}</span>
          </div>
        ))}
        {labeled.some(b=>b.isSurprise) && (
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:SUR_CLR+'18', border:`1px solid ${SUR_CLR}44`, fontSize:10, fontFamily:'var(--mono)' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:SUR_CLR, display:'inline-block' }} />
            <span style={{ color:SUR_CLR, fontWeight:600 }}>Surprise</span>
          </div>
        )}
      </div>

      {/* Cell rows */}
      {rows.map((row, ri) => (
        <div key={ri} style={{ display:'flex', alignItems:'center', gap:3, marginBottom:2 }}>
          <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--tx-3)', width:20, textAlign:'right', flexShrink:0 }}>{row[0].barNumber}</span>
          <div style={{ display:'flex', gap:1, flex:1 }}>
            {row.map(lb => (
              <div
                key={lb.barNumber}
                onMouseEnter={() => setHov(lb)}
                onMouseLeave={() => setHov(null)}
                style={{
                  flex:1, height:22, borderRadius:2,
                  background: cellBg(lb),
                  opacity: lb.isEmpty ? 0.2 : 1,
                  cursor: 'default',
                  outline: hov?.barNumber===lb.barNumber ? '2px solid var(--tx-1)' : 'none',
                  position:'relative', transition:'outline 0.08s',
                }}
              >
                {lb.isSustain && <div style={{ position:'absolute', inset:'40% 0', height:2, background:'rgba(255,255,255,0.6)', borderRadius:1 }} />}
                {lb.alternating && (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', gap:1 }}>
                    {[0,1,2].map(i=><div key={i} style={{ width:1, height:'55%', background:'rgba(255,255,255,0.45)', borderRadius:1 }} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Tooltip */}
      {hov && (
        <div style={{ marginTop:8, padding:'8px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:11, fontFamily:'var(--mono)', color:'var(--text2)' }}>
          <span style={{ color:'var(--tx-1)', fontWeight:600 }}>Bar {hov.barNumber}</span>
          {' · '}
          <span style={{ color: hov.isSurprise ? SUR_CLR : (hov.isEmpty ? 'var(--tx-3)' : hov.color) }}>{hov.patternLabel}</span>
          {' · '}{hov.noteCount} notes
          {hov.alternating && <span style={{ color:'var(--accent)', marginLeft:8 }}>⟳ pedal:{hov.alternating.pedal}</span>}
          {hov.isSustain   && <span style={{ color:'var(--sky)',    marginLeft:8 }}>▬ sustain</span>}
          {hov.isSurprise  && <span style={{ color:SUR_CLR,        marginLeft:8 }}>★ surprise</span>}
        </div>
      )}
    </div>
  )
}

// ─── PATTERN CARDS ──────────────────────────────────────────────
function PatternCard({ pat, meta, spb }) {
  const occ = pat.occurrences[0]
  const bar = meta.bars.find(b => (b.bar_number ?? b.bn) === occ.startBar)
  const notes = bar ? [...bar.notes].map(normNote).sort((a,b)=>a.start_subdivision-b.start_subdivision) : []
  const altBar = (meta.bars||[]).find(b => {
    const bn = normBar(b)
    return bn.notes.length > 0 && pat.occurrences.some(o=>o.startBar===bn.bar_number) && detAlt(bn)
  })
  const alt = altBar ? detAlt(normBar(altBar)) : null

  const allMidis = notes.map(n=>p2m(n.pitch)).filter(x=>x!==null)
  const minM = allMidis.length ? Math.min(...allMidis) : 60
  const maxM = allMidis.length ? Math.max(...allMidis) : 72
  const range = Math.max(maxM - minM, 8)

  return (
    <div style={{ border:`1px solid ${pat.color}33`, borderRadius:'var(--radius)', overflow:'hidden', background:`linear-gradient(135deg,${pat.color}0d,${pat.color}05)` }}>
      {/* Header */}
      <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:pat.color+'1a' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:pat.color, display:'inline-block', boxShadow:`0 0 6px ${pat.color}` }} />
          <span style={{ fontWeight:700, color:'var(--tx-1)', fontSize:13 }}>{pat.label}</span>
          <span style={{ fontSize:9, fontFamily:'var(--mono)', padding:'1px 6px', borderRadius:3, background:pat.color+'28', color:pat.color }}>{pat.type}</span>
        </div>
        <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{pat.occurrences.length}× · {pat.windowSize}bar</span>
      </div>

      <div style={{ padding:'10px 14px' }}>
        {/* Mini roll */}
        <div style={{ height:52, background:'var(--surface2)', borderRadius:'var(--radius-sm)', marginBottom:10, position:'relative', overflow:'hidden', border:'1px solid var(--border)' }}>
          {notes.slice(0,20).map((n,i) => {
            const mn = p2m(n.pitch); if (mn===null) return null
            const y = ((maxM - mn) / range) * 88
            const x = (n.start_subdivision / spb) * 100
            const w = Math.max((n.duration_subdivisions / spb) * 100, 2)
            return <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:`${w}%`, height:'10%', minHeight:3, background:pat.color, borderRadius:1, opacity:0.9 }} title={`${n.pitch} s${n.start_subdivision} d${n.duration_subdivisions}`} />
          })}
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:10, fontFamily:'var(--mono)' }}>
          <div style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'6px 8px', border:'1px solid var(--border)' }}>
            <div style={{ color:'var(--tx-3)', marginBottom:2 }}>Bars</div>
            <div style={{ color:'var(--tx-1)', fontSize:11 }}>{pat.occurrences.map(o=>o.startBar).join(', ')}</div>
          </div>
          <div style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'6px 8px', border:'1px solid var(--border)' }}>
            <div style={{ color:'var(--tx-3)', marginBottom:2 }}>Score</div>
            <div style={{ color:'var(--tx-1)' }}>{pat.score.toFixed(1)}</div>
          </div>
        </div>

        {alt && (
          <div style={{ marginTop:6, padding:'5px 8px', borderRadius:'var(--radius-sm)', background:pat.color+'18', color:pat.color, fontSize:10, fontFamily:'var(--mono)' }}>
            ⟳ Pedal: <strong>{alt.pedal}</strong> · {alt.notesPerBar} notes/bar
          </div>
        )}
      </div>
    </div>
  )
}

// ─── GRAPH VIEW ─────────────────────────────────────────────────
function GraphView({ graph }) {
  const { nodes, edges } = graph
  if (!nodes.length) return <div style={{ color:'var(--tx-3)', fontSize:12, fontFamily:'var(--mono)' }}>No transitions detected</div>

  const maxW = Math.max(...edges.map(e=>e.weight), 1)
  const cx=260, cy=180, r=130

  const pos = {}
  nodes.forEach((nd, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI/2
    pos[nd.id] = { x: cx + r*Math.cos(a), y: cy + r*Math.sin(a) }
  })

  return (
    <div>
      <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', marginBottom:12 }}>
        <svg width="100%" viewBox="0 0 520 360">
          <defs>
            <marker id="ar" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#4b5563" />
            </marker>
          </defs>
          {edges.slice(0,16).map((e,i) => {
            const f=pos[e.from], t=pos[e.to]; if (!f||!t) return null
            const sw = Math.max(1,(e.weight/maxW)*3.5)
            const dx=t.x-f.x, dy=t.y-f.y
            const mx=(f.x+t.x)/2 - dy*0.15, my=(f.y+t.y)/2 + dx*0.15
            const stroke = e.weight>=maxW*0.6 ? (nodes.find(n=>n.id===e.from)?.color||'#4b5563') : '#374151'
            return (
              <g key={i}>
                <path d={`M${f.x},${f.y} Q${mx},${my} ${t.x},${t.y}`} fill="none" stroke={stroke} strokeWidth={sw} strokeOpacity={0.55} markerEnd="url(#ar)" />
                <text x={mx} y={my-3} textAnchor="middle" fill="#6b7280" fontSize="8">{e.weight}</text>
              </g>
            )
          })}
          {nodes.map(nd => {
            const p=pos[nd.id]; if (!p) return null
            const nr = Math.max(18, Math.min(30, 14+nd.count*1.2))
            return (
              <g key={nd.id}>
                <circle cx={p.x} cy={p.y} r={nr} fill={nd.color} fillOpacity={0.18} stroke={nd.color} strokeWidth={1.5} />
                <text x={p.x} y={p.y-3} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">{nd.id}</text>
                <text x={p.x} y={p.y+9} textAnchor="middle" fill="#94a3b8" fontSize="8">{nd.count}b</text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Edge list */}
      <div style={{ fontSize:11, fontFamily:'var(--mono)', display:'flex', flexDirection:'column', gap:4 }}>
        {edges.slice(0,6).map((e,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color: nodes.find(n=>n.id===e.from)?.color||'var(--tx-2)', width:30 }}>{e.from}</span>
            <span style={{ color:'var(--tx-3)' }}>→</span>
            <span style={{ color: nodes.find(n=>n.id===e.to)?.color||'var(--tx-2)', width:30 }}>{e.to}</span>
            <div style={{ flex:1, height:3, background:'var(--surface3)', borderRadius:2 }}>
              <div style={{ height:'100%', borderRadius:2, background:'var(--accent3)', width:`${(e.weight/maxW)*100}%` }} />
            </div>
            <span style={{ color:'var(--tx-3)', width:14, textAlign:'right' }}>{e.weight}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── HAND TABLE ──────────────────────────────────────────────────
function HandTable({ alignment }) {
  const [page, setPage] = useState(0)
  const PG = 20
  const total = Math.ceil((alignment||[]).length / PG)
  const slice = (alignment||[]).slice(page*PG, (page+1)*PG)

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'2rem 1fr 1fr', gap:4, marginBottom:6 }}>
        <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Bar</span>
        <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Right Hand</span>
        <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Left Hand</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {slice.map(aln => {
          const rhC = aln.rh?.color || EMP_CLR
          const lhC = aln.lh?.color || EMP_CLR
          return (
            <div key={aln.barNumber} style={{ display:'grid', gridTemplateColumns:'2rem 1fr 1fr', gap:4, alignItems:'center' }}>
              <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)', textAlign:'right' }}>{aln.barNumber}</span>
              <div style={{ padding:'3px 8px', borderRadius:4, fontSize:10, fontFamily:'var(--mono)', background:rhC+'22', color:rhC, border:`1px solid ${rhC}33`, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                {aln.rh?.patternLabel || '—'}
                {aln.rh?.alternating && ' ⟳'}
                {aln.rh?.isSustain   && ' ▬'}
              </div>
              <div style={{ padding:'3px 8px', borderRadius:4, fontSize:10, fontFamily:'var(--mono)', background:lhC+'22', color:lhC, border:`1px solid ${lhC}33`, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                {aln.lh?.patternLabel || '—'}
                {aln.lh?.alternating && ' ⟳'}
              </div>
            </div>
          )
        })}
      </div>
      {total > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:10 }}>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
                  style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:page===0?'not-allowed':'pointer', opacity:page===0?0.4:1, fontSize:11, fontFamily:'var(--mono)' }}>←</button>
          <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{page+1}/{total}</span>
          <button onClick={()=>setPage(p=>Math.min(total-1,p+1))} disabled={page===total-1}
                  style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:page===total-1?'not-allowed':'pointer', opacity:page===total-1?0.4:1, fontSize:11, fontFamily:'var(--mono)' }}>→</button>
        </div>
      )}
    </div>
  )
}

// ─── YAML PANEL ─────────────────────────────────────────────────
function YamlPanel({ yaml }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(yaml).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000) })
  }
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
        <button onClick={copy} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color: copied?'var(--accent)':'var(--tx-2)', cursor:'pointer', fontSize:11, fontFamily:'var(--font)', fontWeight:600, transition:'all 0.15s' }}>
          {copied ? <Check size={11} stroke="var(--accent)" /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy YAML'}
        </button>
      </div>
      <textarea readOnly value={yaml}
                style={{ width:'100%', minHeight:320, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:12, color:'var(--accent)', fontFamily:'var(--mono)', fontSize:11, resize:'vertical', outline:'none', lineHeight:1.7 }} />
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const INNER_TABS = ['Timeline','Patterns','Graph','Hands','YAML']

export default function Analyzer() {
  const [input,   setInput]   = useState('')
  const [jsonOk,  setJsonOk]  = useState(true)
  const [result,  setResult]  = useState(null)
  const [running, setRunning] = useState(false)
  const [error,   setError]   = useState(null)
  const [inner,   setInner]   = useState('Timeline')
  const [copied,  setCopied]  = useState(false)
  const fileRef = useRef(null)

  const handleChange = v => {
    setInput(v)
    try { JSON.parse(v); setJsonOk(true) } catch { setJsonOk(false) }
  }

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = ev => handleChange(ev.target.result)
    reader.readAsText(f)
    e.target.value = ''
  }

  const analyze = useCallback(() => {
    if (!input.trim() || !jsonOk) return
    setRunning(true); setError(null)
    setTimeout(() => {
      try {
        const r = runAnalysis(JSON.parse(input))
        setResult(r); setInner('Timeline')
      } catch(e) {
        setError(e.message || 'Analysis failed')
      } finally {
        setRunning(false)
      }
    }, 30)
  }, [input, jsonOk])

  const { meta, result: res, yaml } = result || {}

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Input area ──────────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--tx-2)', letterSpacing:'0.5px', textTransform:'uppercase', fontFamily:'var(--mono)' }}>
            JSON Input
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, fontFamily:'var(--mono)', padding:'2px 7px', borderRadius:4, background: !input.trim() ? 'var(--surface3)' : jsonOk ? 'rgba(184,245,74,0.07)' : 'rgba(245,85,74,0.07)', color: !input.trim() ? 'var(--tx-3)' : jsonOk ? 'var(--lime)' : 'var(--rose)', border: `1px solid ${!input.trim() ? 'var(--border)' : jsonOk ? 'rgba(184,245,74,0.2)' : 'rgba(245,85,74,0.2)'}` }}>
              {!input.trim() ? 'empty' : jsonOk ? '✓ valid' : '✗ invalid'}
            </span>
            <input ref={fileRef} type="file" accept=".json,.txt" style={{ display:'none' }} onChange={handleFile} />
            <button onClick={()=>fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:'pointer', fontSize:11, fontFamily:'var(--font)', fontWeight:600 }}>
              <Upload size={11} /> Load file
            </button>
          </div>
        </div>

        <textarea
          value={input}
          onChange={e => handleChange(e.target.value)}
          spellCheck={false}
          placeholder={'Paste MIDI JSON here — compact (p/s/d/bn) or full format…\n\n{"tempo":120,"time_signature":"4/4","key":"Am","subdivisions_per_bar":16,"bars":[…]}'}
          style={{ width:'100%', minHeight:160, background:'var(--surface2)', border:`1px solid ${!input.trim()||jsonOk ? 'var(--border)' : 'rgba(245,85,74,0.35)'}`, borderRadius:'var(--radius-sm)', padding:12, color:'var(--text)', fontFamily:'var(--mono)', fontSize:12, resize:'vertical', outline:'none', lineHeight:1.7, transition:'border-color 0.2s' }}
          onFocus={e => e.target.style.borderColor = jsonOk ? 'var(--border2)' : 'rgba(245,85,74,0.5)'}
          onBlur={e  => e.target.style.borderColor = !input.trim()||jsonOk ? 'var(--border)' : 'rgba(245,85,74,0.35)'}
        />

        {error && (
          <div style={{ fontSize:12, color:'var(--rose)', background:'rgba(245,85,74,0.07)', border:'1px solid rgba(245,85,74,0.2)', borderRadius:'var(--radius-sm)', padding:'8px 12px', fontFamily:'var(--mono)' }}>
            ⚠ {error}
          </div>
        )}

        <button
          onClick={analyze}
          disabled={running || !input.trim() || !jsonOk}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 18px', borderRadius:'var(--radius-sm)', background: running||!input.trim()||!jsonOk ? 'var(--surface3)' : 'var(--accent)', color: running||!input.trim()||!jsonOk ? 'var(--tx-3)' : '#000', fontSize:12, fontWeight:700, cursor: running||!input.trim()||!jsonOk ? 'not-allowed' : 'pointer', border:'none', transition:'all 0.15s ease', alignSelf:'flex-start', fontFamily:'var(--font)' }}
          onMouseEnter={e => { if (!running&&input.trim()&&jsonOk) { e.currentTarget.style.background='#d4f570'; e.currentTarget.style.transform='translateY(-1px)' } }}
          onMouseLeave={e => { e.currentTarget.style.background=running||!input.trim()||!jsonOk?'var(--surface3)':'var(--accent)'; e.currentTarget.style.transform='none' }}
        >
          <Activity size={13} />
          {running ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {/* ── Results ─────────────────────────────────────────── */}
      {result && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'fadeUp 0.2s ease' }}>

          {/* Summary bar */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'10px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:11, fontFamily:'var(--mono)' }}>
            {[
              [`${meta.bars.length} bars`,         'var(--tx-2)'],
              [`${res.rhPatterns.length} RH pats`,  'var(--accent)'],
              [`${res.lhPatterns.length} LH pats`,  'var(--sky)'],
              [`${res.rhSections.length} sections`, 'var(--mint)'],
              [`split MIDI ${res.split} (${m2n(res.split)})`, 'var(--tx-3)'],
              [`${res.rhLabeled.filter(b=>b.isSurprise).length} surprises`, 'var(--rose)'],
            ].map(([label, color]) => (
              <span key={label} style={{ color, padding:'1px 7px', borderRadius:4, background:'var(--surface3)', border:'1px solid var(--border)' }}>
                {label}
              </span>
            ))}
          </div>

          {/* Inner tab bar */}
          <div style={{ display:'flex', gap:2 }}>
            {INNER_TABS.map(t => {
              const on = inner===t
              return (
                <button key={t} onClick={()=>setInner(t)} style={{ padding:'4px 12px', borderRadius:'var(--radius-sm)', border: on ? '1px solid var(--border2)' : '1px solid transparent', background: on ? 'var(--surface2)' : 'transparent', color: on ? 'var(--tx-1)' : 'var(--tx-3)', fontSize:11, fontWeight: on ? 600 : 400, cursor:'pointer', transition:'all 0.12s', fontFamily:'var(--mono)', letterSpacing:'0.3px' }}>
                  {t}
                </button>
              )
            })}
          </div>

          {/* Inner content */}
          <div style={{ animation:'fadeUp 0.15s ease' }}>
            {inner==='Timeline' && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <TimelineRow labeled={res.rhLabeled} sections={res.rhSections} title="Right Hand" />
                <TimelineRow labeled={res.lhLabeled} sections={res.lhSections} title="Left Hand" />
              </div>
            )}

            {inner==='Patterns' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {res.rhPatterns.length > 0 && (
                  <>
                    <div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase' }}>Right Hand — {res.rhPatterns.length} patterns</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
                      {res.rhPatterns.map(p => <PatternCard key={p.id} pat={p} meta={meta} spb={meta.subdivisions_per_bar} />)}
                    </div>
                  </>
                )}
                {res.lhPatterns.length > 0 && (
                  <>
                    <div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginTop:8 }}>Left Hand — {res.lhPatterns.length} patterns</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
                      {res.lhPatterns.map(p => <PatternCard key={p.id} pat={p} meta={meta} spb={meta.subdivisions_per_bar} />)}
                    </div>
                  </>
                )}
                {res.rhPatterns.length===0 && res.lhPatterns.length===0 && (
                  <div style={{ color:'var(--tx-3)', fontSize:12, fontFamily:'var(--mono)' }}>No repeating patterns detected</div>
                )}
              </div>
            )}

            {inner==='Graph' && <GraphView graph={res.rhGraph} />}

            {inner==='Hands' && <HandTable alignment={res.alignment} />}

            {inner==='YAML' && <YamlPanel yaml={yaml} />}
          </div>
        </div>
      )}
    </div>
  )
}