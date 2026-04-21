
'use strict';

// ═══════════════════════════════════════════════════════════════════
// MUSIC ANALYZER ENGINE v4.0
//
// Core improvements over v3:
//
// 1. STRUCTURAL FINGERPRINTING
//    Every bar/window gets a "structural fp" (direction-agnostic) AND
//    a "directional fp". Families are grouped by structural fp, so
//    inverted/retrograded versions land in the SAME family.
//
// 2. DEEP ALTERNATING DETECTION
//    Pedal/melody are separated. Melody trend uses linear regression
//    so octave-displaced first notes don't confuse the direction.
//    This makes bars 3-8 and bars 11-16 correctly seen as one family
//    (ascending alternating vs descending alternating = "inverted").
//
// 3. COMPREHENSIVE VARIATION CLASSIFIER
//    Exact, transposed (any interval), octave-transposed, inverted,
//    retrograde, retrograde-inversion, augmented/diminished, developed.
//
// 4. EXHAUSTIVE MULTI-WINDOW DISCOVERY  O(n² × W)
//    Every window size from 1..maxW, every start position.
//    Overlap is OK during discovery; priority resolves at labeling time.
//
// 5. BOUNDARY-RESPECTING SECTION DETECTION
//    Boundaries discovered from novelty scores. Patterns crossing a
//    boundary get deprioritized in labeling (a bar claimed inside its
//    boundary section won't be stolen by a cross-boundary pattern).
//
// 6. FULLY DYNAMIC — no hardcoded cadence rules, scale assumptions,
//    fixed bar lengths, or music-type constraints.
// ═══════════════════════════════════════════════════════════════════

// ─── CONSTANTS ──────────────────────────────────────────────────────
const NOTE_NAMES  = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_MAP    = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
  'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
  'A':9,'A#':10,'BB':10,'B':11,
};

// Scale templates (bitmasks) for harmonic analysis
const SCALE_TEMPLATES = [];
(function buildScales() {
  const patterns = [
    { name: 'major',    steps: [0,2,4,5,7,9,11] },
    { name: 'minor',    steps: [0,2,3,5,7,8,10] },
    { name: 'harm-min', steps: [0,2,3,5,7,8,11] },
    { name: 'dorian',   steps: [0,2,3,5,7,9,10] },
    { name: 'mixo',     steps: [0,2,4,5,7,9,10] },
    { name: 'pent-maj', steps: [0,2,4,7,9]       },
    { name: 'pent-min', steps: [0,3,5,7,10]      },
  ];
  for (const { name, steps } of patterns) {
    for (let root = 0; root < 12; root++) {
      let mask = 0;
      for (const s of steps) mask |= (1 << ((root + s) % 12));
      SCALE_TEMPLATES.push({ name: NOTE_NAMES[root] + ' ' + name, root, mask });
    }
  }
})();

const PATTERN_COLORS = [
  { bg:'#06b6d4', text:'#001', label:'cyan'    },
  { bg:'#8b5cf6', text:'#fff', label:'violet'  },
  { bg:'#f59e0b', text:'#001', label:'amber'   },
  { bg:'#10b981', text:'#001', label:'emerald' },
  { bg:'#f43f5e', text:'#fff', label:'rose'    },
  { bg:'#3b82f6', text:'#fff', label:'blue'    },
  { bg:'#a855f7', text:'#fff', label:'purple'  },
  { bg:'#ec4899', text:'#fff', label:'pink'    },
  { bg:'#14b8a6', text:'#001', label:'teal'    },
  { bg:'#f97316', text:'#fff', label:'orange'  },
  { bg:'#84cc16', text:'#001', label:'lime'    },
  { bg:'#e11d48', text:'#fff', label:'crimson' },
];
const EMPTY_COLOR    = { bg:'#374151', text:'#9ca3af', label:'gray'   };
const SURPRISE_COLOR = { bg:'#ef4444', text:'#fff',   label:'red'    };
const BOUNDARY_COLOR = { bg:'#f97316', text:'#fff',   label:'orange' };


// ═══════════════════════════════════════════════════════════════════
// PITCH UTILITIES
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

function popcount(mask) {
  let c = 0, m = mask >>> 0;
  while (m) { c += m & 1; m >>>= 1; }
  return c;
}


// ═══════════════════════════════════════════════════════════════════
// PHASE 0 — NORMALIZATION
// ═══════════════════════════════════════════════════════════════════

function normalizeNote(n) {
  return {
    pitch:                 n.pitch                ?? n.p  ?? null,
    start_subdivision:     n.start_subdivision    ?? n.s  ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
    offset_percent:        n.offset_percent       ?? n.o  ?? 0,
    end_cutoff_percent:    n.end_cutoff_percent   ?? n.c  ?? null,
    velocity:              100,
  };
}

function normalizeBar(b) {
  return {
    bar_number: b.bar_number ?? b.bn,
    notes: (b.notes ?? []).map(normalizeNote).filter(n => n.pitch !== null),
  };
}

function normalizeJson(json) {
  const ts    = json.time_signature || '4/4';
  const [n,d] = ts.split('/').map(Number);
  const spb   = json.subdivisions_per_bar || (n * (16 / d));
  return {
    tempo:                json.tempo    || 120,
    time_signature:       ts,
    key:                  json.key     || 'C',
    subdivisions_per_bar: spb,
    bars:                 (json.bars || []).map(normalizeBar),
  };
}

// ─── Hand separation ─────────────────────────────────────────────

const HAND_SPLIT_LOW  = 48;
const HAND_SPLIT_HIGH = 72;

function detectSplitPoint(bars) {
  const pitchFreq = new Map();
  for (const bar of bars)
    for (const note of bar.notes) {
      const m = pitchToMidi(note.pitch);
      if (m !== null) pitchFreq.set(m, (pitchFreq.get(m) || 0) + 1);
    }
  if (pitchFreq.size < 2) return 60;
  const sorted = [...pitchFreq.keys()].sort((a,b) => a - b);
  let best = -1, splitAt = 60;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i-1];
    const mid = (sorted[i-1] + sorted[i]) / 2;
    const w   = (mid >= HAND_SPLIT_LOW && mid <= HAND_SPLIT_HIGH) ? 3.0 : 0.7;
    if (gap * w > best) { best = gap * w; splitAt = Math.round(mid); }
  }
  return splitAt;
}

function separateHands(bars, splitMidi) {
  const split = (splitMidi != null) ? splitMidi : detectSplitPoint(bars);
  const rhBars = [], lhBars = [];
  for (const bar of bars) {
    rhBars.push({ bar_number: bar.bar_number, notes: bar.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) >= split) });
    lhBars.push({ bar_number: bar.bar_number, notes: bar.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) <  split) });
  }
  return {
    rhBars, lhBars, splitMidi: split,
    rhHasNotes: rhBars.some(b => b.notes.length > 0),
    lhHasNotes: lhBars.some(b => b.notes.length > 0),
  };
}


// ═══════════════════════════════════════════════════════════════════
// PHASE 1 — STRUCTURAL DESCRIPTOR (THE HEART OF v4)
// ═══════════════════════════════════════════════════════════════════

/**
 * Detect alternating pedal-note pattern with robust heuristics.
 * Returns {isAlternating, pedalPitch, pedalPosition, pedalNotes, melodyNotes}
 */
function detectAlternatingDeep(sortedNotes) {
  if (sortedNotes.length < 4) return { isAlternating: false };

  // ── 1. Find the most frequent pitch ─────────────────────────────
  const pitchFreq = new Map();
  for (const n of sortedNotes)
    pitchFreq.set(n.pitch, (pitchFreq.get(n.pitch) || 0) + 1);

  // Try each candidate pedal (any pitch appearing ≥ 30% of the time)
  const candidates = [...pitchFreq.entries()]
    .filter(([, c]) => c / sortedNotes.length >= 0.30)
    .sort((a, b) => b[1] - a[1]);

  for (const [pedalPitch] of candidates) {
    const pedalIndices    = sortedNotes.map((n, i) => n.pitch === pedalPitch ? i : -1).filter(i => i >= 0);
    const nonPedalIndices = sortedNotes.map((n, i) => n.pitch !== pedalPitch ? i : -1).filter(i => i >= 0);

    if (pedalIndices.length < 2 || nonPedalIndices.length < 2) continue;

    // ── 2. Check that pedal appears at regular positional intervals ──
    const allEven = pedalIndices.every(i => i % 2 === 0);
    const allOdd  = pedalIndices.every(i => i % 2 === 1);
    if (!allEven && !allOdd) continue;

    // ── 3. Check uniform temporal spacing ───────────────────────────
    const positions = sortedNotes.map(n => n.start_subdivision);
    const gaps = [];
    for (let i = 1; i < positions.length; i++) gaps.push(positions[i] - positions[i - 1]);
    const meanGap      = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gapVariance  = gaps.reduce((a, b) => a + (b - meanGap) ** 2, 0) / gaps.length;
    const spacingOk    = gapVariance < (meanGap * meanGap * 0.25); // CV < 0.5

    // Alternating is still valid even with mild spacing variation
    const isAlternating = spacingOk || pedalIndices.length >= 3;
    if (!isAlternating) continue;

    // ── 4. Determine pedal register position ────────────────────────
    const pedalMidi     = pitchToMidi(pedalPitch);
    const nonPedalNotes = sortedNotes.filter(n => n.pitch !== pedalPitch);
    const nonPedalMidis = nonPedalNotes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
    const avgNonPedal   = nonPedalMidis.length
      ? nonPedalMidis.reduce((a, b) => a + b, 0) / nonPedalMidis.length
      : pedalMidi;
    const pedalPosition = pedalMidi > avgNonPedal ? 'top' : 'bottom';

    return {
      isAlternating: true,
      pedalPitch,
      pedalPosition,
      pedalNotes:  sortedNotes.filter(n => n.pitch === pedalPitch),
      melodyNotes: nonPedalNotes,
      meanGap:     Math.round(meanGap),
    };
  }

  return { isAlternating: false };
}

/**
 * Compute melody direction using linear regression on MIDI values over time.
 * Handles octave-displaced first notes correctly (they don't fool the slope).
 */
function getMelodyTrend(melodyNotes) {
  if (!melodyNotes || melodyNotes.length < 2) return 'static';

  const pts = melodyNotes
    .map(n => ({ x: n.start_subdivision, y: pitchToMidi(n.pitch) }))
    .filter(p => p.y !== null);

  if (pts.length < 2) return 'static';

  const n     = pts.length;
  const meanX = pts.reduce((a, p) => a + p.x, 0) / n;
  const meanY = pts.reduce((a, p) => a + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of pts) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  const slope = den > 0 ? num / den : 0;

  // slope is in MIDI-semitones per subdivision
  if (slope >  0.2) return 'ascending';
  if (slope < -0.2) return 'descending';
  return 'static';
}

/**
 * Classify step type from an array of intervals.
 * 'step'  = all abs-intervals ≤ 2
 * 'skip'  = max ≤ 7
 * 'leap'  = max > 7
 * 'none'  = no intervals
 */
function classifyStepType(intervals) {
  if (!intervals || intervals.length === 0) return 'none';
  const maxAbs = Math.max(...intervals.map(Math.abs));
  if (maxAbs <= 2)  return 'step';
  if (maxAbs <= 7)  return 'skip';
  return 'leap';
}

/**
 * Dominant duration — most frequent duration value in a note list.
 */
function dominantDuration(notes) {
  if (!notes || notes.length === 0) return 0;
  const freq = new Map();
  for (const n of notes)
    freq.set(n.duration_subdivisions, (freq.get(n.duration_subdivisions) || 0) + 1);
  let best = 0, bestCount = 0;
  for (const [d, c] of freq) if (c > bestCount) { bestCount = c; best = d; }
  return best;
}

/**
 * Uniform spacing: are all gaps between note-start positions the same?
 * Returns {uniform: bool, spacing: int}
 */
function uniformSpacing(notes) {
  if (!notes || notes.length < 2) return { uniform: true, spacing: 0 };
  const positions = [...notes].sort((a, b) => a.start_subdivision - b.start_subdivision)
                               .map(n => n.start_subdivision);
  const gaps = [];
  for (let i = 1; i < positions.length; i++) gaps.push(positions[i] - positions[i - 1]);
  const first = gaps[0];
  const uniform = gaps.every(g => g === first);
  return { uniform, spacing: uniform ? first : 0 };
}

/**
 * Compute structural descriptor for a single bar's notes.
 *
 * Returns:
 *   fpStructural  — direction-agnostic key (groups inversions)
 *   fpDirectional — includes melody direction (distinguishes inversions)
 *   fpRhythm      — rhythm-only (positions + durations)
 *   fpExact       — full pitch+position+duration
 *   + rich metadata
 */
function computeStructuralDescriptor(notes, spb) {
  if (!notes || notes.length === 0) {
    return {
      type: 'empty', isAlternating: false,
      pedalPitch: null, pedalPosition: 'none',
      melodyDirection: 'none', melodyIntervals: [],
      allIntervals: [], stepType: 'none',
      noteCount: 0, dominantDur: 0,
      uniform: true, spacing: 0,
      textureType: 'EMPTY',
      fpStructural: 'EMPTY', fpDirectional: 'EMPTY',
      fpRhythm: 'EMPTY', fpExact: 'EMPTY',
    };
  }

  const sorted = [...notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
  const noteCount = sorted.length;

  // ── Alternating detection ─────────────────────────────────────────
  const altResult = detectAlternatingDeep(sorted);

  // ── Intervals ─────────────────────────────────────────────────────
  const midiVals = sorted.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
  const allIntervals = [];
  for (let i = 1; i < midiVals.length; i++) allIntervals.push(midiVals[i] - midiVals[i - 1]);

  // ── Melody trend ──────────────────────────────────────────────────
  let melodyDirection = 'mixed';
  let melodyIntervals = [];
  if (altResult.isAlternating && altResult.melodyNotes.length >= 2) {
    const melMidis = altResult.melodyNotes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
    for (let i = 1; i < melMidis.length; i++) melodyIntervals.push(melMidis[i] - melMidis[i - 1]);
    // Use linear regression on melody notes (handles octave-displaced first note)
    melodyDirection = getMelodyTrend(altResult.melodyNotes);
  } else {
    melodyDirection = getMelodyTrend(sorted);
    melodyIntervals = allIntervals;
  }

  // ── Step type ─────────────────────────────────────────────────────
  const relevantIntervals = altResult.isAlternating ? melodyIntervals : allIntervals;
  const stepType = classifyStepType(relevantIntervals);

  // ── Duration / spacing ────────────────────────────────────────────
  const domDur = dominantDuration(sorted);
  const { uniform, spacing } = uniformSpacing(sorted);

  // ── Texture type ──────────────────────────────────────────────────
  // For structural grouping we want a coarse type bucket
  let textureType;
  if (altResult.isAlternating) {
    textureType = 'ALT'; // alternating (direction-agnostic)
  } else if (noteCount === 1) {
    textureType = 'MONO';   // single long note / sustain
  } else if (noteCount <= 3) {
    textureType = 'SPARSE';
  } else if (noteCount <= 6) {
    textureType = 'MED';
  } else {
    textureType = 'DENSE';
  }

  // ── Fingerprints ──────────────────────────────────────────────────

  // STRUCTURAL: groups inversions together (direction-agnostic for ALT)
  // Format: TYPE:noteCount:domDur:spacing:stepType
  const fpStructural = altResult.isAlternating
    ? `ALT:${noteCount}:${domDur}:${spacing}:${stepType}`
    : `${textureType}:${noteCount}:${domDur}:${stepType}:${melodyDirection}`;

  // DIRECTIONAL: distinguishes ascending vs descending within same structural family
  const fpDirectional = altResult.isAlternating
    ? `ALT:${noteCount}:${domDur}:${spacing}:${stepType}:${melodyDirection}`
    : fpStructural;

  // RHYTHM: positions + durations, no pitch
  const fpRhythm = sorted.map(n => `${n.start_subdivision}:${n.duration_subdivisions}`).join(',');

  // EXACT: full pitch + position + duration
  const fpExact = sorted.map(n => `${n.pitch}@${n.start_subdivision}:${n.duration_subdivisions}`).join(',');

  return {
    type: altResult.isAlternating ? 'alternating' : textureType.toLowerCase(),
    isAlternating:    altResult.isAlternating,
    pedalPitch:       altResult.pedalPitch      ?? null,
    pedalPosition:    altResult.pedalPosition   ?? 'none',
    melodyDirection,
    melodyIntervals,
    allIntervals,
    stepType,
    noteCount,
    dominantDur:      domDur,
    uniform,
    spacing,
    textureType,
    orderedNotes:     sorted,
    fpStructural,
    fpDirectional,
    fpRhythm,
    fpExact,
  };
}


// ═══════════════════════════════════════════════════════════════════
// PHASE 1b — PER-BAR FEATURE VECTOR (standard metrics + structural)
// ═══════════════════════════════════════════════════════════════════

function shannonEntropy(freqMap, total) {
  if (total === 0) return 0;
  let h = 0;
  for (const count of freqMap.values()) {
    if (!count) continue;
    const p = count / total;
    h -= p * Math.log2(p);
  }
  return h;
}

function buildPitchClassMask(notes) {
  let mask = 0;
  for (const n of notes) {
    const pc = pitchClass(n.pitch);
    if (pc !== null) mask |= (1 << pc);
  }
  return mask;
}

function bestScaleMatch(pitchClassMask) {
  if (!pitchClassMask) return { name: 'unknown', match: 0 };
  let best = 0, bestName = 'unknown';
  for (const sc of SCALE_TEMPLATES) {
    const overlap = popcount(pitchClassMask & sc.mask);
    const union   = popcount(pitchClassMask | sc.mask);
    const jaccard = union ? overlap / union : 0;
    if (jaccard > best) { best = jaccard; bestName = sc.name; }
  }
  return { name: bestName, match: best };
}

function extractFeatureVector(bar, spb) {
  const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
  const bn    = bar.bar_number;

  // ── Structural descriptor (NEW in v4) ────────────────────────────
  const structural = computeStructuralDescriptor(notes, spb);

  if (notes.length === 0) {
    return {
      barNumber: bn, isEmpty: true,
      midiValues: [], midiMin:0, midiMax:0, midiMean:0, midiRange:0, midiVariance:0,
      pitchClassMask:0, pitchClassCount:0, pitchClassSet: new Set(),
      noteCount:0, subdivisionMap: new Array(spb).fill(false),
      durationFreq: new Map(), dominantDuration:0,
      rhythmicEntropy:0, hasMixedDurations:false, subdivisionCoverage:0,
      orderedNotes:[], contourIntervals:[], contourDirections:[], hasLeaps:false, contourShape:'',
      bestScaleName:'unknown', bestScaleMatch:0, hasChromaticNotes:false,
      isMonophonic:true, polyphonyMax:0,
      hasAlternating:false, pedalCandidate:null, registralSpread:0,
      rawEnergy:0, relativeEnergy:0,
      structural,
    };
  }

  // ── Pitch ─────────────────────────────────────────────────────────
  const midiValues = notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
  const midiMin    = Math.min(...midiValues);
  const midiMax    = Math.max(...midiValues);
  const midiMean   = midiValues.reduce((a,b) => a+b, 0) / midiValues.length;
  const midiRange  = midiMax - midiMin;
  const midiVar    = midiValues.reduce((a,b) => a + (b-midiMean)**2, 0) / midiValues.length;
  const pcMask     = buildPitchClassMask(notes);
  const pcSet      = new Set(midiValues.map(m => m % 12));

  // ── Rhythm ────────────────────────────────────────────────────────
  const subdivMap  = new Array(spb).fill(false);
  const durFreq    = new Map();
  for (const n of notes) {
    const s = Math.max(0, Math.min(spb - 1, n.start_subdivision));
    subdivMap[s] = true;
    durFreq.set(n.duration_subdivisions, (durFreq.get(n.duration_subdivisions) || 0) + 1);
  }
  let domDur = 0, domDurCount = 0;
  for (const [d, c] of durFreq) if (c > domDurCount) { domDurCount = c; domDur = d; }

  const rhythmEnt   = shannonEntropy(durFreq, notes.length);
  const coveredSubd = subdivMap.filter(Boolean).length;

  // ── Melodic contour ───────────────────────────────────────────────
  const intervals  = [];
  const directions = [];
  for (let i = 1; i < notes.length; i++) {
    const m1 = pitchToMidi(notes[i-1].pitch), m2 = pitchToMidi(notes[i].pitch);
    if (m1 !== null && m2 !== null) {
      const diff = m2 - m1;
      intervals.push(diff);
      directions.push(diff > 0 ? 'U' : diff < 0 ? 'D' : 'S');
    }
  }
  const contourShape = directions.join('');
  const hasLeaps     = intervals.some(i => Math.abs(i) > 2);

  // ── Harmonic ──────────────────────────────────────────────────────
  const scaleResult = bestScaleMatch(pcMask);
  let hasChromaticNotes = false;
  for (const n of notes) {
    const pc = pitchClass(n.pitch);
    if (pc !== null) {
      const template = SCALE_TEMPLATES.find(t => t.name === scaleResult.name);
      if (template && !((template.mask >> pc) & 1)) { hasChromaticNotes = true; break; }
    }
  }

  // ── Texture ───────────────────────────────────────────────────────
  const subdivStarts = new Map();
  for (const n of notes) subdivStarts.set(n.start_subdivision, (subdivStarts.get(n.start_subdivision) || 0) + 1);
  const polyphonyMax = Math.max(...subdivStarts.values(), 0);

  // ── Energy ────────────────────────────────────────────────────────
  const avgDur    = notes.reduce((a, n) => a + n.duration_subdivisions, 0) / notes.length;
  const rawEnergy = (notes.length * midiMean * avgDur) / (spb * spb);

  return {
    barNumber:         bn,
    isEmpty:           false,
    midiValues, midiMin, midiMax, midiMean, midiRange,
    midiVariance:      midiVar,
    pitchClassMask:    pcMask,
    pitchClassCount:   pcSet.size,
    pitchClassSet:     pcSet,
    noteCount:         notes.length,
    subdivisionMap:    subdivMap,
    durationFreq:      durFreq,
    dominantDuration:  domDur,
    rhythmicEntropy:   rhythmEnt,
    hasMixedDurations: durFreq.size > 1,
    subdivisionCoverage: coveredSubd / spb,
    orderedNotes:      notes,
    contourIntervals:  intervals,
    contourDirections: directions,
    hasLeaps,
    contourShape,
    bestScaleName:     scaleResult.name,
    bestScaleMatch:    scaleResult.match,
    hasChromaticNotes,
    isMonophonic:      polyphonyMax <= 1,
    polyphonyMax,
    hasAlternating:    structural.isAlternating,
    pedalCandidate:    structural.pedalPitch,
    registralSpread:   midiRange,
    rawEnergy,
    relativeEnergy:    0, // filled after all bars extracted
    structural,         // ← the rich structural descriptor
  };
}

function computeRelativeEnergy(features) {
  const nonEmpty = features.filter(f => !f.isEmpty);
  if (!nonEmpty.length) return;
  const mean = nonEmpty.reduce((a, f) => a + f.rawEnergy, 0) / nonEmpty.length;
  for (const f of features) f.relativeEnergy = mean > 0 ? f.rawEnergy / mean : 0;
}

function extractAllFeatures(bars, spb) {
  const features = bars.map(b => extractFeatureVector(b, spb));
  computeRelativeEnergy(features);
  return features;
}


// ═══════════════════════════════════════════════════════════════════
// PHASE 2 — PAIRWISE SIMILARITY MATRIX (O(n²))
// ═══════════════════════════════════════════════════════════════════

function jaccardBitmask(maskA, maskB) {
  const inter = popcount(maskA & maskB);
  const union  = popcount(maskA | maskB);
  return union ? inter / union : 1;
}

function jaccardBoolArray(a, b) {
  let inter = 0, union = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] || b[i]) union++;
    if (a[i] && b[i]) inter++;
  }
  return union ? inter / union : 1;
}

function levenshteinSim(sA, sB) {
  if (!sA && !sB) return 1;
  if (!sA || !sB) return 0;
  if (sA === sB)  return 1;
  const la = sA.length, lb = sB.length;
  const dp = Array.from({ length: la + 1 }, (_, i) => {
    const row = new Array(lb + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++)
    for (let j = 1; j <= lb; j++)
      dp[i][j] = sA[i-1] === sB[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return 1 - dp[la][lb] / Math.max(la, lb);
}

function computeSimilarity(fi, fj) {
  const rhythm   = jaccardBoolArray(fi.subdivisionMap, fj.subdivisionMap);
  const contour  = levenshteinSim(fi.contourShape,  fj.contourShape);
  const harmonic = jaccardBitmask(fi.pitchClassMask, fj.pitchClassMask);
  const ncDiff   = Math.max(fi.noteCount, fj.noteCount) > 0
    ? Math.abs(fi.noteCount - fj.noteCount) / Math.max(fi.noteCount, fj.noteCount) : 0;
  const durMatch  = fi.dominantDuration === fj.dominantDuration ? 1 : 0;
  const altMatch  = fi.hasAlternating   === fj.hasAlternating   ? 1 : 0;
  const texture   = (1 - ncDiff + durMatch + altMatch) / 3;
  const energy    = 1 - Math.min(1, Math.abs(fi.relativeEnergy - fj.relativeEnergy));

  // Structural similarity (NEW in v4)
  const structMatch = (fi.structural.fpStructural === fj.structural.fpStructural) ? 1 : 0;
  const dirMatch    = (fi.structural.fpDirectional === fj.structural.fpDirectional) ? 1 : 0;

  return {
    rhythm, contour, harmonic, texture, energy, structMatch, dirMatch,
    combined: (rhythm + contour + harmonic + texture + energy + structMatch * 0.5 + dirMatch * 0.3) / 6,
  };
}

function buildSimilarityMatrix(features) {
  const n   = features.length;
  const mat = new Array(n).fill(null).map(() => new Array(n).fill(null));
  for (let i = 0; i < n; i++) {
    mat[i][i] = { rhythm:1, contour:1, harmonic:1, texture:1, energy:1, structMatch:1, dirMatch:1, combined:1 };
    for (let j = i + 1; j < n; j++) {
      const sim  = computeSimilarity(features[i], features[j]);
      mat[i][j]  = sim;
      mat[j][i]  = sim;
    }
  }
  return mat;
}


// ═══════════════════════════════════════════════════════════════════
// PHASE 3 — BOUNDARY DETECTION
// ═══════════════════════════════════════════════════════════════════

function computeNoveltyScores(features, simMatrix) {
  const n      = features.length;
  const scores = new Array(n - 1).fill(0);
  const maxEnt = Math.log2(16);

  for (let i = 0; i < n - 1; i++) {
    const fi = features[i], fj = features[i + 1];
    if (fi.isEmpty || fj.isEmpty) { scores[i] = 0.1; continue; }

    const sim = simMatrix[i][i + 1];
    const rhythmJump    = 1 - sim.rhythm;
    const contourJump   = 1 - sim.contour;
    const harmonicJump  = 1 - sim.harmonic;
    const textureJump   = 1 - sim.texture;
    const energyJump    = 1 - sim.energy;
    const structJump    = 1 - sim.structMatch; // NEW: structural fingerprint jump
    const entropyDelta  = Math.abs(fj.rhythmicEntropy - fi.rhythmicEntropy) / (maxEnt || 1);
    const densityDelta  = Math.min(1, Math.abs(fj.relativeEnergy - fi.relativeEnergy));

    scores[i] = (rhythmJump + contourJump + harmonicJump + textureJump + energyJump + structJump + entropyDelta + densityDelta) / 8;
  }
  return scores;
}

function detectBoundaries(features, simMatrix, kSigma = 1.0) {
  if (features.length < 3) return [];
  const novelty   = computeNoveltyScores(features, simMatrix);
  const mean      = novelty.reduce((a, b) => a + b, 0) / novelty.length;
  const std       = Math.sqrt(novelty.reduce((a, b) => a + (b - mean) ** 2, 0) / novelty.length);
  const threshold = mean + kSigma * std;

  const boundaries = [];
  for (let i = 0; i < novelty.length; i++) {
    if (novelty[i] < threshold) continue;
    const fi = features[i], fj = features[i + 1];
    const sim = simMatrix[i][i + 1];
    const dims = {
      rhythm:   1 - sim.rhythm,
      contour:  1 - sim.contour,
      harmonic: 1 - sim.harmonic,
      texture:  1 - sim.texture,
      energy:   1 - sim.energy,
      struct:   1 - sim.structMatch,
    };
    const domDim = Object.entries(dims).sort((a, b) => b[1] - a[1])[0][0];
    let type = 'mixed';
    if (domDim === 'texture' || domDim === 'energy') {
      type = (fj.relativeEnergy < 0.3 || fj.noteCount <= 2) ? 'cadential' : 'texture';
    } else if (domDim === 'struct') {
      type = 'structural';
    } else {
      type = domDim;
    }
    boundaries.push({
      afterBarIdx:    i,
      afterBarNumber: fi.barNumber,
      noveltyScore:   novelty[i],
      type, dims,
    });
  }
  return boundaries;
}


// ═══════════════════════════════════════════════════════════════════
// PHASE 4 — MULTI-WINDOW PATTERN DETECTION WITH STRUCTURAL GROUPING
// ═══════════════════════════════════════════════════════════════════

/**
 * Compute all fingerprints for a window of feature vectors.
 * Returns {structFp, dirFp, rhythmFp, exactFp, contourFp, contourInvFp}
 */
function buildWindowFingerprints(fvWindow) {
  // Structural (direction-agnostic) = concat of bar-level structural fps
  const structFp  = fvWindow.map(f => f.structural.fpStructural).join('||');
  // Directional = concat of bar-level directional fps
  const dirFp     = fvWindow.map(f => f.structural.fpDirectional).join('||');
  // Rhythm = concat of bar-level rhythm fps
  const rhythmFp  = fvWindow.map(f => f.structural.fpRhythm).join('||');
  // Exact = concat of bar-level exact fps
  const exactFp   = fvWindow.map(f => f.structural.fpExact).join('||');

  // Contour-level (for retrograde/inversion detection)
  const contourFp = fvWindow.map(f => f.contourShape).join('|');
  const contourInvFp = contourFp.split('').map(c => c==='U'?'D':c==='D'?'U':c).join('');
  const contourRetFp = contourFp.split('').reverse().join('');
  const contourRetInvFp = contourRetFp.split('').map(c => c==='U'?'D':c==='D'?'U':c).join('');

  return { structFp, dirFp, rhythmFp, exactFp, contourFp, contourInvFp, contourRetFp, contourRetInvFp };
}

/**
 * Discover natural window sizes where patterns actually repeat.
 */
function discoverNaturalWindowSizes(features, maxW) {
  const n = features.length;
  const density = new Map();

  for (let W = 1; W <= maxW; W++) {
    const fpCount = new Map();
    let total = 0;
    for (let start = 0; start + W <= n; start++) {
      const fvWin = features.slice(start, start + W);
      const key   = fvWin.map(f => f.structural.fpStructural).join('||');
      fpCount.set(key, (fpCount.get(key) || 0) + 1);
      total++;
    }
    const repeated = [...fpCount.values()].filter(c => c >= 2).reduce((a,b) => a+b, 0);
    density.set(W, total > 0 ? repeated / total : 0);
  }

  // Pick top-4 window sizes by density, plus any local maxima
  const ranked = [...density.entries()]
    .filter(([, d]) => d > 0.05)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([W, d]) => ({ W, density: d }));

  const sizeMap = new Map(ranked.map(s => [s.W, s]));
  return [...sizeMap.values()].sort((a, b) => b.density - a.density);
}

/**
 * Core pattern detection — O(n² × W).
 *
 * Grouping strategy:
 *   Primary key  = structFp  → groups inversions + transpositions together
 *   Secondary key = dirFp   → sub-groups by direction (for variation labeling)
 *
 * A family = all occurrences sharing the same structFp.
 * Within the family, the dirFp sub-group of the first occurrence is the "prototype".
 */
function detectPatternsV4(features, simMatrix, boundaries) {
  const n = features.length;
  if (n === 0) return { families: [], windowSizes: [] };

  const maxW       = Math.min(Math.floor(n / 2), 16);
  const windowSizes = discoverNaturalWindowSizes(features, maxW);

  // Build a Set of boundary-after-indices for overlap checking
  const boundaryIdxSet = new Set(boundaries.map(b => b.afterBarIdx));

  // Index: structFp → [occurrences]
  const structIndex = new Map();

  for (const { W } of windowSizes) {
    for (let start = 0; start + W <= n; start++) {
      const fvWin = features.slice(start, start + W);
      if (fvWin.every(f => f.isEmpty)) continue;

      const fps = buildWindowFingerprints(fvWin);

      // Does this window cross a boundary?
      let crossesBoundary = false;
      for (let k = start; k < start + W - 1; k++) {
        if (boundaryIdxSet.has(k)) { crossesBoundary = true; break; }
      }

      const occ = {
        startIdx:        start,
        startBar:        fvWin[0].barNumber,
        endBar:          fvWin[fvWin.length - 1].barNumber,
        barRange:        [fvWin[0].barNumber, fvWin[fvWin.length - 1].barNumber],
        W,
        fps,
        crossesBoundary,
        features:        fvWin,
        descriptors:     fvWin.map(f => f.structural),
      };

      if (!structIndex.has(fps.structFp)) structIndex.set(fps.structFp, []);
      structIndex.get(fps.structFp).push(occ);
    }
  }

  // Filter: families need ≥ 2 occurrences
  // Sort: primary by (count × W), secondary: prefer within-boundary occurrences
  const sorted = [...structIndex.entries()]
    .filter(([, occs]) => occs.length >= 2)
    .sort((a, b) => {
      const scoreA = a[1].length * a[1][0].W * (a[1].some(o => !o.crossesBoundary) ? 2 : 1);
      const scoreB = b[1].length * b[1][0].W * (b[1].some(o => !o.crossesBoundary) ? 2 : 1);
      return scoreB - scoreA;
    });

  const families = [];
  let colorIdx = 0;

  for (const [structFp, occs] of sorted) {
    if (families.length >= 12) break;

    const W = occs[0].W;
    const letter = String.fromCharCode(65 + families.length);
    const id     = `FAM_${letter}`;

    // Determine match level from fingerprint comparison
    const allSameExact  = new Set(occs.map(o => o.fps.exactFp)).size === 1;
    const allSameRhythm = new Set(occs.map(o => o.fps.rhythmFp)).size === 1;
    const allSameDir    = new Set(occs.map(o => o.fps.dirFp)).size === 1;
    const matchLevel    = allSameExact ? 'exact'
                        : allSameRhythm ? 'rhythmic'
                        : allSameDir    ? 'tonal'
                        :                 'structural';

    families.push({
      id, label: `Motif_${letter}`,
      famKey:       structFp,
      windowSize:   W,
      matchLevel,
      occurrenceCount: occs.length,
      occurrences: occs.map(o => ({
        startBar:        o.startBar,
        endBar:          o.endBar,
        barRange:        o.barRange,
        startIdx:        o.startIdx,
        w:               o.W,
        fps:             o.fps,
        crossesBoundary: o.crossesBoundary,
        descriptors:     o.descriptors,
        features:        o.features,
      })),
      score:  occs.length * W * 2.5,
      color:  PATTERN_COLORS[colorIdx % PATTERN_COLORS.length],
      type:   'motif',
    });
    colorIdx++;
  }

  return { families, windowSizes: windowSizes.map(s => s.W) };
}


// ═══════════════════════════════════════════════════════════════════
// PHASE 5 — COMPREHENSIVE VARIATION CLASSIFIER
// ═══════════════════════════════════════════════════════════════════

/**
 * Compute the consistent pitch shift between two windows (for transposition).
 * Returns the shift in semitones if all notes shift by the same amount, else null.
 */
function computePitchShift(protoOcc, compareOcc) {
  const pFeats = protoOcc.features || [];
  const cFeats = compareOcc.features || [];
  if (pFeats.length !== cFeats.length) return null;

  const shifts = [];
  for (let i = 0; i < pFeats.length; i++) {
    const pNotes = pFeats[i].orderedNotes || [];
    const cNotes = cFeats[i].orderedNotes || [];
    if (pNotes.length !== cNotes.length) return null;
    for (let j = 0; j < pNotes.length; j++) {
      const pm = pitchToMidi(pNotes[j].pitch);
      const cm = pitchToMidi(cNotes[j].pitch);
      if (pm === null || cm === null) return null;
      shifts.push(cm - pm);
    }
  }
  if (!shifts.length) return null;
  return shifts.every(s => s === shifts[0]) ? shifts[0] : null;
}

/**
 * Compute the consistent duration ratio between two windows (augmentation/diminution).
 */
function computeDurationRatio(protoOcc, compareOcc) {
  const pFeats = protoOcc.features || [];
  const cFeats = compareOcc.features || [];
  if (pFeats.length !== cFeats.length) return null;

  const ratios = [];
  for (let i = 0; i < pFeats.length; i++) {
    const pDur = pFeats[i].dominantDuration;
    const cDur = cFeats[i].dominantDuration;
    if (!pDur) return null;
    ratios.push(cDur / pDur);
  }
  if (!ratios.length) return null;
  const r0 = ratios[0];
  return ratios.every(r => Math.abs(r - r0) < 0.01) ? r0 : null;
}

/**
 * Full variation classifier — called per occurrence relative to prototype.
 *
 * Checks (in order of specificity):
 *   1. Exact (same in every way)
 *   2. Octave transposition (shift = ±12, ±24)
 *   3. Diatonic/chromatic transposition (any consistent pitch shift)
 *   4. Same rhythm, different pitch but inconsistent shift = "tonal variation"
 *   5. Direction-inverted (UDUD → DUDU) within same structural family
 *   6. Retrograde (reverse contour)
 *   7. Retrograde inversion
 *   8. Augmentation / diminution (same contour, different durations)
 *   9. Developed (contour similarity ≥ 0.7)
 *  10. Variation
 */
function classifyVariationV4(protoOcc, compareOcc) {
  const pFps = protoOcc.fps;
  const cFps = compareOcc.fps;

  // 1. Exact
  if (pFps.exactFp === cFps.exactFp) return 'exact';

  // Helper: check if melody directions are pairwise inverted
  function checkInverted() {
    if (pFps.structFp !== cFps.structFp || pFps.dirFp === cFps.dirFp) return false;
    const pDirs = (protoOcc.descriptors  || []).map(d => d.melodyDirection);
    const cDirs = (compareOcc.descriptors || []).map(d => d.melodyDirection);
    if (!pDirs.length) return false;
    return pDirs.every((d, i) => {
      const cd = cDirs[i];
      return (d === 'ascending'  && cd === 'descending') ||
             (d === 'descending' && cd === 'ascending')  ||
             d === cd;
    });
  }

  // 2 & 3. Transposition (same rhythm)
  if (pFps.rhythmFp === cFps.rhythmFp) {
    const shift = computePitchShift(protoOcc, compareOcc);
    if (shift !== null) {
      if (shift === 0)   return 'exact';
      if (shift === 12)  return 'octave up';
      if (shift === -12) return 'octave down';
      if (shift === 24)  return '2 octaves up';
      if (shift === -24) return '2 octaves down';
      return `transposed ${shift > 0 ? '+' : ''}${shift}st`;
    }
    // Same rhythm, inconsistent pitch shift — still check for inversion
    if (checkInverted()) return 'inverted';
    return 'tonal variation';
  }

  // 4. Direction inversion (different rhythm but same structural family, opposite direction)
  if (checkInverted()) return 'inverted';

  // 5-7. Contour transformations
  const pContour = pFps.contourFp || '';
  const cContour = cFps.contourFp || '';

  if (pContour && cContour) {
    if (pContour === cFps.contourInvFp)    return 'inverted';
    if (pContour === cFps.contourRetFp)    return 'retrograde';
    if (pContour === cFps.contourRetInvFp) return 'retrograde inversion';

    // 8. Augmentation / diminution (same contour, different durations)
    if (pContour === cContour) {
      const ratio = computeDurationRatio(protoOcc, compareOcc);
      if (ratio !== null && ratio !== 1) {
        return ratio > 1
          ? `augmented ×${ratio.toFixed(1)}`
          : `diminished ×${ratio.toFixed(1)}`;
      }
    }

    // 9. Developed (high Levenshtein similarity)
    const sim = levenshteinSim(pContour, cContour);
    if (sim >= 0.75) return 'developed';
  }

  // 10. Fallback
  return 'variation';
}

function classifyFamilyVariations(families) {
  for (const fam of families) {
    if (!fam.occurrences.length) continue;
    fam.occurrences[0].variationType = 'prototype';
    for (let i = 1; i < fam.occurrences.length; i++) {
      fam.occurrences[i].variationType = classifyVariationV4(fam.occurrences[0], fam.occurrences[i]);
    }
  }
}


// ═══════════════════════════════════════════════════════════════════
// PHASE 6 — HIERARCHICAL LABELING + OUTPUT
// ═══════════════════════════════════════════════════════════════════

/**
 * Assign each bar to its best family occurrence.
 *
 * Priority rules:
 *   1. Non-cross-boundary occurrences win over cross-boundary ones
 *   2. Among ties: higher family score wins
 *   3. Each bar gets one primary assignment
 */
function labelBars(features, families, boundaries) {
  // Build lookup: barNumber → [{fam, occ, posInWindow, priority}]
  const barFamilyLookup = new Map();

  for (const fam of families) {
    for (const occ of fam.occurrences) {
      const priority = occ.crossesBoundary ? 1 : 2; // higher = preferred
      for (let j = 0; j < fam.windowSize; j++) {
        const bn = occ.startBar + j;
        if (!barFamilyLookup.has(bn)) barFamilyLookup.set(bn, []);
        barFamilyLookup.get(bn).push({ fam, occ, posInWindow: j, priority });
      }
    }
  }

  const boundaryBns = new Set(boundaries.map(b => b.afterBarNumber));
  const boundaryMap = new Map(boundaries.map(b => [b.afterBarNumber, b]));

  return features.map(f => {
    const bn      = f.barNumber;
    const matches = (barFamilyLookup.get(bn) || []).sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.fam.score - a.fam.score;
    });
    const best    = matches[0] ?? null;
    const isBoundaryEnd = boundaryBns.has(bn);
    const boundaryInfo  = isBoundaryEnd ? boundaryMap.get(bn) : null;
    const patternId     = best ? best.fam.id : null;
    const isSurprise    = !f.isEmpty && !patternId;

    return {
      barNumber:      bn,
      notes:          f.orderedNotes,
      patternId:      f.isEmpty ? 'EMPTY' : (patternId || 'SURPRISE'),
      patternLabel:   f.isEmpty ? 'Empty' : (best ? best.fam.label : 'Surprise'),
      variationType:  best?.occ?.variationType ?? null,
      isSurprise,
      isEmpty:        f.isEmpty,
      isBoundaryEnd,
      boundaryType:   boundaryInfo?.type ?? null,
      noveltyScore:   boundaryInfo?.noveltyScore ?? 0,
      noteCount:      f.noteCount,
      rhythmicEntropy: f.rhythmicEntropy,
      relativeEnergy: f.relativeEnergy,
      hasAlternating: f.hasAlternating,
      pedalCandidate: f.pedalCandidate,
      bestScaleName:  f.bestScaleName,
      hasChromaticNotes: f.hasChromaticNotes,
      contourShape:   f.contourShape,
      isSustain:      f.noteCount <= 2 && f.noteCount > 0 && f.dominantDuration >= 8,
      color:          best ? best.fam.color : (f.isEmpty ? EMPTY_COLOR : SURPRISE_COLOR),
      alternating:    f.hasAlternating
        ? { pedal: f.pedalCandidate, notesPerBar: f.noteCount }
        : null,
      texture:        `n${f.noteCount}_d${f.dominantDuration}`,
      // Expose structural descriptor fields for YAML and graph
      structural:     f.structural,
    };
  });
}

/**
 * Detect sections using boundary splits + pattern family continuity.
 */
function detectSections(labeledBars, families, boundaries) {
  if (!labeledBars.length) return [];

  const boundaryIdxSet = new Set(boundaries.map(b => b.afterBarIdx));
  const sections = [];
  let current    = { bars: [], patternId: null };

  for (let i = 0; i < labeledBars.length; i++) {
    const lb = labeledBars[i];
    current.bars.push(lb);
    if (!current.patternId && lb.patternId !== 'EMPTY' && lb.patternId !== 'SURPRISE')
      current.patternId = lb.patternId;

    const isLast     = i === labeledBars.length - 1;
    const isBoundary = boundaryIdxSet.has(i);
    if (isBoundary || isLast) {
      if (current.bars.length > 0) sections.push({ ...current });
      current = { bars: [], patternId: null };
    }
  }

  // Assign letters using family continuity
  const familyLetterMap = new Map();
  let nextLetter = 0;

  return sections.map((sec, idx) => {
    const pid     = sec.patternId || 'MIXED';
    if (!familyLetterMap.has(pid))
      familyLetterMap.set(pid, String.fromCharCode(65 + nextLetter++));
    const letter   = familyLetterMap.get(pid);
    const prevSame = sections.slice(0, idx).filter(s => s.patternId === pid).length;
    const fullLabel = prevSame === 0 ? letter
                    : prevSame === 1 ? `${letter}'`
                    : prevSame === 2 ? `${letter}''`
                    : `${letter}(${prevSame + 1})`;
    const fam       = families.find(f => f.id === pid);
    const firstBar  = sec.bars[0]?.barNumber ?? 0;
    const lastBar   = sec.bars[sec.bars.length - 1]?.barNumber ?? 0;
    return {
      id:          `S${String(idx + 1).padStart(2,'0')}`,
      index:       idx,
      startBar:    firstBar,
      endBar:      lastBar,
      barCount:    sec.bars.length,
      patternId:   pid, pid,
      patternLabel: fam?.label ?? pid,
      letter, fullLabel,
      musicLabel:  letter,
      isRepeat:    prevSame > 0,
      bars:        sec.bars,
      color:       fam?.color ?? EMPTY_COLOR,
    };
  });
}

function buildGraph(labeledBars, families) {
  const nodeMap = new Map();
  for (const lb of labeledBars) {
    const id = lb.patternId;
    if (!nodeMap.has(id)) {
      const fam = families.find(f => f.id === id);
      nodeMap.set(id, {
        id, label: lb.patternLabel,
        type:  fam ? fam.type : (lb.isEmpty ? 'empty' : 'surprise'),
        count: 0, bars: [],
        color: fam ? fam.color : (lb.isEmpty ? EMPTY_COLOR : SURPRISE_COLOR),
      });
    }
    const node = nodeMap.get(id); node.count++; node.bars.push(lb.barNumber);
  }
  const edgeMap = new Map();
  for (let i = 0; i < labeledBars.length - 1; i++) {
    const from = labeledBars[i].patternId, to = labeledBars[i+1].patternId;
    if (from === to) continue;
    const key = `${from}|||${to}`;
    edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
  }
  const edges = [...edgeMap.entries()].map(([key, w]) => {
    const [from, to] = key.split('|||');
    return { from, to, weight: w };
  }).sort((a, b) => b.weight - a.weight);
  return { nodes: [...nodeMap.values()], edges };
}

function alignHands(rhLabeled, lhLabeled) {
  const allBns = new Set([...rhLabeled.map(b => b.barNumber), ...lhLabeled.map(b => b.barNumber)]);
  const rhMap  = new Map(rhLabeled.map(b => [b.barNumber, b]));
  const lhMap  = new Map(lhLabeled.map(b => [b.barNumber, b]));
  return [...allBns].sort((a, b) => a - b).map(bn => ({
    barNumber: bn,
    rh: rhMap.get(bn) || null,
    lh: lhMap.get(bn) || null,
    rhPattern: rhMap.get(bn)?.patternLabel || '-',
    lhPattern: lhMap.get(bn)?.patternLabel || '-',
  }));
}


// ═══════════════════════════════════════════════════════════════════
// YAML BLUEPRINT GENERATOR (v4)
// ═══════════════════════════════════════════════════════════════════

function generateYaml(analysis) {
  const { metadata, rightHand, leftHand } = analysis;
  const rh       = rightHand || {};
  const lh       = leftHand  || {};
  const fams     = rh.families  || [];
  const bounds   = rh.boundaries || [];
  const sections = rh.sections  || [];
  const labeled  = rh.labeled   || [];

  const surpriseBars = labeled.filter(b => b.isSurprise).map(b => b.barNumber).join(', ') || 'none';
  const boundaryBars = bounds.map(b => `${b.afterBarNumber}(${b.type})`).join(', ')          || 'none';
  const sectionOrder = sections.map(s => s.fullLabel).join(' → ')                            || 'N/A';
  const naturalSizes = (rh.windowSizes || []).join(', ')                                     || 'none';

  const famLines = fams.map(f => {
    const occLines = f.occurrences.map(o =>
      `      - bars: [${o.startBar}, ${o.endBar}]  variation: "${o.variationType || 'prototype'}"  cross_boundary: ${o.crossesBoundary || false}`
    ).join('\n');
    const struct = f.occurrences[0]?.descriptors?.[0];
    const structNote = struct
      ? `    structural_type: "${struct.textureType}"  melody_dir: "${struct.melodyDirection}"  step_type: "${struct.stepType}"`
      : '';
    return [
      `  ${f.label}:`,
      `    id: "${f.id}"`,
      `    window_size: ${f.windowSize}`,
      `    match_level: "${f.matchLevel}"`,
      `    occurrence_count: ${f.occurrenceCount}`,
      structNote,
      occLines,
    ].filter(Boolean).join('\n');
  }).join('\n\n') || '  # (no patterns detected)';

  const secLines = sections.map(s =>
    `  - id: "${s.id}"  bars: [${s.startBar}, ${s.endBar}]  label: "${s.fullLabel}"  pattern: "${s.patternId}"`
  ).join('\n') || '  # (no sections)';

  return `# ═══════════════════════════════════════════════════════
# MUSIC ANALYSIS BLUEPRINT v4.0
# Structural fingerprinting + inversion-aware family grouping
# ${metadata.bars.length} bars · ${metadata.time_signature} · ${metadata.tempo} BPM · Key: ${metadata.key}
# Natural window sizes: [${naturalSizes}]
# Boundaries: ${bounds.length}
# ═══════════════════════════════════════════════════════

composition:
  key: "${metadata.key}"
  tempo: ${metadata.tempo}
  time_signature: "${metadata.time_signature}"
  total_bars: ${metadata.bars.length}
  subdivisions_per_bar: ${metadata.subdivisions_per_bar}

structure:
  natural_window_sizes: [${naturalSizes}]
  boundary_count: ${bounds.length}
  boundary_bars: "${boundaryBars}"
  section_order: "${sectionOrder}"

pattern_families:
${famLines}

sections:
${secLines}

left_hand:
  pattern_count: ${(lh.families || []).length}
  section_count: ${(lh.sections || []).length}

generation_rules:
  - "Section order: ${sectionOrder}"
  - "Total distinct pattern families: ${fams.length}"
  - "Surprise bars: [${surpriseBars}]"
  - "Boundary bars: ${boundaryBars}"
  - "Discovered window sizes: [${naturalSizes}]"
`;
}


// ═══════════════════════════════════════════════════════════════════
// HAND ANALYZER — orchestrates phases 1–6 for one hand
// ═══════════════════════════════════════════════════════════════════

function analyzeHand(bars, spb, handName) {
  const nonEmpty = bars.filter(b => b.notes.length > 0);

  if (nonEmpty.length === 0) {
    const emptyLabeled = bars.map(b => ({
      barNumber: b.bar_number, notes: [], patternId: 'EMPTY', patternLabel: 'Empty',
      isEmpty: true, isSurprise: false, isBoundaryEnd: false, boundaryType: null,
      noteCount: 0, alternating: null, isSustain: false, color: EMPTY_COLOR,
      structural: computeStructuralDescriptor([], spb),
    }));
    return {
      features: [], simMatrix: [], families: [], boundaries: [],
      labeled: emptyLabeled, sections: [], windowSizes: [],
      graph: { nodes: [], edges: [] }, hand: handName,
    };
  }

  const features   = extractAllFeatures(bars, spb);            // Phase 1
  const simMatrix  = buildSimilarityMatrix(features);           // Phase 2
  const boundaries = detectBoundaries(features, simMatrix);     // Phase 3
  const { families, windowSizes } = detectPatternsV4(features, simMatrix, boundaries); // Phase 4
  classifyFamilyVariations(families);                           // Phase 5
  const labeled    = labelBars(features, families, boundaries); // Phase 6
  const sections   = detectSections(labeled, families, boundaries);
  const graph      = buildGraph(labeled, families);

  return {
    features, simMatrix, families, boundaries,
    labeled, sections, windowSizes, graph, hand: handName,
    // v2/v3 compat alias
    patterns: families.map(f => ({
      ...f,
      id:         f.id,
      label:      f.label,
      type:       f.matchLevel,
      windowSize: f.windowSize,
      occurrences: f.occurrences,
    })),
  };
}


// ═══════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
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
      rhPatterns:   rightHand.families.length,
      lhPatterns:   leftHand.families.length,
      rhSections:   rightHand.sections.length,
      lhSections:   leftHand.sections.length,
      boundaries:   rightHand.boundaries.length,
      windowSizes:  rightHand.windowSizes,
      surpriseBars: rightHand.labeled.filter(b => b.isSurprise).map(b => b.barNumber),
      splitMidi, rhHasNotes, lhHasNotes,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

const MusicAnalyzerEngine = {
  analyze, normalizeJson, normalizeNote, normalizeBar,
  separateHands, detectSplitPoint,
  extractAllFeatures, extractFeatureVector,
  computeStructuralDescriptor, detectAlternatingDeep, getMelodyTrend,
  buildSimilarityMatrix, computeSimilarity,
  detectBoundaries, computeNoveltyScores,
  detectPatternsV4, discoverNaturalWindowSizes, buildWindowFingerprints,
  classifyFamilyVariations, classifyVariationV4,
  labelBars, detectSections, buildGraph, alignHands,
  generateYaml, analyzeHand,
  pitchToMidi, midiToPitchName, pitchClass,
  jaccardBitmask, levenshteinSim, shannonEntropy,
  PATTERN_COLORS, EMPTY_COLOR, SURPRISE_COLOR, BOUNDARY_COLOR,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MusicAnalyzerEngine;
} else if (typeof globalThis !== 'undefined') {
  globalThis.MusicAnalyzerEngine = MusicAnalyzerEngine;
}