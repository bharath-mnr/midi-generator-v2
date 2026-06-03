'use strict';

// ═══════════════════════════════════════════════════════════════════
// MUSIC ANALYZER ENGINE v8.2 — ADAPTIVE PERIOD-AWARE ENGINE
//
// ┌─ STEP 1  barFingerprint  (quantised duration buckets a-g)
// │   Pitch-agnostic. Same rhythm at any key = same fingerprint.
// │   Quantisation tolerates ±1-2 sub noise (d=7 and d=8 → same).
// │
// ├─ STEP 2  findMotifs
// │   Frequency-rank fingerprints → labels A B C …
// │   Continuation bars (sustained cross-bar notes) inherit parent label.
// │
// ├─ STEP 3  mergePairedMotifs
// │   If motif Y always follows motif X (≥75% both ways) → merge Y
// │   into X as a 2-bar unit (e.g. Passacaglia breath bar pairs).
// │
// ├─ STEP 4  detectSections  ← THE KEY FIX IN v8.2
// │
// │   a) detectPeriod(labels, ≥85% approximate match)
// │      Scans periods 1…n/4 on content labels (skips leading S).
// │      Allows up to 15% variation so a few Variation bars do NOT
// │      break an otherwise solid 8-bar cycle.
// │
// │   b) IF period found → createPeriodSections
// │      Split content into P-bar chunks; each chunk = one section.
// │      Chunks matching base motif-mix → Exposition / Main / Reprise / Coda.
// │      Chunks with different motif-mix → Variation.
// │
// │   c) IF no period → createChangebasedSections (fallback)
// │      Works for through-composed music (Comptine, nocturnes, etc.).
// │      Section boundary = dominant label changes and holds ≥3 bars.
// │
// └─ STEP 5  generateYaml  → clean output, per-section cycle info
//
// Works for any style. The algorithm adapts to the piece.
// ═══════════════════════════════════════════════════════════════════


// ─── PITCH UTILITIES ───────────────────────────────────────────────

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_MAP = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
  'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
  'A':9,'A#':10,'BB':10,'B':11,
};
function pitchToMidi(pitch) {
  if (!pitch) return null;
  const m = String(pitch).match(/^([A-G][#Bb]?)(-?\d+)$/i);
  if (!m) return null;
  const pc = NOTE_MAP[m[1].toUpperCase()];
  return pc === undefined ? null : (parseInt(m[2]) + 1) * 12 + pc;
}
function midiToName(midi) {
  if (midi == null) return '?';
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}
function chordName(rootMidi, allMidis) {
  const pcs = new Set(allMidis.map(m => m % 12));
  const r   = rootMidi % 12;
  const has = iv => pcs.has((r + iv) % 12);
  if (has(4) && has(7)) return NOTE_NAMES[r] + ' maj';
  if (has(3) && has(7)) return NOTE_NAMES[r] + ' min';
  if (has(3) && has(6)) return NOTE_NAMES[r] + ' dim';
  return NOTE_NAMES[r];
}


// ─── NORMALIZATION ─────────────────────────────────────────────────

function normalizeNote(n) {
  return {
    pitch:                 n.pitch ?? n.p ?? null,
    start_subdivision:     n.start_subdivision ?? n.s ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
  };
}
function normalizeBar(b) {
  return {
    bar_number: b.bar_number ?? b.bn,
    notes: (b.notes ?? []).map(normalizeNote).filter(n => n.pitch !== null),
  };
}
function normalizeJson(json) {
  const ts  = json.time_signature || '4/4';
  const [num, den] = ts.split('/').map(Number);
  const spb = json.subdivisions_per_bar || (num * (16 / den));
  return {
    tempo: json.tempo || 120, time_signature: ts,
    key:   json.key  || 'C', subdivisions_per_bar: spb,
    bars:  (json.bars || []).map(normalizeBar),
  };
}


// ─── HAND SPLIT ────────────────────────────────────────────────────

function detectSplitMidi(bars) {
  const freq = new Map();
  for (const bar of bars)
    for (const n of bar.notes) {
      const m = pitchToMidi(n.pitch);
      if (m !== null) freq.set(m, (freq.get(m) || 0) + 1);
    }
  if (freq.size < 2) return 60;
  const sorted = [...freq.keys()].sort((a, b) => a - b);
  let bestGap = 0, splitAt = 60;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    const mid = (sorted[i - 1] + sorted[i]) / 2;
    const wt  = (mid >= 48 && mid <= 72) ? 2.5 : 1.0;
    if (gap * wt > bestGap) { bestGap = gap * wt; splitAt = Math.round(mid); }
  }
  return splitAt;
}
function splitHandsFromFull(bars, splitMidi) {
  const split  = splitMidi ?? detectSplitMidi(bars);
  return {
    rhBars: bars.map(b => ({ bar_number: b.bar_number, notes: b.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) >= split) })),
    lhBars: bars.map(b => ({ bar_number: b.bar_number, notes: b.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) <  split) })),
    splitMidi: split,
  };
}


// ═══════════════════════════════════════════════════════════════════
// STEP 1: DURATION QUANTISATION
//
// Snap raw subdivision counts to 7 musical-value buckets.
// Tolerates ±1-2 sub quantisation noise:  d=7 and d=8 → same 'd'.
//
//  a  ≤1 sub           16th (or shorter)
//  b  ≤2 subs          8th note
//  c  ≤31% of bar      quarter-ish  (3-5 for spb=16)
//  d  ≤50% of bar      half-ish     (6-8 for spb=16)
//  e  ≤75% of bar      dotted-half  (9-12)
//  f  ≤100% of bar     whole note   (13-16)
//  g  > bar            cross-bar sustain
// ═══════════════════════════════════════════════════════════════════

function quantizeDuration(d, spb) {
  const S = spb || 16;
  if (d <= 1)                    return 'a';
  if (d <= 2)                    return 'b';
  if (d <= Math.ceil(S * 0.31))  return 'c';
  if (d <= Math.ceil(S * 0.50))  return 'd';
  if (d <= Math.ceil(S * 0.75))  return 'e';
  if (d <= S)                    return 'f';
  return 'g';
}
function durBucketName(q) {
  return { a:'16th', b:'8th', c:'quarter', d:'half', e:'dotted-half', f:'whole', g:'multi-bar' }[q] ?? q;
}


// ─── BAR FINGERPRINT ───────────────────────────────────────────────

function barFingerprint(bar, spb) {
  const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
  const SPB   = spb || 16;
  if (!notes.length) {
    return { noteCount:0, quantDurStr:'', isUniform:true, uniformQ:null,
      maxDur:0, minDur:0, hasSimultaneous:false, isEmpty:true,
      rhythmClass:'empty', fingerprint:'EMPTY' };
  }
  const subCounts = new Map();
  for (const n of notes) subCounts.set(n.start_subdivision, (subCounts.get(n.start_subdivision)||0)+1);
  const hasSimultaneous = [...subCounts.values()].some(c => c > 1);
  const durs        = notes.map(n => n.duration_subdivisions);
  const quantDurs   = durs.map(d => quantizeDuration(d, SPB));
  const quantDurStr = quantDurs.join('-');
  const isUniform   = quantDurs.every(d => d === quantDurs[0]);
  const uniformQ    = isUniform ? quantDurs[0] : null;
  const maxDur = Math.max(...durs), minDur = Math.min(...durs);
  let rhythmClass;
  if      (isUniform && uniformQ === 'a')                        rhythmClass = 'rapid';
  else if (isUniform && uniformQ === 'b' && !hasSimultaneous)    rhythmClass = 'weave';
  else if (isUniform && uniformQ === 'b' &&  hasSimultaneous)    rhythmClass = 'interval';
  else if (isUniform && (uniformQ === 'f' || uniformQ === 'g'))  rhythmClass = 'sustain';
  else if (notes.length <= 5 && maxDur >= Math.round(SPB/2))     rhythmClass = 'lyrical';
  else if (notes.length <= 3 && maxDur >= Math.round(SPB*0.75))  rhythmClass = 'sustain';
  else if (isUniform)                                             rhythmClass = 'pulse';
  else                                                            rhythmClass = 'mixed';
  const sim         = hasSimultaneous ? '1' : '0';
  const fingerprint = `${notes.length}|${quantDurStr}|${sim}`;
  return { noteCount:notes.length, quantDurStr, isUniform, uniformQ,
    maxDur, minDur, hasSimultaneous, isEmpty:false, rhythmClass, fingerprint };
}

function describeMotif(fp, unitBars) {
  if (fp.isEmpty) return 'Silence';
  const durPart  = fp.isUniform
    ? `all ${durBucketName(fp.uniformQ)} notes (d=${fp.minDur})`
    : `d=${fp.minDur}–${fp.maxDur} (mixed)`;
  const textures = {
    rapid:'rapid 16th-note run', weave:'alternating 8th-note weave',
    interval:'simultaneous interval pairs', sustain:'sustained long tone',
    lyrical:'lyrical sparse phrase', pulse:'steady pulse figure', mixed:'varied rhythm phrase',
  };
  const simNote  = fp.hasSimultaneous ? ' · simultaneous pairs' : '';
  const unitNote = (unitBars||1) > 1 ? ` · ${unitBars}-bar unit` : '';
  return `${fp.noteCount} notes/bar · ${durPart}${simNote} · ${textures[fp.rhythmClass]||fp.rhythmClass}${unitNote}`;
}


// ─── UTILITIES ──────────────────────────────────────────────────────

function compressRanges(barNumbers) {
  if (!barNumbers.length) return '';
  const sorted = [...new Set(barNumbers)].sort((a, b) => a - b);
  const ranges = []; let start = sorted[0], end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) end = sorted[i];
    else { ranges.push(start === end ? `${start}` : `${start}–${end}`); start = end = sorted[i]; }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`);
  return ranges.join(', ');
}

const MOTIF_COLORS = ['#3b82f6','#8b5cf6','#10b981','#ef4444','#f59e0b','#ec4899','#06b6d4','#84cc16','#f97316','#a78bfa'];
const COLOR_S = '#374151', COLOR_X = '#6b7280';
function motifColor(label) {
  if (label === 'S') return COLOR_S;
  if (label === 'X') return COLOR_X;
  const idx = label.charCodeAt(0) - 65;
  return MOTIF_COLORS[idx % MOTIF_COLORS.length] ?? COLOR_X;
}


// ─── CONTINUATION BAR DETECTION ────────────────────────────────────
// Cross-bar sustained notes leave the next bar empty in compact JSON.
// Detect and mark those bars so they inherit the parent motif label.

function markContinuationBars(bars, spb) {
  const SPB = spb || 16;
  const continuations = new Map(); // bar_number → source bar_number
  for (const bar of bars)
    for (const note of bar.notes) {
      const endSub = note.start_subdivision + note.duration_subdivisions;
      if (endSub > SPB) {
        const barsSpanned = Math.floor(endSub / SPB);
        for (let i = 1; i <= barsSpanned; i++) {
          const target = bar.bar_number + i;
          if (!continuations.has(target)) continuations.set(target, bar.bar_number);
        }
      }
    }
  return continuations;
}


// ═══════════════════════════════════════════════════════════════════
// STEP 2: MOTIF DETECTION
// ═══════════════════════════════════════════════════════════════════

function findMotifs(bars, spb) {
  const continuations = markContinuationBars(bars, spb);
  const fps     = bars.map(b => barFingerprint(b, spb));
  const barMap  = new Map(bars.map(b => [b.bar_number, b]));
  // Count fingerprint frequency (skip empty and continuation bars)
  const freq = new Map();
  bars.forEach((bar, i) => {
    const fp = fps[i];
    if (fp.isEmpty || continuations.has(bar.bar_number)) return;
    freq.set(fp.fingerprint, (freq.get(fp.fingerprint)||0)+1);
  });
  const ranked = [...freq.entries()].filter(([,c]) => c >= 2).sort((a,b) => b[1]-a[1]);
  const LABELS = 'ABCDEFGHIJKLMNOP'.split('');
  const motifMap = new Map();
  ranked.forEach(([fp], i) => { if (i < LABELS.length) motifMap.set(fp, LABELS[i]); });
  // First pass: label non-continuation bars
  const labelArr = bars.map((bar, i) => {
    const fp = fps[i];
    if (continuations.has(bar.bar_number)) return null;
    const label = fp.isEmpty ? 'S' : (motifMap.get(fp.fingerprint) ?? 'X');
    return { bar, fp, label, isContinuation: false };
  });
  // Second pass: resolve continuation bars
  const barIndexMap = new Map(bars.map((b,i) => [b.bar_number, i]));
  const labeled = labelArr.map((entry, i) => {
    if (entry !== null) return entry;
    const bar   = bars[i];
    const srcBn = continuations.get(bar.bar_number);
    const srcIdx = srcBn !== undefined ? barIndexMap.get(srcBn) : undefined;
    const parentLabel = srcIdx !== undefined ? (labelArr[srcIdx]?.label ?? 'S') : 'S';
    return { bar, fp: fps[i], label: parentLabel, isContinuation: true };
  });
  // Build motif detail objects
  const motifDetails = new Map();
  labeled.forEach(({ bar, fp, label }) => {
    if (label === 'S') return;
    if (!motifDetails.has(label)) {
      motifDetails.set(label, {
        label, fingerprint: fp.fingerprint, fp,
        barNumbers:[], count:0, description:'', barRanges:'',
        color: motifColor(label), unitBars: 1,
      });
    }
    const d = motifDetails.get(label);
    d.barNumbers.push(bar.bar_number);
    d.count++;
  });
  for (const [,d] of motifDetails) {
    d.barRanges   = compressRanges(d.barNumbers);
    d.description = describeMotif(d.fp, d.unitBars);
  }
  const sortedMotifs = [...motifDetails.values()].sort((a,b) => {
    if (a.label==='X') return 1; if (b.label==='X') return -1;
    return a.label.localeCompare(b.label);
  });
  return { labeled, fingerprints: fps, motifMap, motifDetails, sortedMotifs };
}


// ═══════════════════════════════════════════════════════════════════
// STEP 3: MOTIF PAIR MERGING (2-bar unit detection)
//
// Confidence threshold lowered to 0.75 so that B→C pairs in
// Passacaglia merge even when D occasionally replaces C.
// ═══════════════════════════════════════════════════════════════════

const PAIR_THRESHOLD = 0.75;

function mergePairedMotifs(labeled, motifDetails) {
  const forwardTrans = new Map(); // from → Map<to, count>
  const totalFrom    = new Map(); // from → total out
  const totalTo      = new Map(); // to   → total in
  for (let i = 0; i < labeled.length - 1; i++) {
    const from = labeled[i].label, to = labeled[i+1].label;
    if (from==='S'||to==='S'||from==='X'||to==='X') continue;
    if (!forwardTrans.has(from)) forwardTrans.set(from, new Map());
    const ft = forwardTrans.get(from);
    ft.set(to, (ft.get(to)||0)+1);
    totalFrom.set(from, (totalFrom.get(from)||0)+1);
    totalTo.set(to, (totalTo.get(to)||0)+1);
  }
  const mergeInto = new Map();
  for (const [from, toMap] of forwardTrans) {
    if (mergeInto.has(from)) continue; // don't chain
    const outTotal = totalFrom.get(from) || 0;
    for (const [to, count] of toMap) {
      if (to === from) continue;
      const pForward = count / outTotal;
      const inTotal  = totalTo.get(to) || 0;
      const pBack    = inTotal > 0 ? count / inTotal : 0;
      if (pForward >= PAIR_THRESHOLD && pBack >= PAIR_THRESHOLD && !mergeInto.has(from)) {
        mergeInto.set(to, from);
      }
    }
  }
  if (mergeInto.size === 0) return { labeled, motifDetails, sortedMotifs: [...motifDetails.values()] };
  const newLabeled = labeled.map(entry => {
    if (mergeInto.has(entry.label)) {
      const parentLabel = mergeInto.get(entry.label);
      const parentDet   = motifDetails.get(parentLabel);
      return { ...entry, label: parentLabel, color: parentDet?.color ?? entry.color,
               patternLabel: `Motif ${parentLabel}`, isMergedContinuation: true };
    }
    return entry;
  });
  const newDetails = new Map([...motifDetails.entries()].map(([k,v]) => [k, {...v, barNumbers:[...v.barNumbers]}]));
  for (const [childLabel, parentLabel] of mergeInto) {
    const child = newDetails.get(childLabel), parent = newDetails.get(parentLabel);
    if (!child || !parent) continue;
    parent.barNumbers = [...parent.barNumbers, ...child.barNumbers].sort((a,b) => a-b);
    parent.count      = parent.barNumbers.length;
    parent.barRanges  = compressRanges(parent.barNumbers);
    parent.unitBars   = 2;
    parent.description = describeMotif(parent.fp, 2);
    newDetails.delete(childLabel);
  }
  const sortedMotifs = [...newDetails.values()].sort((a,b) => {
    if (a.label==='X') return 1; if (b.label==='X') return -1;
    return a.label.localeCompare(b.label);
  });
  return { labeled: newLabeled, motifDetails: newDetails, sortedMotifs };
}


// ─── RLE ───────────────────────────────────────────────────────────

function rleRuns(labeled) {
  const runs = []; let i = 0;
  while (i < labeled.length) {
    const lbl = labeled[i].label; let j = i;
    while (j < labeled.length && labeled[j].label === lbl) j++;
    runs.push({ label:lbl, startBar:labeled[i].bar.bar_number, endBar:labeled[j-1].bar.bar_number, len:j-i });
    i = j;
  }
  return runs;
}


// ─── INNER CYCLE (exact) ───────────────────────────────────────────

function detectRepeat(arr) {
  const n = arr.length;
  if (n < 2) return null;
  for (let P = 1; P <= Math.floor(n/2); P++) {
    let ok = true;
    for (let i = P; i < n; i++) { if (arr[i] !== arr[i % P]) { ok = false; break; } }
    if (!ok) continue;
    const reps    = Math.floor(n / P);
    const pattern = arr.slice(0, P);
    const pRle    = [];
    let pi = 0;
    while (pi < P) {
      const lbl = pattern[pi]; let pj = pi;
      while (pj < P && pattern[pj] === lbl) pj++;
      pRle.push(pj - pi === 1 ? lbl : `${lbl}(${pj-pi})`);
      pi = pj;
    }
    return { pattern, period:P, reps, cycleStr:`${pRle.join('')}×${reps}` };
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════════
// STEP 4A: APPROXIMATE PERIOD DETECTION
//
// Scans the label sequence (content only, skips leading S) for the
// smallest period P where ≥minMatchRate of adjacent-P pairs match.
//
// Allows up to 15% variation → a few Variation bars won't break
// an otherwise solid 8-bar cycle.
//
// Requires at least 4 repetitions (maxP = n/4) to avoid false hits.
// ═══════════════════════════════════════════════════════════════════

function detectPeriod(labels, minMatchRate) {
  minMatchRate = minMatchRate ?? 0.85;
  // Skip leading silence
  let start = 0;
  while (start < labels.length && labels[start] === 'S') start++;
  const content = labels.slice(start);
  const n       = content.length;
  if (n < 8) return null; // too short to detect period

  const maxP = Math.floor(n / 4); // need at least 4 full repetitions
  for (let P = 1; P <= maxP; P++) {
    // A period is only meaningful if its base pattern contains ≥2 distinct labels.
    // This prevents period=1 from being "found" on long uniform same-label blocks.
    const patternLabels = new Set(content.slice(0, P));
    if (patternLabels.size < 2) continue;

    let matches = 0;
    const total = n - P;
    for (let i = 0; i < total; i++) {
      if (content[i] === content[i + P]) matches++;
    }
    if (matches / total >= minMatchRate) {
      return { period: P, contentStart: start };
    }
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════════
// STEP 4B: PERIOD-BASED SECTIONS (periodic music)
//
// Split content into P-bar chunks.  Each chunk = one section.
// Base motif-mix = set of non-S/X labels in first chunk.
// Chunk matches base → Main  /  Exposition  /  Reprise  /  Coda
// Chunk differs       → Variation
// ═══════════════════════════════════════════════════════════════════

function createPeriodSections(labeled, periodInfo) {
  const { period, contentStart } = periodInfo;
  const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
  const barToLabel = new Map(labeled.map(lb => [lb.bar.bar_number, lb.label]));
  const sections   = [];
  let sIdx = 0;

  // 1. Silence section(s) at start
  if (contentStart > 0) {
    const silBars = labeled.slice(0, contentStart);
    const silStart = silBars[0].bar.bar_number;
    const silEnd   = silBars[silBars.length-1].bar.bar_number;
    sections.push({
      romanLabel: ROMAN[sIdx++] ?? `S${sIdx}`,
      type: 'Silence', startBar: silStart, endBar: silEnd,
      barRange: `${silStart}–${silEnd}`,
      dominantLabel: 'S', labels: ['S'], motifStr: 'S', cycleStr: null,
      color: COLOR_S,
    });
  }

  // 2. Split content into period-length chunks
  const content  = labeled.slice(contentStart);
  // Base mix = distinct non-S/X labels in the FIRST full chunk
  const firstChunkLabels = content.slice(0, period).map(lb => lb.label);
  const baseMix  = new Set(firstChunkLabels.filter(l => l !== 'S' && l !== 'X'));

  // Track how many non-variation sections we've seen (for Reprise/Coda naming)
  let mainCount = 0;
  let hadVariation = false;

  for (let i = 0; i < content.length; i += period) {
    const chunk = content.slice(i, Math.min(i + period, content.length));
    const chunkLabels  = chunk.map(lb => lb.label);
    const chunkNonSX   = new Set(chunkLabels.filter(l => l !== 'S' && l !== 'X'));

    // Variation = chunk introduces a label NOT in base OR is missing a base label
    const isVariation = [...chunkNonSX].some(l => !baseMix.has(l));

    // Inner exact cycle within this chunk (only shows if the chunk itself repeats internally)
    const innerCycle = detectRepeat(chunkLabels);
    const cycleStr   = innerCycle?.cycleStr ?? null;

    const startBar = chunk[0].bar.bar_number;
    const endBar   = chunk[chunk.length - 1].bar.bar_number;
    const motifArr = [...new Set(chunkLabels)].filter(l => l !== 'S' && l !== 'X');
    const motifStr = motifArr.join(' + ') || 'S';

    let type;
    if (isVariation) {
      type = 'Variation';
      hadVariation = true;
    } else if (mainCount === 0) {
      type = 'Exposition';
    } else if (hadVariation) {
      // Returned to base after variation
      type = i + period >= content.length ? 'Coda' : 'Reprise';
    } else {
      // Still in base, before any variation
      type = i + period >= content.length ? 'Coda' : 'Main';
    }
    if (!isVariation) mainCount++;

    sections.push({
      romanLabel:    ROMAN[sIdx++] ?? `S${sIdx}`,
      type,
      startBar, endBar,
      barRange:      `${startBar}–${endBar}`,
      dominantLabel: motifArr[0] ?? 'S',
      labels:        motifArr,
      motifStr,
      cycleStr,
      color:         motifColor(motifArr[0] ?? 'S'),
    });
  }

  return sections;
}


// ═══════════════════════════════════════════════════════════════════
// STEP 4C: CHANGE-BASED SECTIONS (through-composed fallback)
//
// Used when no period is detected (e.g. Comptine, nocturnes).
// A section boundary forms when the dominant window label changes
// and holds for ≥ MIN_RUN consecutive bars.
// ═══════════════════════════════════════════════════════════════════

const MIN_SECTION_RUN = 3; // bars minimum to declare a new section

function createChangeSections(labeled) {
  const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
  const runs   = rleRuns(labeled);

  // Absorb very short non-S runs (≤ MIN-1 bars) into the previous section
  const merged = [];
  for (const run of runs) {
    const isShort = run.label !== 'S' && run.len < MIN_SECTION_RUN;
    if (isShort && merged.length > 0 && merged[merged.length-1].label !== 'S') {
      const prev = merged[merged.length-1];
      prev.endBar = run.endBar; prev.len += run.len;
      if (!prev.extra) prev.extra = new Set([prev.label]);
      prev.extra.add(run.label);
    } else {
      merged.push({ ...run, extra: new Set([run.label]) });
    }
  }

  // Merge consecutive same-label groups (non-S)
  const groups = [];
  let mi = 0;
  while (mi < merged.length) {
    const cur  = merged[mi]; const grp = [cur]; let mj = mi+1;
    while (mj < merged.length && merged[mj].label === cur.label && cur.label !== 'S') {
      grp.push(merged[mj]); mj++;
    }
    const allExtras = new Set(grp.flatMap(g => [...g.extra]));
    groups.push({ startBar:grp[0].startBar, endBar:grp[grp.length-1].endBar,
      dominantLabel:cur.label, labels:[...allExtras] });
    mi = mj;
  }

  // Classify types
  const barToLabel = new Map(labeled.map(lb => [lb.bar.bar_number, lb.label]));
  const primaryLabel = (() => {
    const cov = new Map();
    for (const g of groups) {
      if (g.dominantLabel !== 'S' && g.dominantLabel !== 'X') {
        const len = g.endBar - g.startBar + 1;
        cov.set(g.dominantLabel, (cov.get(g.dominantLabel)||0)+len);
      }
    }
    let best = null, bestC = 0;
    for (const [l,c] of cov) { if (c > bestC) { best = l; bestC = c; } }
    return best;
  })();
  const primaryGroups = groups.filter(g => g.dominantLabel === primaryLabel);
  let hadVariation = false;

  return groups.map((g, idx) => {
    const chunkLabels = [];
    for (let b = g.startBar; b <= g.endBar; b++) chunkLabels.push(barToLabel.get(b) ?? g.dominantLabel);
    const innerCycle = g.dominantLabel !== 'S' ? detectRepeat(chunkLabels) : null;
    const nonSX = g.labels.filter(l => l !== 'S' && l !== 'X');
    let type;
    if (g.dominantLabel === 'S') {
      type = 'Silence';
    } else if (g.dominantLabel === primaryLabel) {
      const isFirst = primaryGroups[0] === g;
      const isLast  = primaryGroups[primaryGroups.length-1] === g;
      if (isFirst) type = 'Exposition';
      else if (hadVariation) type = isLast ? 'Coda' : 'Reprise';
      else type = isLast ? 'Coda' : 'Main';
    } else {
      type = 'Development'; hadVariation = true;
    }
    return {
      romanLabel:    ROMAN[idx] ?? `S${idx+1}`,
      type,
      startBar:      g.startBar,
      endBar:        g.endBar,
      barRange:      `${g.startBar}–${g.endBar}`,
      dominantLabel: g.dominantLabel,
      labels:        nonSX.length ? nonSX : [g.dominantLabel],
      motifStr:      nonSX.join(' + ') || 'S',
      cycleStr:      innerCycle?.cycleStr ?? null,
      color:         motifColor(g.dominantLabel),
    };
  });
}


// ═══════════════════════════════════════════════════════════════════
// STEP 4 (TOP LEVEL): DETECT SECTIONS
//
// 1. Try approximate period detection.
// 2. If period found → createPeriodSections  (periodic music)
// 3. If not found   → createChangeSections   (through-composed)
// ═══════════════════════════════════════════════════════════════════

function detectSections(labeled) {
  if (!labeled.length) return [];
  const labels = labeled.map(lb => lb.label);

  // Try period detection first
  const periodInfo = detectPeriod(labels, 0.85);
  const sections   = periodInfo
    ? createPeriodSections(labeled, periodInfo)
    : createChangeSections(labeled);

  // Mark boundary-end bars on the labeled array (for timeline rendering)
  const boundarySet = new Set(sections.map(s => s.endBar));
  const secByBar    = new Map();
  for (const sec of sections)
    for (let b = sec.startBar; b <= sec.endBar; b++) secByBar.set(b, sec);

  return { sections, boundarySet, secByBar };
}


// ═══════════════════════════════════════════════════════════════════
// FULL TRACK ANALYSIS
// ═══════════════════════════════════════════════════════════════════

function analyzeTrack(bars, spb) {
  if (!bars || !bars.length) return { motifs:[], labeled:[], sections:[] };

  const { labeled, sortedMotifs, motifDetails } = findMotifs(bars, spb);
  const merged   = mergePairedMotifs(labeled, motifDetails);
  const final    = merged.labeled;
  const detMots  = merged.motifDetails;
  const finMots  = merged.sortedMotifs;

  const { sections, boundarySet, secByBar } = detectSections(final);

  const labeledBars = final.map(({ bar, fp, label, isContinuation, isMergedContinuation }) => {
    const motif = detMots.get(label);
    const sec   = secByBar.get(bar.bar_number);
    return {
      barNumber:     bar.bar_number,
      notes:         bar.notes,
      label,
      patternLabel:  label==='S' ? 'Silence' : label==='X' ? 'Unique' : `Motif ${label}`,
      patternId:     `MOT_${label}`,
      role:          label==='S' ? 'silence' : label==='X' ? 'unique'
                     : (isContinuation||isMergedContinuation) ? 'continuation' : 'primary',
      color:         motif?.color ?? motifColor(label),
      isEmpty:       fp.isEmpty,
      noteCount:     bar.notes.length,
      rhythmClass:   fp.rhythmClass,
      description:   motif?.description ?? (fp.isEmpty ? 'Silence' : 'Unique bar'),
      sectionLabel:  sec?.romanLabel ?? null,
      sectionType:   sec?.type       ?? null,
      isBoundaryEnd: boundarySet.has(bar.bar_number),
      isUnique:      label === 'X',
      isContinuation: !!(isContinuation || isMergedContinuation),
    };
  });

  return { motifs: finMots, labeled: labeledBars, sections };
}


// ─── LH CHORD CYCLE ────────────────────────────────────────────────

function lhChordForBar(bar) {
  if (!bar.notes.length) return null;
  const midis = bar.notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
  if (!midis.length) return null;
  return chordName(Math.min(...midis), midis);
}
function detectChordCycle(bars) {
  const chords = bars.map(b => lhChordForBar(b)).filter(c => c !== null);
  if (chords.length < 4) return null;
  for (let P = 1; P <= 16; P++) {
    const cycle = chords.slice(0, P); const cs = cycle.join(',');
    let reps = 1;
    while ((reps+1)*P <= chords.length) {
      if (chords.slice(reps*P,(reps+1)*P).join(',') === cs) reps++;
      else break;
    }
    if (reps >= 2) return { cycle, cycleString: cycle.join(' → '), periodBars:P, repeatCount:reps };
  }
  return null;
}


// ─── YAML GENERATOR ────────────────────────────────────────────────

function generateYaml(rhResult, lhResult, lhChordCycle, metadata) {
  const totalBars = metadata.bars.length;
  const header    =
    `# COMPOSITION ANALYSIS\n` +
    `# ${totalBars} bars · ${metadata.time_signature} · ${metadata.tempo} BPM · Key: ${metadata.key}`;

  const motifLines = (motifs) =>
    (motifs||[]).filter(m => m.label !== 'X').map(m => {
      const u = m.unitBars > 1 ? `\n      unit_bars: ${m.unitBars}` : '';
      return `    ${m.label}:\n      count:  ${m.count}${u}\n      bars:   "${m.barRanges}"\n      descr:  "${m.description}"`;
    }).join('\n\n');

  const secLines = (sections) =>
    (sections||[]).map(s => {
      const cyc = s.cycleStr ? `, cycle: ${s.cycleStr}` : '';
      return `    ${s.romanLabel}: {bars: "${s.barRange}", type: ${s.type}, motifs: [${s.motifStr}]${cyc}}`;
    }).join('\n');

  const chord = lhChordCycle
    ? `  chord_cycle: "${lhChordCycle.cycleString} (${lhChordCycle.periodBars}-bar × ${lhChordCycle.repeatCount})"`
    : '  chord_cycle: n/a';

  return (
    header + '\n\n' +
    `right_hand:\n  motifs:\n${motifLines(rhResult.motifs)}\n\n  sections:\n${secLines(rhResult.sections)}\n` +
    (lhResult?.motifs?.length
      ? `\nleft_hand:\n  motifs:\n${motifLines(lhResult.motifs)}\n\n  sections:\n${secLines(lhResult.sections)}\n${chord}\n`
      : '')
  );
}


// ─── MAIN ENTRY POINT ──────────────────────────────────────────────

function analyze(input = {}) {
  let rhBars = null, lhBars = null, metadata = null, splitMidi = null, spb = 16;
  if (input.full) {
    const norm = normalizeJson(input.full);
    metadata = norm; spb = norm.subdivisions_per_bar;
    splitMidi = input.splitMidi ?? detectSplitMidi(norm.bars);
    const split = splitHandsFromFull(norm.bars, splitMidi);
    rhBars = split.rhBars; lhBars = split.lhBars; splitMidi = split.splitMidi;
  } else {
    if (input.rh) { const n = normalizeJson(input.rh); metadata = metadata??n; spb = n.subdivisions_per_bar; rhBars = n.bars; }
    if (input.lh) { const n = normalizeJson(input.lh); metadata = metadata??n; lhBars = n.bars; }
    if (!metadata) metadata = { tempo:120, time_signature:'4/4', key:'C', subdivisions_per_bar:16, bars:rhBars||lhBars||[] };
  }
  if (!metadata) throw new Error('No input provided. Pass { rh }, { lh }, { rh, lh }, or { full }.');

  const empty    = { motifs:[], labeled:[], sections:[] };
  const rhResult = rhBars ? analyzeTrack(rhBars, spb) : empty;
  const lhResult = lhBars ? analyzeTrack(lhBars, spb) : empty;
  const lhChord  = lhBars ? detectChordCycle(lhBars)  : null;
  const yaml     = generateYaml(rhResult, lhResult, lhChord, metadata);
  const splitDisp = splitMidi ?? (rhBars&&lhBars ? detectSplitMidi([...rhBars,...lhBars]) : null);

  return {
    metadata, splitMidi: splitDisp,
    rightHand: { motifs: rhResult.motifs, labeled: rhResult.labeled, sections: rhResult.sections },
    leftHand:  { motifs: lhResult.motifs, labeled: lhResult.labeled, sections: lhResult.sections, chordCycle: lhChord },
    yamlBlueprint: yaml,
    summary: {
      totalBars:  metadata.bars.length,
      rhMotifs:   (rhResult.motifs||[]).length,
      lhMotifs:   (lhResult.motifs||[]).length,
      rhSections: (rhResult.sections||[]).length,
      lhSections: (lhResult.sections||[]).length,
      splitMidi:   splitDisp,
      chordCycle:  lhChord?.cycleString ?? null,
    },
  };
}


// ─── EXPORTS ───────────────────────────────────────────────────────

const MusicAnalyzerEngine = {
  analyze, analyzeTrack, findMotifs, mergePairedMotifs,
  detectPeriod, createPeriodSections, createChangeSections, detectSections,
  detectRepeat, barFingerprint, quantizeDuration, describeMotif, compressRanges,
  markContinuationBars, detectChordCycle, lhChordForBar,
  normalizeJson, normalizeBar, normalizeNote,
  splitHandsFromFull, detectSplitMidi,
  pitchToMidi, midiToName, chordName, rleRuns,
};
if (typeof module !== 'undefined' && module.exports) module.exports = MusicAnalyzerEngine;
else if (typeof globalThis !== 'undefined') globalThis.MusicAnalyzerEngine = MusicAnalyzerEngine;