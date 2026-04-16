// 'use strict';

// // ═══════════════════════════════════════════════════════════════════
// // MUSIC ANALYZER ENGINE v2.0
// //
// // REDESIGN OVER v1.1:
// //   [1] CADENCE-FIRST segmentation — cadence pairs detected before any
// //       pattern search runs. Patterns NEVER cross a cadence boundary.
// //   [2] HIERARCHICAL structure output:
// //         Piece → Phrases (8-bar) → MotifCells (2-bar) + Cadence (2-bar)
// //   [3] TRANSPOSITION-NORMALISED motif matching — bars 3-4, 5-6, 7-8
// //       all correctly identified as the same motif shape.
// //   [4] BAR ROLE CLASSIFIER — each bar typed before pattern detection:
// //         empty | uniform_alternating | cadence_chromatic |
// //         cadence_sustain | mixed
// //   [5] CROSS-SECTION motif grouping — same role at same phrase-position
// //       across sections → same motif family (A / A' / A'').
// //   [6] Backward-compatible API — existing analyze() still works,
// //       but returns richer data in rightHand.phrases and .motifMap.
// //
// // Works in: Node.js (require) AND browser (globalThis export)
// // Input:    MIDI JSON — full format OR compact shorthand (p/s/d/bn)
// // ═══════════════════════════════════════════════════════════════════

// // ─── PITCH CONSTANTS ────────────────────────────────────────────────
// const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// const NOTE_MAP = {
//   'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
//   'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
//   'A':9,'A#':10,'BB':10,'B':11
// };

// const PATTERN_COLORS = [
//   { bg:'#06b6d4', text:'#001', label:'cyan'    },
//   { bg:'#8b5cf6', text:'#fff', label:'violet'  },
//   { bg:'#f59e0b', text:'#001', label:'amber'   },
//   { bg:'#10b981', text:'#001', label:'emerald' },
//   { bg:'#f43f5e', text:'#fff', label:'rose'    },
//   { bg:'#3b82f6', text:'#fff', label:'blue'    },
//   { bg:'#a855f7', text:'#fff', label:'purple'  },
//   { bg:'#ec4899', text:'#fff', label:'pink'    },
// ];
// const CADENCE_COLOR  = { bg:'#f97316', text:'#fff', label:'orange' };
// const SURPRISE_COLOR = { bg:'#ef4444', text:'#fff', label:'red'    };
// const EMPTY_COLOR    = { bg:'#374151', text:'#9ca3af', label:'gray' };

// // ─── PHRASE STRUCTURE CONSTANTS ─────────────────────────────────────
// const ROLE = {
//   EMPTY:             'empty',
//   UNIFORM_ALT:       'uniform_alternating',   // all same dur + alternating pedal
//   UNIFORM_PLAIN:     'uniform_plain',          // all same dur, no alternating
//   CADENCE_CHROMATIC: 'cadence_chromatic',      // mixed dur, chromatic notes
//   CADENCE_SUSTAIN:   'cadence_sustain',        // 1–2 notes, very long dur
//   MIXED:             'mixed',
// };


// // ═══════════════════════════════════════════════════════════════════
// // PART 1 — PITCH UTILITIES
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

// function intervalSemitones(a, b) {
//   const ma = pitchToMidi(a), mb = pitchToMidi(b);
//   if (ma === null || mb === null) return null;
//   return mb - ma;
// }

// function hasChromaticPitch(notes) {
//   return notes.some(n => {
//     const p = (n.pitch || '').toUpperCase();
//     return p.includes('#') || p.includes('B') && /[A-G]B/i.test(p);
//   });
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 2 — JSON NORMALIZER
// // ═══════════════════════════════════════════════════════════════════

// function normalizeNote(n) {
//   return {
//     pitch:                 n.pitch                ?? n.p,
//     start_subdivision:     n.start_subdivision    ?? n.s ?? 0,
//     offset_percent:        n.offset_percent       ?? n.o ?? 0,
//     duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
//     end_cutoff_percent:    n.end_cutoff_percent   ?? n.c ?? null,
//     velocity:              100,
//   };
// }

// function normalizeBar(b) {
//   return {
//     bar_number: b.bar_number ?? b.bn,
//     notes: (b.notes ?? []).map(normalizeNote),
//   };
// }

// function normalizeJson(json) {
//   const ts    = json.time_signature || '4/4';
//   const [n,d] = ts.split('/').map(Number);
//   const spb   = json.subdivisions_per_bar || (n * (16 / d));
//   return {
//     tempo:                json.tempo || 120,
//     time_signature:       ts,
//     key:                  json.key || 'C',
//     subdivisions_per_bar: spb,
//     bars: (json.bars || []).map(normalizeBar),
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 3 — HAND SEPARATOR
// // ═══════════════════════════════════════════════════════════════════

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
//   const sorted = [...pitchFreq.keys()].sort((a, b) => a - b);
//   let bestWeighted = -1, splitAt = 60;
//   for (let i = 1; i < sorted.length; i++) {
//     const lo = sorted[i - 1], hi = sorted[i];
//     const gap = hi - lo;
//     if (gap === 0) continue;
//     const mid = (lo + hi) / 2;
//     const w   = (mid >= HAND_SPLIT_LOW && mid <= HAND_SPLIT_HIGH) ? 3.0 : 0.7;
//     if (gap * w > bestWeighted) { bestWeighted = gap * w; splitAt = Math.round(mid); }
//   }
//   return splitAt;
// }

// function separateHands(bars, splitMidi) {
//   const split = (splitMidi !== undefined && splitMidi !== null)
//     ? splitMidi : detectSplitPoint(bars);
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
// // PART 4 — BAR UTILITIES & FINGERPRINTING
// // ═══════════════════════════════════════════════════════════════════

// function getNotesOrdered(bar) {
//   return [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
// }

// function fpExact(bar) {
//   return getNotesOrdered(bar).map(n => `${n.pitch}@${n.start_subdivision}:${n.duration_subdivisions}`).join('|');
// }

// function fpRhythm(bar) {
//   return getNotesOrdered(bar).map(n => `${n.start_subdivision}:${n.duration_subdivisions}`).join('|');
// }

// function fpContour(bar) {
//   const sorted = getNotesOrdered(bar);
//   if (sorted.length === 0) return 'empty';
//   if (sorted.length === 1) return `1:${sorted[0].duration_subdivisions}`;
//   const intervals = [];
//   for (let i = 1; i < sorted.length; i++) {
//     const m1 = pitchToMidi(sorted[i-1].pitch), m2 = pitchToMidi(sorted[i].pitch);
//     intervals.push(m1 !== null && m2 !== null ? m2 - m1 : '?');
//   }
//   return intervals.join(',');
// }

// function fpTexture(bar, spb = 16) {
//   const notes = bar.notes;
//   if (notes.length === 0) return 'empty';
//   const durCount = {};
//   for (const n of notes) durCount[n.duration_subdivisions] = (durCount[n.duration_subdivisions] || 0) + 1;
//   const dominantDur = Object.entries(durCount).sort((a, b) => b[1] - a[1])[0][0];
//   const maxDur = Math.max(...notes.map(n => n.duration_subdivisions));
//   return `n${notes.length}_d${dominantDur}_max${maxDur}_${Object.keys(durCount).length === 1 ? 'U' : 'M'}`;
// }

// function detectAlternating(bar) {
//   const sorted = getNotesOrdered(bar);
//   if (sorted.length < 4) return null;
//   const allSameDur = sorted.every(n => n.duration_subdivisions === sorted[0].duration_subdivisions);
//   const even = sorted.filter((_, i) => i % 2 === 0);
//   const odd  = sorted.filter((_, i) => i % 2 === 1);
//   const evenPitches = new Set(even.map(n => n.pitch));
//   const oddPitches  = new Set(odd.map(n => n.pitch));
//   if (oddPitches.size === 1 && evenPitches.size > 1 && allSameDur)
//     return { type:'alternating', pedal:[...oddPitches][0], pedalPosition:'odd',
//              melody: even.map(n => n.pitch), notesPerBar: sorted.length,
//              duration: sorted[0].duration_subdivisions };
//   if (evenPitches.size === 1 && oddPitches.size > 1 && allSameDur)
//     return { type:'alternating', pedal:[...evenPitches][0], pedalPosition:'even',
//              melody: odd.map(n => n.pitch), notesPerBar: sorted.length,
//              duration: sorted[0].duration_subdivisions };
//   return null;
// }

// function fpWindow(bars, startIdx, w) {
//   const slice = bars.slice(startIdx, startIdx + w);
//   const rhythmKey  = slice.map((b, i) => `[${i}:${fpRhythm(b)}]`).join('');
//   const contourKey = slice.map((b, i) => `[${i}:${fpContour(b)}]`).join('');
//   return { rhythmKey, contourKey, combined: `${rhythmKey}~~${contourKey}` };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 5 — BAR ROLE CLASSIFIER  ← NEW IN v2.0
// //
// // Classifies each bar into a structural role BEFORE pattern detection.
// // This is the foundation of boundary-aware analysis.
// // ═══════════════════════════════════════════════════════════════════

// function classifyBarRole(bar, spb = 16) {
//   const notes = bar.notes;
//   if (!notes || notes.length === 0) return ROLE.EMPTY;

//   const sorted   = getNotesOrdered(bar);
//   const durations = sorted.map(n => n.duration_subdivisions);
//   const maxDur    = Math.max(...durations);
//   const minDur    = Math.min(...durations);
//   const allSame   = maxDur === minDur;
//   const nc        = sorted.length;

//   // ── Cadence sustain: very few notes, very long duration ───────────
//   // Covers bars like: A5(d:15) or A5(d:8)+A5(d:7)
//   if (nc <= 3 && maxDur >= Math.round(spb * 0.7)) return ROLE.CADENCE_SUSTAIN;

//   // ── Cadence chromatic: mixed durations with chromatic pitches ──────
//   // Covers bars like: A5(d:4), G#5(d:2), F#5(d:2), G#5(d:6), A5(d:2)
//   if (!allSame && nc >= 3 && nc <= 8 && maxDur >= 4) return ROLE.CADENCE_CHROMATIC;

//   // ── Uniform alternating: all same dur + pedal/melody interleave ───
//   if (allSame && nc >= 4) {
//     const alt = detectAlternating(bar);
//     if (alt) return ROLE.UNIFORM_ALT;
//     return ROLE.UNIFORM_PLAIN;
//   }

//   return ROLE.MIXED;
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 6 — CADENCE PAIR DETECTOR  ← NEW IN v2.0
// //
// // Finds [cadence_chromatic, cadence_sustain] consecutive pairs.
// // These are HARD section boundaries — no pattern may cross them.
// // ═══════════════════════════════════════════════════════════════════

// function findCadencePairs(bars, spb) {
//   const roles = bars.map(b => classifyBarRole(b, spb));
//   const pairs = [];
//   for (let i = 0; i < roles.length - 1; i++) {
//     if (roles[i] === ROLE.CADENCE_CHROMATIC && roles[i + 1] === ROLE.CADENCE_SUSTAIN) {
//       pairs.push({
//         chromIdx: i, sustainIdx: i + 1,
//         chromBn:  bars[i].bar_number,
//         sustainBn: bars[i + 1].bar_number,
//       });
//     }
//   }
//   return pairs;
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 7 — PHRASE BUILDER  ← NEW IN v2.0
// //
// // Splits the bar array into Phrases delimited by cadence pairs.
// // Each Phrase has: motifBars (all bars before cadence) + cadenceBars.
// //
// // Example for passacaglia:
// //   Phrase 1 → bars 3–10
// //     motifBars  = [3,4,5,6,7,8]   (3 × 2-bar motif cells)
// //     cadenceBars = [9,10]
// //   Phrase 2 → bars 11–18
// //     ...
// // ═══════════════════════════════════════════════════════════════════

// function buildPhrases(bars, cadencePairs) {
//   if (cadencePairs.length === 0) return null; // fallback to flat detection

//   const phrases = [];
//   let segStart = 0; // index into bars array

//   for (const pair of cadencePairs) {
//     const segEnd = pair.sustainIdx; // inclusive
//     if (segEnd < segStart) continue;

//     const segBars = bars.slice(segStart, segEnd + 1);
//     const cadenceBars = segBars.slice(-2);     // last 2
//     const motifBars   = segBars.slice(0, -2);  // all before cadence

//     phrases.push({
//       startBar:    segBars[0].bar_number,
//       endBar:      segBars[segBars.length - 1].bar_number,
//       barCount:    segBars.length,
//       bars:        segBars,
//       motifBars,
//       cadenceBars,
//       // subdivide motifBars into 2-bar cells
//       cells: splitIntoCells(motifBars, 2),
//     });

//     segStart = segEnd + 1;
//   }

//   // Any tail bars after last cadence
//   if (segStart < bars.length) {
//     const tail = bars.slice(segStart);
//     if (tail.length > 0) {
//       phrases.push({
//         startBar:    tail[0].bar_number,
//         endBar:      tail[tail.length - 1].bar_number,
//         barCount:    tail.length,
//         bars:        tail,
//         motifBars:   tail,
//         cadenceBars: [],
//         cells:       splitIntoCells(tail, 2),
//       });
//     }
//   }

//   return phrases;
// }

// function splitIntoCells(bars, cellSize) {
//   const cells = [];
//   for (let i = 0; i + cellSize <= bars.length; i += cellSize) {
//     cells.push(bars.slice(i, i + cellSize));
//   }
//   // Remaining partial cell
//   if (bars.length % cellSize !== 0) {
//     cells.push(bars.slice(bars.length - (bars.length % cellSize)));
//   }
//   return cells;
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 8 — MOTIF CELL FINGERPRINTING  ← NEW IN v2.0
// //
// // Computes a TRANSPOSITION-NORMALISED fingerprint for a 2-bar
// // motif cell so that the same shape at different pitch levels
// // produces the same key (enabling cross-section grouping).
// //
// // Algorithm for a cell [bar1, bar2]:
// //   1. For alternating bars: extract melody-only notes (non-pedal)
// //   2. Concatenate melody notes from bar1 + bar2 in order
// //   3. Compute chromatic intervals between consecutive melody notes
// //   4. Key = rhythm_key + "~~" + intervals_key
// //
// // Two cells with the same intervals (same melodic shape, different
// // starting pitch) will hash to the same key.
// // ═══════════════════════════════════════════════════════════════════

// function extractMelodyNotes(bar) {
//   const sorted = getNotesOrdered(bar);
//   if (sorted.length === 0) return [];
//   const alt = detectAlternating(bar);
//   if (alt) {
//     // Return only the melody notes (non-pedal positions)
//     return sorted.filter((_, i) =>
//       alt.pedalPosition === 'odd' ? i % 2 === 0 : i % 2 === 1
//     );
//   }
//   return sorted; // not alternating → use all notes
// }

// function cellIntervalKey(cell) {
//   // Collect melody notes across all bars in the cell
//   const melodyNotes = cell.flatMap(b => extractMelodyNotes(b));
//   if (melodyNotes.length < 2) return 'short';
//   const intervals = [];
//   for (let i = 1; i < melodyNotes.length; i++) {
//     const m1 = pitchToMidi(melodyNotes[i-1].pitch);
//     const m2 = pitchToMidi(melodyNotes[i].pitch);
//     intervals.push(m1 !== null && m2 !== null ? (m2 - m1) : '?');
//   }
//   return intervals.join(',');
// }

// function cellRhythmKey(cell) {
//   // Rhythm signature of the whole cell (bar-by-bar)
//   return cell.map(b => fpRhythm(b)).join('|BAR|');
// }

// function cellRoleKey(cell, spb) {
//   return cell.map(b => classifyBarRole(b, spb)).join('+');
// }

// function cellFingerprint(cell, spb) {
//   return {
//     rhythm:   cellRhythmKey(cell),
//     contour:  cellIntervalKey(cell),
//     roleKey:  cellRoleKey(cell, spb),
//     combined: cellRhythmKey(cell) + '~~' + cellIntervalKey(cell),
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 9 — HIERARCHICAL PATTERN DETECTOR  ← CORE OF v2.0
// //
// // Main algorithm:
// //   A. Find cadence pairs → hard section boundaries
// //   B. Build phrases using those boundaries
// //   C. For each phrase, fingerprint its cells
// //   D. Across all phrases, group cells by transposition-normalised
// //      fingerprint → motif families
// //   E. Each cadence pair is its own "Cadence" pattern family
// //   F. Return flat patterns list (backward-compat) + phrases structure
// // ═══════════════════════════════════════════════════════════════════

// function detectPatternsHierarchical(bars, spb) {
//   const cadencePairs = findCadencePairs(bars, spb);
//   const phrases      = buildPhrases(bars, cadencePairs);

//   // ── Fallback: no cadences found → use old flat detector ──────────
//   if (!phrases || phrases.length === 0) {
//     return { patterns: detectPatternsFlat(bars, spb), phrases: null, cadencePairs: [] };
//   }

//   // ── A. Build cadence pattern ─────────────────────────────────────
//   const cadenceOccurrences = cadencePairs.map(p => ({
//     startBar: p.chromBn, endBar: p.sustainBn,
//     barRange: [p.chromBn, p.sustainBn], w: 2,
//   }));

//   const cadencePattern = {
//     id: 'PAT_CADENCE', label: 'Cadence', type: 'cadence',
//     windowSize: 2, occurrences: cadenceOccurrences,
//     score: cadenceOccurrences.length * 2 * 3.0, quality: 3.0,
//     color: CADENCE_COLOR,
//   };

//   // ── B. Group motif cells by RHYTHM + ROLE (transposition-normalised) ──
//   //
//   // WHY NOT CONTOUR: transposed versions of the same motif (e.g. bars 3-4
//   // at C6 pedal vs bars 5-6 at B5 pedal) have identical rhythms and roles
//   // but differ in their interval key because the starting pitch changes.
//   // Rhythm + role is the correct family key.
//   //
//   // CONTOUR is still computed and stored for reference, but NOT used for
//   // primary grouping.
//   const cellFpMap = new Map(); // familyKey → [{phrase, cellIdx, cell, fp}]

//   for (const phrase of phrases) {
//     for (let ci = 0; ci < phrase.cells.length; ci++) {
//       const cell = phrase.cells[ci];
//       const fp   = cellFingerprint(cell, spb);
//       // Family key = rhythm + role (same for all transpositions of the motif)
//       const familyKey = cellRhythmKey(cell) + '~~' + cellRoleKey(cell, spb);
//       if (!cellFpMap.has(familyKey)) cellFpMap.set(familyKey, []);
//       cellFpMap.get(familyKey).push({ phrase, cellIdx: ci, cell, fp, familyKey });
//     }
//   }

//   // ── C. Build motif patterns from cell groups ───────────────────────
//   const motifPatterns = [];
//   let patternIdx = 0;

//   // Sort groups by occurrence count DESC so most common motif = Pattern_A
//   const sortedGroups = [...cellFpMap.entries()]
//     .filter(([, occs]) => occs.length >= 2)
//     .sort((a, b) => b[1].length - a[1].length);

//   for (const [, occs] of sortedGroups) {
//     if (patternIdx >= 8) break;
//     const letter = String.fromCharCode(65 + patternIdx);
//     const roleKey = occs[0].fp.roleKey;

//     // Determine type label from roles
//     const isAlt = roleKey.includes(ROLE.UNIFORM_ALT);
//     const typeLabel = isAlt ? 'alternating_motif' : 'window';

//     const pattern = {
//       id:          `PAT_${letter}`,
//       label:       `Motif_${letter}`,
//       type:        typeLabel,
//       windowSize:  occs[0].cell.length,
//       occurrences: occs.map(o => ({
//         startBar: o.cell[0].bar_number,
//         endBar:   o.cell[o.cell.length - 1].bar_number,
//         barRange: [o.cell[0].bar_number, o.cell[o.cell.length - 1].bar_number],
//         phraseStartBar: o.phrase.startBar,
//         cellIndex: o.cellIdx,
//         w: o.cell.length,
//       })),
//       score:   occs.length * occs[0].cell.length * 2.5,
//       quality: 2.5,
//       color:   PATTERN_COLORS[patternIdx] || { bg:'#6b7280', text:'#fff', label:'gray' },
//     };
//     motifPatterns.push(pattern);
//     patternIdx++;
//   }

//   // ── D. Single-occurrence cells → unique motif or "SURPRISE" ───────
//   const singleGroups = [...cellFpMap.entries()].filter(([, occs]) => occs.length === 1);
//   // (we label these as per-cell analysis below, not as patterns)

//   // Final patterns: cadence first (most structural), then motifs
//   const allPatterns = [cadencePattern, ...motifPatterns];

//   return { patterns: allPatterns, phrases, cadencePairs };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 10 — FLAT PATTERN DETECTOR (fallback / legacy)
// // Kept from v1.1 — used when no cadence pairs are found.
// // ═══════════════════════════════════════════════════════════════════

// function detectPatternsFlat(bars, spb = 16) {
//   if (bars.length === 0) return [];
//   const exactMap = new Map(), rhythmMap = new Map(), contourMap = new Map(),
//         textureMap = new Map(), windowMap = new Map();
//   const push = (map, key, e) => { if (!map.has(key)) map.set(key, []); map.get(key).push(e); };

//   for (let i = 0; i < bars.length; i++) {
//     const bar = bars[i], bn = bar.bar_number, e = { barIdx: i, startBar: bn, w: 1 };
//     push(exactMap,   fpExact(bar),    e);
//     push(rhythmMap,  fpRhythm(bar),   e);
//     push(contourMap, fpContour(bar),  e);
//     push(textureMap, fpTexture(bar),  e);
//     for (const w of [2, 4, 8]) {
//       if (i + w > bars.length) continue;
//       const { combined } = fpWindow(bars, i, w);
//       push(windowMap, `C_${w}:${combined}`, { barIdx: i, startBar: bn, w });
//     }
//   }
//   const candidates = [];
//   const add = (map, type, q) => {
//     for (const [fp, occs] of map) {
//       if (occs.length < 2) continue;
//       candidates.push({ fingerprint: fp, type, windowSize: occs[0].w,
//                         occurrences: occs, score: occs.length * occs[0].w * q, quality: q });
//     }
//   };
//   add(exactMap, 'exact', 3.0); add(rhythmMap, 'rhythmic', 2.0);
//   add(contourMap, 'melodic', 1.8); add(textureMap, 'textural', 1.0);
//   add(windowMap, 'window', 2.5);
//   candidates.sort((a, b) => b.score - a.score);
//   const covered = new Set(), finals = [];
//   for (const c of candidates) {
//     const newSlots = [];
//     for (const occ of c.occurrences)
//       for (let j = 0; j < c.windowSize; j++) { const bn = occ.startBar + j; if (!covered.has(bn)) newSlots.push(bn); }
//     if (newSlots.length >= 2 || finals.length < 2) {
//       finals.push(c); for (const bn of newSlots) covered.add(bn);
//     }
//     if (finals.length >= 10) break;
//   }
//   finals.forEach((p, i) => {
//     const letter = String.fromCharCode(65 + i);
//     p.id = `PAT_${letter}`; p.label = `Pattern_${letter}`;
//     p.color = PATTERN_COLORS[i] || { bg:'#6b7280', text:'#fff', label:'gray' };
//   });
//   return finals;
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 11 — BAR LABELER  (updated for v2.0 roles)
// // ═══════════════════════════════════════════════════════════════════

// function labelBars(bars, patterns, spb, phrases) {
//   // Build lookup: barNumber → best matching pattern
//   const barPatternLookup = new Map();
//   for (const pat of patterns) {
//     for (const occ of pat.occurrences) {
//       for (let j = 0; j < (pat.windowSize || 2); j++) {
//         const bn = (occ.startBar || occ.barRange?.[0]) + j;
//         if (!barPatternLookup.has(bn)) barPatternLookup.set(bn, []);
//         barPatternLookup.get(bn).push({ pat, posInWindow: j });
//       }
//     }
//   }

//   // Build cadence bar set for quick lookup
//   const cadenceChromBns = new Set();
//   const cadenceSustBns  = new Set();
//   if (phrases) {
//     for (const ph of phrases) {
//       if (ph.cadenceBars.length >= 2) {
//         cadenceChromBns.add(ph.cadenceBars[0].bar_number);
//         cadenceSustBns.add(ph.cadenceBars[1].bar_number);
//       }
//     }
//   }

//   return bars.map(bar => {
//     const bn      = bar.bar_number;
//     const notes   = bar.notes;
//     const role    = classifyBarRole(bar, spb);
//     const isEmpty = notes.length === 0;
//     const alt     = isEmpty ? null : detectAlternating(bar);

//     const isCadenceChromatic = cadenceChromBns.has(bn);
//     const isCadenceSustain   = cadenceSustBns.has(bn);
//     const isCadence          = isCadenceChromatic || isCadenceSustain;
//     const isSustain          = notes.length <= 2 && notes.length > 0 &&
//                                Math.max(...notes.map(n => n.duration_subdivisions)) >= spb - 1;

//     const matches = barPatternLookup.get(bn) || [];
//     let patternId = null, patternLabel = null;
//     if (matches.length > 0) {
//       const best = [...matches].sort((a, b) => b.pat.score - a.pat.score)[0];
//       patternId    = best.pat.id;
//       patternLabel = best.pat.label;
//     }

//     // Override: cadence bars get their own label even if they matched a pattern
//     let finalPatternId = patternId, finalPatternLabel = patternLabel;
//     if (isCadenceChromatic) { finalPatternId = 'PAT_CADENCE'; finalPatternLabel = 'Cadence'; }
//     if (isCadenceSustain)   { finalPatternId = 'PAT_CADENCE'; finalPatternLabel = 'Cadence'; }

//     const isSurprise = !isEmpty && !isCadence && finalPatternId === null;

//     return {
//       barNumber:    bn, notes,
//       role,
//       patternId:    isEmpty ? 'EMPTY' : (finalPatternId || 'SURPRISE'),
//       patternLabel: isEmpty ? 'Empty' : (finalPatternLabel || 'Surprise'),
//       matchQuality: matches.length ? matches[0].pat.type : null,
//       isSurprise, isEmpty, isSustain, isCadence,
//       isCadenceChromatic, isCadenceSustain,
//       noteCount:    notes.length,
//       texture:      fpTexture(bar, spb),
//       rhythm:       fpRhythm(bar),
//       alternating:  alt,
//       maxDuration:  notes.length ? Math.max(...notes.map(n => n.duration_subdivisions)) : 0,
//     };
//   });
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 12 — PHRASE-AWARE SECTION DETECTOR  ← UPDATED IN v2.0
// //
// // If phrases were detected: each phrase becomes a section.
// // The section label respects the passacaglia/variation structure:
// //   same motif family at same position → same letter.
// // Fallback: old section detector for non-phrase music.
// // ═══════════════════════════════════════════════════════════════════

// function detectSections(labeledBars, patterns, phrases) {
//   // ── Phrase-aware path ─────────────────────────────────────────────
//   if (phrases && phrases.length > 0) {
//     return buildSectionsFromPhrases(labeledBars, patterns, phrases);
//   }
//   // ── Fallback: flat section detection ──────────────────────────────
//   return detectSectionsFlat(labeledBars, patterns);
// }

// function buildSectionsFromPhrases(labeledBars, patterns, phrases) {
//   const lbMap = new Map(labeledBars.map(lb => [lb.barNumber, lb]));

//   return phrases.map((phrase, idx) => {
//     const phraseLbs = phrase.bars.map(b => lbMap.get(b.bar_number)).filter(Boolean);
//     const surprises = phraseLbs.filter(lb => lb.isSurprise).map(lb => lb.barNumber);
//     const altCount  = phraseLbs.filter(lb => lb.role === ROLE.UNIFORM_ALT).length;
//     const cadCount  = phraseLbs.filter(lb => lb.isCadence).length;

//     // Determine dominant motif pattern for this phrase
//     const motifPatterns = patterns.filter(p => p.type === 'alternating_motif' || p.type === 'window');
//     const phraseBns     = new Set(phrase.bars.map(b => b.bar_number));
//     let bestMotifId = null, bestMotifLabel = 'Phrase', bestMotifCount = 0;
//     for (const pat of motifPatterns) {
//       const cnt = pat.occurrences.filter(o => phraseBns.has(o.startBar)).length;
//       if (cnt > bestMotifCount) { bestMotifCount = cnt; bestMotifId = pat.id; bestMotifLabel = pat.label; }
//     }

//     const letter = String.fromCharCode(65 + (idx % 26));
//     const isRepeat = idx > 0;
//     const repeatCount = idx;

//     // Build cell analysis for this phrase
//     const cellAnalysis = phrase.cells.map((cell, ci) => {
//       const cellBns = new Set(cell.map(b => b.bar_number));
//       const cellRole = cell.map(b => classifyBarRole(b, 16)).join('+');
//       const fp = cellFingerprint(cell, 16);
//       // Find which pattern this cell belongs to
//       let cellPatId = null;
//       for (const pat of patterns) {
//         if (pat.occurrences.some(o => cellBns.has(o.startBar || o.barRange?.[0]))) {
//           cellPatId = pat.id; break;
//         }
//       }
//       return {
//         cellIndex:    ci + 1,
//         startBar:     cell[0].bar_number,
//         endBar:       cell[cell.length - 1].bar_number,
//         barCount:     cell.length,
//         roleKey:      cellRole,
//         patternId:    cellPatId,
//         contourKey:   fp.contour.slice(0, 40),
//       };
//     });

//     return {
//       id:          `PHR_${String(idx + 1).padStart(2, '0')}`,
//       index:       idx,
//       startBar:    phrase.startBar,
//       endBar:      phrase.endBar,
//       barCount:    phrase.barCount,
//       patternId:   bestMotifId || 'MIXED',
//       patternLabel: bestMotifLabel,
//       letter:      `Ph${idx + 1}`,
//       isRepeat,
//       repeatCount,
//       fullLabel:   `Phrase_${idx + 1}`,
//       musicLabel:  `Ph${idx + 1}`,
//       bars:        phraseLbs,
//       surprises,
//       dominantTexture: altCount > phraseLbs.length / 2 ? 'alternating'
//                       : cadCount > 0 ? 'cadence' : 'mixed',
//       cells:    cellAnalysis,
//       hasCadence: phrase.cadenceBars.length > 0,
//       cadenceStart: phrase.cadenceBars[0]?.bar_number ?? null,
//       color: PATTERN_COLORS[idx % PATTERN_COLORS.length],
//     };
//   });
// }

// function detectSectionsFlat(labeledBars, patterns) {
//   if (labeledBars.length === 0) return [];
//   const rawGroups = [];
//   let current = null;
//   for (const lb of labeledBars) {
//     const pid = lb.patternId;
//     if (!current || current.patternId !== pid) {
//       if (current && pid === 'SURPRISE' && rawGroups.length > 0) {
//         current.bars.push(lb); current.surprises.push(lb.barNumber); continue;
//       }
//       current = { patternId: pid, patternLabel: lb.patternLabel, bars: [lb], surprises: [] };
//       rawGroups.push(current);
//     } else { current.bars.push(lb); }
//   }
//   const merged = [];
//   for (let i = 0; i < rawGroups.length; i++) {
//     const g = rawGroups[i];
//     if (g.bars.length === 1 && merged.length > 0) {
//       const prev = merged[merged.length - 1];
//       prev.bars.push(...g.bars); prev.surprises.push(...g.surprises, g.bars[0].barNumber);
//     } else { merged.push(g); }
//   }
//   const sectionLetterMap = new Map(); let nextLetter = 0;
//   return merged.map((g, idx) => {
//     const firstBar = g.bars[0].barNumber, lastBar = g.bars[g.bars.length - 1].barNumber;
//     const pat = patterns.find(p => p.id === g.patternId);
//     if (!sectionLetterMap.has(g.patternId)) sectionLetterMap.set(g.patternId, String.fromCharCode(65 + nextLetter++));
//     const letter = sectionLetterMap.get(g.patternId);
//     const isRepeat = idx > 0 && merged.slice(0, idx).some(p => p.patternId === g.patternId);
//     const repeatCount = merged.slice(0, idx).filter(p => p.patternId === g.patternId).length;
//     const altCount = g.bars.filter(b => b.alternating !== null).length;
//     const susCount = g.bars.filter(b => b.isSustain).length;
//     return {
//       id: `S${String(idx + 1).padStart(2, '0')}`, index: idx,
//       startBar: firstBar, endBar: lastBar, barCount: g.bars.length,
//       patternId: g.patternId, patternLabel: g.patternLabel, letter, isRepeat, repeatCount,
//       fullLabel: isRepeat ? `${letter}${repeatCount > 1 ? repeatCount : "'"}` : letter,
//       musicLabel: letter, bars: g.bars, surprises: g.surprises,
//       dominantTexture: altCount > g.bars.length / 2 ? 'alternating' : susCount > 0 ? 'sustain_cadence' : 'mixed',
//       color: pat ? pat.color : (g.patternId === 'EMPTY' ? EMPTY_COLOR : SURPRISE_COLOR),
//     };
//   });
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 13 — DIRECTED GRAPH BUILDER
// // ═══════════════════════════════════════════════════════════════════

// function buildGraph(labeledBars, patterns) {
//   const nodeMap = new Map();
//   for (const lb of labeledBars) {
//     const id = lb.patternId;
//     if (!nodeMap.has(id)) {
//       const pat = patterns.find(p => p.id === id);
//       nodeMap.set(id, {
//         id, label: lb.patternLabel,
//         type:  pat ? pat.type : (lb.isEmpty ? 'empty' : lb.isCadence ? 'cadence' : 'surprise'),
//         count: 0, bars: [],
//         color: pat ? pat.color : (lb.isEmpty ? EMPTY_COLOR : lb.isCadence ? CADENCE_COLOR : SURPRISE_COLOR),
//       });
//     }
//     const node = nodeMap.get(id); node.count++; node.bars.push(lb.barNumber);
//   }
//   const edgeMap = new Map();
//   for (let i = 0; i < labeledBars.length - 1; i++) {
//     const from = labeledBars[i].patternId, to = labeledBars[i + 1].patternId;
//     if (from === to) continue;
//     const key = `${from}|||${to}`;
//     edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
//   }
//   const edges = [];
//   for (const [key, weight] of edgeMap) {
//     const [from, to] = key.split('|||');
//     edges.push({ from, to, weight });
//   }
//   edges.sort((a, b) => b.weight - a.weight);
//   const adjacency = {};
//   for (const e of edges) {
//     if (!adjacency[e.from]) adjacency[e.from] = [];
//     adjacency[e.from].push({ to: e.to, weight: e.weight });
//   }
//   return { nodes: [...nodeMap.values()], edges, adjacency };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 14 — HAND ALIGNMENT
// // ═══════════════════════════════════════════════════════════════════

// function alignHands(rhLabeled, lhLabeled) {
//   const allBarNums = new Set([...rhLabeled.map(b => b.barNumber), ...lhLabeled.map(b => b.barNumber)]);
//   const rhMap = new Map(rhLabeled.map(b => [b.barNumber, b]));
//   const lhMap = new Map(lhLabeled.map(b => [b.barNumber, b]));
//   return [...allBarNums].sort((a, b) => a - b).map(bn => ({
//     barNumber: bn,
//     rh: rhMap.get(bn) || null,
//     lh: lhMap.get(bn) || null,
//     rhPattern: rhMap.get(bn)?.patternLabel || '-',
//     lhPattern: lhMap.get(bn)?.patternLabel || '-',
//     texturePair: `${rhMap.get(bn)?.patternId || '-'}_${lhMap.get(bn)?.patternId || '-'}`,
//   }));
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 15 — YAML BLUEPRINT GENERATOR  (updated for phrase hierarchy)
// // ═══════════════════════════════════════════════════════════════════

// function generateYaml(analysis) {
//   const { metadata, rightHand, leftHand } = analysis;
//   const rh = rightHand  || { patterns: [], sections: [], labeled: [], graph: { edges: [] } };
//   const lh = leftHand   || { patterns: [], sections: [] };
//   const totalBars = (metadata?.bars || []).length;
//   const phrases   = rh.phrases || [];

//   // ── Phrase summary ─────────────────────────────────────────────
//   const phraseLines = phrases.length > 0
//     ? phrases.map(ph => {
//         const cellStr = (ph.cells || []).map(c =>
//           `      - cell: ${c.cellIndex}  bars: [${c.startBar}, ${c.endBar}]  role: "${c.roleKey}"  pattern: "${c.patternId || 'unique'}"  contour: "${c.contourKey}"`
//         ).join('\n');
//         return `  - id: "${ph.id}"\n    bars: [${ph.startBar}, ${ph.endBar}]\n    barCount: ${ph.barCount}\n    hasCadence: ${ph.hasCadence}\n    cadenceStart: ${ph.cadenceStart ?? 'null'}\n    texture: "${ph.dominantTexture}"\n    cells:\n${cellStr || '      # (no cells)'}`;
//       }).join('\n\n')
//     : '  # (no phrase structure detected)';

//   // ── Motifs (non-cadence patterns) ──────────────────────────────
//   const motifPatterns = (rh.patterns || []).filter(p => p.type !== 'cadence');
//   const cadPattern    = (rh.patterns || []).find(p => p.type === 'cadence');

//   const motifLines = motifPatterns.length > 0
//     ? motifPatterns.map(pat => {
//         const occs = pat.occurrences || [];
//         return `  ${pat.label}:\n    id: "${pat.id}"\n    type: "${pat.type}"\n    windowSize: ${pat.windowSize}\n    occurrenceCount: ${occs.length}\n    bars: [${occs.map(o => o.startBar).join(', ')}]`;
//       }).join('\n\n')
//     : '  # (no motifs detected)';

//   // ── Cadence ─────────────────────────────────────────────────────
//   const cadenceLines = cadPattern
//     ? `  occurrenceCount: ${cadPattern.occurrences.length}\n  bars: [${cadPattern.occurrences.map(o => o.startBar).join(', ')}]`
//     : '  # (no cadences detected)';

//   // ── Graph edges ─────────────────────────────────────────────────
//   const graphEdges = (rh.graph?.edges || []).slice(0, 8).map(e =>
//     `    - from: "${e.from}" → to: "${e.to}" weight: ${e.weight}`
//   ).join('\n') || '    # (no transitions)';

//   // ── Section order string ─────────────────────────────────────────
//   const sectionOrder = phrases.length > 0
//     ? phrases.map(s => s.fullLabel).join(' → ')
//     : (rh.sections || []).map(s => s.fullLabel).join(' → ') || 'N/A';

//   const surpriseBars = (rh.labeled || []).filter(b => b.isSurprise).map(b => b.barNumber).join(', ') || 'none';
//   const sustainBars  = (rh.labeled || []).filter(b => b.isSustain).map(b => b.barNumber).join(', ')  || 'none';
//   const cadenceBars  = (rh.labeled || []).filter(b => b.isCadence).map(b => b.barNumber).join(', ')  || 'none';

//   return `# ═══════════════════════════════════════════════════════
// # MUSIC ANALYSIS BLUEPRINT v2.0
// # Generated by: MIDI Analyzer Engine v2.0
// # Source: ${totalBars} bars · ${metadata?.time_signature} · ${metadata?.tempo} BPM · Key: ${metadata?.key || '?'}
// # Phrases detected: ${phrases.length}
// # ═══════════════════════════════════════════════════════

// composition:
//   title: "Analyzed Composition"
//   key: "${metadata?.key || 'C'}"
//   tempo: ${metadata?.tempo || 120}
//   time_signature: "${metadata?.time_signature || '4/4'}"
//   total_bars: ${totalBars}
//   subdivisions_per_bar: ${metadata?.subdivisions_per_bar || 16}

// # ─── PHRASE STRUCTURE (Hierarchical) ─────────────────
// # Each phrase = complete musical unit (motif cells + cadence)
// phrases:
// ${phraseLines}

// # ─── MOTIF PATTERNS (Transposition-Normalised) ───────
// motifs:
// ${motifLines}

// # ─── CADENCE PATTERN ────────────────────────────────
// cadence:
// ${cadenceLines}

// # ─── PATTERN GRAPH ───────────────────────────────────
// pattern_graph:
//   description: "Directed graph of pattern transitions"
//   edges:
// ${graphEdges}

// # ─── LEFT HAND ───────────────────────────────────────
// left_hand:
//   patternCount: ${(lh.patterns || []).length}
//   sectionCount: ${(lh.sections || []).length}
//   patterns: [${(lh.patterns || []).map(p => `"${p.label}"`).join(', ')}]

// # ─── GENERATION RULES ────────────────────────────────
// generation_rules:
//   - "Phrase order: ${sectionOrder}"
//   - "Total phrases: ${phrases.length}"
//   - "Cadence pattern at bars: [${cadenceBars}]"
//   - "Total distinct motif patterns: ${motifPatterns.length}"
//   - "Surprise bars (uncategorised): [${surpriseBars}]"
//   - "Sustain/cadence bars: [${sustainBars}]"
//   - "RH alternating-motif bars: ${(rh.labeled || []).filter(b => b.role === '${ROLE.UNIFORM_ALT}').length}"
// `;
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 16 — HAND ANALYZER  (updated to use hierarchical detector)
// // ═══════════════════════════════════════════════════════════════════

// function analyzeHand(bars, spb, handName) {
//   const nonEmpty = bars.filter(b => b.notes.length > 0);
//   if (nonEmpty.length === 0) {
//     return {
//       patterns: [], graph: { nodes: [], edges: [], adjacency: {} }, hand: handName,
//       labeled: bars.map(b => ({
//         barNumber: b.bar_number, notes: [], patternId: 'EMPTY', patternLabel: 'Empty',
//         role: ROLE.EMPTY, isEmpty: true, isSurprise: false, isSustain: false,
//         isCadence: false, isCadenceChromatic: false, isCadenceSustain: false,
//         noteCount: 0, alternating: null, texture: 'empty', rhythm: 'empty', maxDuration: 0,
//       })),
//       sections: [], phrases: null,
//     };
//   }

//   // ── Run hierarchical detection on all bars (including empty) ─────
//   const { patterns, phrases: rawPhrases, cadencePairs } = detectPatternsHierarchical(bars, spb);

//   const labeled   = labelBars(bars, patterns, spb, rawPhrases);
//   const sections  = detectSections(labeled, patterns, rawPhrases);
//   const graph     = buildGraph(labeled, patterns);

//   // Expose enriched phrases = the sections object when phrase mode is active.
//   // rawPhrases is kept for internal reference.
//   const phrases = rawPhrases ? sections : null;

//   return { patterns, labeled, sections, phrases, rawPhrases, cadencePairs, graph, hand: handName };
// }


// // ═══════════════════════════════════════════════════════════════════
// // PART 17 — MAIN ORCHESTRATOR
// // ═══════════════════════════════════════════════════════════════════

// function analyze(rawJson, options = {}) {
//   const normalized = normalizeJson(rawJson);
//   const spb        = normalized.subdivisions_per_bar;

//   const { rhBars, lhBars, splitMidi, rhHasNotes, lhHasNotes } =
//     separateHands(normalized.bars, options.splitMidi);

//   const rightHand = analyzeHand(rhBars, spb, 'right');
//   const leftHand  = analyzeHand(lhBars, spb, 'left');
//   const alignment = alignHands(rightHand.labeled, leftHand.labeled);

//   const yamlBlueprint = generateYaml({
//     metadata:  normalized,
//     rightHand, leftHand, alignment,
//   });

//   return {
//     metadata: normalized, splitMidi,
//     rightHand, leftHand, alignment, yamlBlueprint,
//     summary: {
//       totalBars:      normalized.bars.length,
//       rhPatterns:     rightHand.patterns.length,
//       lhPatterns:     leftHand.patterns.length,
//       rhSections:     rightHand.sections.length,
//       lhSections:     leftHand.sections.length,
//       rhPhrases:      rightHand.phrases?.length ?? 0,
//       cadencePairs:   rightHand.cadencePairs?.length ?? 0,
//       surpriseBars:   rightHand.labeled.filter(b => b.isSurprise).map(b => b.barNumber),
//       sustainBars:    rightHand.labeled.filter(b => b.isSustain).map(b => b.barNumber),
//       cadenceBars:    rightHand.labeled.filter(b => b.isCadence).map(b => b.barNumber),
//       splitMidi, rhHasNotes, lhHasNotes,
//     },
//   };
// }


// // ═══════════════════════════════════════════════════════════════════
// // EXPORTS
// // ═══════════════════════════════════════════════════════════════════

// const MusicAnalyzerEngine = {
//   // Core
//   analyze, normalizeJson, normalizeNote, normalizeBar,
//   separateHands, detectSplitPoint,
//   // Pattern detection (v2 + legacy)
//   detectPatternsHierarchical, detectPatternsFlat,
//   // Phrase / section / graph
//   buildPhrases, findCadencePairs, buildSectionsFromPhrases,
//   detectSections, detectSectionsFlat, buildGraph, alignHands,
//   labelBars, analyzeHand, generateYaml,
//   // Bar classification
//   classifyBarRole,
//   // Cell fingerprinting
//   cellFingerprint, cellIntervalKey, cellRhythmKey, extractMelodyNotes, splitIntoCells,
//   // Low-level utilities
//   fpExact, fpRhythm, fpContour, fpTexture, fpWindow,
//   detectAlternating, getNotesOrdered,
//   pitchToMidi, midiToPitchName, pitchClass, intervalSemitones,
//   // Constants
//   PATTERN_COLORS, CADENCE_COLOR, SURPRISE_COLOR, EMPTY_COLOR,
//   HAND_SPLIT_LOW, HAND_SPLIT_HIGH, ROLE,
// };

// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = MusicAnalyzerEngine;
// } else if (typeof globalThis !== 'undefined') {
//   globalThis.MusicAnalyzerEngine = MusicAnalyzerEngine;
// }














'use strict';

// ═══════════════════════════════════════════════════════════════════
// MUSIC ANALYZER ENGINE v3.0
//
// Universal — works on any MIDI JSON regardless of music type.
// No hardcoded cadence rules, no fixed bar/cell assumptions.
// Everything emerges from feature similarity.
//
// Pipeline:
//   Phase 0 — ingestion + normalization
//   Phase 1 — per-bar FeatureVector extraction
//   Phase 2 — pairwise similarity matrix (O(n²), intentional)
//   Phase 3 — data-driven boundary detection (novelty score)
//   Phase 4 — adaptive window pattern detection
//   Phase 5 — variation classifier
//   Phase 6 — hierarchical labeling + YAML blueprint
// ═══════════════════════════════════════════════════════════════════

// ─── CONSTANTS ──────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_MAP = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,
  'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
  'A':9,'A#':10,'BB':10,'B':11,
};

// All 12 major and 12 natural minor pitch-class sets (bitmasks)
const SCALE_TEMPLATES = [];
(function buildScales() {
  const majorPattern = [0,2,4,5,7,9,11];
  const minorPattern = [0,2,3,5,7,8,10];
  const harmMinorPat = [0,2,3,5,7,8,11];
  const modePatterns = [
    { name:'major',    p: majorPattern },
    { name:'minor',    p: minorPattern },
    { name:'harm-min', p: harmMinorPat },
  ];
  for (const { name, p } of modePatterns) {
    for (let root = 0; root < 12; root++) {
      let mask = 0;
      for (const step of p) mask |= (1 << ((root + step) % 12));
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
];
const EMPTY_COLOR   = { bg:'#374151', text:'#9ca3af', label:'gray'    };
const SURPRISE_COLOR = { bg:'#ef4444', text:'#fff',   label:'red'     };
const BOUNDARY_COLOR = { bg:'#f97316', text:'#fff',   label:'orange'  };

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

// ═══════════════════════════════════════════════════════════════════
// PHASE 0 — NORMALIZATION
// ═══════════════════════════════════════════════════════════════════

function normalizeNote(n) {
  return {
    pitch:                 n.pitch                ?? n.p                ?? null,
    start_subdivision:     n.start_subdivision    ?? n.s                ?? 0,
    offset_percent:        n.offset_percent       ?? n.o                ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d               ?? 4,
    end_cutoff_percent:    n.end_cutoff_percent   ?? n.c                ?? null,
    velocity:              100,
  };
}

function normalizeBar(b) {
  return {
    bar_number: b.bar_number ?? b.bn,
    notes:      (b.notes ?? []).map(normalizeNote).filter(n => n.pitch !== null),
  };
}

function normalizeJson(json) {
  const ts    = json.time_signature || '4/4';
  const [n,d] = ts.split('/').map(Number);
  const spb   = json.subdivisions_per_bar || (n * (16 / d));
  return {
    tempo:                json.tempo           || 120,
    time_signature:       ts,
    key:                  json.key             || 'C',
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
  const sorted = [...pitchFreq.keys()].sort((a, b) => a - b);
  let best = -1, splitAt = 60;
  for (let i = 1; i < sorted.length; i++) {
    const lo = sorted[i-1], hi = sorted[i], gap = hi - lo;
    if (!gap) continue;
    const mid = (lo + hi) / 2;
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
  return { rhBars, lhBars, splitMidi: split, rhHasNotes: rhBars.some(b=>b.notes.length>0), lhHasNotes: lhBars.some(b=>b.notes.length>0) };
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 1 — PER-BAR FEATURE VECTOR
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

function popcount(mask) {
  let c = 0;
  let m = mask >>> 0;
  while (m) { c += m & 1; m >>>= 1; }
  return c;
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

function detectAlternatingStatistical(orderedNotes) {
  // purely statistical: does one pitch appear in >= 40% of notes
  // and is it interleaved with other pitches?
  if (orderedNotes.length < 4) return { hasAlternating: false, pedalCandidate: null };
  const pitchCount = new Map();
  for (const n of orderedNotes)
    pitchCount.set(n.pitch, (pitchCount.get(n.pitch) || 0) + 1);

  const total = orderedNotes.length;
  let topPitch = null, topCount = 0;
  for (const [p, c] of pitchCount) {
    if (c > topCount) { topCount = c; topPitch = p; }
  }

  if (topCount / total < 0.35) return { hasAlternating: false, pedalCandidate: null };

  // check interleaving: does topPitch appear in alternating positions?
  const positions = orderedNotes.map((n, i) => n.pitch === topPitch ? i : -1).filter(i => i >= 0);
  if (positions.length < 2) return { hasAlternating: false, pedalCandidate: null };

  // are gaps between pedal positions roughly equal?
  const gaps = [];
  for (let i = 1; i < positions.length; i++) gaps.push(positions[i] - positions[i-1]);
  const meanGap = gaps.reduce((a,b) => a+b, 0) / gaps.length;
  const gapVariance = gaps.reduce((a,b) => a + (b - meanGap)**2, 0) / gaps.length;
  const isRegular = gapVariance < 2.0; // gaps are consistent

  return { hasAlternating: isRegular, pedalCandidate: isRegular ? topPitch : null };
}

function extractFeatureVector(bar, spb, pieceStats) {
  const notes = [...bar.notes].sort((a, b) => a.start_subdivision - b.start_subdivision);
  const bn    = bar.bar_number;

  if (notes.length === 0) {
    return {
      barNumber: bn, isEmpty: true,
      midiValues: [], midiMin: 0, midiMax: 0, midiMean: 0, midiRange: 0, midiVariance: 0,
      pitchClassMask: 0, pitchClassCount: 0, pitchClassSet: new Set(),
      noteCount: 0, subdivisionMap: new Array(spb).fill(false),
      durationFreq: new Map(), dominantDuration: 0,
      rhythmicEntropy: 0, hasMixedDurations: false, subdivisionCoverage: 0,
      orderedNotes: [], contourIntervals: [], contourDirections: [], hasLeaps: false, contourShape: '',
      bestScaleName: 'unknown', bestScaleMatch: 0, hasChromaticNotes: false,
      isMonophonic: true, polyphonyMax: 0,
      hasAlternating: false, pedalCandidate: null, registralSpread: 0,
      rawEnergy: 0, relativeEnergy: 0,
    };
  }

  // ── Pitch group ─────────────────────────────────────────────
  const midiValues = notes.map(n => pitchToMidi(n.pitch)).filter(m => m !== null);
  const midiMin    = Math.min(...midiValues);
  const midiMax    = Math.max(...midiValues);
  const midiMean   = midiValues.reduce((a,b) => a+b, 0) / midiValues.length;
  const midiRange  = midiMax - midiMin;
  const midiVar    = midiValues.reduce((a,b) => a + (b-midiMean)**2, 0) / midiValues.length;
  const pcMask     = buildPitchClassMask(notes);
  const pcSet      = new Set(midiValues.map(m => m % 12));

  // ── Rhythm group ─────────────────────────────────────────────
  const subdivMap  = new Array(spb).fill(false);
  const durFreq    = new Map();
  let subdCount    = 0;
  for (const n of notes) {
    const s = Math.max(0, Math.min(spb - 1, n.start_subdivision));
    subdivMap[s] = true;
    subdCount++;
    durFreq.set(n.duration_subdivisions, (durFreq.get(n.duration_subdivisions) || 0) + 1);
  }
  let domDur = 0, domDurCount = 0;
  for (const [d, c] of durFreq) { if (c > domDurCount) { domDurCount = c; domDur = d; } }
  const rhythmEnt   = shannonEntropy(durFreq, notes.length);
  const coveredSubd = subdivMap.filter(Boolean).length;

  // ── Melodic group ────────────────────────────────────────────
  const intervals   = [];
  const directions  = [];
  for (let i = 1; i < notes.length; i++) {
    const m1 = pitchToMidi(notes[i-1].pitch);
    const m2 = pitchToMidi(notes[i].pitch);
    if (m1 !== null && m2 !== null) {
      const diff = m2 - m1;
      intervals.push(diff);
      directions.push(diff > 0 ? 'U' : diff < 0 ? 'D' : 'S');
    }
  }
  const contourShape = directions.join('');
  const hasLeaps     = intervals.some(i => Math.abs(i) > 2);

  // ── Harmonic group ───────────────────────────────────────────
  const scaleResult = bestScaleMatch(pcMask);
  // Check chromatic: does any note fall outside the best matching scale?
  let hasChromaticNotes = false;
  for (const n of notes) {
    const pc = pitchClass(n.pitch);
    if (pc !== null) {
      const template = SCALE_TEMPLATES.find(t => t.name === scaleResult.name);
      if (template && !((template.mask >> pc) & 1)) { hasChromaticNotes = true; break; }
    }
  }

  // ── Texture group ────────────────────────────────────────────
  const subdivStarts = new Map();
  for (const n of notes) {
    const s = n.start_subdivision;
    subdivStarts.set(s, (subdivStarts.get(s) || 0) + 1);
  }
  const polyphonyMax  = Math.max(...subdivStarts.values(), 0);
  const isMonophonic  = polyphonyMax <= 1;
  const { hasAlternating, pedalCandidate } = detectAlternatingStatistical(notes);

  // ── Energy group ─────────────────────────────────────────────
  const avgDur   = notes.reduce((a, n) => a + n.duration_subdivisions, 0) / notes.length;
  const rawEnergy = (notes.length * midiMean * avgDur) / (spb * spb);
  // relativeEnergy computed after all bars extracted (needs pieceStats)

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
    isMonophonic,
    polyphonyMax,
    hasAlternating,
    pedalCandidate,
    registralSpread:   midiRange,
    rawEnergy,
    relativeEnergy:    0, // filled in after
  };
}

function computeRelativeEnergy(features) {
  const nonEmpty = features.filter(f => !f.isEmpty);
  if (nonEmpty.length === 0) return;
  const mean = nonEmpty.reduce((a, f) => a + f.rawEnergy, 0) / nonEmpty.length;
  for (const f of features)
    f.relativeEnergy = mean > 0 ? f.rawEnergy / mean : 0;
}

function extractAllFeatures(bars, spb) {
  const features = bars.map(b => extractFeatureVector(b, spb, null));
  computeRelativeEnergy(features);
  return features;
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 2 — PAIRWISE SIMILARITY MATRIX
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
  // Dim 1: rhythmic (subdivision grid)
  const rhythm  = jaccardBoolArray(fi.subdivisionMap, fj.subdivisionMap);
  // Dim 2: contour (melodic shape, transposition-invariant)
  const contour = levenshteinSim(fi.contourShape, fj.contourShape);
  // Dim 3: harmonic (pitch-class overlap)
  const harmonic = jaccardBitmask(fi.pitchClassMask, fj.pitchClassMask);
  // Dim 4: texture
  const ncDiff    = Math.max(fi.noteCount, fj.noteCount) > 0
    ? Math.abs(fi.noteCount - fj.noteCount) / Math.max(fi.noteCount, fj.noteCount) : 0;
  const durMatch  = fi.dominantDuration === fj.dominantDuration ? 1 : 0;
  const altMatch  = fi.hasAlternating === fj.hasAlternating ? 1 : 0;
  const texture   = (1 - ncDiff + durMatch + altMatch) / 3;
  // Dim 5: energy
  const energy    = 1 - Math.min(1, Math.abs(fi.relativeEnergy - fj.relativeEnergy));

  return { rhythm, contour, harmonic, texture, energy,
           combined: (rhythm + contour + harmonic + texture + energy) / 5 };
}

function buildSimilarityMatrix(features) {
  const n   = features.length;
  const mat = new Array(n).fill(null).map(() => new Array(n).fill(null));
  for (let i = 0; i < n; i++) {
    mat[i][i] = { rhythm:1, contour:1, harmonic:1, texture:1, energy:1, combined:1 };
    for (let j = i + 1; j < n; j++) {
      const sim  = computeSimilarity(features[i], features[j]);
      mat[i][j]  = sim;
      mat[j][i]  = sim;
    }
  }
  return mat;
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 3 — DATA-DRIVEN BOUNDARY DETECTION
// ═══════════════════════════════════════════════════════════════════

function computeNoveltyScores(features, simMatrix) {
  const n       = features.length;
  const scores  = new Array(n - 1).fill(0);

  for (let i = 0; i < n - 1; i++) {
    const fi = features[i], fj = features[i + 1];
    if (fi.isEmpty || fj.isEmpty) { scores[i] = 0.1; continue; }

    const sim = simMatrix[i][i + 1];
    const rhythmJump   = 1 - sim.rhythm;
    const contourJump  = 1 - sim.contour;
    const harmonicJump = 1 - sim.harmonic;
    const textureJump  = 1 - sim.texture;
    const energyJump   = 1 - sim.energy;

    const maxEnt     = Math.log2(16); // max possible entropy for spb=16
    const entropyDelta = Math.abs(fj.rhythmicEntropy - fi.rhythmicEntropy) / (maxEnt || 1);
    const densityDelta = Math.min(1, Math.abs(fj.relativeEnergy - fi.relativeEnergy));

    scores[i] = (rhythmJump + contourJump + harmonicJump + textureJump + energyJump + entropyDelta + densityDelta) / 7;
  }

  return scores;
}

function detectBoundaries(features, simMatrix, kSigma = 1.0) {
  if (features.length < 3) return [];

  const novelty = computeNoveltyScores(features, simMatrix);

  // Dynamic threshold
  const mean = novelty.reduce((a, b) => a + b, 0) / novelty.length;
  const std  = Math.sqrt(novelty.reduce((a, b) => a + (b - mean) ** 2, 0) / novelty.length);
  const threshold = mean + kSigma * std;

  const boundaries = [];
  for (let i = 0; i < novelty.length; i++) {
    if (novelty[i] >= threshold) {
      const fi = features[i], fj = features[i + 1];
      const sim = simMatrix[i][i + 1];

      // Determine dominant type of boundary
      let type = 'mixed';
      const dims = {
        rhythm:   1 - sim.rhythm,
        contour:  1 - sim.contour,
        harmonic: 1 - sim.harmonic,
        texture:  1 - sim.texture,
        energy:   1 - sim.energy,
      };
      const domDim = Object.entries(dims).sort((a,b) => b[1] - a[1])[0][0];
      if (domDim === 'texture' || domDim === 'energy') {
        // further refine: low energy after = cadential
        if (fj.relativeEnergy < 0.3 || fj.noteCount <= 2) type = 'cadential';
        else type = 'texture';
      } else {
        type = domDim; // 'rhythm' | 'contour' | 'harmonic'
      }

      boundaries.push({
        afterBarIdx:   i,                    // boundary is AFTER features[i]
        afterBarNumber: fi.barNumber,
        noveltyScore:  novelty[i],
        type,
        dims,
      });
    }
  }

  return boundaries;
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 4 — ADAPTIVE WINDOW PATTERN DETECTION
// ═══════════════════════════════════════════════════════════════════

// ── Multi-level fingerprinting for a window of feature vectors ──

function fpLevel0(fvWindow) {
  // Exact: pitch-start-duration per note
  return fvWindow.map(f =>
    f.orderedNotes.map(n => `${n.pitch}@${n.start_subdivision}:${n.duration_subdivisions}`).join(',')
  ).join('|');
}

function fpLevel1(fvWindow) {
  // Rhythmic: subdivision-duration, no pitch
  return fvWindow.map(f =>
    f.orderedNotes.map(n => `${n.start_subdivision}:${n.duration_subdivisions}`).join(',')
  ).join('|');
}

function fpLevel2(fvWindow) {
  // Contour + dominant duration: transposition-invariant
  return fvWindow.map(f => `${f.contourShape}:${f.dominantDuration}`).join('|');
}

function fpLevel3(fvWindow) {
  // Shape only: contour directions compressed
  return fvWindow.map(f => f.contourShape).join('|');
}

function fpLevel4(fvWindow) {
  // Density: note count + dominant duration
  return fvWindow.map(f => `${f.noteCount}:${f.dominantDuration}`).join('|');
}

function discoverNaturalWindowSizes(features, maxW) {
  const n = features.length;
  const density = new Map(); // W → repetitionDensity

  for (let W = 1; W <= maxW; W++) {
    const fpCount   = new Map();
    let total       = 0;
    for (let start = 0; start + W <= n; start++) {
      const fvWin = features.slice(start, start + W);
      const key   = fpLevel2(fvWin);
      fpCount.set(key, (fpCount.get(key) || 0) + 1);
      total++;
    }
    const repeated = [...fpCount.values()].filter(c => c >= 2).reduce((a, b) => a + b, 0);
    density.set(W, total > 0 ? repeated / total : 0);
  }

  // Local maxima in density
  const naturalSizes = [];
  for (let W = 1; W <= maxW; W++) {
    const prev = density.get(W - 1) ?? 0;
    const curr = density.get(W)     ?? 0;
    const next = density.get(W + 1) ?? 0;
    if (curr > prev && curr >= next && curr > 0.15) {
      naturalSizes.push({ W, density: curr });
    }
  }

  // Always include W=1 if it has any density, and the top-3 sizes
  const ranked = [...density.entries()]
    .filter(([, d]) => d > 0.1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([W, d]) => ({ W, density: d }));

  // Merge natural + ranked, deduplicate
  const sizeMap = new Map();
  for (const s of [...naturalSizes, ...ranked]) sizeMap.set(s.W, s);
  return [...sizeMap.values()].sort((a, b) => b.density - a.density);
}

function detectPatternsAdaptive(features, simMatrix, boundaries) {
  const n    = features.length;
  if (n === 0) return { families: [], windowSizes: [] };

  const maxW = Math.min(Math.floor(n / 2), 16);
  const windowSizes = discoverNaturalWindowSizes(features, maxW);

  // Index: familyKey (Level 2) → list of occurrences
  const familyIndex = new Map();

  for (const { W } of windowSizes) {
    for (let start = 0; start + W <= n; start++) {
      const fvWin = features.slice(start, start + W);
      // skip all-empty windows
      if (fvWin.every(f => f.isEmpty)) continue;

      const l0 = fpLevel0(fvWin);
      const l1 = fpLevel1(fvWin);
      const l2 = fpLevel2(fvWin);
      const l3 = fpLevel3(fvWin);
      const l4 = fpLevel4(fvWin);

      // Family key = Level 2 (contour + dominant duration, transposition-invariant)
      const famKey = `W${W}~~${l2}`;
      if (!familyIndex.has(famKey)) familyIndex.set(famKey, []);

      familyIndex.get(famKey).push({
        startIdx:    start,
        startBar:    fvWin[0].barNumber,
        endBar:      fvWin[fvWin.length - 1].barNumber,
        barRange:    [fvWin[0].barNumber, fvWin[fvWin.length - 1].barNumber],
        W,
        fp:          { l0, l1, l2, l3, l4 },
        features:    fvWin,
      });
    }
  }

  // Filter to families with ≥ 2 occurrences
  const families = [];
  let colorIdx = 0;

  const sorted = [...familyIndex.entries()]
    .filter(([, occs]) => occs.length >= 2)
    .sort((a, b) => {
      // rank: occurrence count × window size
      const scoreA = a[1].length * a[1][0].W;
      const scoreB = b[1].length * b[1][0].W;
      return scoreB - scoreA;
    });

  for (const [famKey, occs] of sorted) {
    const W       = occs[0].W;
    const letter  = String.fromCharCode(65 + families.length);
    const id      = `FAM_${letter}`;

    // Determine match level: what fingerprint level groups these?
    // All occs share l2 by construction. Check if they also share l1 or l0.
    const allSameL1 = new Set(occs.map(o => o.fp.l1)).size === 1;
    const allSameL0 = new Set(occs.map(o => o.fp.l0)).size === 1;
    const matchLevel = allSameL0 ? 'exact' : allSameL1 ? 'rhythmic' : 'contour';

    families.push({
      id,
      label:       `Motif_${letter}`,
      famKey,
      windowSize:  W,
      matchLevel,
      occurrenceCount: occs.length,
      occurrences: occs.map(o => ({
        startBar: o.startBar,
        endBar:   o.endBar,
        barRange: o.barRange,
        startIdx: o.startIdx,
        w:        o.W,
        fp:       o.fp,
      })),
      score:  occs.length * W * 2.5,
      color:  PATTERN_COLORS[colorIdx % PATTERN_COLORS.length],
      type:   'motif',
    });
    colorIdx++;
    if (families.length >= 12) break;
  }

  return { families, windowSizes: windowSizes.map(s => s.W) };
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 5 — VARIATION CLASSIFIER
// ═══════════════════════════════════════════════════════════════════

function classifyVariation(protoOcc, compareOcc) {
  const pFp = protoOcc.fp, cFp = compareOcc.fp;

  // Exact: same pitch, rhythm, everything
  if (pFp.l0 === cFp.l0) return 'exact';

  // Same rhythm different pitch = transposition or different harmony
  if (pFp.l1 === cFp.l1) {
    // Check if intervals are all shifted by same amount (transposition)
    const pNotes = protoOcc.features?.flatMap(f => f.contourIntervals) ?? [];
    const cNotes = compareOcc.features?.flatMap(f => f.contourIntervals) ?? [];
    if (pNotes.length === cNotes.length && pNotes.length > 0) {
      const diffs = pNotes.map((p, i) => cNotes[i] - p);
      if (diffs.every(d => d === diffs[0]) && diffs[0] !== 0)
        return `transposed ${diffs[0] > 0 ? '+' : ''}${diffs[0]} st`;
    }
    return 'same rhythm, different pitch';
  }

  // Contour inversion: directions are opposite
  const pDir = protoOcc.features?.map(f => f.contourShape).join('') ?? '';
  const cDir = compareOcc.features?.map(f => f.contourShape).join('') ?? '';
  const cDirInverted = cDir.split('').map(d => d==='U'?'D':d==='D'?'U':'S').join('');
  if (pDir === cDirInverted && pDir.length > 0) return 'inverted';

  // Retrograde: reversed contour
  if (pDir === cDir.split('').reverse().join('') && pDir.length > 1) return 'retrograde';

  // Duration augmentation/diminution: same rhythm structure but different durations
  if (pFp.l3 === cFp.l3 && pFp.l1 !== cFp.l1) {
    const pDurs = protoOcc.features?.map(f => f.dominantDuration) ?? [];
    const cDurs = compareOcc.features?.map(f => f.dominantDuration) ?? [];
    if (pDurs.length === cDurs.length && pDurs.length > 0 && pDurs[0] > 0) {
      const ratios = pDurs.map((d, i) => cDurs[i] / d);
      if (ratios.every(r => Math.abs(r - ratios[0]) < 0.01)) {
        const r = ratios[0];
        if (r > 1) return `augmented ×${r.toFixed(1)}`;
        if (r < 1) return `diminished ×${r.toFixed(1)}`;
      }
    }
  }

  // Similar shape: Levenshtein on contour < 30%
  const simScore = levenshteinSim(pDir, cDir);
  if (simScore >= 0.7) return 'developed';

  return 'variation';
}

function classifyFamilyVariations(families) {
  for (const fam of families) {
    if (fam.occurrences.length < 2) continue;
    const proto = fam.occurrences[0];
    proto.variationType = 'prototype';
    for (let i = 1; i < fam.occurrences.length; i++) {
      fam.occurrences[i].variationType = classifyVariation(proto, fam.occurrences[i]);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 6 — HIERARCHICAL LABELING + OUTPUT
// ═══════════════════════════════════════════════════════════════════

// ── Bar labeling ─────────────────────────────────────────────────

function labelBars(features, families, boundaries) {
  // Build lookup: barNumber → best family match
  const barFamilyLookup = new Map();
  for (const fam of families) {
    for (const occ of fam.occurrences) {
      for (let j = 0; j < fam.windowSize; j++) {
        const bn = occ.startBar + j;
        if (!barFamilyLookup.has(bn)) barFamilyLookup.set(bn, []);
        barFamilyLookup.get(bn).push({ fam, occ, posInWindow: j });
      }
    }
  }

  // Build boundary bar set
  const boundaryBns = new Set(boundaries.map(b => b.afterBarNumber));
  const boundaryMap = new Map(boundaries.map(b => [b.afterBarNumber, b]));

  return features.map(f => {
    const bn      = f.barNumber;
    const matches = barFamilyLookup.get(bn) || [];
    const best    = matches.sort((a, b) => b.fam.score - a.fam.score)[0] ?? null;

    const isBoundaryEnd = boundaryBns.has(bn);
    const boundaryInfo  = isBoundaryEnd ? boundaryMap.get(bn) : null;

    let patternId    = best ? best.fam.id : null;
    let patternLabel = best ? best.fam.label : null;
    const isSurprise = !f.isEmpty && !patternId;

    return {
      barNumber:      bn,
      notes:          f.orderedNotes,
      patternId:      f.isEmpty ? 'EMPTY' : (patternId || 'SURPRISE'),
      patternLabel:   f.isEmpty ? 'Empty' : (patternLabel || 'Surprise'),
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
      isCadence:      f.isCadence ?? false, // filled below
      color:          best ? best.fam.color : (f.isEmpty ? EMPTY_COLOR : SURPRISE_COLOR),
      // mirror feature fields for UI
      alternating:    f.hasAlternating ? { pedal: f.pedalCandidate, notesPerBar: f.noteCount } : null,
      texture:        `n${f.noteCount}_d${f.dominantDuration}`,
    };
  });
}

// ── Section detection from labeled bars ─────────────────────────

function detectSections(labeledBars, families, boundaries) {
  if (labeledBars.length === 0) return [];

  // Use boundaries as section splits
  const boundaryIdxSet = new Set(boundaries.map(b => b.afterBarIdx));
  const sections = [];
  let current    = { bars: [], patternId: null };

  for (let i = 0; i < labeledBars.length; i++) {
    const lb = labeledBars[i];
    current.bars.push(lb);
    if (!current.patternId && lb.patternId !== 'EMPTY')
      current.patternId = lb.patternId;

    const isLast      = i === labeledBars.length - 1;
    const isBoundary  = boundaryIdxSet.has(i);

    if (isBoundary || isLast) {
      if (current.bars.length > 0) sections.push({ ...current });
      current = { bars: [], patternId: null };
    }
  }

  // Assign section letters using pattern family continuity
  const familyLetterMap = new Map();
  let nextLetter = 0;

  return sections.map((sec, idx) => {
    const pid = sec.patternId || 'MIXED';
    if (!familyLetterMap.has(pid)) familyLetterMap.set(pid, String.fromCharCode(65 + nextLetter++));
    const letter    = familyLetterMap.get(pid);
    const prevSame  = sections.slice(0, idx).filter(s => s.patternId === pid).length;
    const fullLabel = prevSame === 0 ? letter : prevSame === 1 ? `${letter}'` : `${letter}''`;
    const fam       = families.find(f => f.id === pid);
    const firstBar  = sec.bars[0]?.barNumber ?? 0;
    const lastBar   = sec.bars[sec.bars.length - 1]?.barNumber ?? 0;

    return {
      id:          `S${String(idx + 1).padStart(2, '0')}`,
      index:       idx,
      startBar:    firstBar,
      endBar:      lastBar,
      barCount:    sec.bars.length,
      patternId:   pid,
      pid,
      patternLabel: fam?.label ?? pid,
      letter,
      fullLabel,
      musicLabel:  letter,
      isRepeat:    prevSame > 0,
      bars:        sec.bars,
      color:       fam?.color ?? EMPTY_COLOR,
    };
  });
}

// ── Graph builder ─────────────────────────────────────────────────

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
    const from = labeledBars[i].patternId, to = labeledBars[i + 1].patternId;
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

// ── Alignment ────────────────────────────────────────────────────

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

// ── YAML blueprint generator ──────────────────────────────────────

function generateYaml(analysis) {
  const { metadata, rightHand, leftHand } = analysis;
  const rh  = rightHand || {};
  const lh  = leftHand  || {};
  const fams = rh.families || [];
  const bounds = rh.boundaries || [];
  const sections = rh.sections || [];
  const labeled  = rh.labeled  || [];

  const surpriseBars = labeled.filter(b => b.isSurprise).map(b => b.barNumber).join(', ') || 'none';
  const boundaryBars = bounds.map(b => `${b.afterBarNumber}(${b.type})`).join(', ') || 'none';
  const sectionOrder = sections.map(s => s.fullLabel).join(' → ') || 'N/A';
  const naturalSizes = (rh.windowSizes || []).join(', ') || 'none';

  const famLines = fams.map(f => {
    const occLines = f.occurrences.map(o =>
      `      - bars: [${o.startBar}, ${o.endBar}]  variation: "${o.variationType || 'prototype'}"`
    ).join('\n');
    return `  ${f.label}:\n    id: "${f.id}"\n    window_size: ${f.windowSize}\n    match_level: "${f.matchLevel}"\n    occurrence_count: ${f.occurrenceCount}\n${occLines}`;
  }).join('\n\n') || '  # (no patterns detected)';

  const secLines = sections.map(s =>
    `  - id: "${s.id}"  bars: [${s.startBar}, ${s.endBar}]  label: "${s.fullLabel}"  pattern: "${s.patternId}"`
  ).join('\n') || '  # (no sections)';

  return `# ═══════════════════════════════════════════════════════
# MUSIC ANALYSIS BLUEPRINT v3.0
# Universal analyzer — no hardcoded music-type assumptions
# ${metadata.bars.length} bars · ${metadata.time_signature} · ${metadata.tempo} BPM · Key: ${metadata.key}
# Natural window sizes discovered: [${naturalSizes}]
# Boundaries detected: ${bounds.length}
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
// HAND ANALYZER — orchestrates phases 1–6 for one hand's bars
// ═══════════════════════════════════════════════════════════════════

function analyzeHand(bars, spb, handName) {
  const nonEmpty = bars.filter(b => b.notes.length > 0);

  if (nonEmpty.length === 0) {
    const emptyLabeled = bars.map(b => ({
      barNumber: b.bar_number, notes: [], patternId: 'EMPTY', patternLabel: 'Empty',
      isEmpty: true, isSurprise: false, isBoundaryEnd: false, boundaryType: null,
      noteCount: 0, alternating: null, isSustain: false, isCadence: false,
      color: EMPTY_COLOR,
    }));
    return {
      features: [], simMatrix: [], families: [], boundaries: [],
      labeled: emptyLabeled, sections: [], windowSizes: [],
      graph: { nodes: [], edges: [] }, hand: handName,
    };
  }

  // Phase 1
  const features = extractAllFeatures(bars, spb);

  // Phase 2
  const simMatrix = buildSimilarityMatrix(features);

  // Phase 3
  const boundaries = detectBoundaries(features, simMatrix);

  // Phase 4
  const { families, windowSizes } = detectPatternsAdaptive(features, simMatrix, boundaries);

  // Phase 5
  classifyFamilyVariations(families);

  // Phase 6
  const labeled  = labelBars(features, families, boundaries);
  const sections = detectSections(labeled, families, boundaries);
  const graph    = buildGraph(labeled, families);

  return {
    features, simMatrix, families, boundaries,
    labeled, sections, windowSizes, graph, hand: handName,
    // expose patterns in v2-compatible shape for UI
    patterns: families.map(f => ({
      ...f,
      id:          f.id,
      label:       f.label,
      type:        f.matchLevel,
      windowSize:  f.windowSize,
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

  const yamlBlueprint = generateYaml({
    metadata: normalized, rightHand, leftHand, alignment,
  });

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
  buildSimilarityMatrix, computeSimilarity,
  detectBoundaries, computeNoveltyScores,
  detectPatternsAdaptive, discoverNaturalWindowSizes,
  classifyFamilyVariations, classifyVariation,
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