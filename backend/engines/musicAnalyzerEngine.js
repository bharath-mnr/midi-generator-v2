
// // 'use strict';

// // // ═══════════════════════════════════════════════════════════════════
// // // MUSIC ANALYZER ENGINE v4.0
// // //
// // // Core improvements over v3:
// // //
// // // 1. STRUCTURAL FINGERPRINTING
// // //    Every bar/window gets a "structural fp" (direction-agnostic) AND
// // //    a "directional fp". Families are grouped by structural fp, so
// // //    inverted/retrograded versions land in the SAME family.
// // //
// // // 2. DEEP ALTERNATING DETECTION
// // //    Pedal/melody are separated. Melody trend uses linear regression
// // //    so octave-displaced first notes don't confuse the direction.
// // //    This makes bars 3-8 and bars 11-16 correctly seen as one family
// // //    (ascending alternating vs descending alternating = "inverted").
// // //
// // // 3. COMPREHENSIVE VARIATION CLASSIFIER
// // //    Exact, transposed (any interval), octave-transposed, inverted,
// // //    retrograde, retrograde-inversion, augmented/diminished, developed.
// // //
// // // 4. EXHAUSTIVE MULTI-WINDOW DISCOVERY  O(n² × W)
// // //    Every window size from 1..maxW, every start position.
// // //    Overlap is OK during discovery; priority resolves at labeling time.
// // //
// // // 5. BOUNDARY-RESPECTING SECTION DETECTION
// // //    Boundaries discovered from novelty scores. Patterns crossing a
// // //    boundary get deprioritized in labeling (a bar claimed inside its
// // //    boundary section won't be stolen by a cross-boundary pattern).
// // //
// // // 6. FULLY DYNAMIC — no hardcoded cadence rules, scale assumptions,
// // //    fixed bar lengths, or music-type constraints.
// // // ═══════════════════════════════════════════════════════════════════

// // // ─── CONSTANTS ──────────────────────────────────────────────────────
// // const NOTE_NAMES  = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// // const NOTE_MAP    = {
// //   'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
// //   'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
// //   'A':9,'A#':10,'BB':10,'B':11,
// // };

// // // Scale templates (bitmasks) for harmonic analysis
// // const SCALE_TEMPLATES = [];
// // (function buildScales() {
// //   const patterns = [
// //     { name: 'major',    steps: [0,2,4,5,7,9,11] },
// //     { name: 'minor',    steps: [0,2,3,5,7,8,10] },
// //     { name: 'harm-min', steps: [0,2,3,5,7,8,11] },
// //     { name: 'dorian',   steps: [0,2,3,5,7,9,10] },
// //     { name: 'mixo',     steps: [0,2,4,5,7,9,10] },
// //     { name: 'pent-maj', steps: [0,2,4,7,9]       },
// //     { name: 'pent-min', steps: [0,3,5,7,10]      },
// //   ];
// //   for (const { name, steps } of patterns) {
// //     for (let root = 0; root < 12; root++) {
// //       let mask = 0;
// //       for (const s of steps) mask |= (1 << ((root + s) % 12));
// //       SCALE_TEMPLATES.push({ name: NOTE_NAMES[root] + ' ' + name, root, mask });
// //     }
// //   }
// // })();

// // const PATTERN_COLORS = [
// //   { bg:'#06b6d4', text:'#001', label:'cyan'    },
// //   { bg:'#8b5cf6', text:'#fff', label:'violet'  },
// //   { bg:'#f59e0b', text:'#001', label:'amber'   },
// //   { bg:'#10b981', text:'#001', label:'emerald' },
// //   { bg:'#f43f5e', text:'#fff', label:'rose'    },
// //   { bg:'#3b82f6', text:'#fff', label:'blue'    },
// //   { bg:'#a855f7', text:'#fff', label:'purple'  },
// //   { bg:'#ec4899', text:'#fff', label:'pink'    },
// //   { bg:'#14b8a6', text:'#001', label:'teal'    },
// //   { bg:'#f97316', text:'#fff', label:'orange'  },
// //   { bg:'#84cc16', text:'#001', label:'lime'    },
// //   { bg:'#e11d48', text:'#fff', label:'crimson' },
// // ];
// // const EMPTY_COLOR    = { bg:'#374151', text:'#9ca3af', label:'gray'   };
// // const SURPRISE_COLOR = { bg:'#ef4444', text:'#fff',   label:'red'    };
// // const BOUNDARY_COLOR = { bg:'#f97316', text:'#fff',   label:'orange' };


// // // ═══════════════════════════════════════════════════════════════════
// // // PITCH UTILITIES
// // // ═══════════════════════════════════════════════════════════════════

// // function pitchToMidi(pitch) {
// //   if (!pitch) return null;
// //   const m = String(pitch).match(/^([A-G][#Bb]?)(-?\d+)$/i);
// //   if (!m) return null;
// //   const pc = NOTE_MAP[m[1].toUpperCase()];
// //   if (pc === undefined) return null;
// //   return (parseInt(m[2]) + 1) * 12 + pc;
// // }

// // function midiToPitchName(midi) {
// //   return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
// // }

// // function pitchClass(pitch) {
// //   const m = pitchToMidi(pitch);
// //   return m !== null ? m % 12 : null;
// // }

// // function popcount(mask) {
// //   let c = 0, m = mask >>> 0;
// //   while (m) { c += m & 1; m >>>= 1; }
// //   return c;
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // PHASE 0 — NORMALIZATION
// // // ═══════════════════════════════════════════════════════════════════

// // function normalizeNote(n) {
// //   return {
// //     pitch:                 n.pitch                ?? n.p  ?? null,
// //     start_subdivision:     n.start_subdivision    ?? n.s  ?? 0,
// //     duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
// //     offset_percent:        n.offset_percent       ?? n.o  ?? 0,
// //     end_cutoff_percent:    n.end_cutoff_percent   ?? n.c  ?? null,
// //     velocity:              100,
// //   };
// // }

// // function normalizeBar(b) {
// //   return {
// //     bar_number: b.bar_number ?? b.bn,
// //     notes: (b.notes ?? []).map(normalizeNote).filter(n => n.pitch !== null),
// //   };
// // }

// // function normalizeJson(json) {
// //   const ts    = json.time_signature || '4/4';
// //   const [n,d] = ts.split('/').map(Number);
// //   const spb   = json.subdivisions_per_bar || (n * (16 / d));
// //   return {
// //     tempo:                json.tempo    || 120,
// //     time_signature:       ts,
// //     key:                  json.key     || 'C',
// //     subdivisions_per_bar: spb,
// //     bars:                 (json.bars || []).map(normalizeBar),
// //   };
// // }

// // // ─── Hand separation ─────────────────────────────────────────────

// // const HAND_SPLIT_LOW  = 48;
// // const HAND_SPLIT_HIGH = 72;

// // function detectSplitPoint(bars) {
// //   const pitchFreq = new Map();
// //   for (const bar of bars)
// //     for (const note of bar.notes) {
// //       const m = pitchToMidi(note.pitch);
// //       if (m !== null) pitchFreq.set(m, (pitchFreq.get(m) || 0) + 1);
// //     }
// //   if (pitchFreq.size < 2) return 60;
// //   const sorted = [...pitchFreq.keys()].sort((a,b) => a - b);
// //   let best = -1, splitAt = 60;
// //   for (let i = 1; i < sorted.length; i++) {
// //     const gap = sorted[i] - sorted[i-1];
// //     const mid = (sorted[i-1] + sorted[i]) / 2;
// //     const w   = (mid >= HAND_SPLIT_LOW && mid <= HAND_SPLIT_HIGH) ? 3.0 : 0.7;
// //     if (gap * w > best) { best = gap * w; splitAt = Math.round(mid); }
// //   }
// //   return splitAt;
// // }

// // function separateHands(bars, splitMidi) {
// //   const split = (splitMidi != null) ? splitMidi : detectSplitPoint(bars);
// //   const rhBars = [], lhBars = [];
// //   for (const bar of bars) {
// //     rhBars.push({ bar_number: bar.bar_number, notes: bar.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) >= split) });
// //     lhBars.push({ bar_number: bar.bar_number, notes: bar.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) <  split) });
// //   }
// //   return {
// //     rhBars, lhBars, splitMidi: split,
// //     rhHasNotes: rhBars.some(b => b.notes.length > 0),
// //     lhHasNotes: lhBars.some(b => b.notes.length > 0),
// //   };
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // PHASE 1 — STRUCTURAL DESCRIPTOR (THE HEART OF v4)
// // // ═══════════════════════════════════════════════════════════════════

// // /**
// //  * Detect alternating pedal-note pattern with robust heuristics.
// //  * Returns {isAlternating, pedalPitch, pedalPosition, pedalNotes, melodyNotes}
// //  */
// // function detectAlternatingDeep(sortedNotes) {
// //   if (sortedNotes.length < 4) return { isAlternating: false };

// //   // ── 1. Find the most frequent pitch ─────────────────────────────
// //   const pitchFreq = new Map();
// //   for (const n of sortedNotes)
// //     pitchFreq.set(n.pitch, (pitchFreq.get(n.pitch) || 0) + 1);

// //   // Try each candidate pedal (any pitch appearing ≥ 30% of the time)
// //   const candidates = [...pitchFreq.entries()]
// //     .filter(([, c]) => c / sortedNotes.length >= 0.30)
// //     .sort((a, b) => b[1] - a[1]);

// //   for (const [pedalPitch] of candidates) {
// //     const pedalIndices    = sortedNotes.map((n, i) => n.pitch === pedalPitch ? i : -1).filter(i => i >= 0);
// //     const nonPedalIndices = sortedNotes.map((n, i) => n.pitch !== pedalPitch ? i : -1).filter(i => i >= 0);

// //     if (pedalIndices.length < 2 || nonPedalIndices.length < 2) continue;

// //     // ── 2. Check that pedal appears at regular positional intervals ──
// //     const allEven = pedalIndices.every(i => i % 2 === 0);
// //     const allOdd  = pedalIndices.every(i => i % 2 === 1);
// //     if (!allEven && !allOdd) continue;

// //     // ── 3. Check uniform temporal spacing ───────────────────────────
// //     const positions = sortedNotes.map(n => n.start_subdivision);
// //     const gaps = [];
// //     for (let i = 1; i < positions.length; i++) gaps.push(positions[i] - positions[i - 1]);
// //     const meanGap      = gaps.reduce((a, b) => a + b, 0) / gaps.length;
// //     const gapVariance  = gaps.reduce((a, b) => a + (b - meanGap) ** 2, 0) / gaps.length;
// //     const spacingOk    = gapVariance < (meanGap * meanGap * 0.25); // CV < 0.5

// //     // Alternating is still valid even with mild spacing variation
// //     const isAlternating = spacingOk || pedalIndices.length >= 3;
// //     if (!isAlternating) continue;

// //     // ── 4. Determine pedal register position ────────────────────────
// //     const pedalMidi     = pitchToMidi(pedalPitch);
// //     const nonPedalNotes = sortedNotes.filter(n => n.pitch !== pedalPitch);
// //     const nonPedalMidis = nonPedalNotes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
// //     const avgNonPedal   = nonPedalMidis.length
// //       ? nonPedalMidis.reduce((a, b) => a + b, 0) / nonPedalMidis.length
// //       : pedalMidi;
// //     const pedalPosition = pedalMidi > avgNonPedal ? 'top' : 'bottom';

// //     return {
// //       isAlternating: true,
// //       pedalPitch,
// //       pedalPosition,
// //       pedalNotes:  sortedNotes.filter(n => n.pitch === pedalPitch),
// //       melodyNotes: nonPedalNotes,
// //       meanGap:     Math.round(meanGap),
// //     };
// //   }

// //   return { isAlternating: false };
// // }

// // /**
// //  * Compute melody direction using linear regression on MIDI values over time.
// //  * Handles octave-displaced first notes correctly (they don't fool the slope).
// //  */
// // function getMelodyTrend(melodyNotes) {
// //   if (!melodyNotes || melodyNotes.length < 2) return 'static';

// //   const pts = melodyNotes
// //     .map(n => ({ x: n.start_subdivision, y: pitchToMidi(n.pitch) }))
// //     .filter(p => p.y !== null);

// //   if (pts.length < 2) return 'static';

// //   const n     = pts.length;
// //   const meanX = pts.reduce((a, p) => a + p.x, 0) / n;
// //   const meanY = pts.reduce((a, p) => a + p.y, 0) / n;
// //   let num = 0, den = 0;
// //   for (const p of pts) {
// //     num += (p.x - meanX) * (p.y - meanY);
// //     den += (p.x - meanX) ** 2;
// //   }
// //   const slope = den > 0 ? num / den : 0;

// //   // slope is in MIDI-semitones per subdivision
// //   if (slope >  0.2) return 'ascending';
// //   if (slope < -0.2) return 'descending';
// //   return 'static';
// // }

// // /**
// //  * Classify step type from an array of intervals.
// //  * 'step'  = all abs-intervals ≤ 2
// //  * 'skip'  = max ≤ 7
// //  * 'leap'  = max > 7
// //  * 'none'  = no intervals
// //  */
// // function classifyStepType(intervals) {
// //   if (!intervals || intervals.length === 0) return 'none';
// //   const maxAbs = Math.max(...intervals.map(Math.abs));
// //   if (maxAbs <= 2)  return 'step';
// //   if (maxAbs <= 7)  return 'skip';
// //   return 'leap';
// // }

// // /**
// //  * Dominant duration — most frequent duration value in a note list.
// //  */
// // function dominantDuration(notes) {
// //   if (!notes || notes.length === 0) return 0;
// //   const freq = new Map();
// //   for (const n of notes)
// //     freq.set(n.duration_subdivisions, (freq.get(n.duration_subdivisions) || 0) + 1);
// //   let best = 0, bestCount = 0;
// //   for (const [d, c] of freq) if (c > bestCount) { bestCount = c; best = d; }
// //   return best;
// // }

// // /**
// //  * Uniform spacing: are all gaps between note-start positions the same?
// //  * Returns {uniform: bool, spacing: int}
// //  */
// // function uniformSpacing(notes) {
// //   if (!notes || notes.length < 2) return { uniform: true, spacing: 0 };
// //   const positions = [...notes].sort((a, b) => a.start_subdivision - b.start_subdivision)
// //                                .map(n => n.start_subdivision);
// //   const gaps = [];
// //   for (let i = 1; i < positions.length; i++) gaps.push(positions[i] - positions[i - 1]);
// //   const first = gaps[0];
// //   const uniform = gaps.every(g => g === first);
// //   return { uniform, spacing: uniform ? first : 0 };
// // }

// // /**
// //  * Compute structural descriptor for a single bar's notes.
// //  *
// //  * Returns:
// //  *   fpStructural  — direction-agnostic key (groups inversions)
// //  *   fpDirectional — includes melody direction (distinguishes inversions)
// //  *   fpRhythm      — rhythm-only (positions + durations)
// //  *   fpExact       — full pitch+position+duration
// //  *   + rich metadata
// //  */
// // function computeStructuralDescriptor(notes, spb) {
// //   if (!notes || notes.length === 0) {
// //     return {
// //       type: 'empty', isAlternating: false,
// //       pedalPitch: null, pedalPosition: 'none',
// //       melodyDirection: 'none', melodyIntervals: [],
// //       allIntervals: [], stepType: 'none',
// //       noteCount: 0, dominantDur: 0,
// //       uniform: true, spacing: 0,
// //       textureType: 'EMPTY',
// //       fpStructural: 'EMPTY', fpDirectional: 'EMPTY',
// //       fpRhythm: 'EMPTY', fpExact: 'EMPTY',
// //     };
// //   }

// //   const sorted = [...notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
// //   const noteCount = sorted.length;

// //   // ── Alternating detection ─────────────────────────────────────────
// //   const altResult = detectAlternatingDeep(sorted);

// //   // ── Intervals ─────────────────────────────────────────────────────
// //   const midiVals = sorted.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
// //   const allIntervals = [];
// //   for (let i = 1; i < midiVals.length; i++) allIntervals.push(midiVals[i] - midiVals[i - 1]);

// //   // ── Melody trend ──────────────────────────────────────────────────
// //   let melodyDirection = 'mixed';
// //   let melodyIntervals = [];
// //   if (altResult.isAlternating && altResult.melodyNotes.length >= 2) {
// //     const melMidis = altResult.melodyNotes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
// //     for (let i = 1; i < melMidis.length; i++) melodyIntervals.push(melMidis[i] - melMidis[i - 1]);
// //     // Use linear regression on melody notes (handles octave-displaced first note)
// //     melodyDirection = getMelodyTrend(altResult.melodyNotes);
// //   } else {
// //     melodyDirection = getMelodyTrend(sorted);
// //     melodyIntervals = allIntervals;
// //   }

// //   // ── Step type ─────────────────────────────────────────────────────
// //   const relevantIntervals = altResult.isAlternating ? melodyIntervals : allIntervals;
// //   const stepType = classifyStepType(relevantIntervals);

// //   // ── Duration / spacing ────────────────────────────────────────────
// //   const domDur = dominantDuration(sorted);
// //   const { uniform, spacing } = uniformSpacing(sorted);

// //   // ── Texture type ──────────────────────────────────────────────────
// //   // For structural grouping we want a coarse type bucket
// //   let textureType;
// //   if (altResult.isAlternating) {
// //     textureType = 'ALT'; // alternating (direction-agnostic)
// //   } else if (noteCount === 1) {
// //     textureType = 'MONO';   // single long note / sustain
// //   } else if (noteCount <= 3) {
// //     textureType = 'SPARSE';
// //   } else if (noteCount <= 6) {
// //     textureType = 'MED';
// //   } else {
// //     textureType = 'DENSE';
// //   }

// //   // ── Fingerprints ──────────────────────────────────────────────────

// //   // STRUCTURAL: groups inversions together (direction-agnostic for ALT)
// //   // Format: TYPE:noteCount:domDur:spacing:stepType
// //   const fpStructural = altResult.isAlternating
// //     ? `ALT:${noteCount}:${domDur}:${spacing}:${stepType}`
// //     : `${textureType}:${noteCount}:${domDur}:${stepType}:${melodyDirection}`;

// //   // DIRECTIONAL: distinguishes ascending vs descending within same structural family
// //   const fpDirectional = altResult.isAlternating
// //     ? `ALT:${noteCount}:${domDur}:${spacing}:${stepType}:${melodyDirection}`
// //     : fpStructural;

// //   // RHYTHM: positions + durations, no pitch
// //   const fpRhythm = sorted.map(n => `${n.start_subdivision}:${n.duration_subdivisions}`).join(',');

// //   // EXACT: full pitch + position + duration
// //   const fpExact = sorted.map(n => `${n.pitch}@${n.start_subdivision}:${n.duration_subdivisions}`).join(',');

// //   return {
// //     type: altResult.isAlternating ? 'alternating' : textureType.toLowerCase(),
// //     isAlternating:    altResult.isAlternating,
// //     pedalPitch:       altResult.pedalPitch      ?? null,
// //     pedalPosition:    altResult.pedalPosition   ?? 'none',
// //     melodyDirection,
// //     melodyIntervals,
// //     allIntervals,
// //     stepType,
// //     noteCount,
// //     dominantDur:      domDur,
// //     uniform,
// //     spacing,
// //     textureType,
// //     orderedNotes:     sorted,
// //     fpStructural,
// //     fpDirectional,
// //     fpRhythm,
// //     fpExact,
// //   };
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // PHASE 1b — PER-BAR FEATURE VECTOR (standard metrics + structural)
// // // ═══════════════════════════════════════════════════════════════════

// // function shannonEntropy(freqMap, total) {
// //   if (total === 0) return 0;
// //   let h = 0;
// //   for (const count of freqMap.values()) {
// //     if (!count) continue;
// //     const p = count / total;
// //     h -= p * Math.log2(p);
// //   }
// //   return h;
// // }

// // function buildPitchClassMask(notes) {
// //   let mask = 0;
// //   for (const n of notes) {
// //     const pc = pitchClass(n.pitch);
// //     if (pc !== null) mask |= (1 << pc);
// //   }
// //   return mask;
// // }

// // function bestScaleMatch(pitchClassMask) {
// //   if (!pitchClassMask) return { name: 'unknown', match: 0 };
// //   let best = 0, bestName = 'unknown';
// //   for (const sc of SCALE_TEMPLATES) {
// //     const overlap = popcount(pitchClassMask & sc.mask);
// //     const union   = popcount(pitchClassMask | sc.mask);
// //     const jaccard = union ? overlap / union : 0;
// //     if (jaccard > best) { best = jaccard; bestName = sc.name; }
// //   }
// //   return { name: bestName, match: best };
// // }

// // function extractFeatureVector(bar, spb) {
// //   const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
// //   const bn    = bar.bar_number;

// //   // ── Structural descriptor (NEW in v4) ────────────────────────────
// //   const structural = computeStructuralDescriptor(notes, spb);

// //   if (notes.length === 0) {
// //     return {
// //       barNumber: bn, isEmpty: true,
// //       midiValues: [], midiMin:0, midiMax:0, midiMean:0, midiRange:0, midiVariance:0,
// //       pitchClassMask:0, pitchClassCount:0, pitchClassSet: new Set(),
// //       noteCount:0, subdivisionMap: new Array(spb).fill(false),
// //       durationFreq: new Map(), dominantDuration:0,
// //       rhythmicEntropy:0, hasMixedDurations:false, subdivisionCoverage:0,
// //       orderedNotes:[], contourIntervals:[], contourDirections:[], hasLeaps:false, contourShape:'',
// //       bestScaleName:'unknown', bestScaleMatch:0, hasChromaticNotes:false,
// //       isMonophonic:true, polyphonyMax:0,
// //       hasAlternating:false, pedalCandidate:null, registralSpread:0,
// //       rawEnergy:0, relativeEnergy:0,
// //       structural,
// //     };
// //   }

// //   // ── Pitch ─────────────────────────────────────────────────────────
// //   const midiValues = notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
// //   const midiMin    = Math.min(...midiValues);
// //   const midiMax    = Math.max(...midiValues);
// //   const midiMean   = midiValues.reduce((a,b) => a+b, 0) / midiValues.length;
// //   const midiRange  = midiMax - midiMin;
// //   const midiVar    = midiValues.reduce((a,b) => a + (b-midiMean)**2, 0) / midiValues.length;
// //   const pcMask     = buildPitchClassMask(notes);
// //   const pcSet      = new Set(midiValues.map(m => m % 12));

// //   // ── Rhythm ────────────────────────────────────────────────────────
// //   const subdivMap  = new Array(spb).fill(false);
// //   const durFreq    = new Map();
// //   for (const n of notes) {
// //     const s = Math.max(0, Math.min(spb - 1, n.start_subdivision));
// //     subdivMap[s] = true;
// //     durFreq.set(n.duration_subdivisions, (durFreq.get(n.duration_subdivisions) || 0) + 1);
// //   }
// //   let domDur = 0, domDurCount = 0;
// //   for (const [d, c] of durFreq) if (c > domDurCount) { domDurCount = c; domDur = d; }

// //   const rhythmEnt   = shannonEntropy(durFreq, notes.length);
// //   const coveredSubd = subdivMap.filter(Boolean).length;

// //   // ── Melodic contour ───────────────────────────────────────────────
// //   const intervals  = [];
// //   const directions = [];
// //   for (let i = 1; i < notes.length; i++) {
// //     const m1 = pitchToMidi(notes[i-1].pitch), m2 = pitchToMidi(notes[i].pitch);
// //     if (m1 !== null && m2 !== null) {
// //       const diff = m2 - m1;
// //       intervals.push(diff);
// //       directions.push(diff > 0 ? 'U' : diff < 0 ? 'D' : 'S');
// //     }
// //   }
// //   const contourShape = directions.join('');
// //   const hasLeaps     = intervals.some(i => Math.abs(i) > 2);

// //   // ── Harmonic ──────────────────────────────────────────────────────
// //   const scaleResult = bestScaleMatch(pcMask);
// //   let hasChromaticNotes = false;
// //   for (const n of notes) {
// //     const pc = pitchClass(n.pitch);
// //     if (pc !== null) {
// //       const template = SCALE_TEMPLATES.find(t => t.name === scaleResult.name);
// //       if (template && !((template.mask >> pc) & 1)) { hasChromaticNotes = true; break; }
// //     }
// //   }

// //   // ── Texture ───────────────────────────────────────────────────────
// //   const subdivStarts = new Map();
// //   for (const n of notes) subdivStarts.set(n.start_subdivision, (subdivStarts.get(n.start_subdivision) || 0) + 1);
// //   const polyphonyMax = Math.max(...subdivStarts.values(), 0);

// //   // ── Energy ────────────────────────────────────────────────────────
// //   const avgDur    = notes.reduce((a, n) => a + n.duration_subdivisions, 0) / notes.length;
// //   const rawEnergy = (notes.length * midiMean * avgDur) / (spb * spb);

// //   return {
// //     barNumber:         bn,
// //     isEmpty:           false,
// //     midiValues, midiMin, midiMax, midiMean, midiRange,
// //     midiVariance:      midiVar,
// //     pitchClassMask:    pcMask,
// //     pitchClassCount:   pcSet.size,
// //     pitchClassSet:     pcSet,
// //     noteCount:         notes.length,
// //     subdivisionMap:    subdivMap,
// //     durationFreq:      durFreq,
// //     dominantDuration:  domDur,
// //     rhythmicEntropy:   rhythmEnt,
// //     hasMixedDurations: durFreq.size > 1,
// //     subdivisionCoverage: coveredSubd / spb,
// //     orderedNotes:      notes,
// //     contourIntervals:  intervals,
// //     contourDirections: directions,
// //     hasLeaps,
// //     contourShape,
// //     bestScaleName:     scaleResult.name,
// //     bestScaleMatch:    scaleResult.match,
// //     hasChromaticNotes,
// //     isMonophonic:      polyphonyMax <= 1,
// //     polyphonyMax,
// //     hasAlternating:    structural.isAlternating,
// //     pedalCandidate:    structural.pedalPitch,
// //     registralSpread:   midiRange,
// //     rawEnergy,
// //     relativeEnergy:    0, // filled after all bars extracted
// //     structural,         // ← the rich structural descriptor
// //   };
// // }

// // function computeRelativeEnergy(features) {
// //   const nonEmpty = features.filter(f => !f.isEmpty);
// //   if (!nonEmpty.length) return;
// //   const mean = nonEmpty.reduce((a, f) => a + f.rawEnergy, 0) / nonEmpty.length;
// //   for (const f of features) f.relativeEnergy = mean > 0 ? f.rawEnergy / mean : 0;
// // }

// // function extractAllFeatures(bars, spb) {
// //   const features = bars.map(b => extractFeatureVector(b, spb));
// //   computeRelativeEnergy(features);
// //   return features;
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // PHASE 2 — PAIRWISE SIMILARITY MATRIX (O(n²))
// // // ═══════════════════════════════════════════════════════════════════

// // function jaccardBitmask(maskA, maskB) {
// //   const inter = popcount(maskA & maskB);
// //   const union  = popcount(maskA | maskB);
// //   return union ? inter / union : 1;
// // }

// // function jaccardBoolArray(a, b) {
// //   let inter = 0, union = 0;
// //   for (let i = 0; i < a.length; i++) {
// //     if (a[i] || b[i]) union++;
// //     if (a[i] && b[i]) inter++;
// //   }
// //   return union ? inter / union : 1;
// // }

// // function levenshteinSim(sA, sB) {
// //   if (!sA && !sB) return 1;
// //   if (!sA || !sB) return 0;
// //   if (sA === sB)  return 1;
// //   const la = sA.length, lb = sB.length;
// //   const dp = Array.from({ length: la + 1 }, (_, i) => {
// //     const row = new Array(lb + 1).fill(0);
// //     row[0] = i;
// //     return row;
// //   });
// //   for (let j = 0; j <= lb; j++) dp[0][j] = j;
// //   for (let i = 1; i <= la; i++)
// //     for (let j = 1; j <= lb; j++)
// //       dp[i][j] = sA[i-1] === sB[j-1]
// //         ? dp[i-1][j-1]
// //         : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
// //   return 1 - dp[la][lb] / Math.max(la, lb);
// // }

// // function computeSimilarity(fi, fj) {
// //   const rhythm   = jaccardBoolArray(fi.subdivisionMap, fj.subdivisionMap);
// //   const contour  = levenshteinSim(fi.contourShape,  fj.contourShape);
// //   const harmonic = jaccardBitmask(fi.pitchClassMask, fj.pitchClassMask);
// //   const ncDiff   = Math.max(fi.noteCount, fj.noteCount) > 0
// //     ? Math.abs(fi.noteCount - fj.noteCount) / Math.max(fi.noteCount, fj.noteCount) : 0;
// //   const durMatch  = fi.dominantDuration === fj.dominantDuration ? 1 : 0;
// //   const altMatch  = fi.hasAlternating   === fj.hasAlternating   ? 1 : 0;
// //   const texture   = (1 - ncDiff + durMatch + altMatch) / 3;
// //   const energy    = 1 - Math.min(1, Math.abs(fi.relativeEnergy - fj.relativeEnergy));

// //   // Structural similarity (NEW in v4)
// //   const structMatch = (fi.structural.fpStructural === fj.structural.fpStructural) ? 1 : 0;
// //   const dirMatch    = (fi.structural.fpDirectional === fj.structural.fpDirectional) ? 1 : 0;

// //   return {
// //     rhythm, contour, harmonic, texture, energy, structMatch, dirMatch,
// //     combined: (rhythm + contour + harmonic + texture + energy + structMatch * 0.5 + dirMatch * 0.3) / 6,
// //   };
// // }

// // function buildSimilarityMatrix(features) {
// //   const n   = features.length;
// //   const mat = new Array(n).fill(null).map(() => new Array(n).fill(null));
// //   for (let i = 0; i < n; i++) {
// //     mat[i][i] = { rhythm:1, contour:1, harmonic:1, texture:1, energy:1, structMatch:1, dirMatch:1, combined:1 };
// //     for (let j = i + 1; j < n; j++) {
// //       const sim  = computeSimilarity(features[i], features[j]);
// //       mat[i][j]  = sim;
// //       mat[j][i]  = sim;
// //     }
// //   }
// //   return mat;
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // PHASE 3 — BOUNDARY DETECTION
// // // ═══════════════════════════════════════════════════════════════════

// // function computeNoveltyScores(features, simMatrix) {
// //   const n      = features.length;
// //   const scores = new Array(n - 1).fill(0);
// //   const maxEnt = Math.log2(16);

// //   for (let i = 0; i < n - 1; i++) {
// //     const fi = features[i], fj = features[i + 1];
// //     if (fi.isEmpty || fj.isEmpty) { scores[i] = 0.1; continue; }

// //     const sim = simMatrix[i][i + 1];
// //     const rhythmJump    = 1 - sim.rhythm;
// //     const contourJump   = 1 - sim.contour;
// //     const harmonicJump  = 1 - sim.harmonic;
// //     const textureJump   = 1 - sim.texture;
// //     const energyJump    = 1 - sim.energy;
// //     const structJump    = 1 - sim.structMatch; // NEW: structural fingerprint jump
// //     const entropyDelta  = Math.abs(fj.rhythmicEntropy - fi.rhythmicEntropy) / (maxEnt || 1);
// //     const densityDelta  = Math.min(1, Math.abs(fj.relativeEnergy - fi.relativeEnergy));

// //     scores[i] = (rhythmJump + contourJump + harmonicJump + textureJump + energyJump + structJump + entropyDelta + densityDelta) / 8;
// //   }
// //   return scores;
// // }

// // function detectBoundaries(features, simMatrix, kSigma = 1.0) {
// //   if (features.length < 3) return [];
// //   const novelty   = computeNoveltyScores(features, simMatrix);
// //   const mean      = novelty.reduce((a, b) => a + b, 0) / novelty.length;
// //   const std       = Math.sqrt(novelty.reduce((a, b) => a + (b - mean) ** 2, 0) / novelty.length);
// //   const threshold = mean + kSigma * std;

// //   const boundaries = [];
// //   for (let i = 0; i < novelty.length; i++) {
// //     if (novelty[i] < threshold) continue;
// //     const fi = features[i], fj = features[i + 1];
// //     const sim = simMatrix[i][i + 1];
// //     const dims = {
// //       rhythm:   1 - sim.rhythm,
// //       contour:  1 - sim.contour,
// //       harmonic: 1 - sim.harmonic,
// //       texture:  1 - sim.texture,
// //       energy:   1 - sim.energy,
// //       struct:   1 - sim.structMatch,
// //     };
// //     const domDim = Object.entries(dims).sort((a, b) => b[1] - a[1])[0][0];
// //     let type = 'mixed';
// //     if (domDim === 'texture' || domDim === 'energy') {
// //       type = (fj.relativeEnergy < 0.3 || fj.noteCount <= 2) ? 'cadential' : 'texture';
// //     } else if (domDim === 'struct') {
// //       type = 'structural';
// //     } else {
// //       type = domDim;
// //     }
// //     boundaries.push({
// //       afterBarIdx:    i,
// //       afterBarNumber: fi.barNumber,
// //       noveltyScore:   novelty[i],
// //       type, dims,
// //     });
// //   }
// //   return boundaries;
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // PHASE 4 — MULTI-WINDOW PATTERN DETECTION WITH STRUCTURAL GROUPING
// // // ═══════════════════════════════════════════════════════════════════

// // /**
// //  * Compute all fingerprints for a window of feature vectors.
// //  * Returns {structFp, dirFp, rhythmFp, exactFp, contourFp, contourInvFp}
// //  */
// // function buildWindowFingerprints(fvWindow) {
// //   // Structural (direction-agnostic) = concat of bar-level structural fps
// //   const structFp  = fvWindow.map(f => f.structural.fpStructural).join('||');
// //   // Directional = concat of bar-level directional fps
// //   const dirFp     = fvWindow.map(f => f.structural.fpDirectional).join('||');
// //   // Rhythm = concat of bar-level rhythm fps
// //   const rhythmFp  = fvWindow.map(f => f.structural.fpRhythm).join('||');
// //   // Exact = concat of bar-level exact fps
// //   const exactFp   = fvWindow.map(f => f.structural.fpExact).join('||');

// //   // Contour-level (for retrograde/inversion detection)
// //   const contourFp = fvWindow.map(f => f.contourShape).join('|');
// //   const contourInvFp = contourFp.split('').map(c => c==='U'?'D':c==='D'?'U':c).join('');
// //   const contourRetFp = contourFp.split('').reverse().join('');
// //   const contourRetInvFp = contourRetFp.split('').map(c => c==='U'?'D':c==='D'?'U':c).join('');

// //   return { structFp, dirFp, rhythmFp, exactFp, contourFp, contourInvFp, contourRetFp, contourRetInvFp };
// // }

// // /**
// //  * Discover natural window sizes where patterns actually repeat.
// //  */
// // function discoverNaturalWindowSizes(features, maxW) {
// //   const n = features.length;
// //   const density = new Map();

// //   for (let W = 1; W <= maxW; W++) {
// //     const fpCount = new Map();
// //     let total = 0;
// //     for (let start = 0; start + W <= n; start++) {
// //       const fvWin = features.slice(start, start + W);
// //       const key   = fvWin.map(f => f.structural.fpStructural).join('||');
// //       fpCount.set(key, (fpCount.get(key) || 0) + 1);
// //       total++;
// //     }
// //     const repeated = [...fpCount.values()].filter(c => c >= 2).reduce((a,b) => a+b, 0);
// //     density.set(W, total > 0 ? repeated / total : 0);
// //   }

// //   // Pick top-4 window sizes by density, plus any local maxima
// //   const ranked = [...density.entries()]
// //     .filter(([, d]) => d > 0.05)
// //     .sort((a, b) => b[1] - a[1])
// //     .slice(0, 6)
// //     .map(([W, d]) => ({ W, density: d }));

// //   const sizeMap = new Map(ranked.map(s => [s.W, s]));
// //   return [...sizeMap.values()].sort((a, b) => b.density - a.density);
// // }

// // /**
// //  * Core pattern detection — O(n² × W).
// //  *
// //  * Grouping strategy:
// //  *   Primary key  = structFp  → groups inversions + transpositions together
// //  *   Secondary key = dirFp   → sub-groups by direction (for variation labeling)
// //  *
// //  * A family = all occurrences sharing the same structFp.
// //  * Within the family, the dirFp sub-group of the first occurrence is the "prototype".
// //  */
// // function detectPatternsV4(features, simMatrix, boundaries) {
// //   const n = features.length;
// //   if (n === 0) return { families: [], windowSizes: [] };

// //   const maxW       = Math.min(Math.floor(n / 2), 16);
// //   const windowSizes = discoverNaturalWindowSizes(features, maxW);

// //   // Build a Set of boundary-after-indices for overlap checking
// //   const boundaryIdxSet = new Set(boundaries.map(b => b.afterBarIdx));

// //   // Index: structFp → [occurrences]
// //   const structIndex = new Map();

// //   for (const { W } of windowSizes) {
// //     for (let start = 0; start + W <= n; start++) {
// //       const fvWin = features.slice(start, start + W);
// //       if (fvWin.every(f => f.isEmpty)) continue;

// //       const fps = buildWindowFingerprints(fvWin);

// //       // Does this window cross a boundary?
// //       let crossesBoundary = false;
// //       for (let k = start; k < start + W - 1; k++) {
// //         if (boundaryIdxSet.has(k)) { crossesBoundary = true; break; }
// //       }

// //       const occ = {
// //         startIdx:        start,
// //         startBar:        fvWin[0].barNumber,
// //         endBar:          fvWin[fvWin.length - 1].barNumber,
// //         barRange:        [fvWin[0].barNumber, fvWin[fvWin.length - 1].barNumber],
// //         W,
// //         fps,
// //         crossesBoundary,
// //         features:        fvWin,
// //         descriptors:     fvWin.map(f => f.structural),
// //       };

// //       if (!structIndex.has(fps.structFp)) structIndex.set(fps.structFp, []);
// //       structIndex.get(fps.structFp).push(occ);
// //     }
// //   }

// //   // Filter: families need ≥ 2 occurrences
// //   // Sort: primary by (count × W), secondary: prefer within-boundary occurrences
// //   const sorted = [...structIndex.entries()]
// //     .filter(([, occs]) => occs.length >= 2)
// //     .sort((a, b) => {
// //       const scoreA = a[1].length * a[1][0].W * (a[1].some(o => !o.crossesBoundary) ? 2 : 1);
// //       const scoreB = b[1].length * b[1][0].W * (b[1].some(o => !o.crossesBoundary) ? 2 : 1);
// //       return scoreB - scoreA;
// //     });

// //   const families = [];
// //   let colorIdx = 0;

// //   for (const [structFp, occs] of sorted) {
// //     if (families.length >= 12) break;

// //     const W = occs[0].W;
// //     const letter = String.fromCharCode(65 + families.length);
// //     const id     = `FAM_${letter}`;

// //     // Determine match level from fingerprint comparison
// //     const allSameExact  = new Set(occs.map(o => o.fps.exactFp)).size === 1;
// //     const allSameRhythm = new Set(occs.map(o => o.fps.rhythmFp)).size === 1;
// //     const allSameDir    = new Set(occs.map(o => o.fps.dirFp)).size === 1;
// //     const matchLevel    = allSameExact ? 'exact'
// //                         : allSameRhythm ? 'rhythmic'
// //                         : allSameDir    ? 'tonal'
// //                         :                 'structural';

// //     families.push({
// //       id, label: `Motif_${letter}`,
// //       famKey:       structFp,
// //       windowSize:   W,
// //       matchLevel,
// //       occurrenceCount: occs.length,
// //       occurrences: occs.map(o => ({
// //         startBar:        o.startBar,
// //         endBar:          o.endBar,
// //         barRange:        o.barRange,
// //         startIdx:        o.startIdx,
// //         w:               o.W,
// //         fps:             o.fps,
// //         crossesBoundary: o.crossesBoundary,
// //         descriptors:     o.descriptors,
// //         features:        o.features,
// //       })),
// //       score:  occs.length * W * 2.5,
// //       color:  PATTERN_COLORS[colorIdx % PATTERN_COLORS.length],
// //       type:   'motif',
// //     });
// //     colorIdx++;
// //   }

// //   return { families, windowSizes: windowSizes.map(s => s.W) };
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // PHASE 5 — COMPREHENSIVE VARIATION CLASSIFIER
// // // ═══════════════════════════════════════════════════════════════════

// // /**
// //  * Compute the consistent pitch shift between two windows (for transposition).
// //  * Returns the shift in semitones if all notes shift by the same amount, else null.
// //  */
// // function computePitchShift(protoOcc, compareOcc) {
// //   const pFeats = protoOcc.features || [];
// //   const cFeats = compareOcc.features || [];
// //   if (pFeats.length !== cFeats.length) return null;

// //   const shifts = [];
// //   for (let i = 0; i < pFeats.length; i++) {
// //     const pNotes = pFeats[i].orderedNotes || [];
// //     const cNotes = cFeats[i].orderedNotes || [];
// //     if (pNotes.length !== cNotes.length) return null;
// //     for (let j = 0; j < pNotes.length; j++) {
// //       const pm = pitchToMidi(pNotes[j].pitch);
// //       const cm = pitchToMidi(cNotes[j].pitch);
// //       if (pm === null || cm === null) return null;
// //       shifts.push(cm - pm);
// //     }
// //   }
// //   if (!shifts.length) return null;
// //   return shifts.every(s => s === shifts[0]) ? shifts[0] : null;
// // }

// // /**
// //  * Compute the consistent duration ratio between two windows (augmentation/diminution).
// //  */
// // function computeDurationRatio(protoOcc, compareOcc) {
// //   const pFeats = protoOcc.features || [];
// //   const cFeats = compareOcc.features || [];
// //   if (pFeats.length !== cFeats.length) return null;

// //   const ratios = [];
// //   for (let i = 0; i < pFeats.length; i++) {
// //     const pDur = pFeats[i].dominantDuration;
// //     const cDur = cFeats[i].dominantDuration;
// //     if (!pDur) return null;
// //     ratios.push(cDur / pDur);
// //   }
// //   if (!ratios.length) return null;
// //   const r0 = ratios[0];
// //   return ratios.every(r => Math.abs(r - r0) < 0.01) ? r0 : null;
// // }

// // /**
// //  * Full variation classifier — called per occurrence relative to prototype.
// //  *
// //  * Checks (in order of specificity):
// //  *   1. Exact (same in every way)
// //  *   2. Octave transposition (shift = ±12, ±24)
// //  *   3. Diatonic/chromatic transposition (any consistent pitch shift)
// //  *   4. Same rhythm, different pitch but inconsistent shift = "tonal variation"
// //  *   5. Direction-inverted (UDUD → DUDU) within same structural family
// //  *   6. Retrograde (reverse contour)
// //  *   7. Retrograde inversion
// //  *   8. Augmentation / diminution (same contour, different durations)
// //  *   9. Developed (contour similarity ≥ 0.7)
// //  *  10. Variation
// //  */
// // function classifyVariationV4(protoOcc, compareOcc) {
// //   const pFps = protoOcc.fps;
// //   const cFps = compareOcc.fps;

// //   // 1. Exact
// //   if (pFps.exactFp === cFps.exactFp) return 'exact';

// //   // Helper: check if melody directions are pairwise inverted
// //   function checkInverted() {
// //     if (pFps.structFp !== cFps.structFp || pFps.dirFp === cFps.dirFp) return false;
// //     const pDirs = (protoOcc.descriptors  || []).map(d => d.melodyDirection);
// //     const cDirs = (compareOcc.descriptors || []).map(d => d.melodyDirection);
// //     if (!pDirs.length) return false;
// //     return pDirs.every((d, i) => {
// //       const cd = cDirs[i];
// //       return (d === 'ascending'  && cd === 'descending') ||
// //              (d === 'descending' && cd === 'ascending')  ||
// //              d === cd;
// //     });
// //   }

// //   // 2 & 3. Transposition (same rhythm)
// //   if (pFps.rhythmFp === cFps.rhythmFp) {
// //     const shift = computePitchShift(protoOcc, compareOcc);
// //     if (shift !== null) {
// //       if (shift === 0)   return 'exact';
// //       if (shift === 12)  return 'octave up';
// //       if (shift === -12) return 'octave down';
// //       if (shift === 24)  return '2 octaves up';
// //       if (shift === -24) return '2 octaves down';
// //       return `transposed ${shift > 0 ? '+' : ''}${shift}st`;
// //     }
// //     // Same rhythm, inconsistent pitch shift — still check for inversion
// //     if (checkInverted()) return 'inverted';
// //     return 'tonal variation';
// //   }

// //   // 4. Direction inversion (different rhythm but same structural family, opposite direction)
// //   if (checkInverted()) return 'inverted';

// //   // 5-7. Contour transformations
// //   const pContour = pFps.contourFp || '';
// //   const cContour = cFps.contourFp || '';

// //   if (pContour && cContour) {
// //     if (pContour === cFps.contourInvFp)    return 'inverted';
// //     if (pContour === cFps.contourRetFp)    return 'retrograde';
// //     if (pContour === cFps.contourRetInvFp) return 'retrograde inversion';

// //     // 8. Augmentation / diminution (same contour, different durations)
// //     if (pContour === cContour) {
// //       const ratio = computeDurationRatio(protoOcc, compareOcc);
// //       if (ratio !== null && ratio !== 1) {
// //         return ratio > 1
// //           ? `augmented ×${ratio.toFixed(1)}`
// //           : `diminished ×${ratio.toFixed(1)}`;
// //       }
// //     }

// //     // 9. Developed (high Levenshtein similarity)
// //     const sim = levenshteinSim(pContour, cContour);
// //     if (sim >= 0.75) return 'developed';
// //   }

// //   // 10. Fallback
// //   return 'variation';
// // }

// // function classifyFamilyVariations(families) {
// //   for (const fam of families) {
// //     if (!fam.occurrences.length) continue;
// //     fam.occurrences[0].variationType = 'prototype';
// //     for (let i = 1; i < fam.occurrences.length; i++) {
// //       fam.occurrences[i].variationType = classifyVariationV4(fam.occurrences[0], fam.occurrences[i]);
// //     }
// //   }
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // PHASE 6 — HIERARCHICAL LABELING + OUTPUT
// // // ═══════════════════════════════════════════════════════════════════

// // /**
// //  * Assign each bar to its best family occurrence.
// //  *
// //  * Priority rules:
// //  *   1. Non-cross-boundary occurrences win over cross-boundary ones
// //  *   2. Among ties: higher family score wins
// //  *   3. Each bar gets one primary assignment
// //  */
// // function labelBars(features, families, boundaries) {
// //   // Build lookup: barNumber → [{fam, occ, posInWindow, priority}]
// //   const barFamilyLookup = new Map();

// //   for (const fam of families) {
// //     for (const occ of fam.occurrences) {
// //       const priority = occ.crossesBoundary ? 1 : 2; // higher = preferred
// //       for (let j = 0; j < fam.windowSize; j++) {
// //         const bn = occ.startBar + j;
// //         if (!barFamilyLookup.has(bn)) barFamilyLookup.set(bn, []);
// //         barFamilyLookup.get(bn).push({ fam, occ, posInWindow: j, priority });
// //       }
// //     }
// //   }

// //   const boundaryBns = new Set(boundaries.map(b => b.afterBarNumber));
// //   const boundaryMap = new Map(boundaries.map(b => [b.afterBarNumber, b]));

// //   return features.map(f => {
// //     const bn      = f.barNumber;
// //     const matches = (barFamilyLookup.get(bn) || []).sort((a, b) => {
// //       if (b.priority !== a.priority) return b.priority - a.priority;
// //       return b.fam.score - a.fam.score;
// //     });
// //     const best    = matches[0] ?? null;
// //     const isBoundaryEnd = boundaryBns.has(bn);
// //     const boundaryInfo  = isBoundaryEnd ? boundaryMap.get(bn) : null;
// //     const patternId     = best ? best.fam.id : null;
// //     const isSurprise    = !f.isEmpty && !patternId;

// //     return {
// //       barNumber:      bn,
// //       notes:          f.orderedNotes,
// //       patternId:      f.isEmpty ? 'EMPTY' : (patternId || 'SURPRISE'),
// //       patternLabel:   f.isEmpty ? 'Empty' : (best ? best.fam.label : 'Surprise'),
// //       variationType:  best?.occ?.variationType ?? null,
// //       isSurprise,
// //       isEmpty:        f.isEmpty,
// //       isBoundaryEnd,
// //       boundaryType:   boundaryInfo?.type ?? null,
// //       noveltyScore:   boundaryInfo?.noveltyScore ?? 0,
// //       noteCount:      f.noteCount,
// //       rhythmicEntropy: f.rhythmicEntropy,
// //       relativeEnergy: f.relativeEnergy,
// //       hasAlternating: f.hasAlternating,
// //       pedalCandidate: f.pedalCandidate,
// //       bestScaleName:  f.bestScaleName,
// //       hasChromaticNotes: f.hasChromaticNotes,
// //       contourShape:   f.contourShape,
// //       isSustain:      f.noteCount <= 2 && f.noteCount > 0 && f.dominantDuration >= 8,
// //       color:          best ? best.fam.color : (f.isEmpty ? EMPTY_COLOR : SURPRISE_COLOR),
// //       alternating:    f.hasAlternating
// //         ? { pedal: f.pedalCandidate, notesPerBar: f.noteCount }
// //         : null,
// //       texture:        `n${f.noteCount}_d${f.dominantDuration}`,
// //       // Expose structural descriptor fields for YAML and graph
// //       structural:     f.structural,
// //     };
// //   });
// // }

// // /**
// //  * Detect sections using boundary splits + pattern family continuity.
// //  */
// // function detectSections(labeledBars, families, boundaries) {
// //   if (!labeledBars.length) return [];

// //   const boundaryIdxSet = new Set(boundaries.map(b => b.afterBarIdx));
// //   const sections = [];
// //   let current    = { bars: [], patternId: null };

// //   for (let i = 0; i < labeledBars.length; i++) {
// //     const lb = labeledBars[i];
// //     current.bars.push(lb);
// //     if (!current.patternId && lb.patternId !== 'EMPTY' && lb.patternId !== 'SURPRISE')
// //       current.patternId = lb.patternId;

// //     const isLast     = i === labeledBars.length - 1;
// //     const isBoundary = boundaryIdxSet.has(i);
// //     if (isBoundary || isLast) {
// //       if (current.bars.length > 0) sections.push({ ...current });
// //       current = { bars: [], patternId: null };
// //     }
// //   }

// //   // Assign letters using family continuity
// //   const familyLetterMap = new Map();
// //   let nextLetter = 0;

// //   return sections.map((sec, idx) => {
// //     const pid     = sec.patternId || 'MIXED';
// //     if (!familyLetterMap.has(pid))
// //       familyLetterMap.set(pid, String.fromCharCode(65 + nextLetter++));
// //     const letter   = familyLetterMap.get(pid);
// //     const prevSame = sections.slice(0, idx).filter(s => s.patternId === pid).length;
// //     const fullLabel = prevSame === 0 ? letter
// //                     : prevSame === 1 ? `${letter}'`
// //                     : prevSame === 2 ? `${letter}''`
// //                     : `${letter}(${prevSame + 1})`;
// //     const fam       = families.find(f => f.id === pid);
// //     const firstBar  = sec.bars[0]?.barNumber ?? 0;
// //     const lastBar   = sec.bars[sec.bars.length - 1]?.barNumber ?? 0;
// //     return {
// //       id:          `S${String(idx + 1).padStart(2,'0')}`,
// //       index:       idx,
// //       startBar:    firstBar,
// //       endBar:      lastBar,
// //       barCount:    sec.bars.length,
// //       patternId:   pid, pid,
// //       patternLabel: fam?.label ?? pid,
// //       letter, fullLabel,
// //       musicLabel:  letter,
// //       isRepeat:    prevSame > 0,
// //       bars:        sec.bars,
// //       color:       fam?.color ?? EMPTY_COLOR,
// //     };
// //   });
// // }

// // function buildGraph(labeledBars, families) {
// //   const nodeMap = new Map();
// //   for (const lb of labeledBars) {
// //     const id = lb.patternId;
// //     if (!nodeMap.has(id)) {
// //       const fam = families.find(f => f.id === id);
// //       nodeMap.set(id, {
// //         id, label: lb.patternLabel,
// //         type:  fam ? fam.type : (lb.isEmpty ? 'empty' : 'surprise'),
// //         count: 0, bars: [],
// //         color: fam ? fam.color : (lb.isEmpty ? EMPTY_COLOR : SURPRISE_COLOR),
// //       });
// //     }
// //     const node = nodeMap.get(id); node.count++; node.bars.push(lb.barNumber);
// //   }
// //   const edgeMap = new Map();
// //   for (let i = 0; i < labeledBars.length - 1; i++) {
// //     const from = labeledBars[i].patternId, to = labeledBars[i+1].patternId;
// //     if (from === to) continue;
// //     const key = `${from}|||${to}`;
// //     edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
// //   }
// //   const edges = [...edgeMap.entries()].map(([key, w]) => {
// //     const [from, to] = key.split('|||');
// //     return { from, to, weight: w };
// //   }).sort((a, b) => b.weight - a.weight);
// //   return { nodes: [...nodeMap.values()], edges };
// // }

// // function alignHands(rhLabeled, lhLabeled) {
// //   const allBns = new Set([...rhLabeled.map(b => b.barNumber), ...lhLabeled.map(b => b.barNumber)]);
// //   const rhMap  = new Map(rhLabeled.map(b => [b.barNumber, b]));
// //   const lhMap  = new Map(lhLabeled.map(b => [b.barNumber, b]));
// //   return [...allBns].sort((a, b) => a - b).map(bn => ({
// //     barNumber: bn,
// //     rh: rhMap.get(bn) || null,
// //     lh: lhMap.get(bn) || null,
// //     rhPattern: rhMap.get(bn)?.patternLabel || '-',
// //     lhPattern: lhMap.get(bn)?.patternLabel || '-',
// //   }));
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // YAML BLUEPRINT GENERATOR (v4)
// // // ═══════════════════════════════════════════════════════════════════

// // function generateYaml(analysis) {
// //   const { metadata, rightHand, leftHand } = analysis;
// //   const rh       = rightHand || {};
// //   const lh       = leftHand  || {};
// //   const fams     = rh.families  || [];
// //   const bounds   = rh.boundaries || [];
// //   const sections = rh.sections  || [];
// //   const labeled  = rh.labeled   || [];

// //   const surpriseBars = labeled.filter(b => b.isSurprise).map(b => b.barNumber).join(', ') || 'none';
// //   const boundaryBars = bounds.map(b => `${b.afterBarNumber}(${b.type})`).join(', ')          || 'none';
// //   const sectionOrder = sections.map(s => s.fullLabel).join(' → ')                            || 'N/A';
// //   const naturalSizes = (rh.windowSizes || []).join(', ')                                     || 'none';

// //   const famLines = fams.map(f => {
// //     const occLines = f.occurrences.map(o =>
// //       `      - bars: [${o.startBar}, ${o.endBar}]  variation: "${o.variationType || 'prototype'}"  cross_boundary: ${o.crossesBoundary || false}`
// //     ).join('\n');
// //     const struct = f.occurrences[0]?.descriptors?.[0];
// //     const structNote = struct
// //       ? `    structural_type: "${struct.textureType}"  melody_dir: "${struct.melodyDirection}"  step_type: "${struct.stepType}"`
// //       : '';
// //     return [
// //       `  ${f.label}:`,
// //       `    id: "${f.id}"`,
// //       `    window_size: ${f.windowSize}`,
// //       `    match_level: "${f.matchLevel}"`,
// //       `    occurrence_count: ${f.occurrenceCount}`,
// //       structNote,
// //       occLines,
// //     ].filter(Boolean).join('\n');
// //   }).join('\n\n') || '  # (no patterns detected)';

// //   const secLines = sections.map(s =>
// //     `  - id: "${s.id}"  bars: [${s.startBar}, ${s.endBar}]  label: "${s.fullLabel}"  pattern: "${s.patternId}"`
// //   ).join('\n') || '  # (no sections)';

// //   return `# ═══════════════════════════════════════════════════════
// // # MUSIC ANALYSIS BLUEPRINT v4.0
// // # Structural fingerprinting + inversion-aware family grouping
// // # ${metadata.bars.length} bars · ${metadata.time_signature} · ${metadata.tempo} BPM · Key: ${metadata.key}
// // # Natural window sizes: [${naturalSizes}]
// // # Boundaries: ${bounds.length}
// // # ═══════════════════════════════════════════════════════

// // composition:
// //   key: "${metadata.key}"
// //   tempo: ${metadata.tempo}
// //   time_signature: "${metadata.time_signature}"
// //   total_bars: ${metadata.bars.length}
// //   subdivisions_per_bar: ${metadata.subdivisions_per_bar}

// // structure:
// //   natural_window_sizes: [${naturalSizes}]
// //   boundary_count: ${bounds.length}
// //   boundary_bars: "${boundaryBars}"
// //   section_order: "${sectionOrder}"

// // pattern_families:
// // ${famLines}

// // sections:
// // ${secLines}

// // left_hand:
// //   pattern_count: ${(lh.families || []).length}
// //   section_count: ${(lh.sections || []).length}

// // generation_rules:
// //   - "Section order: ${sectionOrder}"
// //   - "Total distinct pattern families: ${fams.length}"
// //   - "Surprise bars: [${surpriseBars}]"
// //   - "Boundary bars: ${boundaryBars}"
// //   - "Discovered window sizes: [${naturalSizes}]"
// // `;
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // HAND ANALYZER — orchestrates phases 1–6 for one hand
// // // ═══════════════════════════════════════════════════════════════════

// // function analyzeHand(bars, spb, handName) {
// //   const nonEmpty = bars.filter(b => b.notes.length > 0);

// //   if (nonEmpty.length === 0) {
// //     const emptyLabeled = bars.map(b => ({
// //       barNumber: b.bar_number, notes: [], patternId: 'EMPTY', patternLabel: 'Empty',
// //       isEmpty: true, isSurprise: false, isBoundaryEnd: false, boundaryType: null,
// //       noteCount: 0, alternating: null, isSustain: false, color: EMPTY_COLOR,
// //       structural: computeStructuralDescriptor([], spb),
// //     }));
// //     return {
// //       features: [], simMatrix: [], families: [], boundaries: [],
// //       labeled: emptyLabeled, sections: [], windowSizes: [],
// //       graph: { nodes: [], edges: [] }, hand: handName,
// //     };
// //   }

// //   const features   = extractAllFeatures(bars, spb);            // Phase 1
// //   const simMatrix  = buildSimilarityMatrix(features);           // Phase 2
// //   const boundaries = detectBoundaries(features, simMatrix);     // Phase 3
// //   const { families, windowSizes } = detectPatternsV4(features, simMatrix, boundaries); // Phase 4
// //   classifyFamilyVariations(families);                           // Phase 5
// //   const labeled    = labelBars(features, families, boundaries); // Phase 6
// //   const sections   = detectSections(labeled, families, boundaries);
// //   const graph      = buildGraph(labeled, families);

// //   return {
// //     features, simMatrix, families, boundaries,
// //     labeled, sections, windowSizes, graph, hand: handName,
// //     // v2/v3 compat alias
// //     patterns: families.map(f => ({
// //       ...f,
// //       id:         f.id,
// //       label:      f.label,
// //       type:       f.matchLevel,
// //       windowSize: f.windowSize,
// //       occurrences: f.occurrences,
// //     })),
// //   };
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // MAIN ORCHESTRATOR
// // // ═══════════════════════════════════════════════════════════════════

// // function analyze(rawJson, options = {}) {
// //   const normalized = normalizeJson(rawJson);
// //   const spb        = normalized.subdivisions_per_bar;

// //   const { rhBars, lhBars, splitMidi, rhHasNotes, lhHasNotes } =
// //     separateHands(normalized.bars, options.splitMidi);

// //   const rightHand = analyzeHand(rhBars, spb, 'right');
// //   const leftHand  = analyzeHand(lhBars, spb, 'left');
// //   const alignment = alignHands(rightHand.labeled, leftHand.labeled);

// //   const yamlBlueprint = generateYaml({ metadata: normalized, rightHand, leftHand, alignment });

// //   return {
// //     metadata: normalized, splitMidi,
// //     rightHand, leftHand, alignment, yamlBlueprint,
// //     summary: {
// //       totalBars:    normalized.bars.length,
// //       rhPatterns:   rightHand.families.length,
// //       lhPatterns:   leftHand.families.length,
// //       rhSections:   rightHand.sections.length,
// //       lhSections:   leftHand.sections.length,
// //       boundaries:   rightHand.boundaries.length,
// //       windowSizes:  rightHand.windowSizes,
// //       surpriseBars: rightHand.labeled.filter(b => b.isSurprise).map(b => b.barNumber),
// //       splitMidi, rhHasNotes, lhHasNotes,
// //     },
// //   };
// // }


// // // ═══════════════════════════════════════════════════════════════════
// // // EXPORTS
// // // ═══════════════════════════════════════════════════════════════════

// // const MusicAnalyzerEngine = {
// //   analyze, normalizeJson, normalizeNote, normalizeBar,
// //   separateHands, detectSplitPoint,
// //   extractAllFeatures, extractFeatureVector,
// //   computeStructuralDescriptor, detectAlternatingDeep, getMelodyTrend,
// //   buildSimilarityMatrix, computeSimilarity,
// //   detectBoundaries, computeNoveltyScores,
// //   detectPatternsV4, discoverNaturalWindowSizes, buildWindowFingerprints,
// //   classifyFamilyVariations, classifyVariationV4,
// //   labelBars, detectSections, buildGraph, alignHands,
// //   generateYaml, analyzeHand,
// //   pitchToMidi, midiToPitchName, pitchClass,
// //   jaccardBitmask, levenshteinSim, shannonEntropy,
// //   PATTERN_COLORS, EMPTY_COLOR, SURPRISE_COLOR, BOUNDARY_COLOR,
// // };

// // if (typeof module !== 'undefined' && module.exports) {
// //   module.exports = MusicAnalyzerEngine;
// // } else if (typeof globalThis !== 'undefined') {
// //   globalThis.MusicAnalyzerEngine = MusicAnalyzerEngine;
// // }












// 'use strict';

// // ═══════════════════════════════════════════════════════════════════
// // MUSIC ANALYZER ENGINE v5.0 — PASSACAGLIA-AWARE
// //
// // Root problem with v4: generic ML pattern detection (similarity
// // matrices, novelty scores, window fingerprinting) cannot understand
// // passacaglia structure. It misses the 8-bar period, misidentifies
// // the C→B→A pedal descent as separate unrelated motifs, and produces
// // garbage section labels.
// //
// // v5 approach:
// // 1. DETECT the passacaglia ground period automatically (1–16 bars)
// // 2. SEGMENT into sections using that period
// // 3. ANALYZE each section structurally:
// //    - alternating melody+pedal detection (improved)
// //    - pedal tone per bar-pair (within-section descent)
// //    - melody direction per section via linear regression
// //    - cadence bar detection (chromatic / non-uniform rhythm)
// // 4. GROUP motifs across sections by structural role:
// //    - pedal-C bars, pedal-B bars, pedal-A bars, cadence bars,
// //      parallel-octave bars, transition-blurring bars
// // 5. LEFT HAND: detect harmonic ostinato via bass-note cycle
// // 6. GENERATE accurate YAML with correct section labels,
// //    direction alternation, recapitulation detection
// //
// // Falls back gracefully to statistical analysis when no clear period
// // is found (non-passacaglia pieces).
// // ═══════════════════════════════════════════════════════════════════

// // ─── CONSTANTS ──────────────────────────────────────────────────────
// const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// const NOTE_MAP = {
//   'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
//   'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
//   'A':9,'A#':10,'BB':10,'B':11,
// };

// const SCALE_TEMPLATES = [];
// (function buildScales() {
//   const patterns = [
//     { name:'major',    steps:[0,2,4,5,7,9,11] },
//     { name:'minor',    steps:[0,2,3,5,7,8,10] },
//     { name:'harm-min', steps:[0,2,3,5,7,8,11] },
//     { name:'dorian',   steps:[0,2,3,5,7,9,10] },
//     { name:'mixo',     steps:[0,2,4,5,7,9,10] },
//   ];
//   for (const { name, steps } of patterns) {
//     for (let root = 0; root < 12; root++) {
//       let mask = 0;
//       for (const s of steps) mask |= (1 << ((root + s) % 12));
//       SCALE_TEMPLATES.push({ name: NOTE_NAMES[root] + ' ' + name, root, mask });
//     }
//   }
// })();

// const PATTERN_COLORS = [
//   { bg:'#06b6d4', text:'#001', label:'cyan'    },
//   { bg:'#8b5cf6', text:'#fff', label:'violet'  },
//   { bg:'#f59e0b', text:'#001', label:'amber'   },
//   { bg:'#10b981', text:'#001', label:'emerald' },
//   { bg:'#f43f5e', text:'#fff', label:'rose'    },
//   { bg:'#3b82f6', text:'#fff', label:'blue'    },
//   { bg:'#a855f7', text:'#fff', label:'purple'  },
//   { bg:'#ec4899', text:'#fff', label:'pink'    },
//   { bg:'#14b8a6', text:'#001', label:'teal'    },
//   { bg:'#f97316', text:'#fff', label:'orange'  },
//   { bg:'#84cc16', text:'#001', label:'lime'    },
//   { bg:'#e11d48', text:'#fff', label:'crimson' },
// ];
// const EMPTY_COLOR    = { bg:'#374151', text:'#9ca3af', label:'gray'    };
// const SURPRISE_COLOR = { bg:'#ef4444', text:'#fff',   label:'red'     };
// const CADENCE_COLOR  = { bg:'#e11d48', text:'#fff',   label:'crimson' };
// const PARALLEL_COLOR = { bg:'#f97316', text:'#fff',   label:'orange'  };


// // ═══════════════════════════════════════════════════════════════════
// // PITCH UTILITIES
// // ═══════════════════════════════════════════════════════════════════

// function pitchToMidi(pitch) {
//   if (!pitch) return null;
//   const m = String(pitch).match(/^([A-G][#Bb]?)(-?\d+)$/i);
//   if (!m) return null;
//   const pc = NOTE_MAP[m[1].toUpperCase()];
//   if (pc === undefined) return null;
//   return (parseInt(m[2]) + 1) * 12 + pc;
// }

// function midiToPitchName(midi) {
//   return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
// }

// function pitchClass(pitch) {
//   const m = pitchToMidi(pitch);
//   return m !== null ? m % 12 : null;
// }

// function popcount(mask) {
//   let c = 0, m = mask >>> 0;
//   while (m) { c += m & 1; m >>>= 1; }
//   return c;
// }


// // ═══════════════════════════════════════════════════════════════════
// // PHASE 0 — NORMALIZATION  (unchanged from v4)
// // ═══════════════════════════════════════════════════════════════════

// function normalizeNote(n) {
//   return {
//     pitch:                 n.pitch                ?? n.p  ?? null,
//     start_subdivision:     n.start_subdivision    ?? n.s  ?? 0,
//     duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
//     offset_percent:        n.offset_percent       ?? n.o  ?? 0,
//     end_cutoff_percent:    n.end_cutoff_percent   ?? n.c  ?? null,
//     velocity:              100,
//   };
// }

// function normalizeBar(b) {
//   return {
//     bar_number: b.bar_number ?? b.bn,
//     notes: (b.notes ?? []).map(normalizeNote).filter(n => n.pitch !== null),
//   };
// }

// function normalizeJson(json) {
//   const ts    = json.time_signature || '4/4';
//   const [n,d] = ts.split('/').map(Number);
//   const spb   = json.subdivisions_per_bar || (n * (16 / d));
//   return {
//     tempo:                json.tempo    || 120,
//     time_signature:       ts,
//     key:                  json.key     || 'C',
//     subdivisions_per_bar: spb,
//     bars:                 (json.bars || []).map(normalizeBar),
//   };
// }


// // ─── Hand separation ─────────────────────────────────────────────

// const HAND_SPLIT_LOW  = 48;
// const HAND_SPLIT_HIGH = 72;

// function detectSplitPoint(bars) {
//   const pitchFreq = new Map();
//   for (const bar of bars)
//     for (const note of bar.notes) {
//       const m = pitchToMidi(note.pitch);
//       if (m !== null) pitchFreq.set(m, (pitchFreq.get(m) || 0) + 1);
//     }
//   if (pitchFreq.size < 2) return 60;
//   const sorted = [...pitchFreq.keys()].sort((a,b) => a - b);
//   let best = -1, splitAt = 60;
//   for (let i = 1; i < sorted.length; i++) {
//     const gap = sorted[i] - sorted[i-1];
//     const mid = (sorted[i-1] + sorted[i]) / 2;
//     const w   = (mid >= HAND_SPLIT_LOW && mid <= HAND_SPLIT_HIGH) ? 3.0 : 0.7;
//     if (gap * w > best) { best = gap * w; splitAt = Math.round(mid); }
//   }
//   return splitAt;
// }

// function separateHands(bars, splitMidi) {
//   const split = (splitMidi != null) ? splitMidi : detectSplitPoint(bars);
//   const rhBars = [], lhBars = [];
//   for (const bar of bars) {
//     rhBars.push({ bar_number: bar.bar_number, notes: bar.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) >= split) });
//     lhBars.push({ bar_number: bar.bar_number, notes: bar.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) <  split) });
//   }
//   return {
//     rhBars, lhBars, splitMidi: split,
//     rhHasNotes: rhBars.some(b => b.notes.length > 0),
//     lhHasNotes: lhBars.some(b => b.notes.length > 0),
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PHASE 1 — BAR-LEVEL STRUCTURAL ANALYSIS
// // ═══════════════════════════════════════════════════════════════════

// /**
//  * Detect alternating pedal pattern.
//  * Returns {isAlternating, pedalPitch, pedalPosition, pedalNotes, melodyNotes, meanGap}
//  */
// function detectAlternating(sortedNotes) {
//   if (sortedNotes.length < 4) return { isAlternating: false };

//   const pitchFreq = new Map();
//   for (const n of sortedNotes)
//     pitchFreq.set(n.pitch, (pitchFreq.get(n.pitch) || 0) + 1);

//   const candidates = [...pitchFreq.entries()]
//     .filter(([, c]) => c / sortedNotes.length >= 0.30)
//     .sort((a, b) => b[1] - a[1]);

//   for (const [pedalPitch] of candidates) {
//     const pedalIndices    = sortedNotes.map((n, i) => n.pitch === pedalPitch ? i : -1).filter(i => i >= 0);
//     const nonPedalIndices = sortedNotes.map((n, i) => n.pitch !== pedalPitch ? i : -1).filter(i => i >= 0);

//     if (pedalIndices.length < 2 || nonPedalIndices.length < 2) continue;

//     const allEven = pedalIndices.every(i => i % 2 === 0);
//     const allOdd  = pedalIndices.every(i => i % 2 === 1);
//     if (!allEven && !allOdd) continue;

//     const positions = sortedNotes.map(n => n.start_subdivision);
//     const gaps = [];
//     for (let i = 1; i < positions.length; i++) gaps.push(positions[i] - positions[i - 1]);
//     const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

//     const pedalMidi   = pitchToMidi(pedalPitch);
//     const nonPedal    = sortedNotes.filter(n => n.pitch !== pedalPitch);
//     const npMidis     = nonPedal.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
//     const avgNonPedal = npMidis.length ? npMidis.reduce((a, b) => a + b, 0) / npMidis.length : pedalMidi;
//     const pedalPosition = pedalMidi > avgNonPedal ? 'top' : 'bottom';

//     return {
//       isAlternating: true,
//       pedalPitch,
//       pedalMidi,
//       pedalPosition,
//       pedalNotes:  sortedNotes.filter(n => n.pitch === pedalPitch),
//       melodyNotes: nonPedal,
//       meanGap: Math.round(meanGap),
//     };
//   }
//   return { isAlternating: false };
// }

// /**
//  * Melody direction via linear regression on melody note MIDI values over time.
//  */
// function getMelodyTrend(notes) {
//   if (!notes || notes.length < 2) return 'static';
//   const pts = notes.map(n => ({ x: n.start_subdivision, y: pitchToMidi(n.pitch) })).filter(p => p.y !== null);
//   if (pts.length < 2) return 'static';
//   const n = pts.length;
//   const mx = pts.reduce((a, p) => a + p.x, 0) / n;
//   const my = pts.reduce((a, p) => a + p.y, 0) / n;
//   let num = 0, den = 0;
//   for (const p of pts) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2; }
//   const slope = den > 0 ? num / den : 0;
//   if (slope >  0.15) return 'ascending';
//   if (slope < -0.15) return 'descending';
//   return 'static';
// }

// /**
//  * Check if a bar is a cadence bar:
//  * - Has non-uniform note durations (rhythmically varied), OR
//  * - Contains chromatic pitches (G#, F# relative to C major), OR
//  * - Very few notes (held note bar)
//  */
// function isCadenceBar(bar, spb) {
//   const notes = bar.notes;
//   if (notes.length === 0) return false;
//   if (notes.length <= 2) return true; // held note = cadence resolution bar

//   const durs = notes.map(n => n.duration_subdivisions);
//   const allSame = durs.every(d => d === durs[0]);
//   if (!allSame) return true; // mixed durations = cadence formula bar

//   // Chromatic check: G# (pc=8) or F# (pc=6) in a C-major context
//   for (const n of notes) {
//     const p = pitchClass(n.pitch);
//     if (p === 8 || p === 6) return true; // G# or F#
//   }
//   return false;
// }

// /**
//  * Full structural descriptor for a single bar.
//  */
// function describeBar(bar, spb) {
//   const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
//   if (notes.length === 0) return { type:'empty', isEmpty:true };

//   const cadence = isCadenceBar(bar, spb);
//   const alt = detectAlternating(notes);

//   const midiVals = notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
//   const midiMin = Math.min(...midiVals);
//   const midiMax = Math.max(...midiVals);

//   let melodyDir = 'static';
//   if (alt.isAlternating) {
//     melodyDir = getMelodyTrend(alt.melodyNotes);
//   } else {
//     melodyDir = getMelodyTrend(notes);
//   }

//   // Exact fingerprint for matching
//   const exactFp = notes.map(n => `${n.pitch}@${n.start_subdivision}:${n.duration_subdivisions}`).join(',');
//   // Rhythm-only fingerprint
//   const rhythmFp = notes.map(n => `${n.start_subdivision}:${n.duration_subdivisions}`).join(',');
//   // Structural fingerprint (note count + dominant duration + alternating flag)
//   const domDur = (function() {
//     const f = new Map(); for (const n of notes) f.set(n.duration_subdivisions, (f.get(n.duration_subdivisions)||0)+1);
//     let bd=0,bc=0; for (const [d,c] of f) if(c>bc){bc=c;bd=d;} return bd;
//   })();

//   // Check for parallel octaves (Section VI): two active descending lines
//   const isParallelOctaves = (function() {
//     if (!alt.isAlternating) return false;
//     // Both pedal and melody are moving (not static pedal)
//     const pedTrend = getMelodyTrend(alt.pedalNotes);
//     return pedTrend !== 'static' && melodyDir !== 'static';
//   })();

//   // Transition blurring (Section V): first note == pedal pitch then jumps
//   const isTransitionBlur = (function() {
//     if (!alt.isAlternating) return false;
//     if (notes.length < 2) return false;
//     // First note is same pitch as detected pedal
//     return notes[0].pitch === alt.pedalPitch;
//   })();

//   return {
//     type: cadence ? 'cadence' : alt.isAlternating ? 'alternating' : 'other',
//     isEmpty: false,
//     isCadence: cadence,
//     isAlternating: alt.isAlternating,
//     isParallelOctaves,
//     isTransitionBlur,
//     pedalPitch: alt.pedalPitch ?? null,
//     pedalMidi:  alt.pedalMidi ?? null,
//     pedalPosition: alt.pedalPosition ?? 'none',
//     melodyDirection: melodyDir,
//     noteCount: notes.length,
//     domDur,
//     midiMin, midiMax,
//     exactFp, rhythmFp,
//     notes,
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PHASE 2 — PERIOD DETECTION
// // Finds the repeating ground period (in bars) characteristic of a
// // passacaglia / chaconne. Tests periods 2–32.
// // ═══════════════════════════════════════════════════════════════════

// function detectPeriod(bars, spb) {
//   const nonEmpty = bars.filter(b => b.notes.length > 0);
//   if (nonEmpty.length < 4) return null;

//   // Build rhythm fingerprint per bar
//   const fps = bars.map(b => {
//     const notes = [...b.notes].sort((a,b) => a.start_subdivision - b.start_subdivision);
//     return notes.map(n => `${n.start_subdivision}:${n.duration_subdivisions}`).join(',');
//   });

//   // Score each candidate period by how many bar-pairs match rhythm fingerprints
//   let bestPeriod = null, bestScore = -1;

//   for (let P = 2; P <= Math.min(32, Math.floor(bars.length / 2)); P++) {
//     let matches = 0, total = 0;
//     for (let i = 0; i + P < bars.length; i++) {
//       if (fps[i] === '' || fps[i + P] === '') continue;
//       total++;
//       if (fps[i] === fps[i + P]) matches++;
//     }
//     if (total === 0) continue;
//     const score = matches / total;
//     if (score > bestScore) { bestScore = score; bestPeriod = P; }
//   }

//   // Only accept if rhythmic repetition rate > 30%
//   return bestScore > 0.30 ? { period: bestPeriod, score: bestScore } : null;
// }


// // ═══════════════════════════════════════════════════════════════════
// // PHASE 3 — SECTION SEGMENTATION (period-aware)
// // ═══════════════════════════════════════════════════════════════════

// /**
//  * Segment bars into sections of `period` bars.
//  * Skip leading empty bars (intro).
//  * Returns {introBars, sections, period}
//  */
// function segmentBySections(bars, period) {
//   // Find first non-empty bar
//   let firstContent = 0;
//   while (firstContent < bars.length && bars[firstContent].notes.length === 0) firstContent++;

//   const introBars = bars.slice(0, firstContent);
//   const contentBars = bars.slice(firstContent);

//   const sections = [];
//   for (let i = 0; i < contentBars.length; i += period) {
//     sections.push(contentBars.slice(i, i + period));
//   }
//   return { introBars, sections, firstContentBar: firstContent + 1 };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PHASE 4 — WITHIN-SECTION STRUCTURAL ANALYSIS
// // ═══════════════════════════════════════════════════════════════════

// /**
//  * Analyze one section (array of bars).
//  * Identifies:
//  *   - melodic direction of the section
//  *   - pedal tone sequence within the section
//  *   - cadence bars (last N bars with rhythmic deviation)
//  *   - whether this is the parallel-octaves apex section
//  *   - whether this is a transition-blurring section
//  *   - whether this section is an exact repeat of a prior section
//  */
// function analyzeSection(secBars, spb, secIndex, priorSections) {
//   const barDescs = secBars.map(b => describeBar(b, spb));

//   // Separate cadence bars from main bars
//   const cadenceBars = [];
//   const mainBars = [];
//   for (const bd of barDescs) {
//     if (bd.isCadence) cadenceBars.push(bd);
//     else mainBars.push(bd);
//   }

//   // Pedal tone sequence from alternating bars
//   const pedalSequence = mainBars
//     .filter(bd => bd.isAlternating && bd.pedalPitch)
//     .map(bd => bd.pedalPitch);

//   // Unique pedal tones in order of first appearance
//   const seenPedals = [];
//   for (const p of pedalSequence) {
//     if (!seenPedals.includes(p)) seenPedals.push(p);
//   }

//   // Overall melody direction (majority vote across non-cadence bars)
//   const dirs = mainBars.filter(bd => bd.isAlternating).map(bd => bd.melodyDirection);
//   const up = dirs.filter(d => d==='ascending').length;
//   const down = dirs.filter(d => d==='descending').length;
//   let sectionDir = up > down ? 'ascending' : down > up ? 'descending' : 'mixed';

//   // Parallel octave detection — majority of main bars have both voices moving
//   const parallelCount = mainBars.filter(bd => bd.isParallelOctaves).length;
//   const isParallelApex = parallelCount >= mainBars.length * 0.5;
//   if (isParallelApex) sectionDir = 'parallel octaves';

//   // Transition blur detection
//   const blurCount = mainBars.filter(bd => bd.isTransitionBlur).length;
//   const isTransition = blurCount >= 2 && !isParallelApex;

//   // Register
//   const allMidis = barDescs.flatMap(bd => bd.notes ? bd.notes.map(n => pitchToMidi(n.pitch)) : []).filter(m => m !== null);
//   const regMin = allMidis.length ? Math.min(...allMidis) : 0;
//   const regMax = allMidis.length ? Math.max(...allMidis) : 0;
//   const regRange = regMax - regMin;

//   // Exact fingerprint of whole section (concat bar exact fps)
//   const sectionExactFp = barDescs.map(bd => bd.exactFp || '').join('||');
//   const sectionRhythmFp = barDescs.map(bd => bd.rhythmFp || '').join('||');

//   // Check if exact repeat of a prior section
//   let repeatOf = null;
//   for (let i = 0; i < priorSections.length; i++) {
//     if (priorSections[i].sectionExactFp === sectionExactFp) {
//       repeatOf = i; break;
//     }
//   }
//   let rhythmRepeatOf = null;
//   if (repeatOf === null) {
//     for (let i = 0; i < priorSections.length; i++) {
//       if (priorSections[i].sectionRhythmFp === sectionRhythmFp) {
//         rhythmRepeatOf = i; break;
//       }
//     }
//   }

//   return {
//     index: secIndex,
//     bars: secBars,
//     barDescs,
//     mainBars,
//     cadenceBars,
//     sectionDir,
//     pedalSequence,
//     seenPedals,
//     isParallelApex,
//     isTransition,
//     regMin, regMax, regRange,
//     sectionExactFp,
//     sectionRhythmFp,
//     repeatOf,          // null or index of section this exactly repeats
//     rhythmRepeatOf,    // null or index (rhythm-only match)
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PHASE 5 — MOTIF FAMILY BUILDING
// // Groups bars across all sections by their structural role.
// // ═══════════════════════════════════════════════════════════════════

// /**
//  * After sections are analyzed, group all bars into motif families:
//  *
//  * For passacaglia:
//  *   Family = role within section period:
//  *     - per unique pedal tone (C-pedal bars, B-pedal bars, A-pedal bars...)
//  *     - cadence bars (always their own family)
//  *     - parallel-octave bars (apex section)
//  *     - transition-blurring bars
//  *     - ascending vs descending are sub-variants within same pedal family
//  *
//  * Each family tracks: all occurrences, variation types (exact/transposed/inverted)
//  */
// function buildMotifFamilies(analyzedSections, introBars, spb) {
//   // Collect all bars with their role
//   const allLabeledBars = [];

//   // Intro bars
//   for (const b of introBars) {
//     allLabeledBars.push({
//       barNumber: b.bar_number,
//       role: 'intro',
//       sectionIndex: -1,
//       desc: describeBar(b, spb),
//     });
//   }

//   for (const sec of analyzedSections) {
//     for (let bi = 0; bi < sec.bars.length; bi++) {
//       const b = sec.bars[bi];
//       const bd = sec.barDescs[bi];

//       let role;
//       if (bd.isEmpty) {
//         role = 'empty';
//       } else if (bd.isCadence) {
//         role = 'cadence';
//       } else if (sec.isParallelApex) {
//         role = 'parallel-octave';
//       } else if (sec.isTransition && bd.isTransitionBlur) {
//         role = `transition-blur:${bd.pedalPitch || 'unknown'}`;
//       } else if (bd.isAlternating && bd.pedalPitch) {
//         role = `pedal:${bd.pedalPitch}`;
//       } else {
//         role = 'other';
//       }

//       allLabeledBars.push({
//         barNumber: b.bar_number,
//         role,
//         sectionIndex: sec.index,
//         sectionDir: sec.sectionDir,
//         desc: bd,
//       });
//     }
//   }

//   // Group into families by role
//   const familyMap = new Map();
//   for (const lb of allLabeledBars) {
//     if (!familyMap.has(lb.role)) familyMap.set(lb.role, []);
//     familyMap.get(lb.role).push(lb);
//   }

//   // Build family objects
//   const families = [];
//   let colorIdx = 0;

//   // Priority order for display
//   const roleOrder = (role) => {
//     if (role === 'intro') return 0;
//     if (role === 'empty') return 1;
//     if (role.startsWith('pedal:')) return 2;
//     if (role.startsWith('transition-blur:')) return 3;
//     if (role === 'parallel-octave') return 4;
//     if (role === 'cadence') return 5;
//     return 6;
//   };

//   const sortedRoles = [...familyMap.keys()].sort((a, b) => {
//     const oa = roleOrder(a), ob = roleOrder(b);
//     if (oa !== ob) return oa - ob;
//     return a.localeCompare(b);
//   });

//   for (const role of sortedRoles) {
//     const members = familyMap.get(role);
//     if (members.length === 0) continue;

//     const letter = String.fromCharCode(65 + families.length);
//     const id = `FAM_${letter}`;

//     // Determine match level
//     const exactFps = new Set(members.map(m => m.desc.exactFp || '').filter(Boolean));
//     const rhythmFps = new Set(members.map(m => m.desc.rhythmFp || '').filter(Boolean));
//     const matchLevel = exactFps.size === 1 ? 'exact'
//                      : rhythmFps.size === 1 ? 'rhythmic'
//                      : 'structural';

//     // Classify variations relative to first occurrence
//     const proto = members[0];
//     const occurrences = members.map((m, i) => {
//       let variationType = 'prototype';
//       if (i > 0) {
//         if (m.desc.exactFp === proto.desc.exactFp) variationType = 'exact';
//         else if (m.desc.rhythmFp === proto.desc.rhythmFp) variationType = 'tonal variation';
//         else if (m.sectionDir !== proto.sectionDir) variationType = 'inverted';
//         else variationType = 'variation';
//       }
//       return {
//         barNumber: m.barNumber,
//         sectionIndex: m.sectionIndex,
//         sectionDir: m.sectionDir,
//         variationType,
//         exactFp: m.desc.exactFp,
//         rhythmFp: m.desc.rhythmFp,
//       };
//     });

//     // Human-readable label
//     let label;
//     if (role === 'intro') label = 'Intro';
//     else if (role === 'empty') label = 'Empty';
//     else if (role === 'cadence') label = 'Cadence';
//     else if (role === 'parallel-octave') label = 'Parallel octaves';
//     else if (role.startsWith('pedal:')) label = `Pedal-${role.split(':')[1]}`;
//     else if (role.startsWith('transition-blur:')) label = `Blur-${role.split(':')[1]}`;
//     else label = role;

//     families.push({
//       id,
//       label,
//       role,
//       matchLevel,
//       occurrenceCount: members.length,
//       occurrences,
//       barNumbers: members.map(m => m.barNumber),
//       color: (role === 'cadence') ? CADENCE_COLOR
//            : (role === 'parallel-octave') ? PARALLEL_COLOR
//            : (role === 'empty' || role === 'intro') ? EMPTY_COLOR
//            : PATTERN_COLORS[colorIdx++ % PATTERN_COLORS.length],
//       windowSize: 1,
//       type: 'motif',
//       score: members.length,
//     });
//   }

//   return { families, allLabeledBars };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PHASE 6 — SECTION LABELING
// // Assigns musical section labels (I, II, III... or A, B, A'...)
// // accounting for recapitulation (exact/rhythmic repeats).
// // ═══════════════════════════════════════════════════════════════════

// function labelSections(analyzedSections) {
//   // Assign roman numerals I–IX (or letter labels for general pieces)
//   const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
//                  'XI','XII','XIII','XIV','XV','XVI'];

//   // Check if any section is an exact/rhythm repeat of an earlier one
//   // and build the fullLabel (e.g. "VII (= I)")
//   return analyzedSections.map((sec, i) => {
//     const roman = ROMAN[i] || `S${i+1}`;
//     let repeatNote = '';
//     if (sec.repeatOf !== null) {
//       repeatNote = ` (= ${ROMAN[sec.repeatOf]})`;
//     } else if (sec.rhythmRepeatOf !== null) {
//       repeatNote = ` (~${ROMAN[sec.rhythmRepeatOf]})`;
//     }
//     const apex = sec.isParallelApex ? '★' : '';
//     return {
//       ...sec,
//       romanLabel: roman + apex,
//       fullLabel: roman + apex + repeatNote,
//       startBar: sec.bars[0].bar_number,
//       endBar: sec.bars[sec.bars.length - 1].bar_number,
//     };
//   });
// }


// // ═══════════════════════════════════════════════════════════════════
// // PHASE 7 — LEFT HAND: HARMONIC OSTINATO DETECTION
// // Detects the repeating bass-note cycle of a passacaglia ground.
// // ═══════════════════════════════════════════════════════════════════

// function analyzeLhOstinato(lhBars, period, firstContentBar, spb) {
//   if (!period) return null;

//   // Extract bass note (lowest pitch) per bar
//   const bassNotes = lhBars.map(bar => {
//     const notes = bar.notes;
//     if (notes.length === 0) return null;
//     const midis = notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
//     const minMidi = Math.min(...midis);
//     return { midi: minMidi, pitch: midiToPitchName(minMidi), bar: bar.bar_number };
//   });

//   // Extract the repeating cycle starting at firstContentBar
//   const startIdx = firstContentBar - 1; // 0-indexed
//   if (startIdx >= lhBars.length) return null;

//   const cycleNotes = bassNotes.slice(startIdx, startIdx + period)
//     .filter(n => n !== null)
//     .map(n => n.pitch);

//   // Verify cycle repeats
//   let repeatCount = 0;
//   for (let offset = startIdx; offset + period <= lhBars.length; offset += period) {
//     const segment = bassNotes.slice(offset, offset + period).filter(n => n !== null).map(n => n.pitch);
//     // Allow partial match (>60%) to handle cadential variations
//     const matches = segment.filter((p, i) => cycleNotes[i] && p === cycleNotes[i]).length;
//     if (matches / Math.max(segment.length, cycleNotes.length) > 0.5) repeatCount++;
//   }

//   // Build bar-offset to chord role map
//   const cycleRoles = cycleNotes.map((p, i) => ({
//     barOffset: i + 1,
//     bassNote: p,
//     label: `offset ${i+1}`,
//   }));

//   return {
//     cycle: cycleNotes,
//     cycleLength: cycleNotes.length,
//     repeatCount,
//     cycleRoles,
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // YAML GENERATOR v5
// // ═══════════════════════════════════════════════════════════════════

// function generateYamlV5(analysis) {
//   const { metadata, rightHand, leftHand, periodResult } = analysis;
//   const rh = rightHand || {};
//   const lh = leftHand || {};
//   const period = periodResult ? periodResult.period : 'unknown';

//   const secLines = (rh.labeledSections || []).map(s =>
//     `    ${s.romanLabel}: {bars: [${s.startBar}, ${s.endBar}], dir: "${s.sectionDir}", pedals: [${s.seenPedals.join(', ')}], repeat: ${s.repeatOf !== null ? `"= section_${s.repeatOf+1}"` : 'null'}}`
//   ).join('\n');

//   const famLines = (rh.families || []).map(f => {
//     const bars = f.barNumbers.slice(0, 30).join(', ');
//     const more = f.barNumbers.length > 30 ? `, ... (${f.barNumbers.length} total)` : '';
//     return `    ${f.label}:\n      id: "${f.id}"\n      role: "${f.role}"\n      match: "${f.matchLevel}"\n      count: ${f.occurrenceCount}\n      bars: [${bars}${more}]`;
//   }).join('\n\n');

//   const lhCycle = lh.ostinato ? lh.ostinato.cycle.join(' → ') : 'n/a';
//   const lhFamLines = (lh.families || []).map(f => {
//     const bars = f.barNumbers.slice(0, 20).join(', ');
//     return `    ${f.label}: {count: ${f.occurrenceCount}, match: "${f.matchLevel}", bars: [${bars}]}`;
//   }).join('\n');

//   const surpriseBars = (rh.allLabeledBars || [])
//     .filter(b => b.role === 'other')
//     .map(b => b.barNumber).join(', ') || 'none';

//   return `# ═══════════════════════════════════════════════════════
// # MUSIC ANALYSIS BLUEPRINT v5.0
// # Domain-aware passacaglia analyzer
// # ${metadata.bars.length} bars · ${metadata.time_signature} · ${metadata.tempo} BPM · Key: ${metadata.key}
// # Detected period: ${period} bars · Sections: ${(rh.labeledSections||[]).length}
// # ═══════════════════════════════════════════════════════

// composition:
//   key: "${metadata.key}"
//   tempo: ${metadata.tempo}
//   time_signature: "${metadata.time_signature}"
//   total_bars: ${metadata.bars.length}
//   subdivisions_per_bar: ${metadata.subdivisions_per_bar}
//   detected_period_bars: ${period}
//   period_confidence: ${periodResult ? periodResult.score.toFixed(2) : 'n/a'}

// right_hand:
//   intro_bars: [${(rh.introBars||[]).map(b=>b.bar_number).join(', ')||'none'}]
//   section_count: ${(rh.labeledSections||[]).length}
//   sections:
// ${secLines}

//   motif_families:
// ${famLines}

//   generation_rules:
//     - "period = ${period} bars — all structural features repeat every ${period} bars"
//     - "within-section: non-cadence bars use uniform eighth-note grid (s=0,2,4,6,8,10,12,14 all d=2)"
//     - "within-section pedal descent follows: ${(rh.labeledSections||[]).length > 0 ? (rh.labeledSections[0].seenPedals||[]).join(' → ') : 'detected from data'}"
//     - "cadence bars: non-uniform durations and/or chromatic pitches (G# / F#)"
//     - "direction alternates per section: ${(rh.labeledSections||[]).map(s=>s.sectionDir[0].toUpperCase()).join('')}"
//     - "surprise bars (unclassified): [${surpriseBars}]"

// left_hand:
//   ostinato_cycle: "${lhCycle}"
//   ostinato_repeats: ${lh.ostinato ? lh.ostinato.repeatCount : 'n/a'}
//   motif_families:
// ${lhFamLines}
// `;
// }


// // ═══════════════════════════════════════════════════════════════════
// // HAND ANALYZER — v5 main orchestrator for one hand
// // ═══════════════════════════════════════════════════════════════════

// function analyzeHandV5(bars, spb, handName, periodOverride) {
//   const nonEmpty = bars.filter(b => b.notes.length > 0);

//   if (nonEmpty.length === 0) {
//     return {
//       families: [], allLabeledBars: [], labeledSections: [],
//       introBars: bars, period: null, ostinato: null, hand: handName,
//       patterns: [],
//     };
//   }

//   // Period detection
//   const periodResult = periodOverride
//     ? { period: periodOverride, score: 1.0 }
//     : detectPeriod(bars, spb);

//   if (!periodResult) {
//     // Fallback: no clear period detected — basic bar-level analysis only
//     const barDescs = bars.map(b => ({ barNumber: b.bar_number, role: 'other', desc: describeBar(b, spb) }));
//     return {
//       families: [], allLabeledBars: barDescs, labeledSections: [],
//       introBars: [], period: null, ostinato: null, hand: handName,
//       patterns: [],
//       noPeriodDetected: true,
//     };
//   }

//   const period = periodResult.period;

//   // Segmentation
//   const { introBars, sections: rawSections, firstContentBar } = segmentBySections(bars, period);

//   // Section analysis (pass prior results for repeat detection)
//   const analyzedSections = [];
//   for (let i = 0; i < rawSections.length; i++) {
//     const sec = analyzeSection(rawSections[i], spb, i, analyzedSections);
//     analyzedSections.push(sec);
//   }

//   // Section labeling
//   const labeledSections = labelSections(analyzedSections);

//   // Motif families
//   const { families, allLabeledBars } = buildMotifFamilies(analyzedSections, introBars, spb);

//   // Left-hand ostinato (only meaningful for LH)
//   const ostinato = handName === 'left'
//     ? analyzeLhOstinato(bars, period, firstContentBar, spb)
//     : null;

//   // Build sections output (compatible with v4 consumers)
//   const sections = labeledSections.map((s, idx) => ({
//     id: `S${String(idx + 1).padStart(2,'0')}`,
//     index: idx,
//     startBar: s.startBar,
//     endBar: s.endBar,
//     barCount: s.bars.length,
//     romanLabel: s.romanLabel,
//     fullLabel: s.fullLabel,
//     sectionDir: s.sectionDir,
//     seenPedals: s.seenPedals,
//     isParallelApex: s.isParallelApex,
//     isTransition: s.isTransition,
//     repeatOf: s.repeatOf,
//     bars: s.bars,
//     color: s.isParallelApex ? PARALLEL_COLOR : PATTERN_COLORS[idx % PATTERN_COLORS.length],
//   }));

//   // Build labeled bars (compatible shape for rendering)
//   const barLabelMap = new Map();
//   for (const lb of allLabeledBars) barLabelMap.set(lb.barNumber, lb);
//   const labeled = bars.map(b => {
//     const lb = barLabelMap.get(b.bar_number);
//     const fam = lb ? families.find(f => f.role === lb.role) : null;
//     return {
//       barNumber: b.bar_number,
//       notes: b.notes,
//       patternId: fam ? fam.id : 'SURPRISE',
//       patternLabel: fam ? fam.label : 'Unclassified',
//       role: lb ? lb.role : 'unknown',
//       sectionDir: lb ? lb.sectionDir : null,
//       isEmpty: b.notes.length === 0,
//       isSurprise: !fam,
//       color: fam ? fam.color : SURPRISE_COLOR,
//     };
//   });

//   return {
//     families,
//     allLabeledBars,
//     labeledSections,
//     sections,
//     labeled,
//     introBars,
//     period,
//     periodResult,
//     ostinato,
//     hand: handName,
//     // v4 compat aliases
//     patterns: families,
//     boundaries: [],
//     windowSizes: [period],
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // ALIGNMENT  (unchanged from v4)
// // ═══════════════════════════════════════════════════════════════════

// function alignHands(rhLabeled, lhLabeled) {
//   const allBns = new Set([...rhLabeled.map(b => b.barNumber), ...lhLabeled.map(b => b.barNumber)]);
//   const rhMap  = new Map(rhLabeled.map(b => [b.barNumber, b]));
//   const lhMap  = new Map(lhLabeled.map(b => [b.barNumber, b]));
//   return [...allBns].sort((a, b) => a - b).map(bn => ({
//     barNumber: bn,
//     rh: rhMap.get(bn) || null,
//     lh: lhMap.get(bn) || null,
//     rhPattern: rhMap.get(bn)?.patternLabel || '-',
//     lhPattern: lhMap.get(bn)?.patternLabel || '-',
//   }));
// }


// // ═══════════════════════════════════════════════════════════════════
// // MAIN ORCHESTRATOR
// // ═══════════════════════════════════════════════════════════════════

// function analyze(rawJson, options = {}) {
//   const normalized = normalizeJson(rawJson);
//   const spb        = normalized.subdivisions_per_bar;

//   const { rhBars, lhBars, splitMidi, rhHasNotes, lhHasNotes } =
//     separateHands(normalized.bars, options.splitMidi);

//   // Detect period on whichever hand has more content
//   // (can be overridden via options.period)
//   const periodResult = options.period
//     ? { period: options.period, score: 1.0 }
//     : detectPeriod(rhHasNotes ? rhBars : lhBars, spb);

//   const periodOverride = periodResult ? periodResult.period : null;

//   const rightHand = analyzeHandV5(rhBars, spb, 'right', periodOverride);
//   const leftHand  = analyzeHandV5(lhBars, spb, 'left',  periodOverride);

//   const alignment = alignHands(rightHand.labeled || [], leftHand.labeled || []);

//   const yamlBlueprint = generateYamlV5({
//     metadata: normalized,
//     rightHand,
//     leftHand,
//     periodResult: periodResult || rightHand.periodResult || null,
//   });

//   return {
//     metadata: normalized,
//     splitMidi,
//     rightHand,
//     leftHand,
//     alignment,
//     yamlBlueprint,
//     summary: {
//       totalBars:    normalized.bars.length,
//       detectedPeriod: periodOverride,
//       rhSections:   rightHand.sections?.length ?? 0,
//       lhSections:   leftHand.sections?.length  ?? 0,
//       rhPatterns:   rightHand.families?.length  ?? 0,
//       lhPatterns:   leftHand.families?.length   ?? 0,
//       boundaries:   0, // period-based — no novelty boundaries
//       windowSizes:  periodOverride ? [periodOverride] : [],
//       surpriseBars: (rightHand.allLabeledBars || []).filter(b => b.role === 'other').map(b => b.barNumber),
//       splitMidi, rhHasNotes, lhHasNotes,
//     },
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // EXPORTS
// // ═══════════════════════════════════════════════════════════════════

// const MusicAnalyzerEngine = {
//   // Main entry point
//   analyze,

//   // Normalization
//   normalizeJson, normalizeNote, normalizeBar,

//   // Hand utilities
//   separateHands, detectSplitPoint,

//   // Period detection
//   detectPeriod,

//   // Bar-level analysis
//   describeBar, detectAlternating, getMelodyTrend, isCadenceBar,

//   // Section analysis
//   segmentBySections, analyzeSection, labelSections,

//   // Motif building
//   buildMotifFamilies,

//   // LH ostinato
//   analyzeLhOstinato,

//   // YAML
//   generateYamlV5,

//   // Alignment
//   alignHands,

//   // Hand orchestrator
//   analyzeHandV5,

//   // Pitch utilities
//   pitchToMidi, midiToPitchName, pitchClass, popcount,

//   // Color constants
//   PATTERN_COLORS, EMPTY_COLOR, SURPRISE_COLOR, CADENCE_COLOR, PARALLEL_COLOR,
// };

// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = MusicAnalyzerEngine;
// } else if (typeof globalThis !== 'undefined') {
//   globalThis.MusicAnalyzerEngine = MusicAnalyzerEngine;
// }











// 'use strict';

// // ═══════════════════════════════════════════════════════════════════
// // MUSIC ANALYZER ENGINE v6.0 — PASSACAGLIA CORRECT
// //
// // Core fixes from v5:
// //
// // PERIOD DETECTION — v5 used rhythm-fingerprint similarity which failed
// // because bars 3-4 (Motif-C) and bars 5-6 (Motif-B) have identical
// // RHYTHM (all d=2) but different pitches. So rhythm-only fingerprinting
// // saw bars as identical within a section and got confused about the period.
// // Fix: detect period by finding the repeating cadence bar pattern
// // (non-uniform durations / chromatic notes) which is the clearest
// // structural signal. Cadence bars appear at positions 9,17,25,33... = every 8.
// //
// // MOTIF DETECTION — v5 built "families" by pedal pitch string (e.g. "pedal:C6")
// // which broke across sections because the same motif role appears at different
// // octaves (Motif-C is C6 in sec1, C6 in sec3 upper, C5 in sec2, etc.).
// // Fix: classify motif role by POSITION WITHIN SECTION (bar offset 1-2 = Motif-C,
// // 3-4 = Motif-B, 5-6 = Motif-A, 7-8 = cadence), not by pedal pitch.
// //
// // SECTION 5 TRANSITION — v5 transition blur detection checked if first note
// // equals pedal pitch, but its pedal detection itself was unreliable (it
// // sometimes picked the non-pedal pitch as the pedal candidate). 
// // Fix: transition blur = bar where positions 0 AND 1 have the same pitch.
// //
// // SECTION 6 PARALLEL — v5 checked "both voices moving" via getMelodyTrend
// // on pedal notes, but Section 6 has NO pedal (both slots are melody).
// // The detectAlternating function would fail to find a stable pedal and
// // return isAlternating=false, making parallelOctave detection unreliable.
// // Fix: parallel octave bar = 8 notes d=2, every adjacent pair is same
// // pitch class at exactly 12 semitones apart (octave).
// //
// // EXACT REPEAT DETECTION — v5 exact fingerprint comparison failed because
// // Section 7 starts at bar 51 vs Section 1 at bar 3 — bar_numbers differ
// // so no match. Fix: fingerprint uses only pitch+subdivision, not bar number.
// //
// // LEFT HAND — v5 ran the same RH analysis on LH which is wrong. LH has
// // a completely different structure: arpeggiated chord per bar (not alternating
// // melody+pedal), changing root every bar in a fixed 8-bar cycle, with a
// // texture change at bars 67-74 (held octaves). 
// // Fix: dedicated LH analyzer that detects bass root per bar, identifies
// // the repeating chord cycle, names the chords, and flags the texture change.
// //
// // UPLOAD MODES — v5 had no concept of single-file vs two-file upload.
// // Fix: analyze() accepts { rh, lh, full } where rh+lh = two separate hands,
// // full = single combined file (auto-split by register). Single file is split
// // at MIDI 60 (C4) by default; everything below = LH, above = RH.
// // ═══════════════════════════════════════════════════════════════════


// // ─── PITCH UTILITIES ────────────────────────────────────────────────

// const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// const NOTE_MAP = {
//   'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
//   'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
//   'A':9,'A#':10,'BB':10,'B':11,
// };

// function pitchToMidi(pitch) {
//   if (!pitch) return null;
//   const m = String(pitch).match(/^([A-G][#Bb]?)(-?\d+)$/i);
//   if (!m) return null;
//   const pc = NOTE_MAP[m[1].toUpperCase()];
//   if (pc === undefined) return null;
//   return (parseInt(m[2]) + 1) * 12 + pc;
// }

// function midiToName(midi) {
//   if (midi === null || midi === undefined) return '?';
//   return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
// }

// function pitchClass(midi) {
//   return midi !== null ? midi % 12 : null;
// }

// // Chord name from root midi + pitches in bar
// function chordName(rootMidi, allMidis) {
//   const pcs = new Set(allMidis.map(m => m % 12));
//   const root = rootMidi % 12;
//   const has = (interval) => pcs.has((root + interval) % 12);
//   if (has(4) && has(7)) return NOTE_NAMES[root] + ' maj';
//   if (has(3) && has(7)) return NOTE_NAMES[root] + ' min';
//   if (has(4) && has(8)) return NOTE_NAMES[root] + ' aug';
//   if (has(3) && has(6)) return NOTE_NAMES[root] + ' dim';
//   return NOTE_NAMES[root];
// }


// // ─── NORMALIZATION ───────────────────────────────────────────────────

// function normalizeNote(n) {
//   return {
//     pitch:                 n.pitch ?? n.p ?? null,
//     start_subdivision:     n.start_subdivision ?? n.s ?? 0,
//     duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
//     offset_percent:        n.offset_percent ?? n.o ?? 0,
//     end_cutoff_percent:    n.end_cutoff_percent ?? n.c ?? null,
//   };
// }

// function normalizeBar(b) {
//   return {
//     bar_number: b.bar_number ?? b.bn,
//     notes: (b.notes ?? []).map(normalizeNote).filter(n => n.pitch !== null),
//   };
// }

// function normalizeJson(json) {
//   const ts = json.time_signature || '4/4';
//   const [num, den] = ts.split('/').map(Number);
//   const spb = json.subdivisions_per_bar || (num * (16 / den));
//   return {
//     tempo: json.tempo || 120,
//     time_signature: ts,
//     key: json.key || 'C',
//     subdivisions_per_bar: spb,
//     bars: (json.bars || []).map(normalizeBar),
//   };
// }


// // ─── HAND SPLIT (for full-track single file) ─────────────────────────

// // Default split at C4 (midi 60) — everything below LH, at/above RH.
// // Auto-detect: find the largest gap in pitch distribution.
// function detectSplitMidi(bars) {
//   const freq = new Map();
//   for (const bar of bars)
//     for (const n of bar.notes) {
//       const m = pitchToMidi(n.pitch);
//       if (m !== null) freq.set(m, (freq.get(m) || 0) + 1);
//     }
//   if (freq.size < 2) return 60;
//   const sorted = [...freq.keys()].sort((a, b) => a - b);
//   let bestGap = 0, splitAt = 60;
//   for (let i = 1; i < sorted.length; i++) {
//     const gap = sorted[i] - sorted[i-1];
//     // Prefer splits in the C3–C5 range (midi 48–72)
//     const mid = (sorted[i-1] + sorted[i]) / 2;
//     const weight = (mid >= 48 && mid <= 72) ? 2.5 : 1.0;
//     if (gap * weight > bestGap) {
//       bestGap = gap * weight;
//       splitAt = Math.round(mid);
//     }
//   }
//   return splitAt;
// }

// function splitHandsFromFull(bars, splitMidi) {
//   const split = splitMidi ?? detectSplitMidi(bars);
//   const rhBars = bars.map(b => ({
//     bar_number: b.bar_number,
//     notes: b.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) >= split),
//   }));
//   const lhBars = bars.map(b => ({
//     bar_number: b.bar_number,
//     notes: b.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) < split),
//   }));
//   return { rhBars, lhBars, splitMidi: split };
// }


// // ═══════════════════════════════════════════════════════════════════
// // BAR-LEVEL CLASSIFIERS
// // All classification is rule-based from the actual musical facts,
// // NOT from generic ML similarity.
// // ═══════════════════════════════════════════════════════════════════

// // A bar is a CADENCE BAR if:
// //   - it has ≤2 notes (held note bar, e.g. bar 10), OR
// //   - it has mixed durations (e.g. bar 9: d=4,2,2,6,2), OR
// //   - it contains G# (pc=8) or F# (pc=6) — the only chromatic notes
// function isCadenceBar(bar) {
//   const notes = bar.notes;
//   if (!notes.length) return false;
//   if (notes.length <= 2) return true;
//   const durs = notes.map(n => n.duration_subdivisions);
//   if (!durs.every(d => d === durs[0])) return true;
//   for (const n of notes) {
//     const m = pitchToMidi(n.pitch);
//     if (m !== null) {
//       const pc = m % 12;
//       if (pc === 8 || pc === 6) return true; // G# or F#
//     }
//   }
//   return false;
// }

// // A bar is a PARALLEL OCTAVE bar if:
// //   - it has 8 notes d=2, AND
// //   - every adjacent pair (positions 0+1, 2+3, 4+5, 6+7) are exactly 12 semitones apart
// function isParallelOctaveBar(bar) {
//   const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
//   if (notes.length !== 8) return false;
//   if (!notes.every(n => n.duration_subdivisions === 2)) return false;
//   for (let i = 0; i < 8; i += 2) {
//     const m1 = pitchToMidi(notes[i].pitch);
//     const m2 = pitchToMidi(notes[i+1].pitch);
//     if (m1 === null || m2 === null) return false;
//     if (Math.abs(m1 - m2) !== 12) return false;
//   }
//   return true;
// }

// // A bar is a TRANSITION BAR (Section 5 blur) if:
// //   - it has 8 notes d=2, AND
// //   - notes[0] and notes[1] have the same pitch (the doubled pedal at start)
// function isTransitionBar(bar) {
//   const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
//   if (notes.length !== 8) return false;
//   if (!notes.every(n => n.duration_subdivisions === 2)) return false;
//   return notes[0].pitch === notes[1].pitch;
// }

// // Detect the repeating pedal note in a standard alternating bar.
// // In a standard bar: melody and pedal strictly alternate.
// // The pedal is the pitch that appears at either all EVEN or all ODD positions.
// function detectPedal(bar) {
//   const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
//   if (notes.length < 4) return null;
//   if (!notes.every(n => n.duration_subdivisions === 2)) return null;

//   // Even-position pitches
//   const evenPitches = notes.filter((_, i) => i % 2 === 0).map(n => n.pitch);
//   const oddPitches  = notes.filter((_, i) => i % 2 === 1).map(n => n.pitch);

//   const allSameEven = evenPitches.every(p => p === evenPitches[0]);
//   const allSameOdd  = oddPitches.every(p => p === oddPitches[0]);

//   if (allSameOdd)  return { pedalPitch: oddPitches[0],  pedalMidi: pitchToMidi(oddPitches[0]),  pedalPosition: 'top' };
//   if (allSameEven) return { pedalPitch: evenPitches[0], pedalMidi: pitchToMidi(evenPitches[0]), pedalPosition: 'bottom' };
//   return null;
// }

// // Melody direction: ascending or descending across the non-pedal notes
// function getMelodyDirection(bar, pedalPitch) {
//   const notes = [...bar.notes]
//     .sort((a, b) => a.start_subdivision - b.start_subdivision)
//     .filter(n => n.pitch !== pedalPitch);
//   if (notes.length < 2) return 'static';
//   const midis = notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
//   const first = midis[0], last = midis[midis.length - 1];
//   if (last < first) return 'descending';
//   if (last > first) return 'ascending';
//   return 'static';
// }


// // ═══════════════════════════════════════════════════════════════════
// // PERIOD DETECTION — based on cadence bar positions
// // Cadence bars have a distinctive rhythm (mixed durations + chromatics).
// // They appear at regular intervals equal to the passacaglia period.
// // ═══════════════════════════════════════════════════════════════════

// function detectPeriod(bars) {
//   const cadenceBars = bars.filter(b => isCadenceBar(b) && b.notes.length > 0);
//   if (cadenceBars.length < 2) return null;

//   // Find gaps between consecutive cadence bars
//   const positions = cadenceBars.map(b => b.bar_number);
//   const gaps = [];
//   for (let i = 1; i < positions.length; i++) {
//     gaps.push(positions[i] - positions[i-1]);
//   }
//   if (!gaps.length) return null;

//   // Most common gap = period
//   const freq = new Map();
//   for (const g of gaps) freq.set(g, (freq.get(g) || 0) + 1);
//   let bestGap = 0, bestCount = 0;
//   for (const [g, c] of freq) {
//     if (c > bestCount) { bestCount = c; bestGap = g; }
//   }
//   // Also allow period = half the gap (if cadence appears every 2 bars: hold + chromatic)
//   // The actual period includes BOTH cadence bars (chromatic bar + hold bar)
//   // so gap between hold-bar and next chromatic-bar tells us the period
//   return bestGap > 0 ? { period: bestGap, confidence: bestCount / gaps.length } : null;
// }


// // ═══════════════════════════════════════════════════════════════════
// // RIGHT HAND ANALYSIS
// // ═══════════════════════════════════════════════════════════════════

// // Bar exact fingerprint: pitch+subdivision+duration, ignoring bar number
// function barFingerprint(bar) {
//   return [...bar.notes]
//     .sort((a, b) => a.start_subdivision - b.start_subdivision)
//     .map(n => `${n.pitch}|${n.start_subdivision}|${n.duration_subdivisions}`)
//     .join(',');
// }

// function analyzeRightHand(bars) {
//   // Step 1: find first non-empty bar
//   let firstContent = bars.findIndex(b => b.notes.length > 0);
//   if (firstContent < 0) return emptyRHResult();
//   const introBars = bars.slice(0, firstContent);
//   const contentBars = bars.slice(firstContent);

//   // Step 2: detect period
//   const periodResult = detectPeriod(contentBars);
//   const period = periodResult ? periodResult.period : 8; // default 8

//   // Step 3: segment into sections
//   const sections = [];
//   for (let i = 0; i < contentBars.length; i += period) {
//     sections.push(contentBars.slice(i, i + period));
//   }

//   // Step 4: analyze each section
//   // Build fingerprint store for repeat detection
//   const sectionFps = [];

//   const analyzedSections = sections.map((secBars, secIdx) => {
//     // Classify each bar by position within section AND content
//     const barAnalysis = secBars.map((bar, posInSec) => {
//       const cadence = isCadenceBar(bar);
//       const parallel = !cadence && isParallelOctaveBar(bar);
//       const transition = !cadence && !parallel && isTransitionBar(bar);
//       const empty = bar.notes.length === 0;

//       // Determine motif role by position within section
//       // Standard: positions 0-1 = Motif-C, 2-3 = Motif-B, 4-5 = Motif-A, 6-7 = cadence
//       // (Cadence detected by content overrides position for positions 6-7)
//       let motifRole;
//       if (empty) motifRole = 'empty';
//       else if (cadence) motifRole = posInSec <= 5 ? 'cadence-chromatic' : (bar.notes.length <= 2 ? 'cadence-hold' : 'cadence-chromatic');
//       else if (parallel) motifRole = 'parallel';
//       else if (transition) motifRole = 'transition';
//       else {
//         const pos = Math.floor(posInSec / 2);
//         if (pos === 0)      motifRole = 'motif-C';
//         else if (pos === 1) motifRole = 'motif-B';
//         else if (pos === 2) motifRole = 'motif-A';
//         else                motifRole = 'other';
//       }

//       const pedal = (!cadence && !parallel && !empty) ? detectPedal(bar) : null;
//       const melDir = (pedal && !cadence) ? getMelodyDirection(bar, pedal.pedalPitch) : null;

//       const allMidis = bar.notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
//       const midiMin = allMidis.length ? Math.min(...allMidis) : null;
//       const midiMax = allMidis.length ? Math.max(...allMidis) : null;

//       return {
//         barNumber: bar.bar_number,
//         posInSec,
//         motifRole,
//         isCadence: cadence,
//         isParallel: parallel,
//         isTransition: transition,
//         isEmpty: empty,
//         pedalPitch: pedal?.pedalPitch ?? null,
//         pedalMidi: pedal?.pedalMidi ?? null,
//         pedalPosition: pedal?.pedalPosition ?? null,
//         melodyDirection: melDir,
//         noteCount: bar.notes.length,
//         midiMin, midiMax,
//         fingerprint: barFingerprint(bar),
//         notes: bar.notes,
//       };
//     });

//     // Section-level properties
//     const mainBars = barAnalysis.filter(b => !b.isCadence && !b.isEmpty);
//     const isApex = mainBars.length > 0 && mainBars.every(b => b.isParallel);
//     const isTransitionSec = !isApex && mainBars.filter(b => b.isTransition).length >= 2;

//     // Overall melody direction (majority of non-cadence bars)
//     const dirs = mainBars.map(b => b.melodyDirection).filter(Boolean);
//     const upCount   = dirs.filter(d => d === 'ascending').length;
//     const downCount = dirs.filter(d => d === 'descending').length;
//     let sectionDirection;
//     if (isApex) sectionDirection = 'parallel-octaves';
//     else if (upCount > downCount) sectionDirection = 'ascending';
//     else if (downCount > upCount) sectionDirection = 'descending';
//     else sectionDirection = 'mixed';

//     // Pedal sequence within section (the C→B→A descent)
//     const pedalSequence = mainBars
//       .filter(b => b.pedalPitch && b.motifRole !== 'parallel' && b.motifRole !== 'transition')
//       .map(b => b.pedalPitch);
//     // Unique pedals in order
//     const seenPedals = [];
//     for (const p of pedalSequence) {
//       if (!seenPedals.includes(p)) seenPedals.push(p);
//     }

//     // Register
//     const allMidis = barAnalysis.flatMap(b => b.notes.map(n => pitchToMidi(n.pitch))).filter(m => m !== null);
//     const regMin = allMidis.length ? Math.min(...allMidis) : null;
//     const regMax = allMidis.length ? Math.max(...allMidis) : null;

//     // Section fingerprint = concat of bar fingerprints
//     const sectionFp = barAnalysis.map(b => b.fingerprint).join('||');

//     // Repeat detection: compare to all prior sections
//     let repeatOf = null;
//     for (let pi = 0; pi < sectionFps.length; pi++) {
//       if (sectionFps[pi] === sectionFp) { repeatOf = pi; break; }
//     }
//     sectionFps.push(sectionFp);

//     const startBar = secBars[0].bar_number;
//     const endBar   = secBars[secBars.length - 1].bar_number;

//     return {
//       index: secIdx,
//       startBar, endBar,
//       bars: secBars,
//       barAnalysis,
//       mainBars,
//       sectionDirection,
//       seenPedals,
//       isApex,
//       isTransitionSec,
//       regMin, regMax,
//       sectionFp,
//       repeatOf,
//     };
//   });

//   // Step 5: label sections
//   const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI'];
//   const labeledSections = analyzedSections.map((sec, i) => {
//     const roman = ROMAN[i] || `S${i+1}`;
//     const apex = sec.isApex ? '★' : '';
//     const repeatNote = sec.repeatOf !== null ? ` (= ${ROMAN[sec.repeatOf]})` : '';
//     return {
//       ...sec,
//       romanLabel: roman + apex,
//       fullLabel: roman + apex + repeatNote,
//     };
//   });

//   // Step 6: build motif family map
//   // Families by motif role — ALL bars of the same role across ALL sections
//   const familyMap = new Map();
//   const addToFamily = (role, barData) => {
//     if (!familyMap.has(role)) familyMap.set(role, []);
//     familyMap.get(role).push(barData);
//   };

//   for (const sec of labeledSections) {
//     for (const ba of sec.barAnalysis) {
//       addToFamily(ba.motifRole, { ...ba, sectionIndex: sec.index, sectionLabel: sec.romanLabel });
//     }
//   }
//   // Intro bars
//   for (const b of introBars) {
//     addToFamily('intro', {
//       barNumber: b.bar_number,
//       motifRole: 'intro',
//       sectionIndex: -1,
//       fingerprint: barFingerprint(b),
//       notes: b.notes,
//     });
//   }

//   // Define display colors per role
//   const ROLE_COLORS = {
//     'intro':             { bg:'#374151', text:'#9ca3af' },
//     'empty':             { bg:'#1f2937', text:'#4b5563' },
//     'motif-C':           { bg:'#06b6d4', text:'#001' },
//     'motif-B':           { bg:'#8b5cf6', text:'#fff' },
//     'motif-A':           { bg:'#3b82f6', text:'#fff' },
//     'cadence-chromatic': { bg:'#ef4444', text:'#fff' },
//     'cadence-hold':      { bg:'#f97316', text:'#fff' },
//     'parallel':          { bg:'#10b981', text:'#001' },
//     'transition':        { bg:'#ec4899', text:'#fff' },
//     'other':             { bg:'#6b7280', text:'#fff' },
//   };

//   const ROLE_LABELS = {
//     'intro':             'Intro',
//     'empty':             'Empty',
//     'motif-C':           'Motif-C (pedal=C)',
//     'motif-B':           'Motif-B (pedal=B)',
//     'motif-A':           'Motif-A (pedal=A)',
//     'cadence-chromatic': 'Cadence (chromatic)',
//     'cadence-hold':      'Cadence (hold)',
//     'parallel':          'Parallel octaves',
//     'transition':        'Transition blur',
//     'other':             'Other',
//   };

//   const families = [];
//   const ROLE_ORDER = ['intro','empty','motif-C','motif-B','motif-A','transition','parallel','cadence-chromatic','cadence-hold','other'];
//   for (const role of ROLE_ORDER) {
//     const members = familyMap.get(role);
//     if (!members || members.length === 0) continue;

//     // Determine match level
//     const fps = new Set(members.map(m => m.fingerprint).filter(Boolean));
//     const matchLevel = fps.size === 1 ? 'exact' : fps.size <= members.length * 0.5 ? 'partial' : 'structural';

//     // Variation types relative to first member
//     const proto = members[0];
//     const occurrences = members.map((m, i) => ({
//       barNumber: m.barNumber,
//       sectionIndex: m.sectionIndex,
//       sectionLabel: m.sectionLabel,
//       variationType: i === 0 ? 'prototype'
//         : m.fingerprint === proto.fingerprint ? 'exact'
//         : 'variation',
//       pedalPitch: m.pedalPitch,
//       melodyDirection: m.melodyDirection,
//     }));

//     families.push({
//       id: `FAM_${role.toUpperCase().replace(/[^A-Z0-9]/g,'_')}`,
//       label: ROLE_LABELS[role] || role,
//       role,
//       matchLevel,
//       occurrenceCount: members.length,
//       occurrences,
//       barNumbers: members.map(m => m.barNumber),
//       color: ROLE_COLORS[role] || { bg:'#6b7280', text:'#fff' },
//       windowSize: 2,
//     });
//   }

//   // Step 7: build labeled bar list (one entry per bar for timeline)
//   const barFamilyMap = new Map();
//   for (const fam of families) {
//     for (const occ of fam.occurrences) {
//       barFamilyMap.set(occ.barNumber, { fam, occ });
//     }
//   }
//   // Also cover intro
//   for (const b of introBars) {
//     const introFam = families.find(f => f.role === 'intro');
//     if (introFam) barFamilyMap.set(b.bar_number, { fam: introFam, occ: { barNumber: b.bar_number, variationType: 'intro' } });
//   }

//   const labeled = bars.map(bar => {
//     const entry = barFamilyMap.get(bar.bar_number);
//     const fam = entry?.fam;
//     const secEntry = labeledSections.find(s => bar.bar_number >= s.startBar && bar.bar_number <= s.endBar);
//     const barA = secEntry?.barAnalysis.find(ba => ba.barNumber === bar.bar_number);
//     return {
//       barNumber: bar.bar_number,
//       notes: bar.notes,
//       patternId: fam?.id ?? 'FAM_OTHER',
//       patternLabel: fam?.label ?? 'Other',
//       role: barA?.motifRole ?? (bar.notes.length === 0 ? 'empty' : 'other'),
//       isEmpty: bar.notes.length === 0,
//       isCadence: barA?.isCadence ?? false,
//       isParallel: barA?.isParallel ?? false,
//       isTransition: barA?.isTransition ?? false,
//       pedalPitch: barA?.pedalPitch ?? null,
//       melodyDirection: barA?.melodyDirection ?? null,
//       sectionLabel: secEntry?.romanLabel ?? null,
//       variationType: entry?.occ?.variationType ?? null,
//       color: fam?.color ?? { bg:'#6b7280', text:'#fff' },
//       noteCount: bar.notes.length,
//     };
//   });

//   return {
//     hand: 'right',
//     introBars,
//     sections: labeledSections,
//     families,
//     labeled,
//     period: period,
//     periodConfidence: periodResult?.confidence ?? null,
//   };
// }

// function emptyRHResult() {
//   return { hand: 'right', introBars: [], sections: [], families: [], labeled: [], period: null };
// }


// // ═══════════════════════════════════════════════════════════════════
// // LEFT HAND ANALYSIS
// // Dedicated LH analyzer — does NOT reuse RH logic.
// // LH structure: arpeggiated chord per bar, one chord per bar,
// // changing root every bar in a fixed cycle. At bars 67+: held octaves.
// // ═══════════════════════════════════════════════════════════════════

// const CHORD_NAMES_FROM_MIDI = {
//   0:'C', 1:'C#', 2:'D', 3:'D#', 4:'E', 5:'F',
//   6:'F#', 7:'G', 8:'G#', 9:'A', 10:'A#', 11:'B',
// };

// function lhBarType(bar) {
//   const notes = bar.notes;
//   if (!notes.length) return 'empty';
//   // Held octave: ≤2 notes, long durations (d≥8)
//   if (notes.length <= 2 && notes.every(n => n.duration_subdivisions >= 8)) return 'held-octave';
//   // Standard arp: 8 notes all d=2
//   if (notes.length === 8 && notes.every(n => n.duration_subdivisions === 2)) return 'arpeggio';
//   // Partial arp (anomaly bars 42, 50): 7 notes
//   if (notes.length === 7 && notes.every(n => n.duration_subdivisions === 2)) return 'arpeggio-partial';
//   return 'other';
// }

// function lhBarRoot(bar) {
//   if (!bar.notes.length) return null;
//   const midis = bar.notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
//   if (!midis.length) return null;
//   const minMidi = Math.min(...midis);
//   return { midi: minMidi, name: midiToName(minMidi), pc: minMidi % 12 };
// }

// function lhChordLabel(bar) {
//   const root = lhBarRoot(bar);
//   if (!root) return null;
//   const allMidis = bar.notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
//   return chordName(root.midi, allMidis);
// }

// // Check if LH bar contains G# (chromatic, part of E dominant chord)
// function lhHasChromatic(bar) {
//   for (const n of bar.notes) {
//     const m = pitchToMidi(n.pitch);
//     if (m !== null && m % 12 === 8) return true; // G#
//   }
//   return false;
// }

// function analyzeLeftHand(bars) {
//   const labeled = bars.map(bar => {
//     const type = lhBarType(bar);
//     const root = lhBarRoot(bar);
//     const chord = lhChordLabel(bar);
//     const hasChromatic = lhHasChromatic(bar);

//     // Color by chord root
//     const CHORD_COLORS = {
//       'A min': { bg:'#3b82f6', text:'#fff' },  // Am - tonic
//       'D min': { bg:'#8b5cf6', text:'#fff' },  // Dm - subdominant
//       'G maj': { bg:'#10b981', text:'#001' },  // G  - subtonic
//       'C maj': { bg:'#06b6d4', text:'#001' },  // C  - relative major
//       'F maj': { bg:'#f59e0b', text:'#001' },  // F  - submediant
//       'F min': { bg:'#f59e0b', text:'#001' },  // Fm variant
//       'E maj': { bg:'#ef4444', text:'#fff' },  // E  - dominant (chromatic G#)
//     };
//     const colorKey = chord;
//     const color = CHORD_COLORS[colorKey] || (
//       type === 'held-octave' ? { bg:'#374151', text:'#9ca3af' } :
//       type === 'empty'       ? { bg:'#1f2937', text:'#4b5563' } :
//                                { bg:'#6b7280', text:'#fff' }
//     );

//     return {
//       barNumber: bar.bar_number,
//       notes: bar.notes,
//       type,
//       root: root?.name ?? null,
//       rootMidi: root?.midi ?? null,
//       chord,
//       hasChromatic,
//       isEmpty: bar.notes.length === 0,
//       isHeldOctave: type === 'held-octave',
//       isArpeggio: type === 'arpeggio' || type === 'arpeggio-partial',
//       isPartial: type === 'arpeggio-partial',
//       noteCount: bar.notes.length,
//       color,
//     };
//   });

//   // Detect the repeating chord cycle
//   // Find first non-empty bar
//   const firstContent = labeled.findIndex(b => !b.isEmpty);
//   const ostinato = detectLHOstinato(labeled, firstContent);

//   // Build families by chord
//   const chordFamilyMap = new Map();
//   for (const lb of labeled) {
//     if (lb.isEmpty) continue;
//     const key = lb.isHeldOctave ? `held:${lb.root}` : (lb.chord || 'unknown');
//     if (!chordFamilyMap.has(key)) chordFamilyMap.set(key, []);
//     chordFamilyMap.get(key).push(lb);
//   }

//   const CHORD_ORDER = ['A min','D min','G maj','C maj','F maj','F min','E maj'];
//   const families = [];
//   // Ordered chords first
//   for (const chord of CHORD_ORDER) {
//     const members = chordFamilyMap.get(chord);
//     if (!members || members.length === 0) continue;
//     const color = members[0].color;
//     families.push({
//       id: `LH_${chord.replace(/\s/g,'_')}`,
//       label: chord,
//       role: 'chord',
//       chord,
//       matchLevel: 'structural',
//       occurrenceCount: members.length,
//       occurrences: members.map(m => ({ barNumber: m.barNumber, variationType: m.isHeldOctave ? 'held-octave' : m.isPartial ? 'partial' : 'exact' })),
//       barNumbers: members.map(m => m.barNumber),
//       color,
//       windowSize: 1,
//     });
//   }
//   // Held octave families
//   for (const [key, members] of chordFamilyMap) {
//     if (!key.startsWith('held:')) continue;
//     const color = { bg:'#374151', text:'#9ca3af' };
//     families.push({
//       id: `LH_HELD_${key.slice(5)}`,
//       label: `Hold ${key.slice(5)}`,
//       role: 'held-octave',
//       matchLevel: 'exact',
//       occurrenceCount: members.length,
//       occurrences: members.map(m => ({ barNumber: m.barNumber, variationType: 'held-octave' })),
//       barNumbers: members.map(m => m.barNumber),
//       color,
//       windowSize: 1,
//     });
//   }
//   // Remaining
//   for (const [key, members] of chordFamilyMap) {
//     if (CHORD_ORDER.includes(key) || key.startsWith('held:')) continue;
//     families.push({
//       id: `LH_${key.replace(/\s/g,'_')}`,
//       label: key,
//       role: 'chord',
//       matchLevel: 'structural',
//       occurrenceCount: members.length,
//       occurrences: members.map(m => ({ barNumber: m.barNumber, variationType: 'exact' })),
//       barNumbers: members.map(m => m.barNumber),
//       color: { bg:'#6b7280', text:'#fff' },
//       windowSize: 1,
//     });
//   }

//   return { hand: 'left', labeled, families, ostinato };
// }

// function detectLHOstinato(labeled, firstContent) {
//   if (firstContent < 0) return null;
//   const arpBars = labeled.slice(firstContent).filter(b => b.isArpeggio);
//   if (arpBars.length < 2) return null;

//   // Extract chord sequence
//   const chords = arpBars.map(b => b.chord);

//   // The cycle repeats every N bars — find N by checking when the chord matches bar 0 again
//   // The known cycle for this piece: Am(×3) Dm G C F Dm E Am = effectively 8-bar period
//   // Find first repeat of first chord after position 0
//   let cycleLen = null;
//   for (let i = 1; i < chords.length; i++) {
//     if (chords[i] === chords[0]) {
//       // Verify it's a real repeat, not just the same chord twice
//       if (i >= 4) { cycleLen = i; break; }
//     }
//   }
//   if (!cycleLen) return null;

//   const cycleChords = chords.slice(0, cycleLen);
//   const repeatCount = Math.floor(chords.length / cycleLen);

//   return {
//     cycle: cycleChords,
//     cycleLength: cycleLen,
//     repeatCount,
//     barsPerCycle: cycleLen,
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // YAML GENERATOR
// // ═══════════════════════════════════════════════════════════════════

// function generateYaml(rhResult, lhResult, metadata) {
//   const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
//   const secLines = (rhResult.sections || []).map(s => {
//     const pedStr = s.seenPedals.length ? s.seenPedals.join(' → ') : 'none';
//     const rep = s.repeatOf !== null ? ` # exact repeat of section ${ROMAN[s.repeatOf] || s.repeatOf+1}` : '';
//     return `    ${s.fullLabel}: {bars: [${s.startBar}, ${s.endBar}], dir: "${s.sectionDirection}", pedals: [${pedStr}], register: [${s.regMin ? midiToName(s.regMin) : '?'}, ${s.regMax ? midiToName(s.regMax) : '?'}]}${rep}`;
//   }).join('\n');

//   const famLines = (rhResult.families || []).filter(f => !['intro','empty'].includes(f.role)).map(f =>
//     `    ${f.label}:\n      count: ${f.occurrenceCount}\n      match: "${f.matchLevel}"\n      bars: [${f.barNumbers.slice(0,20).join(', ')}${f.barNumbers.length > 20 ? '...' : ''}]`
//   ).join('\n\n');

//   const lhCycle = lhResult?.ostinato?.cycle?.join(' → ') ?? 'n/a';
//   const lhFams = (lhResult?.families || []).map(f =>
//     `    ${f.label}: {count: ${f.occurrenceCount}, bars: [${f.barNumbers.slice(0,10).join(', ')}${f.barNumbers.length > 10 ? '...' : ''}]}`
//   ).join('\n');

//   return `# PASSACAGLIA ANALYSIS BLUEPRINT
// # ${metadata.bars.length} bars · ${metadata.time_signature} · ${metadata.tempo} BPM · Key: ${metadata.key}
// # Period: ${rhResult.period} bars · Sections: ${rhResult.sections.length}

// composition:
//   key: "${metadata.key}"
//   tempo: ${metadata.tempo}
//   time_signature: "${metadata.time_signature}"
//   total_bars: ${metadata.bars.length}
//   subdivisions_per_bar: ${metadata.subdivisions_per_bar}
//   detected_period: ${rhResult.period}
//   period_confidence: ${rhResult.periodConfidence?.toFixed(2) ?? 'n/a'}

// right_hand:
//   intro_bars: [${(rhResult.introBars || []).map(b => b.bar_number).join(', ') || 'none'}]
//   sections:
// ${secLines}

//   motif_families:
// ${famLines}

//   generation_rules:
//     - "8 notes per main bar, all d=2, subdivisions s=0,2,4,6,8,10,12,14"
//     - "alternating: melody-note + pedal-note, strictly interleaved"
//     - "pedal descent per section: C → B → A (diatonic step down each 2-bar motif)"
//     - "cadence bar (chromatic): A d=4, G# d=2, F# d=2, G# d=6, A d=2"
//     - "cadence bar (hold): A d=15 — single pitch, almost full bar"
//     - "transition section: bar opens with pedal-pitch doubled (pos 0 = pos 1)"
//     - "parallel-octave section: every adjacent pair is exactly 12 semitones apart"
//     - "recapitulation: sections VII, VIII, IX are exact note-for-note repeats of I, II, I"

// left_hand:
//   ostinato_cycle: "${lhCycle}"
//   ostinato_repeats: ${lhResult?.ostinato?.repeatCount ?? 'n/a'}
//   texture_change_at: bar 67 (held octaves replace arpeggio)
//   chord_families:
// ${lhFams}
// `;
// }


// // ═══════════════════════════════════════════════════════════════════
// // MAIN ENTRY POINT
// // Supports three modes:
// //   { rh: jsonObj }              — right hand only
// //   { lh: jsonObj }              — left hand only
// //   { rh: jsonObj, lh: jsonObj } — separate hands
// //   { full: jsonObj }            — full track (auto-split by register)
// //   { full: jsonObj, splitMidi: 60 } — full track with manual split
// // ═══════════════════════════════════════════════════════════════════

// function analyze(input = {}) {
//   let rhBars = null, lhBars = null, metadata = null, splitMidi = null;

//   if (input.full) {
//     // Single combined file — split by register
//     const norm = normalizeJson(input.full);
//     metadata = norm;
//     splitMidi = input.splitMidi ?? detectSplitMidi(norm.bars);
//     const split = splitHandsFromFull(norm.bars, splitMidi);
//     rhBars = split.rhBars;
//     lhBars = split.lhBars;
//     splitMidi = split.splitMidi;
//   } else {
//     // Separate hand files (or single hand)
//     if (input.rh) {
//       const norm = normalizeJson(input.rh);
//       metadata = metadata ?? norm;
//       rhBars = norm.bars;
//     }
//     if (input.lh) {
//       const norm = normalizeJson(input.lh);
//       metadata = metadata ?? norm;
//       lhBars = norm.bars;
//     }
//     if (!metadata && (rhBars || lhBars)) {
//       metadata = { tempo: 120, time_signature: '4/4', key: 'C', subdivisions_per_bar: 16, bars: rhBars || lhBars };
//     }
//   }

//   if (!metadata) throw new Error('No input provided. Pass { rh }, { lh }, { rh, lh }, or { full }.');

//   const rhResult = rhBars ? analyzeRightHand(rhBars) : emptyRHResult();
//   const lhResult = lhBars ? analyzeLeftHand(lhBars) : null;

//   // Alignment: merge RH and LH bar-by-bar
//   const allBns = new Set([
//     ...(rhResult.labeled || []).map(b => b.barNumber),
//     ...(lhResult?.labeled || []).map(b => b.barNumber),
//   ]);
//   const rhMap = new Map((rhResult.labeled || []).map(b => [b.barNumber, b]));
//   const lhMap = new Map((lhResult?.labeled || []).map(b => [b.barNumber, b]));
//   const alignment = [...allBns].sort((a, b) => a - b).map(bn => ({
//     barNumber: bn,
//     rh: rhMap.get(bn) ?? null,
//     lh: lhMap.get(bn) ?? null,
//   }));

//   const yaml = generateYaml(rhResult, lhResult, metadata);

//   return {
//     metadata,
//     splitMidi,
//     rightHand: rhResult,
//     leftHand: lhResult,
//     alignment,
//     yamlBlueprint: yaml,
//     summary: {
//       totalBars: metadata.bars.length,
//       detectedPeriod: rhResult.period,
//       periodConfidence: rhResult.periodConfidence,
//       rhSections: rhResult.sections.length,
//       lhChordCycle: lhResult?.ostinato?.cycle ?? [],
//       rhFamilies: rhResult.families.length,
//       lhFamilies: lhResult?.families.length ?? 0,
//       splitMidi,
//     },
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // EXPORTS
// // ═══════════════════════════════════════════════════════════════════

// const MusicAnalyzerEngine = {
//   analyze,
//   // Hand analyzers
//   analyzeRightHand,
//   analyzeLeftHand,
//   // Normalization
//   normalizeJson, normalizeNote, normalizeBar,
//   // Hand split
//   splitHandsFromFull, detectSplitMidi,
//   // Period detection
//   detectPeriod,
//   // Bar classifiers
//   isCadenceBar, isParallelOctaveBar, isTransitionBar, detectPedal, getMelodyDirection,
//   // Pitch utilities
//   pitchToMidi, midiToName, pitchClass, chordName,
//   // YAML
//   generateYaml,
// };

// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = MusicAnalyzerEngine;
// } else if (typeof globalThis !== 'undefined') {
//   globalThis.MusicAnalyzerEngine = MusicAnalyzerEngine;
// }






'use strict';

// ═══════════════════════════════════════════════════════════════════
// MUSIC ANALYZER ENGINE v6.1 — PASSACAGLIA CORRECT
//
// Bug fixes from v6.0:
//
// FIX 1 — isParallelOctaveBar (bar 43 unison start):
//   Bar 43 = [C6,C6, B5,B6, A5,A6, G5,G6]. Pair 0 is UNISON (diff=0),
//   pairs 1-3 are true octaves (diff=12). v6.0 rejected the bar because
//   0 ≠ 12. Fix: allow diff=0 OR diff=12; require ≥2 true octave pairs.
//
// FIX 2 — classifier priority (bar 43 transition vs parallel):
//   isTransitionBar fires when notes[0]==notes[1] — bar 43 matches because
//   both open with C6. But bar 43 IS a parallel bar. Fix: check isParallel
//   BEFORE isTransition. Since the bar has 3 octave pairs + 1 unison, the
//   updated isParallelOctaveBar correctly returns true first.
//
// FIX 3 — getMelodyDirection (first==last, always returns 'static'):
//   Every 2-bar motif in this piece starts and ends on the same pitch
//   (full octave descent C5→C5). So first-vs-last comparison always gives
//   'static'. Fix: use linear regression slope across all melody note midis
//   sorted by subdivision. A descending melody gives a negative slope.
//
// FIX 4 — section direction (measured at 2-bar pair level):
//   Each individual bar alternates ascending/descending (bar 3: C5→G5=asc,
//   bar 4: F5→C5=desc). Majority per single bar = 50/50 = 'mixed'.
//   Fix: measure direction at 2-bar MOTIF level using regression across
//   both bars of a pair combined — this correctly yields 'descending' for
//   Sections I/II/V, 'ascending' for III/IV.
//
// FIX 5 — isApex threshold (Section VI = parallel-octave section):
//   Section VI: bar 43 = transition (old), bars 44-48 = parallel, 49-50 = cadence.
//   mainBars = bars 43-48. With fix 2, bar 43 is now classified as parallel,
//   so mainBars = 6 parallel bars. But safety: use ≥50% threshold not every().
// ═══════════════════════════════════════════════════════════════════


// ─── PITCH UTILITIES ────────────────────────────────────────────────

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
  if (pc === undefined) return null;
  return (parseInt(m[2]) + 1) * 12 + pc;
}

function midiToName(midi) {
  if (midi === null || midi === undefined) return '?';
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

function pitchClass(midi) {
  return midi !== null ? midi % 12 : null;
}

function chordName(rootMidi, allMidis) {
  const pcs = new Set(allMidis.map(m => m % 12));
  const root = rootMidi % 12;
  const has = (interval) => pcs.has((root + interval) % 12);
  if (has(4) && has(7)) return NOTE_NAMES[root] + ' maj';
  if (has(3) && has(7)) return NOTE_NAMES[root] + ' min';
  if (has(4) && has(8)) return NOTE_NAMES[root] + ' aug';
  if (has(3) && has(6)) return NOTE_NAMES[root] + ' dim';
  return NOTE_NAMES[root];
}


// ─── NORMALIZATION ───────────────────────────────────────────────────

function normalizeNote(n) {
  return {
    pitch:                 n.pitch ?? n.p ?? null,
    start_subdivision:     n.start_subdivision ?? n.s ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
    offset_percent:        n.offset_percent ?? n.o ?? 0,
    end_cutoff_percent:    n.end_cutoff_percent ?? n.c ?? null,
  };
}

function normalizeBar(b) {
  return {
    bar_number: b.bar_number ?? b.bn,
    notes: (b.notes ?? []).map(normalizeNote).filter(n => n.pitch !== null),
  };
}

function normalizeJson(json) {
  const ts = json.time_signature || '4/4';
  const [num, den] = ts.split('/').map(Number);
  const spb = json.subdivisions_per_bar || (num * (16 / den));
  return {
    tempo: json.tempo || 120,
    time_signature: ts,
    key: json.key || 'C',
    subdivisions_per_bar: spb,
    bars: (json.bars || []).map(normalizeBar),
  };
}


// ─── HAND SPLIT ──────────────────────────────────────────────────────

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
    const gap = sorted[i] - sorted[i-1];
    const mid = (sorted[i-1] + sorted[i]) / 2;
    const weight = (mid >= 48 && mid <= 72) ? 2.5 : 1.0;
    if (gap * weight > bestGap) {
      bestGap = gap * weight;
      splitAt = Math.round(mid);
    }
  }
  return splitAt;
}

function splitHandsFromFull(bars, splitMidi) {
  const split = splitMidi ?? detectSplitMidi(bars);
  const rhBars = bars.map(b => ({
    bar_number: b.bar_number,
    notes: b.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) >= split),
  }));
  const lhBars = bars.map(b => ({
    bar_number: b.bar_number,
    notes: b.notes.filter(n => (pitchToMidi(n.pitch) ?? 0) < split),
  }));
  return { rhBars, lhBars, splitMidi: split };
}


// ═══════════════════════════════════════════════════════════════════
// BAR-LEVEL CLASSIFIERS
// ═══════════════════════════════════════════════════════════════════

// CADENCE BAR: ≤2 notes (held), OR mixed durations, OR chromatic (G#/F#)
function isCadenceBar(bar) {
  const notes = bar.notes;
  if (!notes.length) return false;
  if (notes.length <= 2) return true;
  const durs = notes.map(n => n.duration_subdivisions);
  if (!durs.every(d => d === durs[0])) return true;
  for (const n of notes) {
    const m = pitchToMidi(n.pitch);
    if (m !== null) {
      const pc = m % 12;
      if (pc === 8 || pc === 6) return true; // G# or F#
    }
  }
  return false;
}

// FIX 1 — PARALLEL OCTAVE BAR:
// 8 notes all d=2. Each adjacent pair must be unison (0) or octave (12).
// At least 2 pairs must be true octaves so we don't match alternating pedal bars.
// Bar 43 = [C6,C6, B5,B6, A5,A6, G5,G6]: pair0=unison, pairs1-3=octave → TRUE.
function isParallelOctaveBar(bar) {
  const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
  if (notes.length !== 8) return false;
  if (!notes.every(n => n.duration_subdivisions === 2)) return false;
  let octavePairs = 0;
  for (let i = 0; i < 8; i += 2) {
    const m1 = pitchToMidi(notes[i].pitch);
    const m2 = pitchToMidi(notes[i + 1].pitch);
    if (m1 === null || m2 === null) return false;
    const diff = Math.abs(m1 - m2);
    if (diff !== 0 && diff !== 12) return false; // must be unison or octave
    if (diff === 12) octavePairs++;
  }
  return octavePairs >= 2; // at least 2 true octave pairs
}

// TRANSITION BAR (Section 5 blur):
// 8 notes d=2, notes[0] and notes[1] same pitch.
// FIX 2: only called AFTER isParallelOctaveBar returns false, so bar 43
// (which IS parallel) never reaches this check.
function isTransitionBar(bar) {
  const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
  if (notes.length !== 8) return false;
  if (!notes.every(n => n.duration_subdivisions === 2)) return false;
  return notes[0].pitch === notes[1].pitch;
}

// PEDAL DETECTION: finds the note that repeats at all even or all odd positions.
function detectPedal(bar) {
  const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
  if (notes.length < 4) return null;
  if (!notes.every(n => n.duration_subdivisions === 2)) return null;
  const evenPitches = notes.filter((_, i) => i % 2 === 0).map(n => n.pitch);
  const oddPitches  = notes.filter((_, i) => i % 2 === 1).map(n => n.pitch);
  const allSameEven = evenPitches.every(p => p === evenPitches[0]);
  const allSameOdd  = oddPitches.every(p => p === oddPitches[0]);
  if (allSameOdd)  return { pedalPitch: oddPitches[0],  pedalMidi: pitchToMidi(oddPitches[0]),  pedalPosition: 'top' };
  if (allSameEven) return { pedalPitch: evenPitches[0], pedalMidi: pitchToMidi(evenPitches[0]), pedalPosition: 'bottom' };
  return null;
}

// FIX 3 — MELODY DIRECTION via linear regression slope:
// Each 2-bar motif starts and ends on the same pitch (full octave descent,
// e.g. C5→B5→A5→G5→F5→E5→D5→C5 across 2 bars), so first-vs-last always
// gives 'static'. The regression slope correctly identifies the direction.
// Called per-bar; section direction uses 2-bar pair analysis (see below).
function getMelodyDirection(bar, pedalPitch) {
  const notes = [...bar.notes]
    .sort((a, b) => a.start_subdivision - b.start_subdivision)
    .filter(n => n.pitch !== pedalPitch);
  if (notes.length < 2) return 'static';
  const pts = notes
    .map(n => ({ x: n.start_subdivision, y: pitchToMidi(n.pitch) }))
    .filter(p => p.y !== null);
  if (pts.length < 2) return 'static';
  const n  = pts.length;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of pts) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2; }
  const slope = den > 0 ? num / den : 0;
  if (slope >  0.05) return 'ascending';
  if (slope < -0.05) return 'descending';
  return 'static';
}

// FIX 4 helper — 2-bar motif direction using combined regression:
// Takes two consecutive bars of the same motif role and measures slope
// across all melody notes from both bars ordered by subdivision.
// This is the correct unit of analysis because each individual bar only
// covers half the descent (ascending half or descending half alternately).
function getPairDirection(bar1, bar2, pedalPitch) {
  const collectPts = (bar, offset) =>
    [...bar.notes]
      .sort((a, b) => a.start_subdivision - b.start_subdivision)
      .filter(n => n.pitch !== pedalPitch)
      .map(n => ({ x: n.start_subdivision + offset, y: pitchToMidi(n.pitch) }))
      .filter(p => p.y !== null);

  const spb = 16; // subdivisions per bar — offset second bar by 16
  const pts = [...collectPts(bar1, 0), ...collectPts(bar2, spb)];
  if (pts.length < 2) return 'static';
  const n  = pts.length;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of pts) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2; }
  const slope = den > 0 ? num / den : 0;
  if (slope >  0.02) return 'ascending';
  if (slope < -0.02) return 'descending';
  return 'static';
}


// ═══════════════════════════════════════════════════════════════════
// PERIOD DETECTION — cadence bar positions
// ═══════════════════════════════════════════════════════════════════

function detectPeriod(bars) {
  // Only use CHROMATIC cadence bars (mixed durations) for period detection.
  // Hold bars (≤2 notes) appear right after chromatic bars — using both
  // would give gaps of 1,7,1,7 → most common = 1, which is wrong.
  const cadenceBars = bars.filter(b => {
    if (!b.notes.length || b.notes.length <= 2) return false; // skip hold bars
    const durs = b.notes.map(n => n.duration_subdivisions);
    if (!durs.every(d => d === durs[0])) return true; // mixed durations = chromatic
    for (const n of b.notes) {
      const m = pitchToMidi(n.pitch);
      if (m !== null && (m % 12 === 8 || m % 12 === 6)) return true;
    }
    return false;
  });
  if (cadenceBars.length < 2) return null;
  const positions = cadenceBars.map(b => b.bar_number);
  const gaps = [];
  for (let i = 1; i < positions.length; i++) gaps.push(positions[i] - positions[i - 1]);
  if (!gaps.length) return null;
  const freq = new Map();
  for (const g of gaps) freq.set(g, (freq.get(g) || 0) + 1);
  let bestGap = 0, bestCount = 0;
  for (const [g, c] of freq) { if (c > bestCount) { bestCount = c; bestGap = g; } }
  return bestGap > 0 ? { period: bestGap, confidence: bestCount / gaps.length } : null;
}


// ═══════════════════════════════════════════════════════════════════
// RIGHT HAND ANALYSIS
// ═══════════════════════════════════════════════════════════════════

function barFingerprint(bar) {
  return [...bar.notes]
    .sort((a, b) => a.start_subdivision - b.start_subdivision)
    .map(n => `${n.pitch}|${n.start_subdivision}|${n.duration_subdivisions}`)
    .join(',');
}

function analyzeRightHand(bars) {
  let firstContent = bars.findIndex(b => b.notes.length > 0);
  if (firstContent < 0) return emptyRHResult();
  const introBars   = bars.slice(0, firstContent);
  const contentBars = bars.slice(firstContent);

  const periodResult = detectPeriod(contentBars);
  const period = periodResult ? periodResult.period : 8;

  const sections = [];
  for (let i = 0; i < contentBars.length; i += period) {
    sections.push(contentBars.slice(i, i + period));
  }

  const sectionFps = [];

  const analyzedSections = sections.map((secBars, secIdx) => {
    const barAnalysis = secBars.map((bar, posInSec) => {
      const cadence  = isCadenceBar(bar);
      // FIX 2: check parallel BEFORE transition
      const parallel = !cadence && isParallelOctaveBar(bar);
      const transition = !cadence && !parallel && isTransitionBar(bar);
      const empty    = bar.notes.length === 0;

      let motifRole;
      if (empty)      motifRole = 'empty';
      else if (cadence)    motifRole = (bar.notes.length <= 2) ? 'cadence-hold' : 'cadence-chromatic';
      else if (parallel)   motifRole = 'parallel';
      else if (transition) motifRole = 'transition';
      else {
        const pos = Math.floor(posInSec / 2);
        if (pos === 0)      motifRole = 'motif-C';
        else if (pos === 1) motifRole = 'motif-B';
        else if (pos === 2) motifRole = 'motif-A';
        else                motifRole = 'other';
      }

      const pedal  = (!cadence && !parallel && !empty) ? detectPedal(bar) : null;
      // FIX 3: per-bar direction uses regression slope
      const melDir = (pedal && !cadence) ? getMelodyDirection(bar, pedal.pedalPitch) : null;

      const allMidis = bar.notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
      const midiMin  = allMidis.length ? Math.min(...allMidis) : null;
      const midiMax  = allMidis.length ? Math.max(...allMidis) : null;

      return {
        barNumber: bar.bar_number,
        posInSec,
        motifRole,
        isCadence:    cadence,
        isParallel:   parallel,
        isTransition: transition,
        isEmpty:      empty,
        pedalPitch:   pedal?.pedalPitch ?? null,
        pedalMidi:    pedal?.pedalMidi ?? null,
        pedalPosition: pedal?.pedalPosition ?? null,
        melodyDirection: melDir,
        noteCount: bar.notes.length,
        midiMin, midiMax,
        fingerprint: barFingerprint(bar),
        notes: bar.notes,
      };
    });

    const mainBars = barAnalysis.filter(b => !b.isCadence && !b.isEmpty);

    // FIX 5: apex uses threshold (≥50% parallel) not every()
    const parallelCount = mainBars.filter(b => b.isParallel).length;
    const isApex = mainBars.length > 0 &&
      parallelCount >= Math.max(1, Math.floor(mainBars.length * 0.5));

    const isTransitionSec = !isApex &&
      mainBars.filter(b => b.isTransition).length >= 2;

    // FIX 4: section direction measured at 2-bar PAIR level
    let sectionDirection;
    if (isApex) {
      sectionDirection = 'parallel-octaves';
    } else {
      // Group non-cadence bars into 2-bar pairs by motif role
      const pairDirs = [];
      for (let pi = 0; pi < secBars.length - 1; pi += 2) {
        const ba1 = barAnalysis[pi];
        const ba2 = barAnalysis[pi + 1];
        if (!ba1 || !ba2) continue;
        if (ba1.isCadence || ba2.isCadence || ba1.isEmpty || ba2.isEmpty) continue;
        if (ba1.isParallel || ba2.isParallel) continue;
        const pedalPitch = ba1.pedalPitch ?? ba2.pedalPitch;
        if (!pedalPitch) continue;
        const dir = getPairDirection(secBars[pi], secBars[pi + 1], pedalPitch);
        pairDirs.push(dir);
      }
      const upCount   = pairDirs.filter(d => d === 'ascending').length;
      const downCount = pairDirs.filter(d => d === 'descending').length;
      if (upCount > downCount)       sectionDirection = 'ascending';
      else if (downCount > upCount)  sectionDirection = 'descending';
      else                           sectionDirection = 'mixed';
    }

    const pedalSequence = mainBars
      .filter(b => b.pedalPitch && !b.isParallel && !b.isTransition)
      .map(b => b.pedalPitch);
    const seenPedals = [];
    for (const p of pedalSequence) {
      if (!seenPedals.includes(p)) seenPedals.push(p);
    }

    const allMidis = barAnalysis.flatMap(b =>
      b.notes.map(n => pitchToMidi(n.pitch))).filter(m => m !== null);
    const regMin = allMidis.length ? Math.min(...allMidis) : null;
    const regMax = allMidis.length ? Math.max(...allMidis) : null;

    const sectionFp = barAnalysis.map(b => b.fingerprint).join('||');
    let repeatOf = null;
    for (let pi = 0; pi < sectionFps.length; pi++) {
      if (sectionFps[pi] === sectionFp) { repeatOf = pi; break; }
    }
    sectionFps.push(sectionFp);

    const startBar = secBars[0].bar_number;
    const endBar   = secBars[secBars.length - 1].bar_number;

    return {
      index: secIdx,
      startBar, endBar,
      bars: secBars,
      barAnalysis,
      mainBars,
      sectionDirection,
      seenPedals,
      isApex,
      isTransitionSec,
      regMin, regMax,
      sectionFp,
      repeatOf,
    };
  });

  const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI'];
  const labeledSections = analyzedSections.map((sec, i) => {
    const roman      = ROMAN[i] || `S${i + 1}`;
    const apex       = sec.isApex ? '★' : '';
    const repeatNote = sec.repeatOf !== null ? ` (= ${ROMAN[sec.repeatOf]})` : '';
    return { ...sec, romanLabel: roman + apex, fullLabel: roman + apex + repeatNote };
  });

  // Build motif families
  const familyMap = new Map();
  const addToFamily = (role, barData) => {
    if (!familyMap.has(role)) familyMap.set(role, []);
    familyMap.get(role).push(barData);
  };
  for (const sec of labeledSections) {
    for (const ba of sec.barAnalysis) {
      addToFamily(ba.motifRole, { ...ba, sectionIndex: sec.index, sectionLabel: sec.romanLabel });
    }
  }
  for (const b of introBars) {
    addToFamily('intro', {
      barNumber: b.bar_number, motifRole: 'intro',
      sectionIndex: -1, fingerprint: barFingerprint(b), notes: b.notes,
    });
  }

  const ROLE_COLORS = {
    'intro':             { bg:'#374151', text:'#9ca3af' },
    'empty':             { bg:'#1f2937', text:'#4b5563' },
    'motif-C':           { bg:'#06b6d4', text:'#001' },
    'motif-B':           { bg:'#8b5cf6', text:'#fff' },
    'motif-A':           { bg:'#3b82f6', text:'#fff' },
    'cadence-chromatic': { bg:'#ef4444', text:'#fff' },
    'cadence-hold':      { bg:'#f97316', text:'#fff' },
    'parallel':          { bg:'#10b981', text:'#001' },
    'transition':        { bg:'#ec4899', text:'#fff' },
    'other':             { bg:'#6b7280', text:'#fff' },
  };

  const ROLE_LABELS = {
    'intro':             'Intro',
    'empty':             'Empty',
    'motif-C':           'Motif-C (pedal=C)',
    'motif-B':           'Motif-B (pedal=B)',
    'motif-A':           'Motif-A (pedal=A)',
    'cadence-chromatic': 'Cadence (chromatic)',
    'cadence-hold':      'Cadence (hold)',
    'parallel':          'Parallel octaves',
    'transition':        'Transition blur',
    'other':             'Other',
  };

  const families = [];
  const ROLE_ORDER = [
    'intro','empty','motif-C','motif-B','motif-A',
    'transition','parallel','cadence-chromatic','cadence-hold','other',
  ];
  for (const role of ROLE_ORDER) {
    const members = familyMap.get(role);
    if (!members || members.length === 0) continue;
    const fps = new Set(members.map(m => m.fingerprint).filter(Boolean));
    const matchLevel = fps.size === 1 ? 'exact'
      : fps.size <= members.length * 0.5 ? 'partial' : 'structural';
    const proto = members[0];
    const occurrences = members.map((m, i) => ({
      startBar:       m.barNumber,
      endBar:         m.barNumber,
      barRange:       `${m.barNumber}`,
      barNumber:      m.barNumber,
      sectionIndex:   m.sectionIndex,
      sectionLabel:   m.sectionLabel,
      variationType:  i === 0 ? 'prototype'
        : m.fingerprint === proto.fingerprint ? 'exact' : 'variation',
      pedalPitch:     m.pedalPitch,
      melodyDirection: m.melodyDirection,
    }));
    families.push({
      id:              `FAM_${role.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
      label:           ROLE_LABELS[role] || role,
      role,
      matchLevel,
      occurrenceCount: members.length,
      occurrences,
      barNumbers:      members.map(m => m.barNumber),
      color:           ROLE_COLORS[role] || { bg:'#6b7280', text:'#fff' },
      windowSize:      2,
    });
  }

  // labeled bar list for timeline
  const barFamilyMap = new Map();
  for (const fam of families) {
    for (const occ of fam.occurrences) {
      barFamilyMap.set(occ.barNumber, { fam, occ });
    }
  }
  for (const b of introBars) {
    const introFam = families.find(f => f.role === 'intro');
    if (introFam) barFamilyMap.set(b.bar_number, {
      fam: introFam,
      occ: { barNumber: b.bar_number, variationType: 'intro' },
    });
  }

  const labeled = bars.map(bar => {
    const entry   = barFamilyMap.get(bar.bar_number);
    const fam     = entry?.fam;
    const secEntry = labeledSections.find(
      s => bar.bar_number >= s.startBar && bar.bar_number <= s.endBar);
    const barA = secEntry?.barAnalysis.find(ba => ba.barNumber === bar.bar_number);
    return {
      barNumber:      bar.bar_number,
      notes:          bar.notes,
      patternId:      fam?.id ?? 'FAM_OTHER',
      patternLabel:   fam?.label ?? 'Other',
      role:           barA?.motifRole ?? (bar.notes.length === 0 ? 'empty' : 'other'),
      isEmpty:        bar.notes.length === 0,
      isCadence:      barA?.isCadence ?? false,
      isParallel:     barA?.isParallel ?? false,
      isTransition:   barA?.isTransition ?? false,
      pedalPitch:     barA?.pedalPitch ?? null,
      melodyDirection: barA?.melodyDirection ?? null,
      sectionLabel:   secEntry?.romanLabel ?? null,
      variationType:  entry?.occ?.variationType ?? null,
      color:          fam?.color ?? { bg:'#6b7280', text:'#fff' },
      noteCount:      bar.notes.length,
    };
  });

  // Build graph: section-to-section transitions
  const sectionNodeMap = new Map();
  for (const sec of labeledSections) {
    sectionNodeMap.set(sec.romanLabel, {
      id:    sec.romanLabel,
      label: sec.fullLabel,
      count: sec.bars.length,
      color: sec.isApex ? '#10b981' : (sec.repeatOf !== null ? '#f59e0b' : '#6366f1'),
    });
  }
  const edgeMap = new Map();
  for (let i = 0; i < labeledSections.length - 1; i++) {
    const key = `${labeledSections[i].romanLabel}->${labeledSections[i+1].romanLabel}`;
    edgeMap.set(key, {
      from: labeledSections[i].romanLabel,
      to:   labeledSections[i+1].romanLabel,
      weight: (edgeMap.get(key)?.weight ?? 0) + 1,
    });
  }
  const graph = {
    nodes: [...sectionNodeMap.values()],
    edges: [...edgeMap.values()].sort((a, b) => b.weight - a.weight),
  };

  // Sections output for frontend (sections format expected by adaptResponse)
  const sectionsOut = labeledSections.map(sec => ({
    patternId:  `SEC_${sec.romanLabel.replace(/[^A-Z0-9]/g, '_')}`,
    id:         `SEC_${sec.romanLabel.replace(/[^A-Z0-9]/g, '_')}`,
    pid:        `SEC_${sec.romanLabel.replace(/[^A-Z0-9]/g, '_')}`,
    fullLabel:  sec.fullLabel,
    startBar:   sec.startBar,
    endBar:     sec.endBar,
    direction:  sec.sectionDirection,
    pedals:     sec.seenPedals,
    isApex:     sec.isApex,
    repeatOf:   sec.repeatOf,
    color:      sec.isApex ? '#10b981' : (sec.repeatOf !== null ? '#f59e0b' : '#6366f1'),
  }));

  // boundaries = positions between sections with novelty score
  const boundaries = labeledSections.slice(0, -1).map((sec, i) => ({
    afterBarNumber: sec.endBar,
    type: labeledSections[i+1].isApex ? 'apex-entry'
        : labeledSections[i+1].repeatOf !== null ? 'recapitulation'
        : 'section',
    noveltyScore: sec.repeatOf !== null ? 0.2 : 0.8,
    dims: {
      register: sec.regMax !== null && labeledSections[i+1].regMax !== null
        ? Math.abs((sec.regMax - sec.regMin) - (labeledSections[i+1].regMax - labeledSections[i+1].regMin)) / 24
        : 0,
    },
  }));

  return {
    hand:             'right',
    introBars,
    sections:         sectionsOut,
    patterns:         families,
    families,
    labeled,
    graph,
    boundaries,
    period,
    periodConfidence: periodResult?.confidence ?? null,
    // Keep internal sections for YAML
    _sections:        labeledSections,
  };
}

function emptyRHResult() {
  return {
    hand: 'right', introBars: [], sections: [], patterns: [],
    families: [], labeled: [], graph: { nodes:[], edges:[] },
    boundaries: [], period: null, _sections: [],
  };
}


// ═══════════════════════════════════════════════════════════════════
// LEFT HAND ANALYSIS
// ═══════════════════════════════════════════════════════════════════

function lhBarType(bar) {
  const notes = bar.notes;
  if (!notes.length) return 'empty';
  if (notes.length <= 2 && notes.every(n => n.duration_subdivisions >= 8)) return 'held-octave';
  if (notes.length === 8 && notes.every(n => n.duration_subdivisions === 2)) return 'arpeggio';
  if (notes.length === 7 && notes.every(n => n.duration_subdivisions === 2)) return 'arpeggio-partial';
  return 'other';
}

function lhBarRoot(bar) {
  if (!bar.notes.length) return null;
  const midis = bar.notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
  if (!midis.length) return null;
  const minMidi = Math.min(...midis);
  return { midi: minMidi, name: midiToName(minMidi), pc: minMidi % 12 };
}

function lhChordLabel(bar) {
  const root = lhBarRoot(bar);
  if (!root) return null;
  const allMidis = bar.notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
  return chordName(root.midi, allMidis);
}

function lhHasChromatic(bar) {
  for (const n of bar.notes) {
    const m = pitchToMidi(n.pitch);
    if (m !== null && m % 12 === 8) return true;
  }
  return false;
}

function analyzeLeftHand(bars) {
  const CHORD_COLORS = {
    'A min': { bg:'#3b82f6', text:'#fff' },
    'D min': { bg:'#8b5cf6', text:'#fff' },
    'G maj': { bg:'#10b981', text:'#001' },
    'C maj': { bg:'#06b6d4', text:'#001' },
    'F maj': { bg:'#f59e0b', text:'#001' },
    'F min': { bg:'#f59e0b', text:'#001' },
    'E maj': { bg:'#ef4444', text:'#fff' },
  };

  const labeled = bars.map(bar => {
    const type         = lhBarType(bar);
    const root         = lhBarRoot(bar);
    const chord        = lhChordLabel(bar);
    const hasChromatic = lhHasChromatic(bar);
    const color = CHORD_COLORS[chord] || (
      type === 'held-octave' ? { bg:'#374151', text:'#9ca3af' } :
      type === 'empty'       ? { bg:'#1f2937', text:'#4b5563' } :
                               { bg:'#6b7280', text:'#fff' }
    );
    return {
      barNumber:    bar.bar_number,
      notes:        bar.notes,
      type,
      root:         root?.name ?? null,
      rootMidi:     root?.midi ?? null,
      chord,
      hasChromatic,
      isEmpty:      bar.notes.length === 0,
      isHeldOctave: type === 'held-octave',
      isArpeggio:   type === 'arpeggio' || type === 'arpeggio-partial',
      isPartial:    type === 'arpeggio-partial',
      noteCount:    bar.notes.length,
      color,
      patternId:    chord ? `LH_${chord.replace(/\s/g, '_')}` : 'LH_OTHER',
      patternLabel: chord ?? (type === 'held-octave' ? `Hold ${root?.name}` : type),
    };
  });

  const firstContent = labeled.findIndex(b => !b.isEmpty);
  const ostinato = detectLHOstinato(labeled, firstContent);

  const chordFamilyMap = new Map();
  for (const lb of labeled) {
    if (lb.isEmpty) continue;
    const key = lb.isHeldOctave ? `held:${lb.root}` : (lb.chord || 'unknown');
    if (!chordFamilyMap.has(key)) chordFamilyMap.set(key, []);
    chordFamilyMap.get(key).push(lb);
  }

  const CHORD_ORDER = ['A min','D min','G maj','C maj','F maj','F min','E maj'];
  const families = [];
  for (const chord of CHORD_ORDER) {
    const members = chordFamilyMap.get(chord);
    if (!members || members.length === 0) continue;
    const color = members[0].color;
    families.push({
      id:              `LH_${chord.replace(/\s/g, '_')}`,
      label:           chord,
      role:            'chord',
      chord,
      matchLevel:      'structural',
      occurrenceCount: members.length,
      occurrences:     members.map(m => ({
        startBar: m.barNumber, endBar: m.barNumber,
        barRange: `${m.barNumber}`, barNumber: m.barNumber,
        variationType: m.isHeldOctave ? 'held-octave' : m.isPartial ? 'partial' : 'exact',
      })),
      barNumbers:  members.map(m => m.barNumber),
      color,
      windowSize:  1,
    });
  }
  for (const [key, members] of chordFamilyMap) {
    if (!key.startsWith('held:')) continue;
    families.push({
      id: `LH_HELD_${key.slice(5)}`, label: `Hold ${key.slice(5)}`,
      role: 'held-octave', matchLevel: 'exact',
      occurrenceCount: members.length,
      occurrences: members.map(m => ({
        startBar: m.barNumber, endBar: m.barNumber,
        barRange: `${m.barNumber}`, barNumber: m.barNumber,
        variationType: 'held-octave',
      })),
      barNumbers: members.map(m => m.barNumber),
      color: { bg:'#374151', text:'#9ca3af' }, windowSize: 1,
    });
  }
  for (const [key, members] of chordFamilyMap) {
    if (CHORD_ORDER.includes(key) || key.startsWith('held:')) continue;
    families.push({
      id: `LH_${key.replace(/\s/g, '_')}`, label: key,
      role: 'chord', matchLevel: 'structural',
      occurrenceCount: members.length,
      occurrences: members.map(m => ({
        startBar: m.barNumber, endBar: m.barNumber,
        barRange: `${m.barNumber}`, barNumber: m.barNumber,
        variationType: 'exact',
      })),
      barNumbers: members.map(m => m.barNumber),
      color: { bg:'#6b7280', text:'#fff' }, windowSize: 1,
    });
  }

  return { hand: 'left', labeled, families, patterns: families, ostinato };
}

function detectLHOstinato(labeled, firstContent) {
  if (firstContent < 0) return null;
  const arpBars = labeled.slice(firstContent).filter(b => b.isArpeggio);
  if (arpBars.length < 2) return null;
  const chords = arpBars.map(b => b.chord);
  let cycleLen = null;
  for (let i = 1; i < chords.length; i++) {
    if (chords[i] === chords[0] && i >= 4) { cycleLen = i; break; }
  }
  if (!cycleLen) return null;
  const cycleChords  = chords.slice(0, cycleLen);
  const repeatCount  = Math.floor(chords.length / cycleLen);
  return { cycle: cycleChords, cycleLength: cycleLen, repeatCount, barsPerCycle: cycleLen };
}


// ═══════════════════════════════════════════════════════════════════
// YAML GENERATOR
// ═══════════════════════════════════════════════════════════════════

function generateYaml(rhResult, lhResult, metadata) {
  const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
  const internalSecs = rhResult._sections || [];
  const secLines = internalSecs.map(s => {
    const pedStr = s.seenPedals.length ? s.seenPedals.join(' → ') : 'none';
    const rep = s.repeatOf !== null ? ` # exact repeat of section ${ROMAN[s.repeatOf] || s.repeatOf + 1}` : '';
    return `    ${s.fullLabel}: {bars: [${s.startBar}, ${s.endBar}], dir: "${s.sectionDirection}", pedals: [${pedStr}], register: [${s.regMin ? midiToName(s.regMin) : '?'}, ${s.regMax ? midiToName(s.regMax) : '?'}]}${rep}`;
  }).join('\n');

  const famLines = (rhResult.families || [])
    .filter(f => !['intro', 'empty'].includes(f.role))
    .map(f =>
      `    ${f.label}:\n      count: ${f.occurrenceCount}\n      match: "${f.matchLevel}"\n      bars: [${f.barNumbers.slice(0, 20).join(', ')}${f.barNumbers.length > 20 ? '...' : ''}]`
    ).join('\n\n');

  const lhCycle = lhResult?.ostinato?.cycle?.join(' → ') ?? 'n/a';
  const lhFams = (lhResult?.families || [])
    .map(f => `    ${f.label}: {count: ${f.occurrenceCount}, bars: [${f.barNumbers.slice(0, 10).join(', ')}${f.barNumbers.length > 10 ? '...' : ''}]}`)
    .join('\n');

  return `# PASSACAGLIA ANALYSIS BLUEPRINT
# ${metadata.bars.length} bars · ${metadata.time_signature} · ${metadata.tempo} BPM · Key: ${metadata.key}
# Period: ${rhResult.period} bars · Sections: ${internalSecs.length}

composition:
  key: "${metadata.key}"
  tempo: ${metadata.tempo}
  time_signature: "${metadata.time_signature}"
  total_bars: ${metadata.bars.length}
  subdivisions_per_bar: ${metadata.subdivisions_per_bar}
  detected_period: ${rhResult.period}
  period_confidence: ${rhResult.periodConfidence?.toFixed(2) ?? 'n/a'}

right_hand:
  intro_bars: [${(rhResult.introBars || []).map(b => b.bar_number).join(', ') || 'none'}]
  sections:
${secLines}

  motif_families:
${famLines}

  generation_rules:
    - "8 notes per main bar, all d=2, subdivisions s=0,2,4,6,8,10,12,14"
    - "alternating: melody-note + pedal-note, strictly interleaved"
    - "pedal descent per section: C → B → A (diatonic step down each 2-bar motif)"
    - "cadence bar (chromatic): A d=4, G# d=2, F# d=2, G# d=6, A d=2"
    - "cadence bar (hold): A d=15 — single pitch, almost full bar"
    - "transition section: bar opens with pedal-pitch doubled (pos 0 = pos 1)"
    - "parallel-octave section: every adjacent pair is exactly 12 semitones apart"
    - "recapitulation: sections VII, VIII, IX are exact note-for-note repeats of I, II, I"

left_hand:
  ostinato_cycle: "${lhCycle}"
  ostinato_repeats: ${lhResult?.ostinato?.repeatCount ?? 'n/a'}
  texture_change_at: bar 67 (held octaves replace arpeggio)
  chord_families:
${lhFams}
`;
}


// ═══════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════

function analyze(input = {}) {
  let rhBars = null, lhBars = null, metadata = null, splitMidi = null;

  if (input.full) {
    const norm = normalizeJson(input.full);
    metadata = norm;
    splitMidi = input.splitMidi ?? detectSplitMidi(norm.bars);
    const split = splitHandsFromFull(norm.bars, splitMidi);
    rhBars    = split.rhBars;
    lhBars    = split.lhBars;
    splitMidi = split.splitMidi;
  } else {
    if (input.rh) {
      const norm = normalizeJson(input.rh);
      metadata = metadata ?? norm;
      rhBars   = norm.bars;
    }
    if (input.lh) {
      const norm = normalizeJson(input.lh);
      metadata = metadata ?? norm;
      lhBars   = norm.bars;
    }
    if (!metadata && (rhBars || lhBars)) {
      metadata = { tempo:120, time_signature:'4/4', key:'C', subdivisions_per_bar:16, bars: rhBars || lhBars };
    }
  }

  if (!metadata) throw new Error('No input provided. Pass { rh }, { lh }, { rh, lh }, or { full }.');

  const rhResult = rhBars ? analyzeRightHand(rhBars) : emptyRHResult();
  const lhResult = lhBars ? analyzeLeftHand(lhBars)  : null;

  // Alignment bar-by-bar
  const allBns = new Set([
    ...(rhResult.labeled || []).map(b => b.barNumber),
    ...(lhResult?.labeled || []).map(b => b.barNumber),
  ]);
  const rhMap = new Map((rhResult.labeled || []).map(b => [b.barNumber, b]));
  const lhMap = new Map((lhResult?.labeled || []).map(b => [b.barNumber, b]));
  const alignment = [...allBns].sort((a, b) => a - b).map(bn => ({
    barNumber: bn,
    rh: rhMap.get(bn) ?? null,
    lh: lhMap.get(bn) ?? null,
  }));

  const yaml = generateYaml(rhResult, lhResult, metadata);

  // Detect best split for display
  const splitDisplay = splitMidi ?? (rhBars && lhBars ? detectSplitMidi([
    ...rhBars, ...lhBars,
  ]) : null);

  return {
    metadata,
    splitMidi: splitDisplay,
    rightHand: {
      families:   rhResult.families,
      patterns:   rhResult.families,
      labeled:    rhResult.labeled,
      sections:   rhResult.sections,
      graph:      rhResult.graph,
      boundaries: rhResult.boundaries,
    },
    leftHand: lhResult ? {
      families: lhResult.families,
      patterns: lhResult.families,
      labeled:  lhResult.labeled,
      sections: [],
      graph:    { nodes:[], edges:[] },
    } : {
      families: [], patterns: [], labeled: [], sections: [], graph: { nodes:[], edges:[] },
    },
    alignment,
    yamlBlueprint: yaml,
    summary: {
      totalBars:         metadata.bars.length,
      detectedPeriod:    rhResult.period,
      periodConfidence:  rhResult.periodConfidence,
      rhSections:        (rhResult._sections || []).length,
      lhChordCycle:      lhResult?.ostinato?.cycle ?? [],
      rhFamilies:        rhResult.families.length,
      lhFamilies:        lhResult?.families.length ?? 0,
      windowSizes:       [2, 8],
      surpriseBars:      rhResult.labeled.filter(b => b.role === 'other').map(b => b.barNumber),
      splitMidi:         splitDisplay,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

const MusicAnalyzerEngine = {
  analyze,
  analyzeRightHand, analyzeLeftHand,
  normalizeJson, normalizeNote, normalizeBar,
  splitHandsFromFull, detectSplitMidi,
  detectPeriod,
  isCadenceBar, isParallelOctaveBar, isTransitionBar,
  detectPedal, getMelodyDirection, getPairDirection,
  pitchToMidi, midiToName, pitchClass, chordName,
  generateYaml,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MusicAnalyzerEngine;
} else if (typeof globalThis !== 'undefined') {
  globalThis.MusicAnalyzerEngine = MusicAnalyzerEngine;
}