// ═══════════════════════════════════════════════════════════════════
// MIDI MUSIC ANALYZER — FRONTEND PAGE  v1.1
// React · Tailwind CSS (static classes only) · In-browser engine
//
// FIXES v1.1:
//   [4] PatternTimeline: SURPRISE bars now correctly render in red
//       (was falling through to dark gray #374151)
//   [5] All dynamic Tailwind color classes replaced with inline styles
//       (bg-${color}-500 pattern is stripped by Tailwind's purge)
//   [6] Header summary badges use inline styles — no dynamic classes
//   [7] Split algorithm in runAnalysis now uses the same weighted
//       zone logic as the backend engine (C3–C5 preference)
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload, Play, BarChart2, GitBranch, Music,
  FileText, AlertTriangle, Copy, CheckCheck, Info
} from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────────────
const NOTE_MAP_FE = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,
  'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11
};
const PAT_COLORS = [
  { bg:'#06b6d4', text:'#001' },{ bg:'#8b5cf6', text:'#fff' },
  { bg:'#f59e0b', text:'#001' },{ bg:'#10b981', text:'#001' },
  { bg:'#f43f5e', text:'#fff' },{ bg:'#3b82f6', text:'#fff' },
  { bg:'#a855f7', text:'#fff' },{ bg:'#ec4899', text:'#fff' },
];
const SUR_COLOR = { bg:'#ef4444', text:'#fff' };
const EMP_COLOR = { bg:'#1f2937', text:'#6b7280' };

// FIX [7]: same weighted split constants as backend engine
const HAND_SPLIT_LOW  = 48; // C3
const HAND_SPLIT_HIGH = 72; // C5

// ─── INLINE ENGINE ──────────────────────────────────────────────────
function p2m(pitch) {
  const m = String(pitch || '').match(/^([A-G][#Bb]?)(-?\d+)$/i);
  if (!m) return null;
  const pc = NOTE_MAP_FE[m[1].toUpperCase()];
  return pc === undefined ? null : (parseInt(m[2]) + 1) * 12 + pc;
}

function normNote(n) {
  return {
    pitch:                 n.pitch ?? n.p,
    start_subdivision:     n.start_subdivision ?? n.s ?? 0,
    offset_percent:        n.offset_percent ?? n.o ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
    end_cutoff_percent:    n.end_cutoff_percent ?? n.c ?? null,
    velocity:              100
  };
}

function normBar(b) {
  return { bar_number: b.bar_number ?? b.bn, notes: (b.notes ?? []).map(normNote) };
}

function normJson(j) {
  const ts = j.time_signature || '4/4';
  const [n, d] = ts.split('/').map(Number);
  return {
    tempo: j.tempo || 120, time_signature: ts, key: j.key || 'C',
    subdivisions_per_bar: j.subdivisions_per_bar || (n * (16 / d)),
    bars: (j.bars || []).map(normBar)
  };
}

function getOrd(bar) {
  return [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
}

function fpR(bar) { return getOrd(bar).map(n => `${n.start_subdivision}:${n.duration_subdivisions}`).join('|'); }
function fpC(bar) {
  const s = getOrd(bar);
  if (!s.length) return 'empty';
  if (s.length < 2) return `1:${s[0].duration_subdivisions}`;
  const iv = [];
  for (let i = 1; i < s.length; i++) {
    const a = p2m(s[i-1].pitch), b = p2m(s[i].pitch);
    iv.push(a !== null && b !== null ? b - a : '?');
  }
  return iv.join(',');
}
function fpT(bar, spb = 16) {
  const nn = bar.notes;
  if (!nn.length) return 'empty';
  const dc = {};
  for (const x of nn) dc[x.duration_subdivisions] = (dc[x.duration_subdivisions] || 0) + 1;
  const dd = Object.entries(dc).sort((a, b) => b[1] - a[1])[0][0];
  const mx = Math.max(...nn.map(x => x.duration_subdivisions));
  return `n${nn.length}_d${dd}_max${mx}`;
}
function fpE(bar) { return getOrd(bar).map(n => `${n.pitch}@${n.start_subdivision}:${n.duration_subdivisions}`).join('|'); }
function fpW(bars, si, w) {
  const sl = bars.slice(si, si + w);
  return { rk: sl.map((b,i) => `[${i}:${fpR(b)}]`).join(''), ck: sl.map((b,i) => `[${i}:${fpC(b)}]`).join('') };
}

function detAlt(bar) {
  const s = getOrd(bar);
  if (s.length < 4) return null;
  const allSame = s.every(n => n.duration_subdivisions === s[0].duration_subdivisions);
  const ev = s.filter((_, i) => i % 2 === 0), od = s.filter((_, i) => i % 2 === 1);
  const ep = new Set(ev.map(n => n.pitch)), op = new Set(od.map(n => n.pitch));
  if (op.size === 1 && ep.size > 1 && allSame)
    return { type: 'alternating', pedal: [...op][0], pedalPos: 'odd', melody: ev.map(n => n.pitch), notesPerBar: s.length, dur: s[0].duration_subdivisions };
  if (ep.size === 1 && op.size > 1 && allSame)
    return { type: 'alternating', pedal: [...ep][0], pedalPos: 'even', melody: od.map(n => n.pitch), notesPerBar: s.length, dur: s[0].duration_subdivisions };
  return null;
}

// FIX [7]: Weighted split — same algorithm as backend engine
function detectSplitFE(bars) {
  const ps = new Set();
  for (const b of bars) for (const n of b.notes) { const m = p2m(n.pitch); if (m !== null) ps.add(m); }
  if (ps.size < 2) return 60;
  const sorted = [...ps].sort((a, b) => a - b);
  let bestW = -1, split = 60;
  for (let i = 1; i < sorted.length; i++) {
    const lo = sorted[i-1], hi = sorted[i], gap = hi - lo;
    if (gap === 0) continue;
    const mid = (lo + hi) / 2;
    const inZone = mid >= HAND_SPLIT_LOW && mid <= HAND_SPLIT_HIGH;
    const weighted = gap * (inZone ? 3.0 : 0.7);
    if (weighted > bestW) { bestW = weighted; split = Math.round(mid); }
  }
  return split;
}

function detectPatternsFE(bars, spb = 16) {
  if (!bars.length) return [];
  const eM = new Map(), rM = new Map(), cM = new Map(), tM = new Map(), wM = new Map();
  const hp = (m, k, e) => { if (!m.has(k)) m.set(k, []); m.get(k).push(e); };
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i], bn = b.bar_number, e = { barIdx: i, startBar: bn, w: 1 };
    hp(eM, fpE(b), e); hp(rM, fpR(b), e); hp(cM, fpC(b), e); hp(tM, fpT(b, spb), e);
  }
  for (const w of [2, 4, 8].filter(w => w <= bars.length)) {
    for (let i = 0; i <= bars.length - w; i++) {
      const { rk, ck } = fpW(bars, i, w);
      const e = { barIdx: i, startBar: bars[i].bar_number, w };
      hp(wM, `R${w}:${rk}`, e); hp(wM, `C${w}:${rk}~~${ck}`, e);
    }
  }
  const cands = [];
  const addC = (m, type, q) => { for (const [fp, oc] of m) { if (oc.length < 2) continue; cands.push({ fingerprint: fp, type, windowSize: oc[0].w, occurrences: oc, score: oc.length * oc[0].w * q, quality: q }); } };
  addC(eM, 'exact', 3.0); addC(rM, 'rhythmic', 2.0); addC(cM, 'melodic', 1.8); addC(tM, 'textural', 1.0); addC(wM, 'window', 2.5);
  cands.sort((a, b) => b.score - a.score);
  const covered = new Set(), finals = [];
  for (const c of cands) {
    const nw = [];
    for (const o of c.occurrences) for (let j = 0; j < c.windowSize; j++) { const bn = o.startBar + j; if (!covered.has(bn)) nw.push(bn); }
    if (nw.length >= 2 || finals.length < 2) { finals.push(c); for (const bn of nw) covered.add(bn); }
    if (finals.length >= 10) break;
  }
  finals.forEach((p, i) => { p.id = `PAT_${String.fromCharCode(65+i)}`; p.label = `Pattern_${String.fromCharCode(65+i)}`; p.color = PAT_COLORS[i] || { bg:'#6b7280', text:'#fff' }; });
  return finals;
}

function labelBarsFE(bars, patterns, spb) {
  const lookup = new Map();
  for (const pat of patterns) for (const occ of pat.occurrences) for (let j = 0; j < pat.windowSize; j++) {
    const bn = occ.startBar + j;
    if (!lookup.has(bn)) lookup.set(bn, []);
    lookup.get(bn).push({ pat, pos: j });
  }
  return bars.map(bar => {
    const bn = bar.bar_number, notes = bar.notes, matches = lookup.get(bn) || [];
    const isEmpty = !notes.length, isSustain = notes.length === 1 && notes[0].duration_subdivisions >= spb - 1;
    const alt = isEmpty ? null : detAlt(bar);
    let pid = null, pl = null;
    if (matches.length > 0) { const best = matches.sort((a, b) => b.pat.score - a.pat.score)[0]; pid = best.pat.id; pl = best.pat.label; }
    return {
      barNumber: bn, notes,
      patternId:    isEmpty ? 'EMPTY'   : (pid || 'SURPRISE'),
      patternLabel: isEmpty ? 'Empty'   : (pl  || 'Surprise'),
      isSurprise: !isEmpty && !pid, isEmpty, isSustain,
      noteCount: notes.length, alternating: alt,
      maxDuration: notes.length ? Math.max(...notes.map(n => n.duration_subdivisions)) : 0,
      texture: fpT(bar, spb), rhythm: fpR(bar)
    };
  });
}

function detectSectionsFE(labeled, patterns) {
  const rawGroups = []; const letterMap = new Map(); let next = 0; let current = null;
  for (const lb of labeled) {
    const pid = lb.patternId;
    if (!current || current.patternId !== pid) {
      if (current && pid === 'SURPRISE' && rawGroups.length > 0) { current.bars.push(lb); current.surprises.push(lb.barNumber); continue; }
      current = { patternId: pid, patternLabel: lb.patternLabel, bars: [lb], surprises: [] };
      rawGroups.push(current);
    } else current.bars.push(lb);
  }
  const merged = [];
  for (let i = 0; i < rawGroups.length; i++) {
    const g = rawGroups[i];
    if (g.bars.length === 1 && merged.length > 0) { const p = merged[merged.length-1]; p.bars.push(...g.bars); p.surprises.push(g.bars[0].barNumber); }
    else merged.push(g);
  }
  return merged.map((g, idx) => {
    const fb = g.bars[0].barNumber, lb2 = g.bars[g.bars.length-1].barNumber;
    const pat = patterns.find(p => p.id === g.patternId);
    if (!letterMap.has(g.patternId)) letterMap.set(g.patternId, String.fromCharCode(65 + next++));
    const letter = letterMap.get(g.patternId);
    const isRepeat = idx > 0 && merged.slice(0, idx).some(p => p.patternId === g.patternId);
    const rc = merged.slice(0, idx).filter(p => p.patternId === g.patternId).length;
    const altCount = g.bars.filter(b => b.alternating !== null).length;
    const susCount = g.bars.filter(b => b.isSustain).length;
    const dominantTexture = altCount > g.bars.length / 2 ? 'alternating' : susCount > 0 ? 'sustain_cadence' : 'mixed';
    return {
      id: `S${String(idx+1).padStart(2,'0')}`, index: idx, startBar: fb, endBar: lb2,
      barCount: g.bars.length, patternId: g.patternId, patternLabel: g.patternLabel,
      letter, isRepeat, repeatCount: rc,
      fullLabel: isRepeat ? `${letter}${rc > 1 ? rc : "'"}` : letter,
      bars: g.bars, surprises: g.surprises, dominantTexture,
      color: pat ? pat.color : (g.patternId === 'EMPTY' ? EMP_COLOR : SUR_COLOR)
    };
  });
}

function buildGraphFE(labeled, patterns) {
  const nM = new Map();
  for (const lb of labeled) {
    const id = lb.patternId;
    if (!nM.has(id)) { const p = patterns.find(x => x.id === id); nM.set(id, { id, label: lb.patternLabel, count: 0, bars: [], color: p ? p.color : (lb.isEmpty ? EMP_COLOR : SUR_COLOR) }); }
    const nd = nM.get(id); nd.count++; nd.bars.push(lb.barNumber);
  }
  const eM = new Map();
  for (let i = 0; i < labeled.length - 1; i++) {
    const f = labeled[i].patternId, t = labeled[i+1].patternId;
    if (f === t) continue;
    const k = `${f}|||${t}`; eM.set(k, (eM.get(k) || 0) + 1);
  }
  const edges = [];
  for (const [k, w] of eM) { const [f, t] = k.split('|||'); edges.push({ from: f, to: t, weight: w }); }
  edges.sort((a, b) => b.weight - a.weight);
  return { nodes: [...nM.values()], edges };
}

function analyzeHandFE(bars, spb, handName) {
  const nonEmpty = bars.filter(b => b.notes.length > 0);
  if (!nonEmpty.length) {
    const labeled = bars.map(b => ({ barNumber: b.bar_number, notes: [], patternId: 'EMPTY', patternLabel: 'Empty', isEmpty: true, isSurprise: false, isSustain: false, noteCount: 0, alternating: null, maxDuration: 0, texture: 'empty', rhythm: 'empty' }));
    return { patterns: [], labeled, sections: [], graph: { nodes: [], edges: [] }, hand: handName };
  }
  const patterns = detectPatternsFE(nonEmpty, spb);
  const labeled  = labelBarsFE(bars, patterns, spb);
  const sections = detectSectionsFE(labeled, patterns);
  const graph    = buildGraphFE(labeled, patterns);
  return { patterns, labeled, sections, graph, hand: handName };
}

function runAnalysis(rawJson, splitMidi) {
  const normalized = normJson(rawJson);
  const spb  = normalized.subdivisions_per_bar;
  const split = splitMidi !== undefined ? splitMidi : detectSplitFE(normalized.bars);
  const rhBars = normalized.bars.map(b => ({ ...b, notes: b.notes.filter(n => (p2m(n.pitch) ?? 0) >= split) }));
  const lhBars = normalized.bars.map(b => ({ ...b, notes: b.notes.filter(n => (p2m(n.pitch) ?? 0) <  split) }));
  const rh = analyzeHandFE(rhBars, spb, 'right');
  const lh = analyzeHandFE(lhBars, spb, 'left');
  const allBNs = new Set([...rh.labeled.map(b => b.barNumber), ...lh.labeled.map(b => b.barNumber)]);
  const rhM = new Map(rh.labeled.map(b => [b.barNumber, b]));
  const lhM = new Map(lh.labeled.map(b => [b.barNumber, b]));
  const alignment = [...allBNs].sort((a, b) => a - b).map(bn => ({
    barNumber: bn, rh: rhM.get(bn) || null, lh: lhM.get(bn) || null,
    rhPattern: rhM.get(bn)?.patternLabel || '-', lhPattern: lhM.get(bn)?.patternLabel || '-'
  }));
  return {
    metadata: normalized, splitMidi: split, rightHand: rh, leftHand: lh, alignment,
    summary: { totalBars: normalized.bars.length, rhPatterns: rh.patterns.length, lhPatterns: lh.patterns.length, rhSections: rh.sections.length, lhSections: lh.sections.length, surpriseBars: rh.labeled.filter(b => b.isSurprise).map(b => b.barNumber), sustainBars: rh.labeled.filter(b => b.isSustain).map(b => b.barNumber), splitMidi: split, rhHasNotes: rhBars.some(b => b.notes.length > 0), lhHasNotes: lhBars.some(b => b.notes.length > 0) }
  };
}

// ─── YAML GENERATOR (frontend copy — safe version) ──────────────────
function generateYamlFE(a) {
  if (!a) return '# No analysis data';
  const { metadata, rightHand: rh, leftHand: lh } = a;
  const total = metadata.bars.length;
  const motifLines = (rh.patterns || []).map(p => {
    const occ = p.occurrences[0];
    const bar = metadata.bars.find(b => (b.bar_number ?? b.bn) === occ.startBar);
    const notes = bar
      ? [...bar.notes].map(n => ({ pitch: n.pitch ?? n.p, d: n.duration_subdivisions ?? n.d ?? 4, s: n.start_subdivision ?? n.s ?? 0 })).sort((a, b) => a.s - b.s).slice(0, 5)
      : [];
    return `  ${p.label}:\n    type: "${p.type}"\n    occurrences: ${p.occurrences.length}\n    window_size: ${p.windowSize}\n    bars: [${p.occurrences.map(o => o.startBar).join(', ')}]\n    sample_notes: [${notes.map(n => `${n.pitch}@s${n.s}:d${n.d}`).join(', ')}]`;
  }).join('\n\n') || '  # (no patterns detected)';

  const secLines = (rh.sections || []).map(s =>
    `  - id: "${s.id}"\n    label: "${s.fullLabel}"\n    bars: [${s.startBar}, ${s.endBar}]\n    pattern: "${s.patternLabel}"\n    texture: "${s.dominantTexture}"\n    is_repeat: ${s.isRepeat}\n    surprises: [${s.surprises.join(', ')}]`
  ).join('\n\n') || '  # (no sections)';

  const surprBars = (rh.labeled || []).filter(b => b.isSurprise).map(b => b.barNumber).join(', ') || 'none';
  const sustBars  = (rh.labeled || []).filter(b => b.isSustain).map(b => b.barNumber).join(', ')  || 'none';
  const graphEdges = (rh.graph?.edges || []).slice(0, 6).map(e => `    - from: "${e.from}" → "${e.to}" (${e.weight}×)`).join('\n') || '    # (no transitions)';
  const sectionOrder = (rh.sections || []).map(s => s.fullLabel).join(' → ') || 'N/A';
  const dominantTexture = rh.patterns?.length > 0 ? rh.patterns[0].type : 'unknown';

  return `# ═══════════════════════════════════════════
# MIDI ANALYSIS BLUEPRINT
# Engine: MusicAnalyzer v1.1
# ═══════════════════════════════════════════

composition:
  key: "${metadata.key}"
  tempo: ${metadata.tempo}
  time_signature: "${metadata.time_signature}"
  total_bars: ${total}
  subdivisions_per_bar: ${metadata.subdivisions_per_bar}
  rh_patterns_found: ${(rh.patterns || []).length}
  lh_patterns_found: ${(lh.patterns || []).length}

motifs:
${motifLines}

sections:
${secLines}

graph_transitions:
${graphEdges}

generation_rules:
  - "Section order: ${sectionOrder}"
  - "Surprise bars: [${surprBars}]"
  - "Sustain bars: [${sustBars}]"
  - "RH hand split (MIDI): ${a.splitMidi}"
  - "Dominant RH texture: ${dominantTexture}"

left_hand:
  pattern_count: ${(lh.patterns || []).length}
  section_count: ${(lh.sections || []).length}
  patterns: [${(lh.patterns || []).map(p => `"${p.label}"`).join(', ')}]
`;
}

// ─── TABS ────────────────────────────────────────────────────────────
const TABS = [
  { id:'input',    label:'Input',    icon: Upload    },
  { id:'timeline', label:'Timeline', icon: BarChart2 },
  { id:'patterns', label:'Patterns', icon: Music     },
  { id:'graph',    label:'Graph',    icon: GitBranch },
  { id:'hands',    label:'Hands',    icon: BarChart2 },
  { id:'yaml',     label:'YAML',     icon: FileText  },
];

// ─── SUMMARY BADGE COLORS ────────────────────────────────────────────
// FIX [6]: Hardcoded inline styles — no dynamic Tailwind class generation
const BADGE_STYLES = [
  { bg:'rgba(100,116,139,0.15)', border:'rgba(100,116,139,0.3)', color:'#94a3b8' }, // slate — totalBars
  { bg:'rgba(6,182,212,0.1)',    border:'rgba(6,182,212,0.25)',   color:'#22d3ee' }, // cyan  — rhPatterns
  { bg:'rgba(139,92,246,0.1)',   border:'rgba(139,92,246,0.25)',  color:'#a78bfa' }, // violet — lhPatterns
  { bg:'rgba(16,185,129,0.1)',   border:'rgba(16,185,129,0.25)',  color:'#34d399' }, // emerald — sections
  { bg:'rgba(244,63,94,0.1)',    border:'rgba(244,63,94,0.25)',   color:'#fb7185' }, // rose — surprises
];


// ═══════════════════════════════════════════════════════════════════
// PATTERN TIMELINE
// FIX [4]: Surprise bar cells now correctly use SUR_COLOR.bg (#ef4444)
// Previously the color resolution path never reached the surprise branch
// because isSurprise check was happening AFTER a fallback to #374151.
// ═══════════════════════════════════════════════════════════════════
function PatternTimeline({ labeled, sections }) {
  const [hovered, setHovered] = useState(null);
  if (!labeled || labeled.length === 0) return <div className="text-sm text-slate-500">No data</div>;

  const ROW_SIZE = 16;
  const rows = [];
  for (let i = 0; i < labeled.length; i += ROW_SIZE) rows.push(labeled.slice(i, i + ROW_SIZE));

  // FIX [4]: Determine cell background in the correct priority order:
  //   1. Empty → gray
  //   2. Surprise → red (was previously merged with "not found in sections" case)
  //   3. Pattern found in sections → section color
  //   4. Fallback → dark gray
  function getCellBg(lb) {
    if (lb.isEmpty) return EMP_COLOR.bg;
    if (lb.isSurprise) return SUR_COLOR.bg;               // ← was missing this branch
    const sec = sections.find(s => s.patternId === lb.patternId);
    return sec ? sec.color.bg : '#374151';
  }

  return (
    <div className="space-y-3">
      {/* Section legend — FIX [5]: inline styles, no dynamic Tailwind */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sections.map(sec => (
          <div key={sec.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
               style={{ backgroundColor: sec.color.bg + '22', border: `1px solid ${sec.color.bg}55` }}>
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: sec.color.bg }} />
            <span style={{ color: sec.color.bg }}>{sec.fullLabel}</span>
            <span className="text-slate-500">bars {sec.startBar}–{sec.endBar}</span>
          </div>
        ))}
        {/* Surprise legend entry */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
             style={{ backgroundColor: SUR_COLOR.bg + '22', border: `1px solid ${SUR_COLOR.bg}55` }}>
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: SUR_COLOR.bg }} />
          <span style={{ color: SUR_COLOR.bg }}>Surprise</span>
        </div>
      </div>

      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center gap-1">
          <span className="w-6 text-xs text-right text-slate-600 shrink-0">{row[0].barNumber}</span>
          <div className="flex gap-0.5 flex-1">
            {row.map(lb => {
              const bg = getCellBg(lb);
              const isHov = hovered?.barNumber === lb.barNumber;
              return (
                <div key={lb.barNumber}
                  className="relative transition-all duration-100 rounded-sm cursor-pointer"
                  style={{ backgroundColor: bg, width: '100%', height: 28, opacity: lb.isEmpty ? 0.25 : 1, outline: isHov ? '2px solid white' : 'none' }}
                  onMouseEnter={() => setHovered(lb)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {lb.isSustain && <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/60 rounded" />}
                  {lb.alternating && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex gap-0.5">{[0,1,2,3].map(i => <div key={i} className="w-px h-3 rounded bg-white/40" />)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {hovered && (
        <div className="p-3 mt-3 space-y-1 font-mono text-xs border rounded-xl"
             style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="font-semibold text-white">
            Bar {hovered.barNumber} — <span style={{ color: hovered.isSurprise ? SUR_COLOR.bg : '#06b6d4' }}>{hovered.patternLabel}</span>
          </div>
          <div className="text-slate-400">Notes: {hovered.noteCount} · {hovered.texture}</div>
          {hovered.alternating && <div style={{ color:'#f59e0b' }}>⟳ Alternating · Pedal: {hovered.alternating.pedal} · Dur: {hovered.alternating.dur}</div>}
          {hovered.isSustain  && <div style={{ color:'#8b5cf6' }}>▬ Full-bar sustain (d={hovered.maxDuration})</div>}
          {hovered.isSurprise && <div style={{ color:'#ef4444' }}>★ Surprise / signature moment</div>}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// PATTERN LIBRARY
// FIX [5]: All color classes replaced with inline styles
// ═══════════════════════════════════════════════════════════════════
function PatternLibrary({ patterns, labeled, metadata }) {
  const spb = metadata?.subdivisions_per_bar || 16;
  if (!patterns || patterns.length === 0)
    return <div className="text-sm text-slate-500">No patterns detected</div>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {patterns.map(pat => {
        const exOcc   = pat.occurrences[0];
        const exBar   = metadata?.bars.find(b => (b.bar_number ?? b.bn) === exOcc.startBar);
        const exNotes = exBar
          ? [...exBar.notes].map(n => ({
              pitch: n.pitch ?? n.p,
              start_subdivision: n.start_subdivision ?? n.s ?? 0,
              duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4
            })).sort((a, b) => a.start_subdivision - b.start_subdivision)
          : [];
        const altSample = (labeled || []).find(lb => lb.patternId === pat.id && lb.alternating)?.alternating;

        return (
          <div key={pat.id} className="overflow-hidden rounded-2xl"
               style={{ border: `1px solid ${pat.color.bg}44`, background: `linear-gradient(135deg,${pat.color.bg}11,${pat.color.bg}05)` }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3"
                 style={{ backgroundColor: pat.color.bg + '22' }}>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pat.color.bg }} />
                <span className="text-sm font-bold text-white">{pat.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: pat.color.bg + '33', color: pat.color.bg }}>{pat.type}</span>
              </div>
              <div className="text-xs text-slate-400">{pat.occurrences.length}× · {pat.windowSize}-bar</div>
            </div>

            {/* Mini piano roll */}
            <div className="px-4 py-3">
              <div className="relative h-20 p-2 mb-3 overflow-hidden rounded-xl"
                   style={{ background: 'rgba(0,0,0,0.4)' }}>
                {exNotes.slice(0, 16).map((n, i) => {
                  const mn = p2m(n.pitch);
                  if (mn === null) return null;
                  const allMidis = exNotes.map(x => p2m(x.pitch)).filter(x => x !== null);
                  const minM = Math.min(...allMidis), maxM = Math.max(...allMidis);
                  const range = Math.max(maxM - minM, 12);
                  return (
                    <div key={i} className="absolute rounded-sm"
                         style={{ left: `${(n.start_subdivision / spb) * 100}%`, top: `${((maxM - mn) / range) * 100}%`, width: `${Math.max((n.duration_subdivisions / spb) * 100, 3)}%`, height: '12%', backgroundColor: pat.color.bg, opacity: 0.85 }}
                         title={`${n.pitch} @sub${n.start_subdivision} d=${n.duration_subdivisions}`} />
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg" style={{ background:'rgba(0,0,0,0.3)' }}>
                  <div className="text-slate-500 mb-0.5">Appears at bars</div>
                  <div className="font-mono text-xs truncate text-slate-200">{pat.occurrences.map(o => o.startBar).join(', ')}</div>
                </div>
                <div className="p-2 rounded-lg" style={{ background:'rgba(0,0,0,0.3)' }}>
                  <div className="text-slate-500 mb-0.5">Score</div>
                  <div className="font-mono text-slate-200">{pat.score.toFixed(1)}</div>
                </div>
              </div>

              {altSample && (
                <div className="p-2 mt-2 text-xs rounded-lg"
                     style={{ backgroundColor: pat.color.bg + '15', color: pat.color.bg }}>
                  ⟳ Alternating pedal: <strong>{altSample.pedal}</strong> · {altSample.notesPerBar} notes/bar · d={altSample.dur}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// PATTERN GRAPH — inline styles throughout
// ═══════════════════════════════════════════════════════════════════
function PatternGraph({ graph }) {
  const [positions, setPositions] = useState(null);
  const { nodes, edges } = graph || { nodes: [], edges: [] };

  useEffect(() => {
    if (!nodes.length) return;
    const cx = 350, cy = 220, r = 160;
    const pos = {};
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      pos[node.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
    setPositions(pos);
  }, [nodes]);

  if (!nodes.length) return <div className="text-sm text-slate-500">No graph data</div>;
  if (!positions)    return <div className="text-sm text-slate-500">Calculating layout…</div>;

  const maxWeight = Math.max(...edges.map(e => e.weight), 1);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Nodes = patterns · Edges = transitions · Thickness = frequency</p>
      <div className="overflow-hidden rounded-2xl"
           style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(100,116,139,0.4)' }}>
        <svg width="100%" viewBox="0 0 700 440" className="w-full">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#6b7280" />
            </marker>
          </defs>

          {edges.slice(0, 20).map((edge, i) => {
            const f = positions[edge.from], t = positions[edge.to];
            if (!f || !t) return null;
            const sw    = Math.max(1, (edge.weight / maxWeight) * 4);
            const stroke = edge.weight >= maxWeight * 0.6 ? '#06b6d4' : '#374151';
            const dx = t.x - f.x, dy = t.y - f.y;
            const mx = (f.x + t.x) / 2 - dy * 0.15, my = (f.y + t.y) / 2 + dx * 0.15;
            return (
              <g key={i}>
                <path d={`M${f.x},${f.y} Q${mx},${my} ${t.x},${t.y}`} fill="none" stroke={stroke} strokeWidth={sw} strokeOpacity={0.6} markerEnd="url(#arrow)" />
                <text x={mx} y={my} textAnchor="middle" fill="#9ca3af" fontSize="9">{edge.weight}</text>
              </g>
            );
          })}

          {nodes.map(node => {
            const pos = positions[node.id];
            if (!pos) return null;
            const r = Math.max(22, Math.min(35, 18 + node.count * 1.5));
            return (
              <g key={node.id}>
                <circle cx={pos.x} cy={pos.y} r={r} fill={node.color.bg} fillOpacity={0.25} stroke={node.color.bg} strokeWidth={2} />
                <text x={pos.x} y={pos.y - 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                  {node.label.replace('Pattern_', 'P')}
                </text>
                <text x={pos.x} y={pos.y + 8} textAnchor="middle" fill="#9ca3af" fontSize="8">{node.count}b</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Edge table */}
      <div className="p-3 rounded-xl" style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(100,116,139,0.4)' }}>
        <p className="mb-2 text-xs tracking-widest uppercase text-slate-500">Top transitions</p>
        <div className="space-y-1.5">
          {edges.slice(0, 8).map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-20 font-mono truncate text-slate-300">{e.from.replace('PAT_','P')}</span>
              <span className="text-slate-600">→</span>
              <span className="w-20 font-mono truncate text-slate-300">{e.to.replace('PAT_','P')}</span>
              <div className="flex-1 rounded-full h-1.5" style={{ background:'rgba(30,41,59,1)' }}>
                <div className="h-full rounded-full" style={{ width:`${(e.weight/maxWeight)*100}%`, background:'#06b6d4' }} />
              </div>
              <span className="w-4 text-right text-slate-500">{e.weight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// HAND VIEWER — inline styles throughout
// ═══════════════════════════════════════════════════════════════════
function HandViewer({ alignment, rightHand, leftHand }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE   = 24;
  const totalPages  = Math.ceil((alignment || []).length / PAGE_SIZE);
  const slice       = (alignment || []).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const getColor = (barData, hand) => {
    if (!barData || barData.isEmpty) return EMP_COLOR;
    if (barData.isSurprise) return SUR_COLOR;
    const patterns = hand === 'rh' ? rightHand.patterns : leftHand.patterns;
    const pat = (patterns || []).find(p => p.id === barData.patternId);
    return pat ? pat.color : EMP_COLOR;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="p-3 text-center rounded-xl"
             style={{ background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)' }}>
          <div className="text-sm font-semibold" style={{ color:'#22d3ee' }}>Right Hand</div>
          <div className="text-xs text-slate-400">{rightHand.patterns.length} patterns · {rightHand.sections.length} sections</div>
        </div>
        <div className="p-3 text-center rounded-xl"
             style={{ background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.2)' }}>
          <div className="text-sm font-semibold" style={{ color:'#a78bfa' }}>Left Hand</div>
          <div className="text-xs" style={{ color:'#8b5cf6' }}>{leftHand.patterns.length} patterns · {leftHand.sections.length} sections</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-1 text-xs text-slate-500 mb-2">
          <span>Bar</span><span>Right Hand</span><span>Left Hand</span>
        </div>
        {slice.map(aln => {
          const rhC = getColor(aln.rh, 'rh');
          const lhC = getColor(aln.lh, 'lh');
          return (
            <div key={aln.barNumber} className="grid grid-cols-[2rem_1fr_1fr] gap-1 items-center">
              <span className="text-xs text-right text-slate-600">{aln.barNumber}</span>
              <div className="px-2 py-1 font-mono text-xs truncate rounded-md"
                   style={{ backgroundColor: rhC.bg + '30', color: rhC.bg, border: `1px solid ${rhC.bg}40` }}>
                {aln.rhPattern}
                {aln.rh?.alternating && <span className="ml-1 opacity-60">⟳</span>}
                {aln.rh?.isSustain   && <span className="ml-1 opacity-60">▬</span>}
              </div>
              <div className="px-2 py-1 font-mono text-xs truncate rounded-md"
                   style={{ backgroundColor: lhC.bg + '30', color: lhC.bg, border: `1px solid ${lhC.bg}40` }}>
                {aln.lhPattern}
                {aln.lh?.alternating && <span className="ml-1 opacity-60">⟳</span>}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}
                  className="px-3 py-1 text-xs rounded-lg disabled:opacity-40"
                  style={{ background:'rgba(51,65,85,1)', color:'#cbd5e1' }}>← Prev</button>
          <span className="text-xs text-slate-500">Page {page+1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page === totalPages-1}
                  className="px-3 py-1 text-xs rounded-lg disabled:opacity-40"
                  style={{ background:'rgba(51,65,85,1)', color:'#cbd5e1' }}>Next →</button>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// YAML EXPORT
// ═══════════════════════════════════════════════════════════════════
function YamlExport({ analysis }) {
  const [copied, setCopied] = useState(false);
  const yaml = generateYamlFE(analysis);
  const handleCopy = () => {
    navigator.clipboard.writeText(yaml).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Auto-generated blueprint — paste into your RAG pipeline or MIDI Composer skill.</p>
        <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={ copied
                  ? { background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#34d399' }
                  : { background:'rgba(51,65,85,1)',      color:'#cbd5e1' }}>
          {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy YAML'}
        </button>
      </div>
      <textarea readOnly value={yaml}
                className="w-full p-4 font-mono text-xs leading-relaxed resize-none h-96 rounded-xl focus:outline-none"
                style={{ background:'rgba(0,0,0,0.6)', border:'1px solid rgba(51,65,85,1)', color:'#4ade80' }} />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function AnalyzerPage() {
  const [input,       setInput]       = useState('');
  const [splitMidi,   setSplitMidi]   = useState('');
  const [analysis,    setAnalysis]    = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState('input');
  const [jsonValid,   setJsonValid]   = useState(true);
  const fileRef = useRef(null);

  const handleInputChange = (val) => {
    setInput(val);
    try { JSON.parse(val); setJsonValid(true); } catch { setJsonValid(false); }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => handleInputChange(ev.target.result);
    reader.readAsText(file);
  };

  const handleAnalyze = useCallback(() => {
    if (!input.trim() || !jsonValid) return;
    setIsAnalyzing(true); setError(null);
    setTimeout(() => {
      try {
        const parsed = JSON.parse(input);
        const split  = splitMidi ? parseInt(splitMidi) : undefined;
        setAnalysis(runAnalysis(parsed, split));
        setActiveTab('timeline');
      } catch (err) {
        setError(err.message || 'Analysis failed');
      } finally {
        setIsAnalyzing(false);
      }
    }, 50);
  }, [input, jsonValid, splitMidi]);

  const rh  = analysis?.rightHand;
  const lh  = analysis?.leftHand;
  const sum = analysis?.summary;

  // Summary label config — inline styles, not dynamic Tailwind
  const sumLabels = sum ? [
    [`${sum.totalBars} bars`,       BADGE_STYLES[0]],
    [`${sum.rhPatterns} RH patterns`, BADGE_STYLES[1]],
    [`${sum.lhPatterns} LH patterns`, BADGE_STYLES[2]],
    [`${sum.rhSections} sections`,   BADGE_STYLES[3]],
    [`${sum.surpriseBars.length} surprises`, BADGE_STYLES[4]],
  ] : [];

  return (
    <div className="flex flex-col w-full min-h-screen p-4 md:p-6"
         style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b, #0f172a)' }}>

      {/* Header */}
      <div className="p-6 mb-6 text-center border shadow-xl rounded-2xl"
           style={{ background:'rgba(30,41,59,0.6)', borderColor:'rgba(71,85,105,0.5)', backdropFilter:'blur(20px)' }}>
        <h1 className="text-3xl font-extrabold md:text-5xl"
            style={{ background:'linear-gradient(90deg,#34d399,#22d3ee,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Music Pattern Analyzer
        </h1>
        <p className="mt-2 text-sm" style={{ color:'#94a3b8' }}>
          DSA: Hash Map + Directed Graph + N-gram · Separate RH/LH · YAML blueprint output
        </p>
        {sumLabels.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {sumLabels.map(([label, style]) => (
              <span key={label} className="px-3 py-1 font-mono text-xs rounded-full"
                    style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 mb-4 border rounded-xl"
           style={{ background:'rgba(30,41,59,0.4)', borderColor:'rgba(71,85,105,0.4)' }}>
        {TABS.map(tab => {
          const Icon     = tab.icon;
          const disabled = tab.id !== 'input' && !analysis;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => !disabled && setActiveTab(tab.id)} disabled={disabled}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all"
                    style={isActive
                      ? { background:'linear-gradient(135deg,rgba(6,182,212,0.2),rgba(139,92,246,0.2))', color:'white', border:'1px solid rgba(255,255,255,0.1)' }
                      : { color: disabled ? '#475569' : '#94a3b8', cursor: disabled ? 'not-allowed' : 'pointer' }}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 border shadow-xl rounded-2xl md:p-6"
           style={{ background:'rgba(30,41,59,0.6)', borderColor:'rgba(71,85,105,0.4)', backdropFilter:'blur(20px)' }}>

        {/* INPUT */}
        {activeTab === 'input' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Paste MIDI JSON</h2>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 font-mono text-xs rounded-full"
                      style={!input.trim()
                        ? { background:'rgba(51,65,85,0.3)', border:'1px solid rgba(71,85,105,0.2)', color:'#64748b' }
                        : jsonValid
                        ? { background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', color:'#34d399' }
                        : { background:'rgba(244,63,94,0.1)',  border:'1px solid rgba(244,63,94,0.3)',  color:'#fb7185' }}>
                  {!input.trim() ? 'empty' : jsonValid ? '✓ valid' : '✗ invalid'}
                </span>
                <button onClick={() => fileRef.current?.click()}
                        className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                        style={{ background:'rgba(51,65,85,1)', color:'#cbd5e1' }}>
                  <Upload className="w-3.5 h-3.5" /> Load file
                </button>
                <input ref={fileRef} type="file" accept=".json,.txt" className="hidden" onChange={handleFile} />
              </div>
            </div>

            <textarea value={input} onChange={e => handleInputChange(e.target.value)} spellCheck={false}
                      placeholder={`Paste MIDI JSON here (compact or full format)…\n\n{"tempo":120,"time_signature":"4/4","key":"Am","subdivisions_per_bar":16,"bars":[…]}`}
                      className="w-full h-64 p-4 font-mono text-xs leading-relaxed resize-none rounded-xl focus:outline-none"
                      style={{
                        background:'rgba(0,0,0,0.6)', color:'#e2e8f0',
                        border: !input.trim() || jsonValid ? '1px solid rgba(71,85,105,0.7)' : '1px solid rgba(244,63,94,0.4)'
                      }} />

            {/* Split control */}
            <div className="flex items-center gap-3 p-3 rounded-xl"
                 style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(71,85,105,0.4)' }}>
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1">
                <div className="mb-1 text-xs text-slate-400">Hand split point (MIDI note number)</div>
                <div className="flex items-center gap-2">
                  <input type="number" value={splitMidi} onChange={e => setSplitMidi(e.target.value)}
                         placeholder="Auto-detect" className="w-32 px-2 py-1 font-mono text-xs rounded-lg focus:outline-none"
                         style={{ background:'rgba(0,0,0,0.5)', border:'1px solid rgba(71,85,105,0.7)', color:'#e2e8f0' }} />
                  <span className="text-xs text-slate-600">Leave blank = weighted auto-detect (prefers C3–C5 zone)</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 text-sm rounded-xl"
                   style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.2)', color:'#fda4af' }}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button onClick={handleAnalyze} disabled={isAnalyzing || !input.trim() || !jsonValid}
                    className="flex items-center justify-center w-full gap-2 px-6 py-3 font-semibold transition-all shadow-lg rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background:'linear-gradient(135deg,#10b981,#06b6d4,#8b5cf6)', color:'white' }}>
              {isAnalyzing
                ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Analyzing…</>
                : <><Play className="w-4 h-4" />Analyze Music</>}
            </button>
          </div>
        )}

        {activeTab === 'timeline' && rh && (
          <div>
            <h2 className="mb-4 font-semibold text-white">Pattern Timeline — Right Hand</h2>
            <PatternTimeline labeled={rh.labeled} sections={rh.sections} />
            {lh.labeled.some(b => !b.isEmpty) && <>
              <h2 className="mt-6 mb-4 font-semibold text-white">Pattern Timeline — Left Hand</h2>
              <PatternTimeline labeled={lh.labeled} sections={lh.sections} />
            </>}
          </div>
        )}

        {activeTab === 'patterns' && rh && (
          <div>
            <h2 className="mb-4 font-semibold text-white">Right Hand Patterns ({rh.patterns.length})</h2>
            <PatternLibrary patterns={rh.patterns} labeled={rh.labeled} metadata={analysis.metadata} />
            {lh.patterns.length > 0 && <>
              <h2 className="mt-6 mb-4 font-semibold text-white">Left Hand Patterns ({lh.patterns.length})</h2>
              <PatternLibrary patterns={lh.patterns} labeled={lh.labeled} metadata={analysis.metadata} />
            </>}
          </div>
        )}

        {activeTab === 'graph' && rh && (
          <div>
            <h2 className="mb-4 font-semibold text-white">Pattern Graph — Right Hand</h2>
            <PatternGraph graph={rh.graph} />
            {lh.patterns.length > 0 && <>
              <h2 className="mt-6 mb-4 font-semibold text-white">Pattern Graph — Left Hand</h2>
              <PatternGraph graph={lh.graph} />
            </>}
          </div>
        )}

        {activeTab === 'hands' && analysis && (
          <div>
            <h2 className="mb-4 font-semibold text-white">Hand Analysis (split at MIDI {analysis.splitMidi} = {analysis.splitMidi ? `${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][analysis.splitMidi%12]}${Math.floor(analysis.splitMidi/12)-1}` : '?'})</h2>
            <HandViewer alignment={analysis.alignment} rightHand={rh} leftHand={lh} />
          </div>
        )}

        {activeTab === 'yaml' && analysis && (
          <div>
            <h2 className="mb-4 font-semibold text-white">YAML Blueprint</h2>
            <YamlExport analysis={analysis} />
          </div>
        )}
      </div>
    </div>
  );
}