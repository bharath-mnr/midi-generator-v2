// // // frontend/src/components/tools/Analyzer.jsx
// // // Music pattern analyzer — fits inside Tools.jsx tab panel.
// // // Design: matches existing tool design system exactly.
// // //   CSS vars: --surface, --surface2, --surface3, --border, --border2,
// // //             --text, --text2, --text3, --accent, --accent2, --accent3,
// // //             --mono, --font, --radius, --radius-sm, --danger, --lime,
// // //             --sky, --rose, --mint
// // // No Tailwind — pure inline styles only.

// // import { useState, useRef, useCallback } from 'react'
// // import { Upload, Copy, Check, Activity } from '../shared/Icons.jsx'

// // // ─── PITCH HELPERS ───────────────────────────────────────────────
// // const NOTE_MAP = {
// //   'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,
// //   'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11
// // }
// // const MIDI_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

// // function p2m(pitch) {
// //   const m = String(pitch || '').match(/^([A-G][#Bb]?)(-?\d+)$/i)
// //   if (!m) return null
// //   const pc = NOTE_MAP[m[1].toUpperCase()]
// //   return pc === undefined ? null : (parseInt(m[2]) + 1) * 12 + pc
// // }

// // function m2n(midi) {
// //   return MIDI_NOTES[midi % 12] + (Math.floor(midi / 12) - 1)
// // }

// // // ─── COMPACT NORMALISER ──────────────────────────────────────────
// // function normNote(n) {
// //   return {
// //     pitch:                 n.pitch ?? n.p,
// //     start_subdivision:     n.start_subdivision ?? n.s ?? 0,
// //     duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
// //   }
// // }
// // function normBar(b) {
// //   return { bar_number: b.bar_number ?? b.bn, notes: (b.notes ?? []).map(normNote) }
// // }
// // function normJson(j) {
// //   const ts = j.time_signature || '4/4'
// //   const [n, d] = ts.split('/').map(Number)
// //   return {
// //     tempo: j.tempo || 120, time_signature: ts, key: j.key || 'C',
// //     subdivisions_per_bar: j.subdivisions_per_bar || (n * (16 / d)),
// //     bars: (j.bars || []).map(normBar)
// //   }
// // }

// // // ─── PATTERN COLORS (accent-safe, uses CSS var names as fallback) ─
// // const PAT_COLORS = [
// //   '#06b6d4','#8b5cf6','#f59e0b','#10b981',
// //   '#f43f5e','#3b82f6','#a855f7','#ec4899',
// // ]
// // const SUR_CLR = '#ef4444'
// // const EMP_CLR = '#374151'

// // // ─── HAND SPLIT ──────────────────────────────────────────────────
// // function detectSplit(bars) {
// //   const ps = new Set()
// //   for (const b of bars) for (const n of b.notes) { const m = p2m(n.pitch); if (m !== null) ps.add(m) }
// //   if (ps.size < 2) return 60
// //   const sorted = [...ps].sort((a, b) => a - b)
// //   let bestW = -1, split = 60
// //   for (let i = 1; i < sorted.length; i++) {
// //     const gap = sorted[i] - sorted[i - 1]
// //     const mid = (sorted[i] + sorted[i - 1]) / 2
// //     const w   = gap * (mid >= 48 && mid <= 72 ? 3.0 : 0.7)
// //     if (w > bestW) { bestW = w; split = Math.round(mid) }
// //   }
// //   return split
// // }

// // // ─── FINGERPRINTS ────────────────────────────────────────────────
// // function ord(bar) { return [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision) }
// // function fpR(bar) { return ord(bar).map(n => `${n.start_subdivision}:${n.duration_subdivisions}`).join('|') || 'empty' }
// // function fpC(bar) {
// //   const s = ord(bar)
// //   if (!s.length) return 'empty'
// //   if (s.length < 2) return `1:${s[0].duration_subdivisions}`
// //   const iv = []
// //   for (let i = 1; i < s.length; i++) { const a = p2m(s[i-1].pitch), b = p2m(s[i].pitch); iv.push(a!==null&&b!==null ? b-a : '?') }
// //   return iv.join(',')
// // }
// // function fpE(bar) { return ord(bar).map(n => `${n.pitch}@${n.start_subdivision}:${n.duration_subdivisions}`).join('|') || 'empty' }
// // function fpT(bar) {
// //   const nn = bar.notes
// //   if (!nn.length) return 'empty'
// //   const dc = {}; for (const x of nn) dc[x.duration_subdivisions] = (dc[x.duration_subdivisions]||0)+1
// //   const dd = Object.entries(dc).sort((a,b)=>b[1]-a[1])[0][0]
// //   return `n${nn.length}_d${dd}_max${Math.max(...nn.map(x=>x.duration_subdivisions))}`
// // }

// // // ─── ALTERNATING DETECTOR ────────────────────────────────────────
// // function detAlt(bar) {
// //   const s = ord(bar); if (s.length < 4) return null
// //   const same = s.every(n => n.duration_subdivisions === s[0].duration_subdivisions)
// //   const ev = s.filter((_,i) => i%2===0), od = s.filter((_,i) => i%2===1)
// //   const ep = new Set(ev.map(n=>n.pitch)), op = new Set(od.map(n=>n.pitch))
// //   if (op.size===1 && ep.size>1 && same) return { pedal: [...op][0], melody: ev.map(n=>n.pitch), notesPerBar: s.length, dur: s[0].duration_subdivisions }
// //   if (ep.size===1 && op.size>1 && same) return { pedal: [...ep][0], melody: od.map(n=>n.pitch), notesPerBar: s.length, dur: s[0].duration_subdivisions }
// //   return null
// // }

// // // ─── PATTERN DETECTION ──────────────────────────────────────────
// // function detectPatterns(bars, spb) {
// //   if (!bars.length) return []
// //   const maps = { e: new Map(), r: new Map(), c: new Map(), t: new Map(), w: new Map() }
// //   const hp = (m, k, e) => { if (!m.has(k)) m.set(k,[]); m.get(k).push(e) }

// //   for (let i = 0; i < bars.length; i++) {
// //     const b = bars[i], e = { barIdx: i, startBar: b.bar_number, w: 1 }
// //     hp(maps.e, fpE(b), e); hp(maps.r, fpR(b), e); hp(maps.c, fpC(b), e); hp(maps.t, fpT(b), e)
// //   }
// //   for (const w of [2,4,8].filter(w => w <= bars.length)) {
// //     for (let i = 0; i <= bars.length - w; i++) {
// //       const sl = bars.slice(i, i+w)
// //       const rk = sl.map((b,j) => `[${j}:${fpR(b)}]`).join('')
// //       const ck = sl.map((b,j) => `[${j}:${fpC(b)}]`).join('')
// //       const e  = { barIdx: i, startBar: bars[i].bar_number, w }
// //       hp(maps.w, `R${w}:${rk}`, e); hp(maps.w, `C${w}:${rk}~~${ck}`, e)
// //     }
// //   }

// //   const cands = []
// //   const addC = (m, type, q) => { for (const [fp, oc] of m) { if (oc.length < 2) continue; cands.push({ fingerprint: fp, type, windowSize: oc[0].w, occurrences: oc, score: oc.length*oc[0].w*q }) } }
// //   addC(maps.e,'exact',3.0); addC(maps.r,'rhythmic',2.0); addC(maps.c,'melodic',1.8); addC(maps.t,'textural',1.0); addC(maps.w,'window',2.5)
// //   cands.sort((a,b) => b.score - a.score)

// //   const covered = new Set(), finals = []
// //   for (const c of cands) {
// //     const nw = []; for (const o of c.occurrences) for (let j=0; j<c.windowSize; j++) { const bn=o.startBar+j; if (!covered.has(bn)) nw.push(bn) }
// //     if (nw.length >= 2 || finals.length < 2) { finals.push(c); for (const bn of nw) covered.add(bn) }
// //     if (finals.length >= 8) break
// //   }
// //   finals.forEach((p,i) => { p.id=`P${String.fromCharCode(65+i)}`; p.label=`Pattern ${String.fromCharCode(65+i)}`; p.color=PAT_COLORS[i]||'#6b7280' })
// //   return finals
// // }

// // // ─── BAR LABELER ────────────────────────────────────────────────
// // function labelBars(bars, patterns, spb) {
// //   const lookup = new Map()
// //   for (const pat of patterns) for (const occ of pat.occurrences) for (let j=0; j<pat.windowSize; j++) {
// //     const bn = occ.startBar+j; if (!lookup.has(bn)) lookup.set(bn,[]); lookup.get(bn).push(pat)
// //   }
// //   return bars.map(bar => {
// //     const bn = bar.bar_number, isEmpty = !bar.notes.length
// //     const isSustain = bar.notes.length===1 && bar.notes[0].duration_subdivisions >= spb-1
// //     const alt = isEmpty ? null : detAlt(bar)
// //     const matches = lookup.get(bn) || []
// //     const best = matches.sort((a,b) => b.score-a.score)[0] || null
// //     return {
// //       barNumber: bn, notes: bar.notes,
// //       patternId:    isEmpty ? 'EMPTY' : (best?.id || 'SURPRISE'),
// //       patternLabel: isEmpty ? 'Empty' : (best?.label || 'Surprise'),
// //       color:        isEmpty ? EMP_CLR : (best?.color || SUR_CLR),
// //       isSurprise: !isEmpty && !best, isEmpty, isSustain,
// //       noteCount: bar.notes.length, alternating: alt,
// //       maxDuration: bar.notes.length ? Math.max(...bar.notes.map(n=>n.duration_subdivisions)) : 0,
// //     }
// //   })
// // }

// // // ─── SECTION DETECTOR ───────────────────────────────────────────
// // function detectSections(labeled, patterns) {
// //   const raw = []; let cur = null
// //   for (const lb of labeled) {
// //     const pid = lb.patternId
// //     if (!cur || cur.pid !== pid) {
// //       if (cur && pid==='SURPRISE') { cur.bars.push(lb); cur.surprises.push(lb.barNumber); continue }
// //       cur = { pid, label: lb.patternLabel, color: lb.color, bars: [lb], surprises: [] }; raw.push(cur)
// //     } else cur.bars.push(lb)
// //   }
// //   const merged = []
// //   for (let i=0; i<raw.length; i++) {
// //     const g = raw[i]
// //     if (g.bars.length===1 && merged.length>0) { const p=merged[merged.length-1]; p.bars.push(...g.bars); p.surprises.push(g.bars[0].barNumber) }
// //     else merged.push(g)
// //   }
// //   const lm = new Map(); let nl = 0
// //   return merged.map((g, idx) => {
// //     const fb=g.bars[0].barNumber, lb2=g.bars[g.bars.length-1].barNumber
// //     if (!lm.has(g.pid)) lm.set(g.pid, String.fromCharCode(65+nl++))
// //     const letter = lm.get(g.pid)
// //     const isRepeat = idx>0 && merged.slice(0,idx).some(p=>p.pid===g.pid)
// //     const rc = merged.slice(0,idx).filter(p=>p.pid===g.pid).length
// //     return {
// //       id: idx, startBar: fb, endBar: lb2, barCount: g.bars.length,
// //       pid: g.pid, label: g.label, color: g.color, letter, isRepeat, repeatCount: rc,
// //       fullLabel: isRepeat ? `${letter}${rc>1?rc:"'"}` : letter,
// //       bars: g.bars, surprises: g.surprises,
// //     }
// //   })
// // }

// // // ─── GRAPH BUILDER ──────────────────────────────────────────────
// // function buildGraph(labeled, patterns) {
// //   const nm = new Map()
// //   for (const lb of labeled) {
// //     if (!nm.has(lb.patternId)) nm.set(lb.patternId, { id: lb.patternId, label: lb.patternLabel, color: lb.color, count: 0 })
// //     nm.get(lb.patternId).count++
// //   }
// //   const em = new Map()
// //   for (let i=0; i<labeled.length-1; i++) {
// //     const f=labeled[i].patternId, t=labeled[i+1].patternId
// //     if (f===t) continue; const k=`${f}|||${t}`; em.set(k,(em.get(k)||0)+1)
// //   }
// //   const edges = []; for (const [k,w] of em) { const [f,t]=k.split('|||'); edges.push({from:f,to:t,weight:w}) }
// //   return { nodes:[...nm.values()], edges: edges.sort((a,b)=>b.weight-a.weight) }
// // }

// // // ─── YAML GENERATOR ─────────────────────────────────────────────
// // function genYaml(analysis, metadata) {
// //   const { rhPatterns, rhLabeled, rhSections, rhGraph, lhPatterns, split } = analysis

// //   const motifs = rhPatterns.map(p => {
// //     const occ = p.occurrences[0]
// //     const bar = metadata.bars.find(b => b.bar_number === occ.startBar)
// //     const sample = bar ? ord({ notes: bar.notes.map(normNote) }).slice(0,5).map(n=>`${n.pitch}@s${n.start_subdivision}:d${n.duration_subdivisions}`).join(', ') : ''
// //     return `  ${p.id}:\n    type: "${p.type}"\n    occurrences: ${p.occurrences.length}\n    window: ${p.windowSize}\n    bars: [${p.occurrences.map(o=>o.startBar).join(', ')}]\n    sample: [${sample}]`
// //   }).join('\n\n') || '  # none'

// //   const secs = rhSections.map(s =>
// //     `  - label: "${s.fullLabel}"  bars: [${s.startBar}, ${s.endBar}]  pattern: "${s.label}"  repeat: ${s.isRepeat}`
// //   ).join('\n') || '  # none'

// //   const edges = (rhGraph.edges||[]).slice(0,6).map(e=>`    - "${e.from}" → "${e.to}" (${e.weight}×)`).join('\n') || '    # none'
// //   const surprises = rhLabeled.filter(b=>b.isSurprise).map(b=>b.barNumber).join(', ') || 'none'
// //   const sustains  = rhLabeled.filter(b=>b.isSustain).map(b=>b.barNumber).join(', ')  || 'none'
// //   const order     = rhSections.map(s=>s.fullLabel).join(' → ') || 'N/A'

// //   return `# MIDI ANALYSIS BLUEPRINT — MidiGen Analyzer
// // composition:
// //   key: "${metadata.key}"
// //   tempo: ${metadata.tempo}
// //   time_signature: "${metadata.time_signature}"
// //   total_bars: ${metadata.bars.length}
// //   subdivisions_per_bar: ${metadata.subdivisions_per_bar}
// //   hand_split_midi: ${split}

// // motifs:
// // ${motifs}

// // sections:
// // ${secs}

// // graph:
// // ${edges}

// // generation_rules:
// //   - "Section order: ${order}"
// //   - "Surprise/cadence bars: [${surprises}]"
// //   - "Sustain bars: [${sustains}]"
// //   - "RH patterns: ${rhPatterns.length}  LH patterns: ${lhPatterns.length}"
// // `
// // }

// // // ─── MAIN ANALYSIS RUNNER ───────────────────────────────────────
// // function runAnalysis(rawJson) {
// //   const meta = normJson(rawJson)
// //   const spb  = meta.subdivisions_per_bar
// //   const split = detectSplit(meta.bars)

// //   const rhBars = meta.bars.map(b => ({ ...b, notes: b.notes.filter(n => (p2m(n.pitch)??0) >= split) }))
// //   const lhBars = meta.bars.map(b => ({ ...b, notes: b.notes.filter(n => (p2m(n.pitch)??0) <  split) }))

// //   const rhNE = rhBars.filter(b=>b.notes.length>0)
// //   const lhNE = lhBars.filter(b=>b.notes.length>0)

// //   const rhPatterns = detectPatterns(rhNE, spb)
// //   const lhPatterns = detectPatterns(lhNE, spb)
// //   const rhLabeled  = labelBars(rhBars, rhPatterns, spb)
// //   const lhLabeled  = labelBars(lhBars, lhPatterns, spb)
// //   const rhSections = detectSections(rhLabeled, rhPatterns)
// //   const lhSections = detectSections(lhLabeled, lhPatterns)
// //   const rhGraph    = buildGraph(rhLabeled, rhPatterns)

// //   const allBNs = new Set([...rhLabeled.map(b=>b.barNumber), ...lhLabeled.map(b=>b.barNumber)])
// //   const rhM    = new Map(rhLabeled.map(b=>[b.barNumber,b]))
// //   const lhM    = new Map(lhLabeled.map(b=>[b.barNumber,b]))
// //   const alignment = [...allBNs].sort((a,b)=>a-b).map(bn=>({
// //     barNumber:bn, rh:rhM.get(bn)||null, lh:lhM.get(bn)||null
// //   }))

// //   const result = { rhPatterns, lhPatterns, rhLabeled, lhLabeled, rhSections, lhSections, rhGraph, alignment, split }
// //   return { meta, result, yaml: genYaml(result, meta) }
// // }


// // // ═══════════════════════════════════════════════════════════════
// // // UI COMPONENTS — all inline styles, CSS vars from existing system
// // // ═══════════════════════════════════════════════════════════════

// // // ─── TIMELINE ROW ───────────────────────────────────────────────
// // function TimelineRow({ labeled, sections, title }) {
// //   const [hov, setHov] = useState(null)
// //   if (!labeled || !labeled.some(b=>!b.isEmpty)) return null

// //   const secMap = new Map(sections.map(s => [s.pid, s]))

// //   const ROW = 16
// //   const rows = []
// //   for (let i=0; i<labeled.length; i+=ROW) rows.push(labeled.slice(i,i+ROW))

// //   function cellBg(lb) {
// //     if (lb.isEmpty) return EMP_CLR
// //     if (lb.isSurprise) return SUR_CLR
// //     const sec = secMap.get(lb.patternId)
// //     return sec ? sec.color : lb.color
// //   }

// //   return (
// //     <div>
// //       <div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>
// //         {title}
// //       </div>

// //       {/* Section legend */}
// //       <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
// //         {sections.map(sec => (
// //           <div key={sec.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:sec.color+'18', border:`1px solid ${sec.color}44`, fontSize:10, fontFamily:'var(--mono)' }}>
// //             <span style={{ width:8, height:8, borderRadius:2, background:sec.color, display:'inline-block' }} />
// //             <span style={{ color:sec.color, fontWeight:600 }}>{sec.fullLabel}</span>
// //             <span style={{ color:'var(--tx-3)' }}>{sec.startBar}–{sec.endBar}</span>
// //           </div>
// //         ))}
// //         {labeled.some(b=>b.isSurprise) && (
// //           <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:SUR_CLR+'18', border:`1px solid ${SUR_CLR}44`, fontSize:10, fontFamily:'var(--mono)' }}>
// //             <span style={{ width:8, height:8, borderRadius:2, background:SUR_CLR, display:'inline-block' }} />
// //             <span style={{ color:SUR_CLR, fontWeight:600 }}>Surprise</span>
// //           </div>
// //         )}
// //       </div>

// //       {/* Cell rows */}
// //       {rows.map((row, ri) => (
// //         <div key={ri} style={{ display:'flex', alignItems:'center', gap:3, marginBottom:2 }}>
// //           <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--tx-3)', width:20, textAlign:'right', flexShrink:0 }}>{row[0].barNumber}</span>
// //           <div style={{ display:'flex', gap:1, flex:1 }}>
// //             {row.map(lb => (
// //               <div
// //                 key={lb.barNumber}
// //                 onMouseEnter={() => setHov(lb)}
// //                 onMouseLeave={() => setHov(null)}
// //                 style={{
// //                   flex:1, height:22, borderRadius:2,
// //                   background: cellBg(lb),
// //                   opacity: lb.isEmpty ? 0.2 : 1,
// //                   cursor: 'default',
// //                   outline: hov?.barNumber===lb.barNumber ? '2px solid var(--tx-1)' : 'none',
// //                   position:'relative', transition:'outline 0.08s',
// //                 }}
// //               >
// //                 {lb.isSustain && <div style={{ position:'absolute', inset:'40% 0', height:2, background:'rgba(255,255,255,0.6)', borderRadius:1 }} />}
// //                 {lb.alternating && (
// //                   <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', gap:1 }}>
// //                     {[0,1,2].map(i=><div key={i} style={{ width:1, height:'55%', background:'rgba(255,255,255,0.45)', borderRadius:1 }} />)}
// //                   </div>
// //                 )}
// //               </div>
// //             ))}
// //           </div>
// //         </div>
// //       ))}

// //       {/* Tooltip */}
// //       {hov && (
// //         <div style={{ marginTop:8, padding:'8px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:11, fontFamily:'var(--mono)', color:'var(--text2)' }}>
// //           <span style={{ color:'var(--tx-1)', fontWeight:600 }}>Bar {hov.barNumber}</span>
// //           {' · '}
// //           <span style={{ color: hov.isSurprise ? SUR_CLR : (hov.isEmpty ? 'var(--tx-3)' : hov.color) }}>{hov.patternLabel}</span>
// //           {' · '}{hov.noteCount} notes
// //           {hov.alternating && <span style={{ color:'var(--accent)', marginLeft:8 }}>⟳ pedal:{hov.alternating.pedal}</span>}
// //           {hov.isSustain   && <span style={{ color:'var(--sky)',    marginLeft:8 }}>▬ sustain</span>}
// //           {hov.isSurprise  && <span style={{ color:SUR_CLR,        marginLeft:8 }}>★ surprise</span>}
// //         </div>
// //       )}
// //     </div>
// //   )
// // }

// // // ─── PATTERN CARDS ──────────────────────────────────────────────
// // function PatternCard({ pat, meta, spb }) {
// //   const occ = pat.occurrences[0]
// //   const bar = meta.bars.find(b => (b.bar_number ?? b.bn) === occ.startBar)
// //   const notes = bar ? [...bar.notes].map(normNote).sort((a,b)=>a.start_subdivision-b.start_subdivision) : []
// //   const altBar = (meta.bars||[]).find(b => {
// //     const bn = normBar(b)
// //     return bn.notes.length > 0 && pat.occurrences.some(o=>o.startBar===bn.bar_number) && detAlt(bn)
// //   })
// //   const alt = altBar ? detAlt(normBar(altBar)) : null

// //   const allMidis = notes.map(n=>p2m(n.pitch)).filter(x=>x!==null)
// //   const minM = allMidis.length ? Math.min(...allMidis) : 60
// //   const maxM = allMidis.length ? Math.max(...allMidis) : 72
// //   const range = Math.max(maxM - minM, 8)

// //   return (
// //     <div style={{ border:`1px solid ${pat.color}33`, borderRadius:'var(--radius)', overflow:'hidden', background:`linear-gradient(135deg,${pat.color}0d,${pat.color}05)` }}>
// //       {/* Header */}
// //       <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:pat.color+'1a' }}>
// //         <div style={{ display:'flex', alignItems:'center', gap:8 }}>
// //           <span style={{ width:10, height:10, borderRadius:'50%', background:pat.color, display:'inline-block', boxShadow:`0 0 6px ${pat.color}` }} />
// //           <span style={{ fontWeight:700, color:'var(--tx-1)', fontSize:13 }}>{pat.label}</span>
// //           <span style={{ fontSize:9, fontFamily:'var(--mono)', padding:'1px 6px', borderRadius:3, background:pat.color+'28', color:pat.color }}>{pat.type}</span>
// //         </div>
// //         <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{pat.occurrences.length}× · {pat.windowSize}bar</span>
// //       </div>

// //       <div style={{ padding:'10px 14px' }}>
// //         {/* Mini roll */}
// //         <div style={{ height:52, background:'var(--surface2)', borderRadius:'var(--radius-sm)', marginBottom:10, position:'relative', overflow:'hidden', border:'1px solid var(--border)' }}>
// //           {notes.slice(0,20).map((n,i) => {
// //             const mn = p2m(n.pitch); if (mn===null) return null
// //             const y = ((maxM - mn) / range) * 88
// //             const x = (n.start_subdivision / spb) * 100
// //             const w = Math.max((n.duration_subdivisions / spb) * 100, 2)
// //             return <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:`${w}%`, height:'10%', minHeight:3, background:pat.color, borderRadius:1, opacity:0.9 }} title={`${n.pitch} s${n.start_subdivision} d${n.duration_subdivisions}`} />
// //           })}
// //         </div>

// //         {/* Stats row */}
// //         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:10, fontFamily:'var(--mono)' }}>
// //           <div style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'6px 8px', border:'1px solid var(--border)' }}>
// //             <div style={{ color:'var(--tx-3)', marginBottom:2 }}>Bars</div>
// //             <div style={{ color:'var(--tx-1)', fontSize:11 }}>{pat.occurrences.map(o=>o.startBar).join(', ')}</div>
// //           </div>
// //           <div style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'6px 8px', border:'1px solid var(--border)' }}>
// //             <div style={{ color:'var(--tx-3)', marginBottom:2 }}>Score</div>
// //             <div style={{ color:'var(--tx-1)' }}>{pat.score.toFixed(1)}</div>
// //           </div>
// //         </div>

// //         {alt && (
// //           <div style={{ marginTop:6, padding:'5px 8px', borderRadius:'var(--radius-sm)', background:pat.color+'18', color:pat.color, fontSize:10, fontFamily:'var(--mono)' }}>
// //             ⟳ Pedal: <strong>{alt.pedal}</strong> · {alt.notesPerBar} notes/bar
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   )
// // }

// // // ─── GRAPH VIEW ─────────────────────────────────────────────────
// // function GraphView({ graph }) {
// //   const { nodes, edges } = graph
// //   if (!nodes.length) return <div style={{ color:'var(--tx-3)', fontSize:12, fontFamily:'var(--mono)' }}>No transitions detected</div>

// //   const maxW = Math.max(...edges.map(e=>e.weight), 1)
// //   const cx=260, cy=180, r=130

// //   const pos = {}
// //   nodes.forEach((nd, i) => {
// //     const a = (i / nodes.length) * Math.PI * 2 - Math.PI/2
// //     pos[nd.id] = { x: cx + r*Math.cos(a), y: cy + r*Math.sin(a) }
// //   })

// //   return (
// //     <div>
// //       <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', marginBottom:12 }}>
// //         <svg width="100%" viewBox="0 0 520 360">
// //           <defs>
// //             <marker id="ar" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
// //               <path d="M0,0 L0,6 L6,3 z" fill="#4b5563" />
// //             </marker>
// //           </defs>
// //           {edges.slice(0,16).map((e,i) => {
// //             const f=pos[e.from], t=pos[e.to]; if (!f||!t) return null
// //             const sw = Math.max(1,(e.weight/maxW)*3.5)
// //             const dx=t.x-f.x, dy=t.y-f.y
// //             const mx=(f.x+t.x)/2 - dy*0.15, my=(f.y+t.y)/2 + dx*0.15
// //             const stroke = e.weight>=maxW*0.6 ? (nodes.find(n=>n.id===e.from)?.color||'#4b5563') : '#374151'
// //             return (
// //               <g key={i}>
// //                 <path d={`M${f.x},${f.y} Q${mx},${my} ${t.x},${t.y}`} fill="none" stroke={stroke} strokeWidth={sw} strokeOpacity={0.55} markerEnd="url(#ar)" />
// //                 <text x={mx} y={my-3} textAnchor="middle" fill="#6b7280" fontSize="8">{e.weight}</text>
// //               </g>
// //             )
// //           })}
// //           {nodes.map(nd => {
// //             const p=pos[nd.id]; if (!p) return null
// //             const nr = Math.max(18, Math.min(30, 14+nd.count*1.2))
// //             return (
// //               <g key={nd.id}>
// //                 <circle cx={p.x} cy={p.y} r={nr} fill={nd.color} fillOpacity={0.18} stroke={nd.color} strokeWidth={1.5} />
// //                 <text x={p.x} y={p.y-3} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">{nd.id}</text>
// //                 <text x={p.x} y={p.y+9} textAnchor="middle" fill="#94a3b8" fontSize="8">{nd.count}b</text>
// //               </g>
// //             )
// //           })}
// //         </svg>
// //       </div>

// //       {/* Edge list */}
// //       <div style={{ fontSize:11, fontFamily:'var(--mono)', display:'flex', flexDirection:'column', gap:4 }}>
// //         {edges.slice(0,6).map((e,i) => (
// //           <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
// //             <span style={{ color: nodes.find(n=>n.id===e.from)?.color||'var(--tx-2)', width:30 }}>{e.from}</span>
// //             <span style={{ color:'var(--tx-3)' }}>→</span>
// //             <span style={{ color: nodes.find(n=>n.id===e.to)?.color||'var(--tx-2)', width:30 }}>{e.to}</span>
// //             <div style={{ flex:1, height:3, background:'var(--surface3)', borderRadius:2 }}>
// //               <div style={{ height:'100%', borderRadius:2, background:'var(--accent3)', width:`${(e.weight/maxW)*100}%` }} />
// //             </div>
// //             <span style={{ color:'var(--tx-3)', width:14, textAlign:'right' }}>{e.weight}</span>
// //           </div>
// //         ))}
// //       </div>
// //     </div>
// //   )
// // }

// // // ─── HAND TABLE ──────────────────────────────────────────────────
// // function HandTable({ alignment }) {
// //   const [page, setPage] = useState(0)
// //   const PG = 20
// //   const total = Math.ceil((alignment||[]).length / PG)
// //   const slice = (alignment||[]).slice(page*PG, (page+1)*PG)

// //   return (
// //     <div>
// //       <div style={{ display:'grid', gridTemplateColumns:'2rem 1fr 1fr', gap:4, marginBottom:6 }}>
// //         <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Bar</span>
// //         <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Right Hand</span>
// //         <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Left Hand</span>
// //       </div>
// //       <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
// //         {slice.map(aln => {
// //           const rhC = aln.rh?.color || EMP_CLR
// //           const lhC = aln.lh?.color || EMP_CLR
// //           return (
// //             <div key={aln.barNumber} style={{ display:'grid', gridTemplateColumns:'2rem 1fr 1fr', gap:4, alignItems:'center' }}>
// //               <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)', textAlign:'right' }}>{aln.barNumber}</span>
// //               <div style={{ padding:'3px 8px', borderRadius:4, fontSize:10, fontFamily:'var(--mono)', background:rhC+'22', color:rhC, border:`1px solid ${rhC}33`, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
// //                 {aln.rh?.patternLabel || '—'}
// //                 {aln.rh?.alternating && ' ⟳'}
// //                 {aln.rh?.isSustain   && ' ▬'}
// //               </div>
// //               <div style={{ padding:'3px 8px', borderRadius:4, fontSize:10, fontFamily:'var(--mono)', background:lhC+'22', color:lhC, border:`1px solid ${lhC}33`, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
// //                 {aln.lh?.patternLabel || '—'}
// //                 {aln.lh?.alternating && ' ⟳'}
// //               </div>
// //             </div>
// //           )
// //         })}
// //       </div>
// //       {total > 1 && (
// //         <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:10 }}>
// //           <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
// //                   style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:page===0?'not-allowed':'pointer', opacity:page===0?0.4:1, fontSize:11, fontFamily:'var(--mono)' }}>←</button>
// //           <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{page+1}/{total}</span>
// //           <button onClick={()=>setPage(p=>Math.min(total-1,p+1))} disabled={page===total-1}
// //                   style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:page===total-1?'not-allowed':'pointer', opacity:page===total-1?0.4:1, fontSize:11, fontFamily:'var(--mono)' }}>→</button>
// //         </div>
// //       )}
// //     </div>
// //   )
// // }

// // // ─── YAML PANEL ─────────────────────────────────────────────────
// // function YamlPanel({ yaml }) {
// //   const [copied, setCopied] = useState(false)
// //   const copy = () => {
// //     navigator.clipboard.writeText(yaml).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000) })
// //   }
// //   return (
// //     <div>
// //       <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
// //         <button onClick={copy} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color: copied?'var(--accent)':'var(--tx-2)', cursor:'pointer', fontSize:11, fontFamily:'var(--font)', fontWeight:600, transition:'all 0.15s' }}>
// //           {copied ? <Check size={11} stroke="var(--accent)" /> : <Copy size={11} />}
// //           {copied ? 'Copied!' : 'Copy YAML'}
// //         </button>
// //       </div>
// //       <textarea readOnly value={yaml}
// //                 style={{ width:'100%', minHeight:320, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:12, color:'var(--accent)', fontFamily:'var(--mono)', fontSize:11, resize:'vertical', outline:'none', lineHeight:1.7 }} />
// //     </div>
// //   )
// // }


// // // ═══════════════════════════════════════════════════════════════
// // // MAIN COMPONENT
// // // ═══════════════════════════════════════════════════════════════
// // const INNER_TABS = ['Timeline','Patterns','Graph','Hands','YAML']

// // export default function Analyzer() {
// //   const [input,   setInput]   = useState('')
// //   const [jsonOk,  setJsonOk]  = useState(true)
// //   const [result,  setResult]  = useState(null)
// //   const [running, setRunning] = useState(false)
// //   const [error,   setError]   = useState(null)
// //   const [inner,   setInner]   = useState('Timeline')
// //   const [copied,  setCopied]  = useState(false)
// //   const fileRef = useRef(null)

// //   const handleChange = v => {
// //     setInput(v)
// //     try { JSON.parse(v); setJsonOk(true) } catch { setJsonOk(false) }
// //   }

// //   const handleFile = e => {
// //     const f = e.target.files[0]; if (!f) return
// //     const reader = new FileReader()
// //     reader.onload = ev => handleChange(ev.target.result)
// //     reader.readAsText(f)
// //     e.target.value = ''
// //   }

// //   const analyze = useCallback(() => {
// //     if (!input.trim() || !jsonOk) return
// //     setRunning(true); setError(null)
// //     setTimeout(() => {
// //       try {
// //         const r = runAnalysis(JSON.parse(input))
// //         setResult(r); setInner('Timeline')
// //       } catch(e) {
// //         setError(e.message || 'Analysis failed')
// //       } finally {
// //         setRunning(false)
// //       }
// //     }, 30)
// //   }, [input, jsonOk])

// //   const { meta, result: res, yaml } = result || {}

// //   return (
// //     <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

// //       {/* ── Input area ──────────────────────────────────────── */}
// //       <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
// //         <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
// //           <div style={{ fontSize:11, fontWeight:600, color:'var(--tx-2)', letterSpacing:'0.5px', textTransform:'uppercase', fontFamily:'var(--mono)' }}>
// //             JSON Input
// //           </div>
// //           <div style={{ display:'flex', alignItems:'center', gap:8 }}>
// //             <span style={{ fontSize:10, fontFamily:'var(--mono)', padding:'2px 7px', borderRadius:4, background: !input.trim() ? 'var(--surface3)' : jsonOk ? 'rgba(184,245,74,0.07)' : 'rgba(245,85,74,0.07)', color: !input.trim() ? 'var(--tx-3)' : jsonOk ? 'var(--lime)' : 'var(--rose)', border: `1px solid ${!input.trim() ? 'var(--border)' : jsonOk ? 'rgba(184,245,74,0.2)' : 'rgba(245,85,74,0.2)'}` }}>
// //               {!input.trim() ? 'empty' : jsonOk ? '✓ valid' : '✗ invalid'}
// //             </span>
// //             <input ref={fileRef} type="file" accept=".json,.txt" style={{ display:'none' }} onChange={handleFile} />
// //             <button onClick={()=>fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:'pointer', fontSize:11, fontFamily:'var(--font)', fontWeight:600 }}>
// //               <Upload size={11} /> Load file
// //             </button>
// //           </div>
// //         </div>

// //         <textarea
// //           value={input}
// //           onChange={e => handleChange(e.target.value)}
// //           spellCheck={false}
// //           placeholder={'Paste MIDI JSON here — compact (p/s/d/bn) or full format…\n\n{"tempo":120,"time_signature":"4/4","key":"Am","subdivisions_per_bar":16,"bars":[…]}'}
// //           style={{ width:'100%', minHeight:160, background:'var(--surface2)', border:`1px solid ${!input.trim()||jsonOk ? 'var(--border)' : 'rgba(245,85,74,0.35)'}`, borderRadius:'var(--radius-sm)', padding:12, color:'var(--text)', fontFamily:'var(--mono)', fontSize:12, resize:'vertical', outline:'none', lineHeight:1.7, transition:'border-color 0.2s' }}
// //           onFocus={e => e.target.style.borderColor = jsonOk ? 'var(--border2)' : 'rgba(245,85,74,0.5)'}
// //           onBlur={e  => e.target.style.borderColor = !input.trim()||jsonOk ? 'var(--border)' : 'rgba(245,85,74,0.35)'}
// //         />

// //         {error && (
// //           <div style={{ fontSize:12, color:'var(--rose)', background:'rgba(245,85,74,0.07)', border:'1px solid rgba(245,85,74,0.2)', borderRadius:'var(--radius-sm)', padding:'8px 12px', fontFamily:'var(--mono)' }}>
// //             ⚠ {error}
// //           </div>
// //         )}

// //         <button
// //           onClick={analyze}
// //           disabled={running || !input.trim() || !jsonOk}
// //           style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 18px', borderRadius:'var(--radius-sm)', background: running||!input.trim()||!jsonOk ? 'var(--surface3)' : 'var(--accent)', color: running||!input.trim()||!jsonOk ? 'var(--tx-3)' : '#000', fontSize:12, fontWeight:700, cursor: running||!input.trim()||!jsonOk ? 'not-allowed' : 'pointer', border:'none', transition:'all 0.15s ease', alignSelf:'flex-start', fontFamily:'var(--font)' }}
// //           onMouseEnter={e => { if (!running&&input.trim()&&jsonOk) { e.currentTarget.style.background='#d4f570'; e.currentTarget.style.transform='translateY(-1px)' } }}
// //           onMouseLeave={e => { e.currentTarget.style.background=running||!input.trim()||!jsonOk?'var(--surface3)':'var(--accent)'; e.currentTarget.style.transform='none' }}
// //         >
// //           <Activity size={13} />
// //           {running ? 'Analyzing…' : 'Analyze'}
// //         </button>
// //       </div>

// //       {/* ── Results ─────────────────────────────────────────── */}
// //       {result && (
// //         <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'fadeUp 0.2s ease' }}>

// //           {/* Summary bar */}
// //           <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'10px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:11, fontFamily:'var(--mono)' }}>
// //             {[
// //               [`${meta.bars.length} bars`,         'var(--tx-2)'],
// //               [`${res.rhPatterns.length} RH pats`,  'var(--accent)'],
// //               [`${res.lhPatterns.length} LH pats`,  'var(--sky)'],
// //               [`${res.rhSections.length} sections`, 'var(--mint)'],
// //               [`split MIDI ${res.split} (${m2n(res.split)})`, 'var(--tx-3)'],
// //               [`${res.rhLabeled.filter(b=>b.isSurprise).length} surprises`, 'var(--rose)'],
// //             ].map(([label, color]) => (
// //               <span key={label} style={{ color, padding:'1px 7px', borderRadius:4, background:'var(--surface3)', border:'1px solid var(--border)' }}>
// //                 {label}
// //               </span>
// //             ))}
// //           </div>

// //           {/* Inner tab bar */}
// //           <div style={{ display:'flex', gap:2 }}>
// //             {INNER_TABS.map(t => {
// //               const on = inner===t
// //               return (
// //                 <button key={t} onClick={()=>setInner(t)} style={{ padding:'4px 12px', borderRadius:'var(--radius-sm)', border: on ? '1px solid var(--border2)' : '1px solid transparent', background: on ? 'var(--surface2)' : 'transparent', color: on ? 'var(--tx-1)' : 'var(--tx-3)', fontSize:11, fontWeight: on ? 600 : 400, cursor:'pointer', transition:'all 0.12s', fontFamily:'var(--mono)', letterSpacing:'0.3px' }}>
// //                   {t}
// //                 </button>
// //               )
// //             })}
// //           </div>

// //           {/* Inner content */}
// //           <div style={{ animation:'fadeUp 0.15s ease' }}>
// //             {inner==='Timeline' && (
// //               <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
// //                 <TimelineRow labeled={res.rhLabeled} sections={res.rhSections} title="Right Hand" />
// //                 <TimelineRow labeled={res.lhLabeled} sections={res.lhSections} title="Left Hand" />
// //               </div>
// //             )}

// //             {inner==='Patterns' && (
// //               <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
// //                 {res.rhPatterns.length > 0 && (
// //                   <>
// //                     <div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase' }}>Right Hand — {res.rhPatterns.length} patterns</div>
// //                     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
// //                       {res.rhPatterns.map(p => <PatternCard key={p.id} pat={p} meta={meta} spb={meta.subdivisions_per_bar} />)}
// //                     </div>
// //                   </>
// //                 )}
// //                 {res.lhPatterns.length > 0 && (
// //                   <>
// //                     <div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginTop:8 }}>Left Hand — {res.lhPatterns.length} patterns</div>
// //                     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
// //                       {res.lhPatterns.map(p => <PatternCard key={p.id} pat={p} meta={meta} spb={meta.subdivisions_per_bar} />)}
// //                     </div>
// //                   </>
// //                 )}
// //                 {res.rhPatterns.length===0 && res.lhPatterns.length===0 && (
// //                   <div style={{ color:'var(--tx-3)', fontSize:12, fontFamily:'var(--mono)' }}>No repeating patterns detected</div>
// //                 )}
// //               </div>
// //             )}

// //             {inner==='Graph' && <GraphView graph={res.rhGraph} />}

// //             {inner==='Hands' && <HandTable alignment={res.alignment} />}

// //             {inner==='YAML' && <YamlPanel yaml={yaml} />}
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   )
// // }










// // frontend/src/components/tools/Analyzer.jsx  v2.0
// // Music pattern analyzer — fits inside Tools.jsx tab panel.
// // Design: matches existing tool design system exactly.
// //   CSS vars: --surface, --surface2, --surface3, --border, --border2,
// //             --text, --text2, --text3, --accent, --accent2, --accent3,
// //             --mono, --font, --radius, --radius-sm, --danger, --lime,
// //             --sky, --rose, --mint
// // No Tailwind — pure inline styles only.
// //
// // v2.0 FIX SUMMARY:
// //   BUG #1  Large-window patterns (8-bar) consumed cadence bars (9-10,
// //           17-18…) before short patterns could claim them.
// //   FIX #1  detectPatterns: sort dedup SHORT-FIRST so 1-bar cadence
// //           patterns own their bars before 8-bar containers see them.
// //
// //   BUG #2  Section detector absorbed ALL SURPRISE bars into previous
// //           section, splitting 2-bar cadences.
// //   FIX #2  detectSections: no surprise absorption. Every bar is in
// //           exactly the section it belongs to.
// //
// //   BUG #3  1-bar merge was eating sustain/cadence bars.
// //   FIX #3  1-bar merge only for isEmpty===true (zero-note) bars.
// //
// //   NEW     detectRelationships() — cadence_of, alternates_with,
// //           always_followed_by, role assignment, structural period.
// //
// //   NEW     "Relations" inner tab showing all the above.

// import { useState, useRef, useCallback } from 'react'
// import { Upload, Copy, Check, Activity } from '../shared/Icons.jsx'

// // ─── PITCH HELPERS ───────────────────────────────────────────────
// const NOTE_MAP = {
//   'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,
//   'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11
// }
// const MIDI_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

// function p2m(pitch) {
//   const m = String(pitch || '').match(/^([A-G][#Bb]?)(-?\d+)$/i)
//   if (!m) return null
//   const pc = NOTE_MAP[m[1].toUpperCase()]
//   return pc === undefined ? null : (parseInt(m[2]) + 1) * 12 + pc
// }
// function m2n(midi) { return MIDI_NOTES[midi % 12] + (Math.floor(midi / 12) - 1) }

// // ─── NORMALISER ──────────────────────────────────────────────────
// function normNote(n) {
//   return {
//     pitch:                 n.pitch ?? n.p,
//     start_subdivision:     n.start_subdivision ?? n.s ?? 0,
//     duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
//   }
// }
// function normBar(b) {
//   return { bar_number: b.bar_number ?? b.bn, notes: (b.notes ?? []).map(normNote) }
// }
// function normJson(j) {
//   const ts = j.time_signature || '4/4'
//   const [n, d] = ts.split('/').map(Number)
//   return {
//     tempo: j.tempo || 120, time_signature: ts, key: j.key || 'C',
//     subdivisions_per_bar: j.subdivisions_per_bar || (n * (16 / d)),
//     bars: (j.bars || []).map(normBar)
//   }
// }

// // ─── PATTERN COLORS ──────────────────────────────────────────────
// const PAT_COLORS = [
//   '#06b6d4','#8b5cf6','#f59e0b','#10b981',
//   '#f43f5e','#3b82f6','#a855f7','#ec4899','#84cc16','#f97316'
// ]
// const SUR_CLR = '#ef4444'
// const EMP_CLR = '#374151'

// // Role badge colors
// const ROLE_STYLE = {
//   main_theme:  { bg:'rgba(6,182,212,0.15)',  color:'#06b6d4' },
//   cadence:     { bg:'rgba(245,158,11,0.15)', color:'#f59e0b' },
//   intro:       { bg:'rgba(16,185,129,0.15)', color:'#10b981' },
//   outro:       { bg:'rgba(16,185,129,0.15)', color:'#10b981' },
//   body:        { bg:'rgba(148,163,184,0.1)', color:'#94a3b8' },
//   transition:  { bg:'rgba(239,68,68,0.12)',  color:'#ef4444' },
//   bridge:      { bg:'rgba(139,92,246,0.15)', color:'#8b5cf6' },
// }

// // ─── HAND SPLIT ──────────────────────────────────────────────────
// function detectSplit(bars) {
//   const pf = new Map()
//   for (const b of bars)
//     for (const n of b.notes) { const m = p2m(n.pitch); if (m !== null) pf.set(m, (pf.get(m)||0)+1) }
//   if (pf.size < 2) return 60
//   const sorted = [...pf.keys()].sort((a, b) => a - b)
//   let best = -1, split = 60
//   for (let i = 1; i < sorted.length; i++) {
//     const lo = sorted[i-1], hi = sorted[i], gap = hi - lo
//     if (!gap) continue
//     const mid = (lo + hi) / 2
//     // Weight gaps in C3–C5 zone 3× — prevents bass octave jumps winning
//     const w = gap * (mid >= 48 && mid <= 72 ? 3.0 : 0.7)
//     if (w > best) { best = w; split = Math.round(mid) }
//   }
//   return split
// }

// // ─── FINGERPRINTS ────────────────────────────────────────────────
// function ord(bar) { return [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision) }
// function fpR(bar) { return ord(bar).map(n => `${n.start_subdivision}:${n.duration_subdivisions}`).join('|') || 'empty' }
// function fpC(bar) {
//   const s = ord(bar)
//   if (!s.length) return 'empty'
//   if (s.length < 2) return `1:${s[0].duration_subdivisions}`
//   const iv = []
//   for (let i = 1; i < s.length; i++) {
//     const a = p2m(s[i-1].pitch), b = p2m(s[i].pitch)
//     iv.push(a !== null && b !== null ? b - a : '?')
//   }
//   return iv.join(',')
// }
// function fpE(bar) { return ord(bar).map(n => `${n.pitch}@${n.start_subdivision}:${n.duration_subdivisions}`).join('|') || 'empty' }
// function fpT(bar) {
//   const nn = bar.notes
//   if (!nn.length) return 'empty'
//   const dc = {}; for (const x of nn) dc[x.duration_subdivisions] = (dc[x.duration_subdivisions]||0)+1
//   const dd = Object.entries(dc).sort((a,b)=>b[1]-a[1])[0][0]
//   return `n${nn.length}_d${dd}_max${Math.max(...nn.map(x=>x.duration_subdivisions))}`
// }

// // Quality rank: higher = more specific = preferred in tiebreaks
// function qRank(q) { return { exact:4, rhythmic:3, melodic:2, textural:1, window:0 }[q] ?? 0 }

// // ─── ALTERNATING DETECTOR ────────────────────────────────────────
// function detAlt(bar) {
//   const s = ord(bar); if (s.length < 4) return null
//   const same = s.every(n => n.duration_subdivisions === s[0].duration_subdivisions)
//   const ev = s.filter((_,i) => i%2===0), od = s.filter((_,i) => i%2===1)
//   const ep = new Set(ev.map(n=>n.pitch)), op = new Set(od.map(n=>n.pitch))
//   if (op.size===1 && ep.size>1 && same) return { pedal: [...op][0], melody: ev.map(n=>n.pitch), notesPerBar: s.length, dur: s[0].duration_subdivisions }
//   if (ep.size===1 && op.size>1 && same) return { pedal: [...ep][0], melody: od.map(n=>n.pitch), notesPerBar: s.length, dur: s[0].duration_subdivisions }
//   return null
// }

// // ═══════════════════════════════════════════════════════════════
// // PATTERN DETECTION  v2.0  — FIX #1: SHORT-FIRST sort
// // ═══════════════════════════════════════════════════════════════
// // OLD: sorted by total score DESC → 8-bar window claimed bars 3-10,
// //      consuming cadence bars 9-10 before smaller patterns could claim them.
// // NEW: sorted by (windowSize ASC, perBarScore DESC) → 1-bar exact matches
// //      claim their bars first; 8-bar windows fill remaining unclaimed bars.
// function detectPatterns(bars, spb) {
//   if (!bars.length) return []
//   const maps = { e: new Map(), r: new Map(), c: new Map(), t: new Map(), w: new Map() }
//   const hp = (m, k, e) => { if (!m.has(k)) m.set(k,[]); m.get(k).push(e) }

//   for (let i = 0; i < bars.length; i++) {
//     const b = bars[i], e = { barIdx: i, startBar: b.bar_number, w: 1 }
//     hp(maps.e, fpE(b), e); hp(maps.r, fpR(b), e); hp(maps.c, fpC(b), e); hp(maps.t, fpT(b), e)
//   }
//   for (const w of [2,4,8].filter(w => w <= bars.length)) {
//     for (let i = 0; i <= bars.length - w; i++) {
//       const sl = bars.slice(i, i+w)
//       const rk = sl.map((b,j) => `[${j}:${fpR(b)}]`).join('')
//       const ck = sl.map((b,j) => `[${j}:${fpC(b)}]`).join('')
//       const e  = { barIdx: i, startBar: bars[i].bar_number, w }
//       hp(maps.w, `R${w}:${rk}`, e); hp(maps.w, `C${w}:${rk}~~${ck}`, e)
//     }
//   }

//   const cands = []
//   const addC = (m, type, q) => {
//     for (const [fp, oc] of m) {
//       if (oc.length < 2) continue
//       const w = oc[0].w
//       cands.push({
//         fingerprint: fp, type, windowSize: w, occurrences: oc, quality: q,
//         perBarScore: oc.length * q,          // per-bar quality × frequency
//         totalScore:  oc.length * w * q       // for final ordering only
//       })
//     }
//   }
//   addC(maps.e,'exact',3.0); addC(maps.r,'rhythmic',2.0); addC(maps.c,'melodic',1.8)
//   addC(maps.t,'textural',1.0); addC(maps.w,'window',2.5)

//   // FIX #1: SHORT-FIRST, then highest per-bar score
//   cands.sort((a, b) => {
//     if (a.windowSize !== b.windowSize) return a.windowSize - b.windowSize  // shorter first
//     if (a.quality !== b.quality) return qRank(b.quality) - qRank(a.quality)  // higher quality first
//     return b.perBarScore - a.perBarScore
//   })

//   const covered = new Set(), finals = []
//   for (const c of cands) {
//     const nw = []
//     for (const o of c.occurrences) for (let j=0; j<c.windowSize; j++) {
//       const bn = o.startBar+j; if (!covered.has(bn)) nw.push(bn)
//     }
//     if (nw.length >= 2 || finals.length < 2) {
//       finals.push(c); for (const bn of nw) covered.add(bn)
//     }
//     if (finals.length >= 10) break
//   }

//   // Re-sort finals by total score DESC so label A = most common/prominent
//   finals.sort((a, b) => b.totalScore - a.totalScore)
//   finals.forEach((p, i) => {
//     p.id    = `P${String.fromCharCode(65+i)}`
//     p.label = `Pattern ${String.fromCharCode(65+i)}`
//     p.color = PAT_COLORS[i] || '#6b7280'
//   })
//   return finals
// }

// // ═══════════════════════════════════════════════════════════════
// // BAR LABELER  — tiebreak: shorter window > higher quality
// // ═══════════════════════════════════════════════════════════════
// function labelBars(bars, patterns, spb) {
//   const lookup = new Map()
//   for (const pat of patterns) for (const occ of pat.occurrences) for (let j=0; j<pat.windowSize; j++) {
//     const bn = occ.startBar+j
//     if (!lookup.has(bn)) lookup.set(bn,[])
//     lookup.get(bn).push(pat)
//   }
//   return bars.map(bar => {
//     const bn = bar.bar_number
//     const isEmpty = !bar.notes.length
//     const isSustain = bar.notes.length===1 && bar.notes[0].duration_subdivisions >= spb-1
//     const alt = isEmpty ? null : detAlt(bar)

//     // Tiebreak: prefer shorter window, then higher quality, then perBarScore
//     const matches = (lookup.get(bn) || []).slice().sort((a, b) => {
//       if (a.windowSize !== b.windowSize) return a.windowSize - b.windowSize
//       if (a.quality !== b.quality) return qRank(b.quality) - qRank(a.quality)
//       return b.perBarScore - a.perBarScore
//     })
//     const best = matches[0] || null

//     return {
//       barNumber: bn, notes: bar.notes,
//       patternId:    isEmpty ? 'EMPTY' : (best?.id || 'SURPRISE'),
//       patternLabel: isEmpty ? 'Empty' : (best?.label || 'Surprise'),
//       color:        isEmpty ? EMP_CLR : (best?.color || SUR_CLR),
//       isSurprise: !isEmpty && !best, isEmpty, isSustain,
//       noteCount: bar.notes.length, alternating: alt,
//       maxDuration: bar.notes.length ? Math.max(...bar.notes.map(n=>n.duration_subdivisions)) : 0,
//     }
//   })
// }

// // ═══════════════════════════════════════════════════════════════
// // SECTION DETECTOR  v2.0  — FIX #2 + FIX #3
// // ═══════════════════════════════════════════════════════════════
// // FIX #2: No SURPRISE absorption into adjacent sections.
// //         Every bar forms its own group; run-length encodes faithfully.
// // FIX #3: 1-bar merge ONLY for truly empty (zero-note) bars.
// //         Sustain bars and SURPRISE bars keep their own section.
// function detectSections(labeled, patterns) {
//   // Pass 1: pure run-length encode — NO surprise absorption
//   const raw = []; let cur = null
//   for (const lb of labeled) {
//     const pid = lb.patternId
//     if (!cur || cur.pid !== pid) {
//       cur = { pid, label: lb.patternLabel, color: lb.color, bars: [lb] }
//       raw.push(cur)
//     } else {
//       cur.bars.push(lb)
//     }
//   }

//   // Pass 2: merge ONLY empty (zero-note) 1-bar groups into previous
//   // FIX #3: isSustain bars are NEVER merged — they are their own section
//   const merged = []
//   for (let i = 0; i < raw.length; i++) {
//     const g = raw[i]
//     const isOnlyEmpty = g.bars.length === 1 && g.bars[0].isEmpty
//     if (isOnlyEmpty && merged.length > 0) {
//       merged[merged.length - 1].bars.push(...g.bars)
//     } else {
//       merged.push(g)
//     }
//   }

//   // Pass 3: assign musical letters + repeat markers
//   const lm = new Map(); let nl = 0
//   return merged.map((g, idx) => {
//     const fb = g.bars[0].barNumber, lb2 = g.bars[g.bars.length-1].barNumber
//     const pat = patterns.find(p => p.id === g.pid)
//     if (!lm.has(g.pid)) lm.set(g.pid, String.fromCharCode(65+nl++))
//     const letter   = lm.get(g.pid)
//     const isRepeat = idx > 0 && merged.slice(0, idx).some(p => p.pid === g.pid)
//     const rc       = merged.slice(0, idx).filter(p => p.pid === g.pid).length
//     const altCount = g.bars.filter(b => b.alternating).length
//     const susCount = g.bars.filter(b => b.isSustain).length
//     const tex      = altCount > g.bars.length/2 ? 'alternating'
//                    : susCount > 0 ? 'sustain_cadence' : 'mixed'
//     return {
//       id: idx, startBar: fb, endBar: lb2, barCount: g.bars.length,
//       pid: g.pid, label: g.label,
//       color: pat ? pat.color : (g.pid==='EMPTY' ? EMP_CLR : SUR_CLR),
//       letter, isRepeat, repeatCount: rc,
//       fullLabel: isRepeat ? `${letter}${rc>1?rc:"'"}` : letter,
//       bars: g.bars, dominantTexture: tex,
//     }
//   })
// }

// // ─── GRAPH BUILDER ──────────────────────────────────────────────
// function buildGraph(labeled, patterns) {
//   const nm = new Map()
//   for (const lb of labeled) {
//     if (!nm.has(lb.patternId)) nm.set(lb.patternId, { id: lb.patternId, label: lb.patternLabel, color: lb.color, count: 0 })
//     nm.get(lb.patternId).count++
//   }
//   const em = new Map()
//   for (let i=0; i<labeled.length-1; i++) {
//     const f=labeled[i].patternId, t=labeled[i+1].patternId
//     if (f===t) continue; const k=`${f}|||${t}`; em.set(k,(em.get(k)||0)+1)
//   }
//   const edges = []; for (const [k,w] of em) { const [f,t]=k.split('|||'); edges.push({from:f,to:t,weight:w}) }
//   return { nodes:[...nm.values()], edges: edges.sort((a,b)=>b.weight-a.weight) }
// }

// // ═══════════════════════════════════════════════════════════════
// // RELATIONSHIP DETECTOR  — NEW
// // Computes musical relationships between pattern pairs from sections.
// // ═══════════════════════════════════════════════════════════════
// function detectRelationships(sections, patterns, totalBars) {
//   const nonEmpty = sections.filter(s => s.pid !== 'EMPTY')
//   if (!nonEmpty.length) return { pairs: [], roles: {}, period: null }

//   // Transition frequency matrix
//   const trans = {}  // from → { to → count }
//   for (let i = 0; i < nonEmpty.length - 1; i++) {
//     const f = nonEmpty[i].pid, t = nonEmpty[i+1].pid
//     if (!trans[f]) trans[f] = {}
//     trans[f][t] = (trans[f][t] || 0) + 1
//   }

//   const appears = {}
//   for (const s of nonEmpty) appears[s.pid] = (appears[s.pid] || 0) + 1

//   const patIds = [...new Set(nonEmpty.map(s => s.pid))]
//   const pairs  = []

//   for (const A of patIds) {
//     const aTotals = Object.values(trans[A] || {}).reduce((s,n)=>s+n,0)
//     for (const B of patIds) {
//       if (A === B) continue
//       const aToB = (trans[A]?.[B] || 0)
//       if (!aToB) continue

//       const followRate = aTotals > 0 ? aToB / aTotals : 0
//       const bSecs      = sections.filter(s => s.pid === B)
//       const bAvgBars   = bSecs.length ? bSecs.reduce((s,x)=>s+x.barCount,0) / bSecs.length : 0
//       const bHasSustain = bSecs.some(s => s.dominantTexture === 'sustain_cadence')

//       // Back-transition rate (does B also always return to A?)
//       const bTotals = Object.values(trans[B] || {}).reduce((s,n)=>s+n,0)
//       const bToA    = (trans[B]?.[A] || 0)
//       const backRate = bTotals > 0 ? bToA / bTotals : 0

//       let type = 'follows'
//       if (followRate >= 0.7 && backRate >= 0.7) {
//         type = 'alternates_with'
//       } else if (followRate >= 0.85 && bAvgBars <= 2 && bHasSustain) {
//         type = 'cadence_of'        // A resolves into short sustain B
//       } else if (followRate >= 0.85 && bAvgBars <= 2) {
//         type = 'transitions_to'   // A always moves to brief B
//       } else if (followRate >= 0.85) {
//         type = 'always_followed_by'
//       } else if (followRate >= 0.5) {
//         type = 'often_followed_by'
//       }

//       pairs.push({ from: A, to: B, aToB, followRate: Math.round(followRate*100)/100, type })
//     }
//   }

//   // Role assignment
//   const maxCount = Math.max(...patIds.map(id => appears[id] || 0), 1)
//   const roles = {}
//   for (const id of patIds) {
//     const count     = appears[id] || 0
//     const secs      = sections.filter(s => s.pid === id)
//     const avgBars   = secs.length ? secs.reduce((s,x)=>s+x.barCount,0)/secs.length : 0
//     const hasSust   = secs.some(s => s.dominantTexture === 'sustain_cadence')
//     const firstBar  = secs.length ? Math.min(...secs.map(s=>s.startBar)) : 0
//     const lastBar   = secs.length ? Math.max(...secs.map(s=>s.endBar)) : 0

//     if (firstBar <= 4 && count <= 2) roles[id] = 'intro'
//     else if (lastBar >= totalBars - 4 && count <= 3) roles[id] = 'outro'
//     else if (count / maxCount >= 0.45) roles[id] = 'main_theme'
//     else if (avgBars <= 2 && hasSust) roles[id] = 'cadence'
//     else if (avgBars <= 2) roles[id] = 'transition'
//     else roles[id] = 'body'
//   }

//   // Structural period: shortest repeating section sequence
//   const seq = nonEmpty.map(s => s.pid)
//   let period = null
//   for (let p = 1; p <= Math.floor(seq.length / 2); p++) {
//     const unit = seq.slice(0, p)
//     const reps = Math.floor(seq.length / p)
//     const reconstructed = Array.from({length: reps * p}, (_, i) => unit[i % p])
//     if (JSON.stringify(reconstructed) === JSON.stringify(seq.slice(0, reps * p))) {
//       const cycleBars = sections.filter(s=>s.pid!=='EMPTY').slice(0, p).reduce((acc,s)=>acc+s.barCount,0)
//       period = { patternCount: p, barsPerCycle: cycleBars, unit: unit }
//       break
//     }
//   }

//   return { pairs, roles, period }
// }

// // ─── YAML GENERATOR ─────────────────────────────────────────────
// function genYaml(analysis, metadata) {
//   const { rhPatterns, rhLabeled, rhSections, rhGraph, lhPatterns, split, rels } = analysis

//   const motifs = rhPatterns.map(p => {
//     const occ  = p.occurrences[0]
//     const bar  = metadata.bars.find(b => b.bar_number === occ.startBar)
//     const notes = bar ? ord({ notes: bar.notes.map(normNote) }).slice(0,6).map(n=>`${n.pitch}@s${n.start_subdivision}:d${n.duration_subdivisions}`).join(', ') : ''
//     const role = rels.roles[p.id] || 'body'
//     return `  ${p.id}:\n    label: "${p.label}"\n    type: "${p.type}"\n    role: "${role}"\n    occurrences: ${p.occurrences.length}\n    window: ${p.windowSize}\n    bars: [${p.occurrences.map(o=>o.startBar).join(', ')}]\n    sample: [${notes}]`
//   }).join('\n\n') || '  # none'

//   const secs = rhSections.map(s =>
//     `  - label: "${s.fullLabel}"  bars: [${s.startBar}, ${s.endBar}]  count: ${s.barCount}  texture: "${s.dominantTexture}"  repeat: ${s.isRepeat}`
//   ).join('\n') || '  # none'

//   const relLines = (rels.pairs||[]).filter(r => r.type !== 'follows').map(r =>
//     `  - "${r.from}" ${r.type} "${r.to}" (${Math.round(r.followRate*100)}%)`
//   ).join('\n') || '  # none'

//   const edges = (rhGraph.edges||[]).slice(0,6).map(e=>`    - "${e.from}" → "${e.to}" (${e.weight}×)`).join('\n') || '    # none'

//   const order    = rhSections.map(s=>s.fullLabel).join(' → ') || 'N/A'
//   const surprises = rhLabeled.filter(b=>b.isSurprise).map(b=>b.barNumber).join(', ') || 'none'
//   const sustains  = rhLabeled.filter(b=>b.isSustain).map(b=>b.barNumber).join(', ')  || 'none'
//   const periodStr = rels.period
//     ? `${rels.period.patternCount} sections = ${rels.period.barsPerCycle} bars per cycle`
//     : 'not detected'

//   return `# MIDI ANALYSIS BLUEPRINT — MidiGen Analyzer v2.0
// composition:
//   key: "${metadata.key}"
//   tempo: ${metadata.tempo}
//   time_signature: "${metadata.time_signature}"
//   total_bars: ${metadata.bars.length}
//   subdivisions_per_bar: ${metadata.subdivisions_per_bar}
//   hand_split_midi: ${split}
//   structural_period: "${periodStr}"

// motifs:
// ${motifs}

// sections:
// ${secs}

// section_sequence: "${order}"
// surprise_bars: [${surprises}]
// sustain_bars:  [${sustains}]

// relationships:
// ${relLines}

// graph:
// ${edges}

// generation_rules:
//   - "Section sequence: ${order}"
//   - "Cadence/surprise bars: [${surprises}]"
//   - "Sustain bars: [${sustains}]"
//   - "Period: ${periodStr}"
//   - "RH patterns: ${rhPatterns.length}  LH patterns: ${lhPatterns.length}"
// `
// }

// // ─── MAIN ANALYSIS RUNNER ───────────────────────────────────────
// function runAnalysis(rawJson) {
//   const meta = normJson(rawJson)
//   const spb  = meta.subdivisions_per_bar
//   const split = detectSplit(meta.bars)

//   const rhBars = meta.bars.map(b => ({ ...b, notes: b.notes.filter(n => (p2m(n.pitch)??0) >= split) }))
//   const lhBars = meta.bars.map(b => ({ ...b, notes: b.notes.filter(n => (p2m(n.pitch)??0) <  split) }))

//   const rhPatterns = detectPatterns(rhBars.filter(b=>b.notes.length>0), spb)
//   const lhPatterns = detectPatterns(lhBars.filter(b=>b.notes.length>0), spb)
//   const rhLabeled  = labelBars(rhBars, rhPatterns, spb)
//   const lhLabeled  = labelBars(lhBars, lhPatterns, spb)
//   const rhSections = detectSections(rhLabeled, rhPatterns)
//   const lhSections = detectSections(lhLabeled, lhPatterns)
//   const rhGraph    = buildGraph(rhLabeled, rhPatterns)
//   const rels       = detectRelationships(rhSections, rhPatterns, meta.bars.length)

//   const allBNs = new Set([...rhLabeled.map(b=>b.barNumber), ...lhLabeled.map(b=>b.barNumber)])
//   const rhM = new Map(rhLabeled.map(b=>[b.barNumber,b]))
//   const lhM = new Map(lhLabeled.map(b=>[b.barNumber,b]))
//   const alignment = [...allBNs].sort((a,b)=>a-b).map(bn=>({ barNumber:bn, rh:rhM.get(bn)||null, lh:lhM.get(bn)||null }))

//   const result = { rhPatterns, lhPatterns, rhLabeled, lhLabeled, rhSections, lhSections, rhGraph, alignment, split, rels }
//   return { meta, result, yaml: genYaml(result, meta) }
// }


// // ═══════════════════════════════════════════════════════════════
// // UI COMPONENTS
// // ═══════════════════════════════════════════════════════════════

// // ─── TIMELINE ROW ───────────────────────────────────────────────
// function TimelineRow({ labeled, sections, title, period }) {
//   const [hov, setHov] = useState(null)
//   if (!labeled || !labeled.some(b=>!b.isEmpty)) return null

//   const secColorMap = new Map(sections.map(s => [s.pid, s.color]))
//   const ROW = 16
//   const rows = []
//   for (let i=0; i<labeled.length; i+=ROW) rows.push(labeled.slice(i,i+ROW))

//   const cellBg = lb => {
//     if (lb.isEmpty) return EMP_CLR
//     if (lb.isSurprise) return SUR_CLR
//     return secColorMap.get(lb.patternId) || lb.color
//   }

//   // Deduplicate sections for legend (show each unique pid once)
//   const legendSections = sections.filter((s, idx, arr) =>
//     arr.findIndex(x => x.pid === s.pid) === idx && s.pid !== 'EMPTY'
//   )

//   return (
//     <div>
//       <div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>
//         {title}
//       </div>

//       {/* Period indicator */}
//       {period && (
//         <div style={{ marginBottom:8, padding:'3px 10px', borderRadius:4, background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.25)', fontSize:10, color:'#06b6d4', fontFamily:'var(--mono)', display:'inline-block' }}>
//           ⟳ Period: {period.patternCount} sections = {period.barsPerCycle} bars/cycle
//         </div>
//       )}

//       {/* Legend */}
//       <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
//         {legendSections.map(sec => (
//           <div key={sec.pid} style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:sec.color+'18', border:`1px solid ${sec.color}44`, fontSize:10, fontFamily:'var(--mono)' }}>
//             <span style={{ width:8, height:8, borderRadius:2, background:sec.color, display:'inline-block', flexShrink:0 }} />
//             <span style={{ color:sec.color, fontWeight:600 }}>{sec.label}</span>
//           </div>
//         ))}
//         {labeled.some(b=>b.isSurprise) && (
//           <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:SUR_CLR+'18', border:`1px solid ${SUR_CLR}44`, fontSize:10, fontFamily:'var(--mono)' }}>
//             <span style={{ width:8, height:8, borderRadius:2, background:SUR_CLR, display:'inline-block' }} />
//             <span style={{ color:SUR_CLR, fontWeight:600 }}>Surprise</span>
//           </div>
//         )}
//       </div>

//       {/* Section markers above timeline */}
//       <div style={{ position:'relative', marginBottom:3 }}>
//         <div style={{ display:'flex', alignItems:'center', gap:3 }}>
//           <span style={{ width:24, flexShrink:0 }} />
//           <div style={{ flex:1, position:'relative', height:14 }}>
//             {sections.filter(s=>s.pid!=='EMPTY').map(sec => {
//               // Only render markers visible in first few rows
//               const totalBars = labeled.length
//               const leftPct   = ((sec.startBar - 1) / totalBars) * 100
//               const widthPct  = (sec.barCount / totalBars) * 100
//               return (
//                 <div key={sec.id} style={{
//                   position:'absolute', left:`${leftPct}%`, width:`${widthPct}%`,
//                   height:14, display:'flex', alignItems:'center',
//                   borderLeft:`2px solid ${sec.color}88`,
//                   paddingLeft:3, overflow:'hidden',
//                 }}>
//                   <span style={{ fontSize:9, fontFamily:'var(--mono)', color:sec.color, fontWeight:700, whiteSpace:'nowrap' }}>
//                     {sec.fullLabel}
//                   </span>
//                 </div>
//               )
//             })}
//           </div>
//         </div>
//       </div>

//       {/* Cell rows */}
//       {rows.map((row, ri) => (
//         <div key={ri} style={{ display:'flex', alignItems:'center', gap:3, marginBottom:2 }}>
//           <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--tx-3)', width:24, textAlign:'right', flexShrink:0 }}>{row[0].barNumber}</span>
//           <div style={{ display:'flex', gap:1, flex:1 }}>
//             {row.map(lb => (
//               <div key={lb.barNumber}
//                 onMouseEnter={() => setHov(lb)}
//                 onMouseLeave={() => setHov(null)}
//                 style={{
//                   flex:1, height:22, borderRadius:2,
//                   background: cellBg(lb),
//                   opacity: lb.isEmpty ? 0.2 : 1,
//                   cursor: 'default',
//                   outline: hov?.barNumber===lb.barNumber ? '2px solid var(--tx-1)' : 'none',
//                   position:'relative', transition:'outline 0.08s',
//                 }}
//               >
//                 {lb.isSustain && <div style={{ position:'absolute', inset:'40% 0', height:2, background:'rgba(255,255,255,0.65)', borderRadius:1 }} />}
//                 {lb.alternating && (
//                   <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', gap:1 }}>
//                     {[0,1,2].map(i=><div key={i} style={{ width:1, height:'55%', background:'rgba(255,255,255,0.45)', borderRadius:1 }} />)}
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       ))}

//       {/* Hover tooltip */}
//       {hov && (
//         <div style={{ marginTop:8, padding:'8px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:11, fontFamily:'var(--mono)', color:'var(--text2)' }}>
//           <span style={{ color:'var(--tx-1)', fontWeight:600 }}>Bar {hov.barNumber}</span>
//           {' · '}
//           <span style={{ color: hov.isSurprise ? SUR_CLR : hov.isEmpty ? 'var(--tx-3)' : hov.color }}>{hov.patternLabel}</span>
//           {' · '}{hov.noteCount} notes
//           {hov.alternating && <span style={{ color:'var(--accent)',  marginLeft:8 }}>⟳ pedal:{hov.alternating.pedal} n={hov.alternating.notesPerBar}</span>}
//           {hov.isSustain   && <span style={{ color:'#a855f7',        marginLeft:8 }}>▬ sustain (d={hov.maxDuration})</span>}
//           {hov.isSurprise  && <span style={{ color:SUR_CLR,          marginLeft:8 }}>★ surprise</span>}
//         </div>
//       )}
//     </div>
//   )
// }

// // ─── PATTERN CARDS ──────────────────────────────────────────────
// function PatternCard({ pat, meta, spb, role }) {
//   const occ   = pat.occurrences[0]
//   const bar   = meta.bars.find(b => (b.bar_number??b.bn) === occ.startBar)
//   const notes = bar ? [...bar.notes].map(normNote).sort((a,b)=>a.start_subdivision-b.start_subdivision) : []
//   const altBar = (meta.bars||[]).find(b => pat.occurrences.some(o=>o.startBar===(b.bar_number??b.bn)) && detAlt(normBar(b)))
//   const alt   = altBar ? detAlt(normBar(altBar)) : null
//   const allMidis = notes.map(n=>p2m(n.pitch)).filter(x=>x!==null)
//   const minM = allMidis.length ? Math.min(...allMidis) : 60
//   const maxM = allMidis.length ? Math.max(...allMidis) : 72
//   const range = Math.max(maxM - minM, 8)
//   const rs = role ? (ROLE_STYLE[role] || ROLE_STYLE.body) : null

//   return (
//     <div style={{ border:`1px solid ${pat.color}33`, borderRadius:'var(--radius)', overflow:'hidden', background:`linear-gradient(135deg,${pat.color}0d,${pat.color}05)` }}>
//       {/* Header */}
//       <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:pat.color+'1a' }}>
//         <div style={{ display:'flex', alignItems:'center', gap:8 }}>
//           <span style={{ width:10, height:10, borderRadius:'50%', background:pat.color, display:'inline-block', boxShadow:`0 0 6px ${pat.color}` }} />
//           <span style={{ fontWeight:700, color:'var(--tx-1)', fontSize:13 }}>{pat.label}</span>
//           <span style={{ fontSize:9, fontFamily:'var(--mono)', padding:'1px 6px', borderRadius:3, background:pat.color+'28', color:pat.color }}>{pat.type}</span>
//           {rs && <span style={{ fontSize:9, fontFamily:'var(--mono)', padding:'1px 6px', borderRadius:3, background:rs.bg, color:rs.color }}>{role}</span>}
//         </div>
//         <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{pat.occurrences.length}× · {pat.windowSize}bar</span>
//       </div>

//       <div style={{ padding:'10px 14px' }}>
//         {/* Mini piano roll */}
//         <div style={{ height:52, background:'var(--surface2)', borderRadius:'var(--radius-sm)', marginBottom:10, position:'relative', overflow:'hidden', border:'1px solid var(--border)' }}>
//           {/* Beat lines */}
//           {[0,4,8,12].map(sub => (
//             <div key={sub} style={{ position:'absolute', top:0, bottom:0, left:`${(sub/spb)*100}%`, width:1, background:'rgba(255,255,255,0.05)' }} />
//           ))}
//           {notes.slice(0,20).map((n,i) => {
//             const mn = p2m(n.pitch); if (mn===null) return null
//             const y = ((maxM - mn) / range) * 88
//             const x = (n.start_subdivision / spb) * 100
//             const w = Math.max((n.duration_subdivisions / spb) * 100, 2)
//             return <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:`${w}%`, height:'10%', minHeight:3, background:pat.color, borderRadius:1, opacity:0.9 }} title={`${n.pitch} s${n.start_subdivision} d${n.duration_subdivisions}`} />
//           })}
//         </div>

//         {/* Stats */}
//         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:10, fontFamily:'var(--mono)' }}>
//           <div style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'6px 8px', border:'1px solid var(--border)' }}>
//             <div style={{ color:'var(--tx-3)', marginBottom:2 }}>Starts at bars</div>
//             <div style={{ color:'var(--tx-1)', fontSize:11, lineHeight:1.5 }}>{pat.occurrences.map(o=>o.startBar).join(', ')}</div>
//           </div>
//           <div style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'6px 8px', border:'1px solid var(--border)' }}>
//             <div style={{ color:'var(--tx-3)', marginBottom:2 }}>Score / window</div>
//             <div style={{ color:'var(--tx-1)' }}>{pat.totalScore?.toFixed(0) || '—'} / {pat.windowSize}b</div>
//           </div>
//         </div>

//         {alt && (
//           <div style={{ marginTop:6, padding:'5px 8px', borderRadius:'var(--radius-sm)', background:pat.color+'18', color:pat.color, fontSize:10, fontFamily:'var(--mono)' }}>
//             ⟳ Alternating pedal: <strong>{alt.pedal}</strong> · {alt.notesPerBar} notes/bar · d={alt.dur}
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// // ─── RELATIONS VIEW  — NEW ───────────────────────────────────────
// function RelationsView({ rels, rhPatterns, rhSections, totalBars }) {
//   if (!rels) return null
//   const { pairs, roles, period } = rels

//   // Filter to meaningful relationships only
//   const meaningful = (pairs||[]).filter(r => r.type !== 'follows' && r.type !== 'often_followed_by')

//   const relTypeColor = {
//     cadence_of:           '#f59e0b',
//     alternates_with:      '#06b6d4',
//     always_followed_by:   '#8b5cf6',
//     transitions_to:       '#10b981',
//     often_followed_by:    '#6b7280',
//   }

//   const relTypeDesc = {
//     cadence_of:         'always resolves into this (sustain/cadence)',
//     alternates_with:    'these two alternate back and forth',
//     always_followed_by: 'always moves to this (85%+ of transitions)',
//     transitions_to:     'always transitions to this brief section',
//     often_followed_by:  'often moves to this (50%+ of transitions)',
//   }

//   return (
//     <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

//       {/* Period */}
//       <div style={{ padding:'10px 14px', borderRadius:'var(--radius-sm)', background:'var(--surface2)', border:'1px solid var(--border)' }}>
//         <div style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>Structural Period</div>
//         {period ? (
//           <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
//             <div style={{ fontSize:12, color:'var(--accent)', fontFamily:'var(--mono)' }}>
//               Every <strong>{period.barsPerCycle}</strong> bars the sequence repeats
//             </div>
//             <div style={{ fontSize:11, color:'var(--tx-2)', fontFamily:'var(--mono)' }}>
//               Unit: [{period.unit.join(' → ')}] × {Math.floor(totalBars / period.barsPerCycle)} cycles
//             </div>
//           </div>
//         ) : (
//           <div style={{ fontSize:11, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>
//             No exact repeating period — piece has variation cycles (normal for passacaglia / through-composed)
//           </div>
//         )}
//       </div>

//       {/* Roles */}
//       <div style={{ padding:'10px 14px', borderRadius:'var(--radius-sm)', background:'var(--surface2)', border:'1px solid var(--border)' }}>
//         <div style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>Pattern Roles</div>
//         <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
//           {rhPatterns.map(pat => {
//             const role = roles[pat.id] || 'body'
//             const rs   = ROLE_STYLE[role] || ROLE_STYLE.body
//             const secs = rhSections.filter(s => s.pid === pat.id)
//             const avg  = secs.length ? Math.round(secs.reduce((a,s)=>a+s.barCount,0)/secs.length*10)/10 : 0
//             return (
//               <div key={pat.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:'var(--radius-sm)', background:pat.color+'18', border:`1px solid ${pat.color}33` }}>
//                 <span style={{ width:8, height:8, borderRadius:'50%', background:pat.color, flexShrink:0 }} />
//                 <span style={{ fontSize:11, fontWeight:600, color:pat.color, fontFamily:'var(--mono)' }}>{pat.label}</span>
//                 <span style={{ fontSize:10, padding:'1px 6px', borderRadius:3, background:rs.bg, color:rs.color, fontFamily:'var(--mono)' }}>{role}</span>
//                 <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{secs.length}× · avg {avg}b</span>
//               </div>
//             )
//           })}
//         </div>
//       </div>

//       {/* Relationships */}
//       <div style={{ padding:'10px 14px', borderRadius:'var(--radius-sm)', background:'var(--surface2)', border:'1px solid var(--border)' }}>
//         <div style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>
//           Pattern Relationships ({meaningful.length})
//         </div>
//         {meaningful.length === 0 && (
//           <div style={{ fontSize:11, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>No strong relationships found (transition rates too low)</div>
//         )}
//         <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
//           {meaningful.map((r, i) => {
//             const fromPat = rhPatterns.find(p => p.id === r.from)
//             const toPat   = rhPatterns.find(p => p.id === r.to)
//             const relColor = relTypeColor[r.type] || '#6b7280'
//             return (
//               <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:'var(--radius-sm)', border:`1px solid ${relColor}33`, background:relColor+'08' }}>
//                 {/* From */}
//                 <span style={{ fontSize:11, fontWeight:700, fontFamily:'var(--mono)', color: fromPat?.color || 'var(--tx-2)', minWidth:80 }}>{r.from}</span>
//                 {/* Arrow + type */}
//                 <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1, flex:1 }}>
//                   <span style={{ fontSize:9, fontFamily:'var(--mono)', color:relColor, fontWeight:600 }}>{r.type.replace(/_/g,' ')}</span>
//                   <div style={{ display:'flex', alignItems:'center', gap:3, width:'100%' }}>
//                     <div style={{ flex:1, height:2, background:`linear-gradient(to right,${relColor}40,${relColor})`, borderRadius:1 }} />
//                     <span style={{ fontSize:10, color:relColor }}>▶</span>
//                   </div>
//                   <span style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{Math.round(r.followRate*100)}% of transitions</span>
//                 </div>
//                 {/* To */}
//                 <span style={{ fontSize:11, fontWeight:700, fontFamily:'var(--mono)', color: toPat?.color || SUR_CLR, minWidth:80, textAlign:'right' }}>{r.to}</span>
//               </div>
//             )
//           })}
//         </div>
//         {/* Description footnotes */}
//         <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:3 }}>
//           {[...new Set(meaningful.map(r=>r.type))].map(type => (
//             <div key={type} style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>
//               <span style={{ color: relTypeColor[type]||'#6b7280', fontWeight:600 }}>{type.replace(/_/g,' ')}</span>
//               {': '}
//               {relTypeDesc[type] || ''}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Section sequence table */}
//       <div style={{ padding:'10px 14px', borderRadius:'var(--radius-sm)', background:'var(--surface2)', border:'1px solid var(--border)' }}>
//         <div style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>
//           Section Sequence
//         </div>
//         <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
//           {rhSections.filter(s=>s.pid!=='EMPTY').map((s,i) => (
//             <div key={i} style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:4, background:s.color+'18', border:`1px solid ${s.color}44` }}>
//               <span style={{ fontSize:10, fontWeight:700, color:s.color, fontFamily:'var(--mono)' }}>{s.fullLabel}</span>
//               <span style={{ fontSize:9, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{s.startBar}</span>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }

// // ─── GRAPH VIEW ─────────────────────────────────────────────────
// function GraphView({ graph, rels }) {
//   const { nodes, edges } = graph
//   if (!nodes.length) return <div style={{ color:'var(--tx-3)', fontSize:12, fontFamily:'var(--mono)' }}>No transitions detected</div>

//   const maxW = Math.max(...edges.map(e=>e.weight), 1)
//   const cx=260, cy=180, r=130
//   const pos = {}
//   nodes.forEach((nd, i) => {
//     const a = (i / nodes.length) * Math.PI * 2 - Math.PI/2
//     pos[nd.id] = { x: cx + r*Math.cos(a), y: cy + r*Math.sin(a) }
//   })

//   // Highlight color for "meaningful" edges
//   const relMap = {}
//   for (const p of (rels?.pairs||[])) relMap[`${p.from}|||${p.to}`] = p

//   return (
//     <div>
//       <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', marginBottom:12 }}>
//         <svg width="100%" viewBox="0 0 520 360">
//           <defs>
//             <marker id="ar" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
//               <path d="M0,0 L0,6 L6,3 z" fill="#4b5563" />
//             </marker>
//             <marker id="arH" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
//               <path d="M0,0 L0,6 L6,3 z" fill="#06b6d4" />
//             </marker>
//           </defs>
//           {edges.slice(0,18).map((e,i) => {
//             const f=pos[e.from], t=pos[e.to]; if (!f||!t) return null
//             const rel   = relMap[`${e.from}|||${e.to}`]
//             const heavy = rel && rel.type !== 'follows' && rel.type !== 'often_followed_by'
//             const sw    = Math.max(1,(e.weight/maxW)*3.5)
//             const dx=t.x-f.x, dy=t.y-f.y
//             const mx=(f.x+t.x)/2 - dy*0.18, my=(f.y+t.y)/2 + dx*0.18
//             const stroke = heavy ? '#06b6d4' : (e.weight>=maxW*0.6 ? (nodes.find(n=>n.id===e.from)?.color||'#4b5563') : '#374151')
//             return (
//               <g key={i}>
//                 <path d={`M${f.x},${f.y} Q${mx},${my} ${t.x},${t.y}`} fill="none" stroke={stroke} strokeWidth={heavy?sw+1:sw} strokeOpacity={heavy?0.75:0.45} markerEnd={heavy?'url(#arH)':'url(#ar)'} />
//                 {heavy && <text x={mx} y={my-4} textAnchor="middle" fill="#06b6d4" fontSize="7" opacity="0.7">{rel.type.split('_')[0]}</text>}
//                 <text x={mx} y={my+7} textAnchor="middle" fill="#6b7280" fontSize="7">{e.weight}</text>
//               </g>
//             )
//           })}
//           {nodes.map(nd => {
//             const p=pos[nd.id]; if (!p) return null
//             const nr = Math.max(18, Math.min(30, 14+nd.count*1.2))
//             return (
//               <g key={nd.id}>
//                 <circle cx={p.x} cy={p.y} r={nr} fill={nd.color} fillOpacity={0.18} stroke={nd.color} strokeWidth={1.5} />
//                 <text x={p.x} y={p.y-3} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="700">{nd.id}</text>
//                 <text x={p.x} y={p.y+9} textAnchor="middle" fill="#94a3b8" fontSize="8">{nd.count}b</text>
//               </g>
//             )
//           })}
//         </svg>
//       </div>
//       <div style={{ fontSize:11, fontFamily:'var(--mono)', display:'flex', flexDirection:'column', gap:4 }}>
//         {edges.slice(0,8).map((e,i) => {
//           const rel = relMap[`${e.from}|||${e.to}`]
//           const heavy = rel && rel.type !== 'follows' && rel.type !== 'often_followed_by'
//           return (
//             <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
//               <span style={{ color: nodes.find(n=>n.id===e.from)?.color||'var(--tx-2)', width:36 }}>{e.from}</span>
//               <span style={{ color:'var(--tx-3)' }}>→</span>
//               <span style={{ color: nodes.find(n=>n.id===e.to)?.color||'var(--tx-2)', width:36 }}>{e.to}</span>
//               {heavy && <span style={{ fontSize:9, color:'#06b6d4', fontFamily:'var(--mono)', padding:'1px 5px', borderRadius:3, background:'rgba(6,182,212,0.1)' }}>{rel.type.replace(/_/g,' ')}</span>}
//               <div style={{ flex:1, height:3, background:'var(--surface3)', borderRadius:2 }}>
//                 <div style={{ height:'100%', borderRadius:2, background: heavy?'#06b6d4':'var(--accent3)', width:`${(e.weight/maxW)*100}%` }} />
//               </div>
//               <span style={{ color:'var(--tx-3)', width:14, textAlign:'right' }}>{e.weight}</span>
//             </div>
//           )
//         })}
//       </div>
//     </div>
//   )
// }

// // ─── HAND TABLE ──────────────────────────────────────────────────
// function HandTable({ alignment }) {
//   const [page, setPage] = useState(0)
//   const PG = 24
//   const total = Math.ceil((alignment||[]).length / PG)
//   const slice = (alignment||[]).slice(page*PG, (page+1)*PG)

//   return (
//     <div>
//       <div style={{ display:'grid', gridTemplateColumns:'2.5rem 1fr 1fr', gap:4, marginBottom:6 }}>
//         <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Bar</span>
//         <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Right Hand</span>
//         <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>Left Hand</span>
//       </div>
//       <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
//         {slice.map(aln => {
//           const rhC = aln.rh?.color || EMP_CLR
//           const lhC = aln.lh?.color || EMP_CLR
//           return (
//             <div key={aln.barNumber} style={{ display:'grid', gridTemplateColumns:'2.5rem 1fr 1fr', gap:4, alignItems:'center' }}>
//               <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)', textAlign:'right' }}>{aln.barNumber}</span>
//               <div style={{ padding:'3px 8px', borderRadius:4, fontSize:10, fontFamily:'var(--mono)', background:rhC+'22', color:rhC, border:`1px solid ${rhC}33`, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
//                 {aln.rh?.patternLabel || '—'}
//                 {aln.rh?.alternating && ' ⟳'}
//                 {aln.rh?.isSustain   && ' ▬'}
//                 {aln.rh?.isSurprise  && ' ★'}
//               </div>
//               <div style={{ padding:'3px 8px', borderRadius:4, fontSize:10, fontFamily:'var(--mono)', background:lhC+'22', color:lhC, border:`1px solid ${lhC}33`, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
//                 {aln.lh?.patternLabel || '—'}
//                 {aln.lh?.alternating && ' ⟳'}
//               </div>
//             </div>
//           )
//         })}
//       </div>
//       {total > 1 && (
//         <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:10 }}>
//           <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
//                   style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:page===0?'not-allowed':'pointer', opacity:page===0?0.4:1, fontSize:11, fontFamily:'var(--mono)' }}>←</button>
//           <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{page+1}/{total}</span>
//           <button onClick={()=>setPage(p=>Math.min(total-1,p+1))} disabled={page===total-1}
//                   style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:page===total-1?'not-allowed':'pointer', opacity:page===total-1?0.4:1, fontSize:11, fontFamily:'var(--mono)' }}>→</button>
//         </div>
//       )}
//     </div>
//   )
// }

// // ─── YAML PANEL ─────────────────────────────────────────────────
// function YamlPanel({ yaml }) {
//   const [copied, setCopied] = useState(false)
//   const copy = () => { navigator.clipboard.writeText(yaml).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000) }) }
//   const dl   = () => {
//     const a = document.createElement('a')
//     a.href = URL.createObjectURL(new Blob([yaml],{type:'text/yaml'}))
//     a.download = 'blueprint.yaml'
//     document.body.appendChild(a); a.click(); document.body.removeChild(a)
//   }
//   return (
//     <div>
//       <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginBottom:8 }}>
//         <button onClick={dl} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:'pointer', fontSize:11, fontFamily:'var(--font)', fontWeight:600 }}>
//           ↓ .yaml
//         </button>
//         <button onClick={copy} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color: copied?'var(--accent)':'var(--tx-2)', cursor:'pointer', fontSize:11, fontFamily:'var(--font)', fontWeight:600, transition:'all 0.15s' }}>
//           {copied ? <Check size={11} stroke="var(--accent)" /> : <Copy size={11} />}
//           {copied ? 'Copied!' : 'Copy YAML'}
//         </button>
//       </div>
//       <textarea readOnly value={yaml}
//                 style={{ width:'100%', minHeight:340, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:12, color:'var(--accent)', fontFamily:'var(--mono)', fontSize:11, resize:'vertical', outline:'none', lineHeight:1.7 }} />
//     </div>
//   )
// }


// // ═══════════════════════════════════════════════════════════════
// // MAIN COMPONENT
// // ═══════════════════════════════════════════════════════════════
// const INNER_TABS = ['Timeline','Patterns','Relations','Graph','Hands','YAML']

// export default function Analyzer() {
//   const [input,   setInput]   = useState('')
//   const [jsonOk,  setJsonOk]  = useState(true)
//   const [result,  setResult]  = useState(null)
//   const [running, setRunning] = useState(false)
//   const [error,   setError]   = useState(null)
//   const [inner,   setInner]   = useState('Timeline')
//   const fileRef = useRef(null)

//   const handleChange = v => {
//     setInput(v)
//     try { JSON.parse(v); setJsonOk(true) } catch { setJsonOk(false) }
//   }

//   const handleFile = e => {
//     const f = e.target.files[0]; if (!f) return
//     const reader = new FileReader()
//     reader.onload = ev => handleChange(ev.target.result)
//     reader.readAsText(f)
//     e.target.value = ''
//   }

//   const analyze = useCallback(() => {
//     if (!input.trim() || !jsonOk) return
//     setRunning(true); setError(null)
//     setTimeout(() => {
//       try {
//         const r = runAnalysis(JSON.parse(input))
//         setResult(r); setInner('Timeline')
//       } catch(e) {
//         setError(e.message || 'Analysis failed')
//       } finally {
//         setRunning(false)
//       }
//     }, 30)
//   }, [input, jsonOk])

//   const { meta, result: res, yaml } = result || {}

//   return (
//     <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

//       {/* ── Input ──────────────────────────────────────────── */}
//       <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
//         <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
//           <div style={{ fontSize:11, fontWeight:600, color:'var(--tx-2)', letterSpacing:'0.5px', textTransform:'uppercase', fontFamily:'var(--mono)' }}>JSON Input</div>
//           <div style={{ display:'flex', alignItems:'center', gap:8 }}>
//             <span style={{ fontSize:10, fontFamily:'var(--mono)', padding:'2px 7px', borderRadius:4,
//               background: !input.trim() ? 'var(--surface3)' : jsonOk ? 'rgba(184,245,74,0.07)' : 'rgba(245,85,74,0.07)',
//               color: !input.trim() ? 'var(--tx-3)' : jsonOk ? 'var(--lime)' : 'var(--rose)',
//               border: `1px solid ${!input.trim() ? 'var(--border)' : jsonOk ? 'rgba(184,245,74,0.2)' : 'rgba(245,85,74,0.2)'}` }}>
//               {!input.trim() ? 'empty' : jsonOk ? '✓ valid' : '✗ invalid'}
//             </span>
//             <input ref={fileRef} type="file" accept=".json,.txt" style={{ display:'none' }} onChange={handleFile} />
//             <button onClick={()=>fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:'pointer', fontSize:11, fontFamily:'var(--font)', fontWeight:600 }}>
//               <Upload size={11} /> Load file
//             </button>
//           </div>
//         </div>

//         <textarea value={input} onChange={e => handleChange(e.target.value)} spellCheck={false}
//           placeholder={'Paste MIDI JSON — compact (p/s/d/bn) or full format\n\n{"tempo":120,"time_signature":"4/4","key":"Am","subdivisions_per_bar":16,"bars":[…]}'}
//           style={{ width:'100%', minHeight:160, background:'var(--surface2)', border:`1px solid ${!input.trim()||jsonOk ? 'var(--border)' : 'rgba(245,85,74,0.35)'}`, borderRadius:'var(--radius-sm)', padding:12, color:'var(--text)', fontFamily:'var(--mono)', fontSize:12, resize:'vertical', outline:'none', lineHeight:1.7, transition:'border-color 0.2s' }} />

//         {error && (
//           <div style={{ fontSize:12, color:'var(--rose)', background:'rgba(245,85,74,0.07)', border:'1px solid rgba(245,85,74,0.2)', borderRadius:'var(--radius-sm)', padding:'8px 12px', fontFamily:'var(--mono)' }}>
//             ⚠ {error}
//           </div>
//         )}

//         <button onClick={analyze} disabled={running || !input.trim() || !jsonOk}
//           style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 18px', borderRadius:'var(--radius-sm)', background: running||!input.trim()||!jsonOk ? 'var(--surface3)' : 'var(--accent)', color: running||!input.trim()||!jsonOk ? 'var(--tx-3)' : '#000', fontSize:12, fontWeight:700, cursor: running||!input.trim()||!jsonOk ? 'not-allowed' : 'pointer', border:'none', transition:'all 0.15s ease', alignSelf:'flex-start', fontFamily:'var(--font)' }}
//           onMouseEnter={e => { if (!running&&input.trim()&&jsonOk) { e.currentTarget.style.background='#d4f570'; e.currentTarget.style.transform='translateY(-1px)' }}}
//           onMouseLeave={e => { e.currentTarget.style.background=running||!input.trim()||!jsonOk?'var(--surface3)':'var(--accent)'; e.currentTarget.style.transform='none' }}>
//           <Activity size={13} />
//           {running ? 'Analyzing…' : 'Analyze'}
//         </button>
//       </div>

//       {/* ── Results ──────────────────────────────────────── */}
//       {result && (
//         <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'fadeUp 0.2s ease' }}>

//           {/* Summary */}
//           <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'10px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:11, fontFamily:'var(--mono)' }}>
//             {[
//               [`${meta.bars.length} bars`,                               'var(--tx-2)'],
//               [`${res.rhPatterns.length} RH patterns`,                   'var(--accent)'],
//               [`${res.lhPatterns.length} LH patterns`,                   'var(--sky)'],
//               [`${res.rhSections.filter(s=>s.pid!=='EMPTY').length} sections`, 'var(--mint)'],
//               [`split ${m2n(res.split)} (${res.split})`,                'var(--tx-3)'],
//               [`${res.rhLabeled.filter(b=>b.isSurprise).length} surprise`, 'var(--rose)'],
//               [`${res.rhLabeled.filter(b=>b.isSustain).length} sustain`, '#a855f7'],
//               [`${(res.rels?.pairs||[]).filter(r=>r.type!=='follows').length} relations`, '#f59e0b'],
//             ].map(([label, color]) => (
//               <span key={label} style={{ color, padding:'1px 7px', borderRadius:4, background:'var(--surface3)', border:'1px solid var(--border)' }}>
//                 {label}
//               </span>
//             ))}
//           </div>

//           {/* Inner tabs */}
//           <div style={{ display:'flex', gap:2, flexWrap:'wrap' }}>
//             {INNER_TABS.map(t => {
//               const on = inner === t
//               return (
//                 <button key={t} onClick={()=>setInner(t)}
//                   style={{ padding:'4px 12px', borderRadius:'var(--radius-sm)', border: on ? '1px solid var(--border2)' : '1px solid transparent', background: on ? 'var(--surface2)' : 'transparent', color: on ? 'var(--tx-1)' : 'var(--tx-3)', fontSize:11, fontWeight: on ? 600 : 400, cursor:'pointer', transition:'all 0.12s', fontFamily:'var(--mono)', letterSpacing:'0.3px' }}>
//                   {t}{t==='Relations' && (res.rels?.pairs||[]).filter(r=>r.type!=='follows').length>0 ? ` (${(res.rels.pairs).filter(r=>r.type!=='follows').length})` : ''}
//                 </button>
//               )
//             })}
//           </div>

//           {/* Tab content */}
//           <div style={{ animation:'fadeUp 0.15s ease' }}>
//             {inner==='Timeline' && (
//               <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
//                 <TimelineRow labeled={res.rhLabeled} sections={res.rhSections} title="Right Hand" period={res.rels?.period} />
//                 {res.lhLabeled.some(b=>!b.isEmpty) && (
//                   <TimelineRow labeled={res.lhLabeled} sections={res.lhSections} title="Left Hand" />
//                 )}
//               </div>
//             )}

//             {inner==='Patterns' && (
//               <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
//                 {res.rhPatterns.length > 0 && (
//                   <>
//                     <div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase' }}>Right Hand — {res.rhPatterns.length} patterns</div>
//                     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
//                       {res.rhPatterns.map(p => <PatternCard key={p.id} pat={p} meta={meta} spb={meta.subdivisions_per_bar} role={res.rels?.roles?.[p.id]} />)}
//                     </div>
//                   </>
//                 )}
//                 {res.lhPatterns.length > 0 && (
//                   <>
//                     <div style={{ fontSize:10, fontWeight:600, color:'var(--tx-3)', fontFamily:'var(--mono)', letterSpacing:'1px', textTransform:'uppercase', marginTop:8 }}>Left Hand — {res.lhPatterns.length} patterns</div>
//                     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
//                       {res.lhPatterns.map(p => <PatternCard key={p.id} pat={p} meta={meta} spb={meta.subdivisions_per_bar} />)}
//                     </div>
//                   </>
//                 )}
//                 {!res.rhPatterns.length && !res.lhPatterns.length && (
//                   <div style={{ color:'var(--tx-3)', fontSize:12, fontFamily:'var(--mono)' }}>No repeating patterns detected</div>
//                 )}
//               </div>
//             )}

//             {inner==='Relations' && (
//               <RelationsView rels={res.rels} rhPatterns={res.rhPatterns} rhSections={res.rhSections} totalBars={meta.bars.length} />
//             )}

//             {inner==='Graph' && <GraphView graph={res.rhGraph} rels={res.rels} />}

//             {inner==='Hands' && <HandTable alignment={res.alignment} />}

//             {inner==='YAML' && <YamlPanel yaml={yaml} />}
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }















// frontend/src/components/tools/Analyzer.jsx
//
// CHANGE from original:
//   - All local pattern-detection logic removed (detectPatterns, labelBars,
//     detectSections, buildGraph, runAnalysis, genYaml, etc.)
//   - analyze() now calls POST /api/analyze on the main backend (port 3001)
//   - adaptResponse() maps backend shape → existing UI component props
//   - All UI components (TimelineRow, PatternCard, GraphView, etc.) UNCHANGED

import { useState, useRef, useCallback } from 'react'
import { Upload, Copy, Check, Activity } from '../shared/Icons.jsx'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─── PITCH HELPERS (kept — used in PatternCard mini-roll display) ──
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

// ─── COMPACT NORMALISER (kept — used for PatternCard display) ──────
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

// ─── DISPLAY HELPERS (kept — used in PatternCard + tooltip) ─────────
function ord(bar) {
  return [...(bar.notes || [])].sort((a, b) => a.start_subdivision - b.start_subdivision)
}

function detAlt(bar) {
  const s = ord(bar); if (s.length < 4) return null
  const same = s.every(n => n.duration_subdivisions === s[0].duration_subdivisions)
  const ev = s.filter((_, i) => i % 2 === 0), od = s.filter((_, i) => i % 2 === 1)
  const ep = new Set(ev.map(n => n.pitch)), op = new Set(od.map(n => n.pitch))
  if (op.size === 1 && ep.size > 1 && same) return { pedal: [...op][0], melody: ev.map(n => n.pitch), notesPerBar: s.length, dur: s[0].duration_subdivisions }
  if (ep.size === 1 && op.size > 1 && same) return { pedal: [...ep][0], melody: od.map(n => n.pitch), notesPerBar: s.length, dur: s[0].duration_subdivisions }
  return null
}

// ─── PATTERN COLORS (hex strings — match backend engine order) ───────
const PAT_COLORS = [
  '#f97316', // cadence   → orange (PAT_CADENCE always first)
  '#06b6d4', // Motif_A   → cyan
  '#8b5cf6', // Motif_B   → violet
  '#f59e0b', // Motif_C   → amber
  '#10b981', // Motif_D   → emerald
  '#f43f5e', // Motif_E   → rose
  '#3b82f6', // Motif_F   → blue
  '#a855f7', // Motif_G   → purple
  '#ec4899', // Motif_H   → pink
]
const SUR_CLR = '#ef4444'
const EMP_CLR = '#374151'
const CAD_CLR = '#f97316'

// ─── RESPONSE ADAPTER ────────────────────────────────────────────────
// Maps backend v2 response shape → exact props the UI components expect.
function adaptResponse(data) {
  const meta = data.metadata   // already has tempo, key, time_signature, bars[]

  // Pattern color extractor: backend sends {bg, text, label}, UI wants hex string
  const patColor = (pat) => pat?.color?.bg || PAT_COLORS[0]

  // Build a patternId → hex color map for labeling bars
  const patColorMap = new Map()
  patColorMap.set('EMPTY',    EMP_CLR)
  patColorMap.set('SURPRISE', SUR_CLR)
  ;(data.rightHand.patterns || []).forEach(p => patColorMap.set(p.id, patColor(p)))
  ;(data.leftHand.patterns  || []).forEach(p => patColorMap.set(p.id, patColor(p)))

  // Normalize labeled bars: add .color field + ensure .alternating exists
  const normLabeled = (labeled) => (labeled || []).map(lb => ({
    ...lb,
    color:       lb.isCadence ? CAD_CLR : (patColorMap.get(lb.patternId) || SUR_CLR),
    alternating: lb.alternating ?? detAlt({ notes: (lb.notes || []).map(normNote) }),
  }))

  // Normalize sections: add .pid alias + hex color
  const normSections = (sections, patterns) => (sections || []).map(s => {
    const pat = (patterns || []).find(p => p.id === s.patternId)
    return {
      ...s,
      pid:   s.patternId,  // alias used by TimelineRow's secMap
      color: patColor(pat) || (s.patternId === 'MIXED' ? '#6b7280' : SUR_CLR),
    }
  })

  // Normalize patterns: flatten color {bg,text,label} → hex string
  const normPatterns = (patterns) => (patterns || []).map(p => ({
    ...p,
    color: patColor(p),
  }))

  const rhPatterns = normPatterns(data.rightHand.patterns)
  const lhPatterns = normPatterns(data.leftHand.patterns)
  const rhLabeled  = normLabeled(data.rightHand.labeled)
  const lhLabeled  = normLabeled(data.leftHand.labeled)
  const rhSections = normSections(data.rightHand.sections, data.rightHand.patterns)
  const lhSections = normSections(data.leftHand.sections, data.leftHand.patterns)

  // alignment: backend returns {barNumber, rh, lh, rhPattern, lhPattern}
  // add color to rh/lh sub-objects
  const alignment = (data.alignment || []).map(aln => ({
    ...aln,
    rh: aln.rh ? { ...aln.rh, color: patColorMap.get(aln.rh.patternId) || SUR_CLR } : null,
    lh: aln.lh ? { ...aln.lh, color: patColorMap.get(aln.lh.patternId) || SUR_CLR } : null,
  }))

  const res = {
    rhPatterns, lhPatterns,
    rhLabeled,  lhLabeled,
    rhSections, lhSections,
    rhGraph:    data.rightHand.graph,
    alignment,
    split:      data.splitMidi,
    // v2 extras (available but not yet used by current UI)
    rhPhrases:      data.rightHand.phrases,
    cadencePairs:   data.rightHand.cadencePairs,
    cadenceBars:    data.summary?.cadenceBars || [],
    surpriseBars:   data.summary?.surpriseBars || [],
  }

  return { meta, res, yaml: data.yamlBlueprint }
}


// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS — unchanged from original
// ═══════════════════════════════════════════════════════════════

function TimelineRow({ labeled, sections, title }) {
  const [hov, setHov] = useState(null)
  if (!labeled || !labeled.some(b => !b.isEmpty)) return null

  const secMap = new Map(sections.map(s => [s.pid, s]))
  const ROW = 16
  const rows = []
  for (let i = 0; i < labeled.length; i += ROW) rows.push(labeled.slice(i, i + ROW))

  function cellBg(lb) {
    if (lb.isEmpty) return EMP_CLR
    if (lb.isSurprise) return SUR_CLR
    if (lb.isCadence) return CAD_CLR
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
        {labeled.some(b => b.isSurprise) && (
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:SUR_CLR+'18', border:`1px solid ${SUR_CLR}44`, fontSize:10, fontFamily:'var(--mono)' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:SUR_CLR, display:'inline-block' }} />
            <span style={{ color:SUR_CLR, fontWeight:600 }}>Surprise</span>
          </div>
        )}
        {labeled.some(b => b.isCadence) && (
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, background:CAD_CLR+'18', border:`1px solid ${CAD_CLR}44`, fontSize:10, fontFamily:'var(--mono)' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:CAD_CLR, display:'inline-block' }} />
            <span style={{ color:CAD_CLR, fontWeight:600 }}>Cadence</span>
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
                  outline: hov?.barNumber === lb.barNumber ? '2px solid var(--tx-1)' : 'none',
                  position:'relative', transition:'outline 0.08s',
                }}
              >
                {lb.isSustain && <div style={{ position:'absolute', inset:'40% 0', height:2, background:'rgba(255,255,255,0.6)', borderRadius:1 }} />}
                {lb.alternating && (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', gap:1 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width:1, height:'55%', background:'rgba(255,255,255,0.45)', borderRadius:1 }} />)}
                  </div>
                )}
                {lb.isCadence && (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:'60%', height:2, background:'rgba(255,255,255,0.7)', borderRadius:1 }} />
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
          <span style={{ color: hov.isCadence ? CAD_CLR : hov.isSurprise ? SUR_CLR : hov.isEmpty ? 'var(--tx-3)' : hov.color }}>{hov.patternLabel}</span>
          {' · '}{hov.noteCount} notes
          {hov.role && <span style={{ color:'var(--tx-3)', marginLeft:8 }}>role:{hov.role}</span>}
          {hov.alternating && <span style={{ color:'var(--accent)', marginLeft:8 }}>⟳ pedal:{hov.alternating.pedal}</span>}
          {hov.isSustain   && <span style={{ color:'var(--sky)',    marginLeft:8 }}>▬ sustain</span>}
          {hov.isSurprise  && <span style={{ color:SUR_CLR,        marginLeft:8 }}>★ surprise</span>}
          {hov.isCadence   && <span style={{ color:CAD_CLR,        marginLeft:8 }}>⬡ cadence</span>}
        </div>
      )}
    </div>
  )
}

function PatternCard({ pat, meta, spb }) {
  const occ = pat.occurrences[0]
  const bar = meta.bars.find(b => (b.bar_number ?? b.bn) === occ.startBar)
  const notes = bar ? [...bar.notes].map(normNote).sort((a, b) => a.start_subdivision - b.start_subdivision) : []
  const altBar = (meta.bars || []).find(b => {
    const bn = normBar(b)
    return bn.notes.length > 0 && pat.occurrences.some(o => o.startBar === bn.bar_number) && detAlt(bn)
  })
  const alt = altBar ? detAlt(normBar(altBar)) : null

  const allMidis = notes.map(n => p2m(n.pitch)).filter(x => x !== null)
  const minM = allMidis.length ? Math.min(...allMidis) : 60
  const maxM = allMidis.length ? Math.max(...allMidis) : 72
  const range = Math.max(maxM - minM, 8)

  return (
    <div style={{ border:`1px solid ${pat.color}33`, borderRadius:'var(--radius)', overflow:'hidden', background:`linear-gradient(135deg,${pat.color}0d,${pat.color}05)` }}>
      <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:pat.color+'1a' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:pat.color, display:'inline-block', boxShadow:`0 0 6px ${pat.color}` }} />
          <span style={{ fontWeight:700, color:'var(--tx-1)', fontSize:13 }}>{pat.label}</span>
          <span style={{ fontSize:9, fontFamily:'var(--mono)', padding:'1px 6px', borderRadius:3, background:pat.color+'28', color:pat.color }}>{pat.type}</span>
        </div>
        <span style={{ fontSize:10, color:'var(--tx-3)', fontFamily:'var(--mono)' }}>{pat.occurrences.length}× · {pat.windowSize}bar</span>
      </div>

      <div style={{ padding:'10px 14px' }}>
        <div style={{ height:52, background:'var(--surface2)', borderRadius:'var(--radius-sm)', marginBottom:10, position:'relative', overflow:'hidden', border:'1px solid var(--border)' }}>
          {notes.slice(0, 20).map((n, i) => {
            const mn = p2m(n.pitch); if (mn === null) return null
            const y = ((maxM - mn) / range) * 88
            const x = (n.start_subdivision / spb) * 100
            const w = Math.max((n.duration_subdivisions / spb) * 100, 2)
            return <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:`${w}%`, height:'10%', minHeight:3, background:pat.color, borderRadius:1, opacity:0.9 }} title={`${n.pitch} s${n.start_subdivision} d${n.duration_subdivisions}`} />
          })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:10, fontFamily:'var(--mono)' }}>
          <div style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'6px 8px', border:'1px solid var(--border)' }}>
            <div style={{ color:'var(--tx-3)', marginBottom:2 }}>Bars</div>
            <div style={{ color:'var(--tx-1)', fontSize:11 }}>{pat.occurrences.map(o => o.startBar).join(', ')}</div>
          </div>
          <div style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'6px 8px', border:'1px solid var(--border)' }}>
            <div style={{ color:'var(--tx-3)', marginBottom:2 }}>Score</div>
            <div style={{ color:'var(--tx-1)' }}>{(pat.score || 0).toFixed(1)}</div>
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
          <defs>
            <marker id="ar" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#4b5563" />
            </marker>
          </defs>
          {edges.slice(0, 16).map((e, i) => {
            const f = pos[e.from], t = pos[e.to]; if (!f || !t) return null
            const sw = Math.max(1, (e.weight / maxW) * 3.5)
            const dx = t.x - f.x, dy = t.y - f.y
            const mx = (f.x + t.x) / 2 - dy * 0.15, my = (f.y + t.y) / 2 + dx * 0.15
            const nodeColor = nodes.find(n => n.id === e.from)?.color
            const stroke = e.weight >= maxW * 0.6
              ? (typeof nodeColor === 'string' ? nodeColor : nodeColor?.bg || '#4b5563')
              : '#374151'
            return (
              <g key={i}>
                <path d={`M${f.x},${f.y} Q${mx},${my} ${t.x},${t.y}`} fill="none" stroke={stroke} strokeWidth={sw} strokeOpacity={0.55} markerEnd="url(#ar)" />
                <text x={mx} y={my - 3} textAnchor="middle" fill="#6b7280" fontSize="8">{e.weight}</text>
              </g>
            )
          })}
          {nodes.map(nd => {
            const p = pos[nd.id]; if (!p) return null
            const nr = Math.max(18, Math.min(30, 14 + nd.count * 1.2))
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
        {edges.slice(0, 6).map((e, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color: nodes.find(n => n.id === e.from)?.color || 'var(--tx-2)', width:80 }}>{e.from}</span>
            <span style={{ color:'var(--tx-3)' }}>→</span>
            <span style={{ color: nodes.find(n => n.id === e.to)?.color || 'var(--tx-2)', width:80 }}>{e.to}</span>
            <div style={{ flex:1, height:3, background:'var(--surface3)', borderRadius:2 }}>
              <div style={{ height:'100%', borderRadius:2, background:'var(--accent3)', width:`${(e.weight / maxW) * 100}%` }} />
            </div>
            <span style={{ color:'var(--tx-3)', width:14, textAlign:'right' }}>{e.weight}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HandTable({ alignment }) {
  const [page, setPage] = useState(0)
  const PG = 20
  const total = Math.ceil((alignment || []).length / PG)
  const slice = (alignment || []).slice(page * PG, (page + 1) * PG)

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
                {aln.rh?.isCadence   && ' ⬡'}
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
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:page===0?'not-allowed':'pointer', opacity:page===0?0.4:1, fontSize:11, fontFamily:'var(--mono)' }}>←</button>
          <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--tx-3)' }}>{page + 1} / {total}</span>
          <button onClick={() => setPage(p => Math.min(total - 1, p + 1))} disabled={page === total - 1}
            style={{ padding:'3px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:page===total-1?'not-allowed':'pointer', opacity:page===total-1?0.4:1, fontSize:11, fontFamily:'var(--mono)' }}>→</button>
        </div>
      )}
    </div>
  )
}

function YamlPanel({ yaml }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(yaml).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
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
const INNER_TABS = ['Timeline', 'Patterns', 'Graph', 'Hands', 'YAML']

export default function Analyzer() {
  const [input,   setInput]   = useState('')
  const [jsonOk,  setJsonOk]  = useState(true)
  const [result,  setResult]  = useState(null)
  const [running, setRunning] = useState(false)
  const [error,   setError]   = useState(null)
  const [inner,   setInner]   = useState('Timeline')
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

  // ── ANALYZE — calls backend instead of running locally ────────
  const analyze = useCallback(async () => {
    if (!input.trim() || !jsonOk) return
    setRunning(true); setError(null)
    try {
      const parsed = JSON.parse(input)
      const res = await fetch(`${BASE}/api/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ json: parsed }),
      })
      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`
        try { const b = await res.json(); msg = b.error || msg } catch (_) {}
        throw new Error(msg)
      }
      const { success, data, error: apiErr } = await res.json()
      if (!success || apiErr) throw new Error(apiErr || 'Analysis failed')

      setResult(adaptResponse(data))
      setInner('Timeline')
    } catch (e) {
      setError(e.message || 'Analysis failed')
    } finally {
      setRunning(false)
    }
  }, [input, jsonOk])

  const { meta, res, yaml } = result || {}

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Input area ──────────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--tx-2)', letterSpacing:'0.5px', textTransform:'uppercase', fontFamily:'var(--mono)' }}>
            JSON Input
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, fontFamily:'var(--mono)', padding:'2px 7px', borderRadius:4,
              background: !input.trim() ? 'var(--surface3)' : jsonOk ? 'rgba(184,245,74,0.07)' : 'rgba(245,85,74,0.07)',
              color:      !input.trim() ? 'var(--tx-3)'     : jsonOk ? 'var(--lime)'            : 'var(--rose)',
              border:     `1px solid ${!input.trim() ? 'var(--border)' : jsonOk ? 'rgba(184,245,74,0.2)' : 'rgba(245,85,74,0.2)'}` }}>
              {!input.trim() ? 'empty' : jsonOk ? '✓ valid' : '✗ invalid'}
            </span>
            <input ref={fileRef} type="file" accept=".json,.txt" style={{ display:'none' }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'none', color:'var(--tx-2)', cursor:'pointer', fontSize:11, fontFamily:'var(--font)', fontWeight:600 }}>
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
              [`${meta.bars.length} bars`,                     'var(--tx-2)'],
              [`${res.rhPatterns.length} RH pats`,             'var(--accent)'],
              [`${res.lhPatterns.length} LH pats`,             'var(--sky)'],
              [`${res.rhSections.length} sections`,            'var(--mint)'],
              [`${res.cadencePairs?.length ?? 0} cadences`,    'var(--orange, #f97316)'],
              [`split MIDI ${res.split} (${m2n(res.split)})`,  'var(--tx-3)'],
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
              const on = inner === t
              return (
                <button key={t} onClick={() => setInner(t)} style={{ padding:'4px 12px', borderRadius:'var(--radius-sm)', border: on ? '1px solid var(--border2)' : '1px solid transparent', background: on ? 'var(--surface2)' : 'transparent', color: on ? 'var(--tx-1)' : 'var(--tx-3)', fontSize:11, fontWeight: on ? 600 : 400, cursor:'pointer', transition:'all 0.12s', fontFamily:'var(--mono)', letterSpacing:'0.3px' }}>
                  {t}
                </button>
              )
            })}
          </div>

          {/* Inner content */}
          <div style={{ animation:'fadeUp 0.15s ease' }}>
            {inner === 'Timeline' && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <TimelineRow labeled={res.rhLabeled} sections={res.rhSections} title="Right Hand" />
                <TimelineRow labeled={res.lhLabeled} sections={res.lhSections} title="Left Hand" />
              </div>
            )}
            {inner === 'Patterns' && (
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
                {res.rhPatterns.length === 0 && res.lhPatterns.length === 0 && (
                  <div style={{ color:'var(--tx-3)', fontSize:12, fontFamily:'var(--mono)' }}>No repeating patterns detected</div>
                )}
              </div>
            )}
            {inner === 'Graph'   && <GraphView graph={res.rhGraph} />}
            {inner === 'Hands'   && <HandTable alignment={res.alignment} />}
            {inner === 'YAML'    && <YamlPanel yaml={yaml} />}
          </div>
        </div>
      )}
    </div>
  )
}