// ═══════════════════════════════════════════════════════════════════
// MUSIC ANALYZER ENGINE v1.1
// DSA: Hash Map (pattern detection) + Directed Graph (pattern flow)
//      + Sliding Window (N-gram analysis) + Greedy Cover (dedup)
//
// Works in: Node.js (require) AND browser (globalThis export)
// Input:    MIDI JSON — full format OR compact shorthand (p/s/d/bn)
// Output:   patterns, sections, graph, alignment, YAML blueprint
//
// FIXES v1.1:
//   [1] generateYaml: guard against empty patterns array (no crash)
//   [2] detectSplitPoint: unified weighted algorithm (was diverging
//       between browser inline copy and backend engine)
//   [3] detectSplitPoint: correctly favours splits in the C3–C5
//       register zone (true hand boundary) over bass octave jumps
// ═══════════════════════════════════════════════════════════════════

'use strict';

// ─── PITCH CONSTANTS ────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_MAP = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
  'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
  'A':9,'A#':10,'BB':10,'B':11
};

const PATTERN_COLORS = [
  { bg:'#06b6d4', text:'#001', label:'cyan'    },  // A
  { bg:'#8b5cf6', text:'#fff', label:'violet'  },  // B
  { bg:'#f59e0b', text:'#001', label:'amber'   },  // C
  { bg:'#10b981', text:'#001', label:'emerald' },  // D
  { bg:'#f43f5e', text:'#fff', label:'rose'    },  // E
  { bg:'#3b82f6', text:'#fff', label:'blue'    },  // F
  { bg:'#a855f7', text:'#fff', label:'purple'  },  // G
  { bg:'#ec4899', text:'#fff', label:'pink'    },  // H
];
const SURPRISE_COLOR = { bg:'#ef4444', text:'#fff', label:'red'  };
const EMPTY_COLOR    = { bg:'#374151', text:'#9ca3af', label:'gray' };


// ═══════════════════════════════════════════════════════════════════
// PART 1 — PITCH & NOTE UTILITIES
// ═══════════════════════════════════════════════════════════════════

function pitchToMidi(pitch) {
  if (!pitch) return null;
  const m = String(pitch).match(/^([A-G][#Bb]?)(-?\d+)$/i);
  if (!m) return null;
  const pc = NOTE_MAP[m[1].toUpperCase()];
  if (pc === undefined) return null;
  return (parseInt(m[2]) + 1) * 12 + pc;
}

function midiToPitchName(midi) {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

function pitchClass(pitch) {
  const m = pitchToMidi(pitch);
  return m !== null ? m % 12 : null;
}

function intervalSemitones(pitchA, pitchB) {
  const a = pitchToMidi(pitchA), b = pitchToMidi(pitchB);
  if (a === null || b === null) return null;
  return b - a;
}


// ═══════════════════════════════════════════════════════════════════
// PART 2 — JSON NORMALIZER (compact ↔ full)
// ═══════════════════════════════════════════════════════════════════

function normalizeNote(n) {
  return {
    pitch:                 n.pitch                ?? n.p,
    start_subdivision:     n.start_subdivision    ?? n.s ?? 0,
    offset_percent:        n.offset_percent       ?? n.o ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
    end_cutoff_percent:    n.end_cutoff_percent   ?? n.c ?? null,
    velocity:              100  // always fixed
  };
}

function normalizeBar(b) {
  return {
    bar_number: b.bar_number ?? b.bn,
    notes: (b.notes ?? []).map(normalizeNote)
  };
}

function normalizeJson(json) {
  const ts    = json.time_signature || '4/4';
  const [n,d] = ts.split('/').map(Number);
  const spb   = json.subdivisions_per_bar || (n * (16 / d));
  return {
    tempo:                json.tempo || 120,
    time_signature:       ts,
    key:                  json.key || 'C',
    subdivisions_per_bar: spb,
    bars: (json.bars || []).map(normalizeBar)
  };
}


// ═══════════════════════════════════════════════════════════════════
// PART 3 — HAND SEPARATOR
//
// FIX [2+3]: Unified weighted split algorithm.
//
// Why the old algorithm was wrong:
//   Bass arpeggios often contain A1→A2→A3 — gaps of exactly 12 st.
//   These look like huge gaps but are within the left hand.
//   The true hand split almost always lives in the C3–C5 zone (48–72).
//   We weight gaps in that zone 3× higher so they win over bass octaves.
//
// Algorithm:
//   1. Collect all unique MIDI pitches actually used (with frequency)
//   2. Sort ascending
//   3. For each adjacent pair, compute gap × zone_weight
//      zone_weight = 3.0 if midpoint in [48,72], else 0.7
//   4. Pick the pair with highest weighted gap as the split
//   5. Return the midpoint between the two pitches
// ═══════════════════════════════════════════════════════════════════

const HAND_SPLIT_LOW  = 48;  // C3
const HAND_SPLIT_HIGH = 72;  // C5

function detectSplitPoint(bars) {
  // Frequency-weighted pitch set
  const pitchFreq = new Map();
  for (const bar of bars) {
    for (const note of bar.notes) {
      const m = pitchToMidi(note.pitch);
      if (m !== null) pitchFreq.set(m, (pitchFreq.get(m) || 0) + 1);
    }
  }
  if (pitchFreq.size < 2) return 60; // fallback: middle C

  const sorted = [...pitchFreq.keys()].sort((a, b) => a - b);

  let bestWeighted = -1;
  let splitAt = 60;

  for (let i = 1; i < sorted.length; i++) {
    const lo  = sorted[i - 1];
    const hi  = sorted[i];
    const gap = hi - lo;
    if (gap === 0) continue;

    const midpoint   = (lo + hi) / 2;
    const inZone     = midpoint >= HAND_SPLIT_LOW && midpoint <= HAND_SPLIT_HIGH;
    const zoneWeight = inZone ? 3.0 : 0.7;
    const weighted   = gap * zoneWeight;

    if (weighted > bestWeighted) {
      bestWeighted = weighted;
      splitAt      = Math.round(midpoint);
    }
  }

  return splitAt;
}

function separateHands(bars, splitMidi) {
  const split = (splitMidi !== undefined && splitMidi !== null)
    ? splitMidi
    : detectSplitPoint(bars);

  const rhBars = [], lhBars = [];
  for (const bar of bars) {
    const rh = bar.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) >= split);
    const lh = bar.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) <  split);
    rhBars.push({ bar_number: bar.bar_number, notes: rh });
    lhBars.push({ bar_number: bar.bar_number, notes: lh });
  }

  const rhHasNotes = rhBars.some(b => b.notes.length > 0);
  const lhHasNotes = lhBars.some(b => b.notes.length > 0);

  return { rhBars, lhBars, splitMidi: split, rhHasNotes, lhHasNotes };
}


// ═══════════════════════════════════════════════════════════════════
// PART 4 — BAR FINGERPRINTING
// ═══════════════════════════════════════════════════════════════════

function getNotesOrdered(bar) {
  return [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
}

function fpExact(bar) {
  return getNotesOrdered(bar)
    .map(n => `${n.pitch}@${n.start_subdivision}:${n.duration_subdivisions}`)
    .join('|');
}

function fpRhythm(bar) {
  return getNotesOrdered(bar)
    .map(n => `${n.start_subdivision}:${n.duration_subdivisions}`)
    .join('|');
}

function fpContour(bar) {
  const sorted = getNotesOrdered(bar);
  if (sorted.length === 0) return 'empty';
  if (sorted.length === 1) return `1:${sorted[0].duration_subdivisions}`;
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const m1 = pitchToMidi(sorted[i - 1].pitch);
    const m2 = pitchToMidi(sorted[i].pitch);
    if (m1 === null || m2 === null) intervals.push('?');
    else intervals.push(m2 - m1);
  }
  return intervals.join(',');
}

function fpTexture(bar, spb = 16) {
  const notes = bar.notes;
  if (notes.length === 0) return 'empty';
  const durCount = {};
  for (const n of notes) {
    durCount[n.duration_subdivisions] = (durCount[n.duration_subdivisions] || 0) + 1;
  }
  const dominantDur  = Object.entries(durCount).sort((a, b) => b[1] - a[1])[0][0];
  const maxDur       = Math.max(...notes.map(n => n.duration_subdivisions));
  const uniformRhythm = Object.keys(durCount).length === 1 ? 'U' : 'M';
  return `n${notes.length}_d${dominantDur}_max${maxDur}_${uniformRhythm}`;
}

function detectAlternating(bar) {
  const sorted = getNotesOrdered(bar);
  if (sorted.length < 4) return null;
  const allSameDur = sorted.every(n => n.duration_subdivisions === sorted[0].duration_subdivisions);
  const even = sorted.filter((_, i) => i % 2 === 0);
  const odd  = sorted.filter((_, i) => i % 2 === 1);
  const evenPitches = new Set(even.map(n => n.pitch));
  const oddPitches  = new Set(odd.map(n => n.pitch));

  if (oddPitches.size === 1 && evenPitches.size > 1 && allSameDur) {
    return { type:'alternating', pedal:[...oddPitches][0], pedalPosition:'odd',
             melody: even.map(n => n.pitch), notesPerBar: sorted.length,
             duration: sorted[0].duration_subdivisions };
  }
  if (evenPitches.size === 1 && oddPitches.size > 1 && allSameDur) {
    return { type:'alternating', pedal:[...evenPitches][0], pedalPosition:'even',
             melody: odd.map(n => n.pitch), notesPerBar: sorted.length,
             duration: sorted[0].duration_subdivisions };
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════════
// PART 5 — N-GRAM WINDOW FINGERPRINTING
// ═══════════════════════════════════════════════════════════════════

function fpWindow(bars, startIdx, w) {
  const slice = bars.slice(startIdx, startIdx + w);
  const rhythmKey  = slice.map((b, i) => `[${i}:${fpRhythm(b)}]`).join('');
  const contourKey = slice.map((b, i) => `[${i}:${fpContour(b)}]`).join('');
  return { rhythmKey, contourKey, combined: `${rhythmKey}~~${contourKey}` };
}


// ═══════════════════════════════════════════════════════════════════
// PART 6 — PATTERN DETECTOR
// ═══════════════════════════════════════════════════════════════════

function detectPatterns(bars, spb = 16) {
  if (bars.length === 0) return [];

  const exactMap   = new Map();
  const rhythmMap  = new Map();
  const contourMap = new Map();
  const textureMap = new Map();
  const windowMap  = new Map();

  const hashPush = (map, key, entry) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
  };

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const bn  = bar.bar_number;
    const e   = { barIdx: i, startBar: bn, w: 1 };
    hashPush(exactMap,   fpExact(bar),        e);
    hashPush(rhythmMap,  fpRhythm(bar),       e);
    hashPush(contourMap, fpContour(bar),      e);
    hashPush(textureMap, fpTexture(bar, spb), e);
  }

  for (const w of [2, 4, 8].filter(w => w <= bars.length)) {
    for (let i = 0; i <= bars.length - w; i++) {
      const { rhythmKey, combined } = fpWindow(bars, i, w);
      const e = { barIdx: i, startBar: bars[i].bar_number, w };
      hashPush(windowMap, `R_${w}:${rhythmKey}`, e);
      hashPush(windowMap, `C_${w}:${combined}`,  e);
    }
  }

  const candidates = [];
  const addCandidates = (map, type, quality) => {
    for (const [fp, occs] of map) {
      if (occs.length < 2) continue;
      candidates.push({ fingerprint: fp, type, windowSize: occs[0].w,
                        occurrences: occs, score: occs.length * occs[0].w * quality, quality });
    }
  };
  addCandidates(exactMap,   'exact',    3.0);
  addCandidates(rhythmMap,  'rhythmic', 2.0);
  addCandidates(contourMap, 'melodic',  1.8);
  addCandidates(textureMap, 'textural', 1.0);
  addCandidates(windowMap,  'window',   2.5);
  candidates.sort((a, b) => b.score - a.score);

  const covered = new Set();
  const finals  = [];
  for (const cand of candidates) {
    const newSlots = [];
    for (const occ of cand.occurrences)
      for (let j = 0; j < cand.windowSize; j++) {
        const bn = occ.startBar + j;
        if (!covered.has(bn)) newSlots.push(bn);
      }
    if (newSlots.length >= 2 || finals.length < 2) {
      finals.push(cand);
      for (const bn of newSlots) covered.add(bn);
    }
    if (finals.length >= 10) break;
  }

  finals.forEach((p, i) => {
    const letter = String.fromCharCode(65 + i);
    p.id    = `PAT_${letter}`;
    p.label = `Pattern_${letter}`;
    p.color = PATTERN_COLORS[i] || { bg:'#6b7280', text:'#fff', label:'gray' };
  });

  return finals;
}


// ═══════════════════════════════════════════════════════════════════
// PART 7 — BAR LABELER
// ═══════════════════════════════════════════════════════════════════

function labelBars(bars, patterns, spb) {
  const barPatternLookup = new Map();
  for (const pat of patterns)
    for (const occ of pat.occurrences)
      for (let j = 0; j < pat.windowSize; j++) {
        const bn = occ.startBar + j;
        if (!barPatternLookup.has(bn)) barPatternLookup.set(bn, []);
        barPatternLookup.get(bn).push({ pat, posInWindow: j });
      }

  return bars.map(bar => {
    const bn      = bar.bar_number;
    const notes   = bar.notes;
    const matches = barPatternLookup.get(bn) || [];
    const isEmpty = notes.length === 0;
    const isSustain = notes.length === 1 && notes[0].duration_subdivisions >= spb - 1;
    const alt = isEmpty ? null : detectAlternating(bar);

    let patternId = null, patternLabel = null;
    if (matches.length > 0) {
      const best = matches.sort((a, b) => b.pat.score - a.pat.score)[0];
      patternId    = best.pat.id;
      patternLabel = best.pat.label;
    }

    return {
      barNumber:    bn, notes,
      patternId:    isEmpty ? 'EMPTY' : (patternId || 'SURPRISE'),
      patternLabel: isEmpty ? 'Empty' : (patternLabel || 'Surprise'),
      matchQuality: matches.length ? matches[0].pat.type : null,
      isSurprise:   !isEmpty && patternId === null,
      isEmpty, isSustain,
      noteCount:    notes.length,
      texture:      fpTexture(bar, spb),
      rhythm:       fpRhythm(bar),
      alternating:  alt,
      maxDuration:  notes.length ? Math.max(...notes.map(n => n.duration_subdivisions)) : 0
    };
  });
}


// ═══════════════════════════════════════════════════════════════════
// PART 8 — DIRECTED GRAPH BUILDER
// ═══════════════════════════════════════════════════════════════════

function buildGraph(labeledBars, patterns) {
  const nodeMap = new Map();
  for (const lb of labeledBars) {
    const id = lb.patternId;
    if (!nodeMap.has(id)) {
      const pat = patterns.find(p => p.id === id);
      nodeMap.set(id, {
        id, label: lb.patternLabel,
        type:  pat ? pat.type : (lb.isEmpty ? 'empty' : 'surprise'),
        count: 0, bars: [],
        color: pat ? pat.color : (lb.isEmpty ? EMPTY_COLOR : SURPRISE_COLOR)
      });
    }
    const node = nodeMap.get(id);
    node.count++;
    node.bars.push(lb.barNumber);
  }

  const edgeMap = new Map();
  for (let i = 0; i < labeledBars.length - 1; i++) {
    const from = labeledBars[i].patternId;
    const to   = labeledBars[i + 1].patternId;
    if (from === to) continue;
    const key = `${from}|||${to}`;
    edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
  }

  const edges = [];
  for (const [key, weight] of edgeMap) {
    const [from, to] = key.split('|||');
    edges.push({ from, to, weight });
  }
  edges.sort((a, b) => b.weight - a.weight);

  // adjacency as plain object (not Map) so JSON.stringify works without sanitizer
  const adjacency = {};
  for (const e of edges) {
    if (!adjacency[e.from]) adjacency[e.from] = [];
    adjacency[e.from].push({ to: e.to, weight: e.weight });
  }

  return { nodes: [...nodeMap.values()], edges, adjacency };
}


// ═══════════════════════════════════════════════════════════════════
// PART 9 — SECTION DETECTOR
// ═══════════════════════════════════════════════════════════════════

function detectSections(labeledBars, patterns) {
  if (labeledBars.length === 0) return [];

  const rawGroups = [];
  let current = null;

  for (const lb of labeledBars) {
    const pid = lb.patternId;
    if (!current || current.patternId !== pid) {
      if (current && pid === 'SURPRISE' && rawGroups.length > 0) {
        current.bars.push(lb);
        current.surprises.push(lb.barNumber);
        continue;
      }
      current = { patternId: pid, patternLabel: lb.patternLabel, bars: [lb], surprises: [] };
      rawGroups.push(current);
    } else {
      current.bars.push(lb);
    }
  }

  const merged = [];
  for (let i = 0; i < rawGroups.length; i++) {
    const g = rawGroups[i];
    if (g.bars.length === 1 && merged.length > 0) {
      const prev = merged[merged.length - 1];
      prev.bars.push(...g.bars);
      prev.surprises.push(...g.surprises, g.bars[0].barNumber);
    } else {
      merged.push(g);
    }
  }

  const sectionLetterMap = new Map();
  let nextLetter = 0;

  return merged.map((g, idx) => {
    const firstBar = g.bars[0].barNumber;
    const lastBar  = g.bars[g.bars.length - 1].barNumber;
    const pat      = patterns.find(p => p.id === g.patternId);
    if (!sectionLetterMap.has(g.patternId))
      sectionLetterMap.set(g.patternId, String.fromCharCode(65 + nextLetter++));
    const letter      = sectionLetterMap.get(g.patternId);
    const isRepeat    = idx > 0 && merged.slice(0, idx).some(p => p.patternId === g.patternId);
    const repeatCount = merged.slice(0, idx).filter(p => p.patternId === g.patternId).length;
    const altCount    = g.bars.filter(b => b.alternating !== null).length;
    const susCount    = g.bars.filter(b => b.isSustain).length;
    const dominantTexture = altCount > g.bars.length / 2 ? 'alternating'
                          : susCount > 0 ? 'sustain_cadence' : 'mixed';
    return {
      id: `S${String(idx + 1).padStart(2, '0')}`, index: idx,
      startBar: firstBar, endBar: lastBar, barCount: g.bars.length,
      patternId: g.patternId, patternLabel: g.patternLabel,
      letter, isRepeat, repeatCount,
      fullLabel: isRepeat ? `${letter}${repeatCount > 1 ? repeatCount : "'"}` : letter,
      musicLabel: letter, bars: g.bars, surprises: g.surprises,
      dominantTexture,
      color: pat ? pat.color : (g.patternId === 'EMPTY' ? EMPTY_COLOR : SURPRISE_COLOR)
    };
  });
}


// ═══════════════════════════════════════════════════════════════════
// PART 10 — HAND ALIGNMENT
// ═══════════════════════════════════════════════════════════════════

function alignHands(rhLabeled, lhLabeled) {
  const allBarNums = new Set([
    ...rhLabeled.map(b => b.barNumber),
    ...lhLabeled.map(b => b.barNumber)
  ]);
  const rhMap = new Map(rhLabeled.map(b => [b.barNumber, b]));
  const lhMap = new Map(lhLabeled.map(b => [b.barNumber, b]));
  return [...allBarNums].sort((a, b) => a - b).map(bn => ({
    barNumber:   bn,
    rh:          rhMap.get(bn) || null,
    lh:          lhMap.get(bn) || null,
    rhPattern:   rhMap.get(bn)?.patternLabel || '-',
    lhPattern:   lhMap.get(bn)?.patternLabel || '-',
    texturePair: `${rhMap.get(bn)?.patternId || '-'}_${lhMap.get(bn)?.patternId || '-'}`
  }));
}


// ═══════════════════════════════════════════════════════════════════
// PART 11 — YAML BLUEPRINT GENERATOR
//
// FIX [1]: All array/property accesses are now guarded.
//   - patterns[0] → wrapped in (patterns.length ? patterns[0] : null) checks
//   - Every section access uses optional chaining
//   - Empty fallback strings instead of crashes on missing data
// ═══════════════════════════════════════════════════════════════════

function generateYaml(analysis) {
  const { metadata, rightHand, leftHand } = analysis;
  const rh         = rightHand  || { patterns: [], sections: [], labeled: [], graph: { edges: [] } };
  const lh         = leftHand   || { patterns: [], sections: [] };
  const totalBars  = (metadata?.bars || []).length;

  // ── Motifs ───────────────────────────────────────────────────────
  const motifLines = (rh.patterns || []).map(pat => {
    const exOcc  = pat.occurrences[0];
    const exBar  = (metadata?.bars || []).find(b => b.bar_number === exOcc.startBar);
    const sample = exBar ? getNotesOrdered(exBar).slice(0, 5) : [];
    const pitches   = sample.map(n => n.pitch).join(', ');
    const durations = sample.map(n => n.duration_subdivisions).join(', ');
    return `  ${pat.label}:\n    name: "${pat.label}"\n    type: "${pat.type}"\n    occurrences: ${pat.occurrences.length}\n    windowSize: ${pat.windowSize}\n    sample_pitches: [${pitches}]\n    sample_durations: [${durations}]\n    bars: [${pat.occurrences.map(o => o.startBar).join(', ')}]`;
  }).join('\n\n') || '  # (no patterns detected)';

  // ── Sections ─────────────────────────────────────────────────────
  const sectionLines = (rh.sections || []).slice(0, 16).map(sec =>
    `  - id: "${sec.id}"\n    label: "${sec.fullLabel}"\n    bars: [${sec.startBar}, ${sec.endBar}]\n    barCount: ${sec.barCount}\n    dominantPattern: "${sec.patternLabel}"\n    texture: "${sec.dominantTexture}"\n    isRepeat: ${sec.isRepeat}\n    surpriseBars: [${sec.surprises.join(', ')}]`
  ).join('\n\n') || '  # (no sections detected)';

  // ── Tension arc ──────────────────────────────────────────────────
  const tensionStages = (rh.sections || []).slice(0, 5).map(sec => {
    const progress = totalBars > 0 ? sec.startBar / totalBars : 0;
    const tension  = progress < 0.2 ? 2 : progress < 0.4 ? 4 : progress < 0.65 ? 7 : progress < 0.8 ? 9 : 3;
    return `    - bars: [${sec.startBar}, ${sec.endBar}]\n      tension: ${tension}\n      label: "${sec.fullLabel}"`;
  }).join('\n') || '    # (insufficient sections for arc)';

  // ── Graph edges ──────────────────────────────────────────────────
  const graphEdges = (rh.graph?.edges || []).slice(0, 8).map(e =>
    `    - from: "${e.from}" → to: "${e.to}" weight: ${e.weight}`
  ).join('\n') || '    # (no transitions)';

  // ── Section order string (safe) ──────────────────────────────────
  const sectionOrder = (rh.sections || []).map(s => s.fullLabel).join(' → ') || 'N/A';

  // ── Dominant texture (safe — no crash if patterns is empty) ──────
  const dominantTexture = rh.patterns?.length > 0 ? rh.patterns[0].type : 'unknown';
  const dominantWindow  = rh.patterns?.length > 0 ? rh.patterns[0].windowSize : 1;

  // ── Surprise / sustain bar lists ─────────────────────────────────
  const surpriseBars = (rh.labeled || []).filter(b => b.isSurprise).map(b => b.barNumber).join(', ') || 'none';
  const sustainBars  = (rh.labeled || []).filter(b => b.isSustain).map(b => b.barNumber).join(', ')  || 'none';

  return `# ═══════════════════════════════════════════════════════
# MUSIC ANALYSIS BLUEPRINT
# Generated by: MIDI Analyzer Engine v1.1
# Source: ${totalBars} bars · ${metadata?.time_signature} · ${metadata?.tempo} BPM · Key: ${metadata?.key || '?'}
# ═══════════════════════════════════════════════════════

composition:
  title: "Analyzed Composition"
  key: "${metadata?.key || 'C'}"
  tempo: ${metadata?.tempo || 120}
  time_signature: "${metadata?.time_signature || '4/4'}"
  total_bars: ${totalBars}
  subdivisions_per_bar: ${metadata?.subdivisions_per_bar || 16}

# ─── DETECTED PATTERNS (Right Hand) ─────────────────────
motifs:
${motifLines}

# ─── SECTION STRUCTURE ───────────────────────────────────
sections:
${sectionLines}

# ─── TENSION ARC ─────────────────────────────────────────
tension_arc:
  description: "Derived from pattern density and section position"
  scale: 10
  stages:
${tensionStages}

# ─── PATTERN GRAPH ───────────────────────────────────────
pattern_graph:
  description: "Directed graph of pattern transitions"
  edges:
${graphEdges}

# ─── LEFT HAND ANALYSIS ─────────────────────────────────
left_hand:
  patternCount: ${(lh.patterns || []).length}
  sectionCount: ${(lh.sections || []).length}
  patterns: [${(lh.patterns || []).map(p => `"${p.label}"`).join(', ')}]

# ─── GENERATION RULES ────────────────────────────────────
generation_rules:
  - "Section order: ${sectionOrder}"
  - "Dominant RH texture: ${dominantTexture}"
  - "Pattern window size: ${dominantWindow} bars"
  - "Total distinct RH patterns: ${(rh.patterns || []).length}"
  - "Surprise bars: [${surpriseBars}]"
  - "Sustain/cadence bars: [${sustainBars}]"
`;
}


// ═══════════════════════════════════════════════════════════════════
// PART 12 — HAND ANALYZER
// ═══════════════════════════════════════════════════════════════════

function analyzeHand(bars, spb, handName) {
  const nonEmpty = bars.filter(b => b.notes.length > 0);
  if (nonEmpty.length === 0) {
    return {
      patterns: [], graph: { nodes: [], edges: [], adjacency: {} }, hand: handName,
      labeled: bars.map(b => ({
        barNumber: b.bar_number, notes: [], patternId: 'EMPTY', patternLabel: 'Empty',
        isEmpty: true, isSurprise: false, isSustain: false, noteCount: 0,
        alternating: null, texture: 'empty', rhythm: 'empty', maxDuration: 0
      })),
      sections: []
    };
  }
  const patterns = detectPatterns(nonEmpty, spb);
  const labeled  = labelBars(bars, patterns, spb);
  const sections = detectSections(labeled, patterns);
  const graph    = buildGraph(labeled, patterns);
  return { patterns, labeled, sections, graph, hand: handName };
}


// ═══════════════════════════════════════════════════════════════════
// PART 13 — MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════

function analyze(rawJson, options = {}) {
  const normalized = normalizeJson(rawJson);
  const spb        = normalized.subdivisions_per_bar;

  const { rhBars, lhBars, splitMidi, rhHasNotes, lhHasNotes } =
    separateHands(normalized.bars, options.splitMidi);

  const rightHand = analyzeHand(rhBars, spb, 'right');
  const leftHand  = analyzeHand(lhBars, spb, 'left');
  const alignment = alignHands(rightHand.labeled, leftHand.labeled);
  const yamlBlueprint = generateYaml({ metadata: normalized, rightHand, leftHand, alignment });

  return {
    metadata: normalized, splitMidi,
    rightHand, leftHand, alignment, yamlBlueprint,
    summary: {
      totalBars:    normalized.bars.length,
      rhPatterns:   rightHand.patterns.length,
      lhPatterns:   leftHand.patterns.length,
      rhSections:   rightHand.sections.length,
      lhSections:   leftHand.sections.length,
      surpriseBars: rightHand.labeled.filter(b => b.isSurprise).map(b => b.barNumber),
      sustainBars:  rightHand.labeled.filter(b => b.isSustain).map(b => b.barNumber),
      splitMidi, rhHasNotes, lhHasNotes
    }
  };
}


// ═══════════════════════════════════════════════════════════════════
// EXPORTS — Node.js (CommonJS) AND browser (globalThis)
// ═══════════════════════════════════════════════════════════════════

const MusicAnalyzerEngine = {
  analyze, normalizeJson, normalizeNote, normalizeBar,
  separateHands, detectSplitPoint,
  detectPatterns, labelBars, buildGraph, detectSections, alignHands,
  generateYaml, analyzeHand,
  pitchToMidi, midiToPitchName, pitchClass, intervalSemitones,
  detectAlternating,
  fpExact, fpRhythm, fpContour, fpTexture, fpWindow,
  PATTERN_COLORS, SURPRISE_COLOR, EMPTY_COLOR,
  HAND_SPLIT_LOW, HAND_SPLIT_HIGH
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MusicAnalyzerEngine;
} else if (typeof globalThis !== 'undefined') {
  globalThis.MusicAnalyzerEngine = MusicAnalyzerEngine;
}
