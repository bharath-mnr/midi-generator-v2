
// 'use strict'
// // backend/services/chunkingService.js
// //
// // HAND-AWARE CHUNKING
// //
// // Detects hand type from filename:
// //   *_rh.*, *right_hand.*, *right* → RIGHT HAND only → 2 chunks
// //   *_lh.*, *left_hand.*,  *left*  → LEFT HAND only  → 2 chunks
// //   anything else (full track)      → FULL ANALYSIS   → 3 chunks
// //
// // Per piece total: full(3) + rh(2) + lh(2) = 7 chunks — same as before
// // but hand separation is USER-DEFINED (accurate) not auto-guessed (wrong).
// //
// // Enables prompts like:
// //   "create legato like two_steps_from_hell evergreen left hand"
// //   → getAllContext finds lh_style chunk → AI uses it as reference

// function uuid() {
//   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
//     const r = Math.random() * 16 | 0
//     return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
//   })
// }

// let engine = null
// function getEngine() {
//   if (!engine) {
//     try { engine = require('../engines/musicAnalyzerEngine') }
//     catch (e) { console.warn('[chunking] Engine not found:', e.message); engine = null }
//   }
//   return engine
// }

// // ── Pitch helpers ──────────────────────────────────────────────────────────────
// const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
// const NOTE_MAP   = {
//   'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,
//   'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11,
// }
// function midiOf(pitch) {
//   if (!pitch) return 60
//   const m = String(pitch).match(/^([A-G][#Bb]?)(-?\d+)$/i)
//   if (!m) return 60
//   const pc = NOTE_MAP[m[1].toUpperCase()]
//   return (parseInt(m[2]) + 1) * 12 + (pc !== undefined ? pc : 0)
// }
// function midiToName(m) {
//   return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1)
// }
// function normNote(n) {
//   return {
//     pitch:                 n.pitch                ?? n.p,
//     duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
//   }
// }
// function rangeOf(notes) {
//   const midis = notes.map(n => midiOf(n.pitch)).filter(m => m > 0)
//   if (!midis.length) return null
//   return `${midiToName(Math.min(...midis))}–${midiToName(Math.max(...midis))}`
// }
// function avgDurOf(notes) {
//   if (!notes.length) return 4
//   return notes.reduce((s, n) => s + (n.duration_subdivisions || 4), 0) / notes.length
// }
// function artStyle(avgDur) {
//   if (avgDur >= 8) return 'sustained/legato (whole/half notes)'
//   if (avgDur >= 4) return 'quarter-note feel'
//   return 'short/detached (eighth notes)'
// }
// function feel(tempo) {
//   return tempo < 70  ? 'slow/meditative'
//        : tempo < 100 ? 'moderate/flowing'
//        : tempo < 140 ? 'moderate-fast'
//        : 'energetic'
// }

// // ── Hand type detection ────────────────────────────────────────────────────────
// function detectHandType(filename) {
//   const base  = filename.toLowerCase().replace(/\.[^.]+$/, '')
//   const clean = base.replace(/[-_.\s]+/g, ' ')
//   if ([/\brh\b/, /right.?hand/, /\bright\b/].some(p => p.test(clean))) return 'rh'
//   if ([/\blh\b/, /left.?hand/,  /\bleft\b/ ].some(p => p.test(clean))) return 'lh'
//   return 'full'
// }

// function extractPieceName(filename) {
//   return filename.toLowerCase()
//     .replace(/\.[^.]+$/, '')
//     .replace(/_rh$|_lh$|_right_hand$|_left_hand$|_righthand$|_lefthand$|_right$|_left$|_full$|_full_track$/, '')
//     .replace(/[-_]+/g, ' ')
//     .trim()
// }

// // ── ID / metadata helpers ──────────────────────────────────────────────────────
// function mkId(src) {
//   return `${src.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${uuid().slice(0, 8)}`
// }
// function mkMeta(src, type, json) {
//   return { source: src, key: json.key || 'C', tempo: json.tempo || 120, type }
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // MAIN ENTRY POINT
// // ═══════════════════════════════════════════════════════════════════════════════

// function chunkMidi(json, sourceName) {
//   const eng      = getEngine()
//   const handType = detectHandType(sourceName)
//   const piece    = extractPieceName(sourceName)
//   console.log(`[chunking] "${sourceName}" → hand:${handType}  piece:"${piece}"`)

//   if (!eng) {
//     console.warn('[chunking] Engine unavailable — using fallback')
//     return [fallbackChunk(json, sourceName, handType, piece)]
//   }

//   let analysis
//   try { analysis = eng.analyze(json) }
//   catch (e) {
//     console.warn(`[chunking] Engine failed: ${e.message}`)
//     return [fallbackChunk(json, sourceName, handType, piece)]
//   }

//   if (handType === 'rh')   return chunksRH(json, sourceName, piece, analysis)
//   if (handType === 'lh')   return chunksLH(json, sourceName, piece, analysis)
//   return chunksFull(json, sourceName, piece, analysis)
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // FULL TRACK → 3 CHUNKS  (exact_ref + blueprint + style)
// // ═══════════════════════════════════════════════════════════════════════════════

// function chunksFull(json, sourceName, piece, analysis) {
//   const { metadata, rightHand, leftHand, yamlBlueprint } = analysis
//   const chunks = []
//   const rhFams = rightHand.families  || []
//   const lhFams = leftHand.families   || []
//   const rhSecs = rightHand.sections  || []
//   const rhBnds = rightHand.boundaries || []
//   const allN   = (json.bars || []).flatMap(b => (b.notes || []).map(normNote))
//   const rhN    = (rightHand.labeled || []).flatMap(b => b.notes || []).filter(n => n?.pitch)
//   const lhN    = (leftHand.labeled  || []).flatMap(b => b.notes || []).filter(n => n?.pitch)

//   // 1. EXACT REF
//   chunks.push({
//     id:   mkId(sourceName),
//     text: [
//       `FULL TRACK: "${sourceName}" (piece:"${piece}").`,
//       `Key:${metadata.key} Tempo:${metadata.tempo}BPM Time:${metadata.time_signature} Bars:${metadata.bars.length}.`,
//       `RH patterns:${rhFams.length} LH patterns:${lhFams.length}.`,
//       `Section order: ${rhSecs.map(s=>s.fullLabel).join('→') || 'N/A'}.`,
//       `Exact JSON retrievable by filename "${sourceName}".`,
//     ].join(' '),
//     metadata: mkMeta(sourceName, 'exact_ref', json),
//   })

//   // 2. YAML BLUEPRINT
//   if (yamlBlueprint) {
//     const MAX = 2000
//     const parts = []
//     for (let i = 0; i < yamlBlueprint.length; i += MAX) parts.push(yamlBlueprint.slice(i, i + MAX))
//     parts.forEach((p, i) => chunks.push({
//       id:   mkId(sourceName),
//       text: `BLUEPRINT "${sourceName}"${parts.length>1?` (${i+1}/${parts.length})`:''}:\n${p}`,
//       metadata: mkMeta(sourceName, 'blueprint', json),
//     }))
//   }

//   // 3. STYLE GUIDE
//   const ad = allN.length ? avgDurOf(allN) : 4
//   chunks.push({
//     id:   mkId(sourceName),
//     text: [
//       `STYLE GUIDE — compose like "${sourceName}" (piece:"${piece}").`,
//       `Key:${metadata.key} Tempo:${metadata.tempo}BPM Feel:${feel(metadata.tempo)}.`,
//       `Articulation: ${artStyle(ad)}.`,
//       `Section flow: ${rhSecs.map(s=>s.fullLabel).join('→')||'N/A'}.`,
//       `Phrase units: [${(rightHand.windowSizes||[]).join(',')}] bars.`,
//       rhN.length ? `RH register: ${rangeOf(rhN)}.` : '',
//       lhN.length ? `LH register: ${rangeOf(lhN)}.` : '',
//       rhFams.length ? `RH motifs: ${rhFams.slice(0,3).map(f=>{const d=f.occurrences[0]?.descriptors?.[0]; return `${f.label}(${d?.textureType||'?'} ${d?.melodyDirection||''} ${d?.stepType||''})`}).join(', ')}.` : '',
//       lhFams.length ? `LH motifs: ${lhFams.slice(0,3).map(f=>{const d=f.occurrences[0]?.descriptors?.[0]; return `${f.label}(${d?.textureType||'?'})`}).join(', ')}.` : '',
//       rhBnds.length ? `Boundaries at bars: ${rhBnds.map(b=>b.afterBarNumber).join(',')}.` : '',
//     ].filter(Boolean).join(' '),
//     metadata: mkMeta(sourceName, 'style', json),
//   })

//   console.log(`[chunking] FULL "${sourceName}" → ${chunks.length} chunks`)
//   return chunks
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // RIGHT HAND → 2 CHUNKS  (patterns_rh + rh_style)
// // ═══════════════════════════════════════════════════════════════════════════════

// function chunksRH(json, sourceName, piece, analysis) {
//   const { metadata, rightHand } = analysis
//   const fams  = rightHand.families   || []
//   const secs  = rightHand.sections   || []
//   const bnds  = rightHand.boundaries || []
//   const notes = (rightHand.labeled   || []).flatMap(b => b.notes || []).filter(n => n?.pitch)
//   const allN  = (json.bars || []).flatMap(b => (b.notes || []).map(normNote))
//   const ad    = allN.length ? avgDurOf(allN) : 4
//   const chunks = []

//   // 1. PATTERNS
//   const famLines = fams.map(f => {
//     const d = f.occurrences[0]?.descriptors?.[0]
//     return `  ${f.label}(win:${f.windowSize} ${f.matchLevel} ×${f.occurrenceCount}): `
//       + f.occurrences.map(o=>`bars${o.startBar}-${o.endBar}[${o.variationType||'proto'}]`).join(',')
//       + (d ? ` — ${d.textureType} ${d.melodyDirection} ${d.stepType}` : '')
//   }).join('\n')

//   chunks.push({
//     id:   mkId(sourceName),
//     text: [
//       `RIGHT HAND patterns: "${sourceName}" (piece:"${piece}").`,
//       `Key:${metadata.key} Tempo:${metadata.tempo}BPM.`,
//       `${fams.length} motif families. Phrase lengths:[${(rightHand.windowSizes||[]).join(',')}]bars.`,
//       `Section order: ${secs.map(s=>s.fullLabel).join('→')||'N/A'}.`,
//       fams.length ? `\nMotifs:\n${famLines}` : '',
//       bnds.length ? `\nBoundaries: ${bnds.map(b=>`bar${b.afterBarNumber}[${b.type}]`).join(',')}` : '',
//     ].filter(Boolean).join(' '),
//     metadata: mkMeta(sourceName, 'patterns_rh', json),
//   })

//   // 2. RH STYLE GUIDE
//   chunks.push({
//     id:   mkId(sourceName),
//     text: [
//       `RIGHT HAND STYLE GUIDE — "${sourceName}" (piece:"${piece}").`,
//       `Key:${metadata.key} Tempo:${metadata.tempo}BPM Feel:${feel(metadata.tempo)}.`,
//       `Articulation: ${artStyle(ad)}.`,
//       notes.length ? `Register: ${rangeOf(notes)}.` : '',
//       `Section flow: ${secs.map(s=>s.fullLabel).join('→')||'N/A'}.`,
//       fams.length ? `Core motifs: ${fams.slice(0,3).map(f=>{const d=f.occurrences[0]?.descriptors?.[0]; return `${f.label}:${d?.melodyDirection||'?'}-${d?.stepType||'?'}`}).join(', ')}.` : '',
//       `To compose RIGHT HAND like "${piece}": use ${artStyle(ad)},`,
//       notes.length ? `stay in ${rangeOf(notes)} register,` : '',
//       fams[0] ? `follow the ${fams[0].label} pattern established in bars ${fams[0].occurrences[0]?.startBar||1}-${fams[0].occurrences[0]?.endBar||4}.` : '',
//     ].filter(Boolean).join(' '),
//     metadata: mkMeta(sourceName, 'rh_style', json),
//   })

//   console.log(`[chunking] RH "${sourceName}" → ${chunks.length} chunks`)
//   return chunks
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // LEFT HAND → 2 CHUNKS  (patterns_lh + lh_style)
// // ═══════════════════════════════════════════════════════════════════════════════

// function chunksLH(json, sourceName, piece, analysis) {
//   const { metadata, leftHand } = analysis
//   const fams  = leftHand.families   || []
//   const secs  = leftHand.sections   || []
//   const bnds  = leftHand.boundaries || []
//   const notes = (leftHand.labeled   || []).flatMap(b => b.notes || []).filter(n => n?.pitch)
//   const allN  = (json.bars || []).flatMap(b => (b.notes || []).map(normNote))
//   const ad    = allN.length ? avgDurOf(allN) : 4
//   const chunks = []

//   // Detect ostinato (repeating bass — exact match ≥ 3 occurrences)
//   const ostinatoFam = fams.find(f => f.matchLevel === 'exact' && f.occurrenceCount >= 3)

//   // 1. PATTERNS
//   const famLines = fams.map(f => {
//     const d = f.occurrences[0]?.descriptors?.[0]
//     return `  ${f.label}(win:${f.windowSize} ${f.matchLevel} ×${f.occurrenceCount}): `
//       + f.occurrences.map(o=>`bars${o.startBar}-${o.endBar}[${o.variationType||'proto'}]`).join(',')
//       + (d ? ` — ${d.textureType} ${d.stepType}` : '')
//   }).join('\n')

//   chunks.push({
//     id:   mkId(sourceName),
//     text: [
//       `LEFT HAND patterns: "${sourceName}" (piece:"${piece}").`,
//       `Key:${metadata.key} Tempo:${metadata.tempo}BPM.`,
//       `${fams.length} bass/accompaniment families.`,
//       ostinatoFam ? `OSTINATO detected: ${ostinatoFam.label} repeats every ${ostinatoFam.windowSize} bars (${ostinatoFam.occurrenceCount}× exact).` : '',
//       `Phrase lengths:[${(leftHand.windowSizes||[]).join(',')}]bars.`,
//       `Section order: ${secs.map(s=>s.fullLabel).join('→')||'N/A'}.`,
//       fams.length ? `\nMotifs:\n${famLines}` : '',
//       bnds.length ? `\nBoundaries: ${bnds.map(b=>`bar${b.afterBarNumber}[${b.type}]`).join(',')}` : '',
//     ].filter(Boolean).join(' '),
//     metadata: mkMeta(sourceName, 'patterns_lh', json),
//   })

//   // 2. LH STYLE GUIDE
//   chunks.push({
//     id:   mkId(sourceName),
//     text: [
//       `LEFT HAND STYLE GUIDE — "${sourceName}" (piece:"${piece}").`,
//       `Key:${metadata.key} Tempo:${metadata.tempo}BPM Feel:${feel(metadata.tempo)}.`,
//       `Articulation: ${artStyle(ad)}.`,
//       notes.length ? `Register: ${rangeOf(notes)}.` : '',
//       ostinatoFam
//         ? `RULE: Repeat ${ostinatoFam.label} pattern every ${ostinatoFam.windowSize} bars without ANY variation — this is the ground bass of "${piece}".`
//         : `Bass follows: ${secs.map(s=>s.fullLabel).join('→')||'N/A'}.`,
//       fams.length ? `Bass motifs: ${fams.slice(0,3).map(f=>{const d=f.occurrences[0]?.descriptors?.[0]; return `${f.label}:${d?.textureType||'?'}-${d?.stepType||'?'}`}).join(', ')}.` : '',
//       `To compose LEFT HAND like "${piece}": use ${artStyle(ad)},`,
//       notes.length ? `stay in ${rangeOf(notes)} register,` : '',
//       ostinatoFam
//         ? `repeat the same bass pattern every ${ostinatoFam.windowSize} bars — never change it.`
//         : fams[0] ? `use ${fams[0].label} pattern from bars ${fams[0].occurrences[0]?.startBar||1}-${fams[0].occurrences[0]?.endBar||4} as the foundation.` : '',
//     ].filter(Boolean).join(' '),
//     metadata: mkMeta(sourceName, 'lh_style', json),
//   })

//   console.log(`[chunking] LH "${sourceName}" → ${chunks.length} chunks`)
//   return chunks
// }

// // ── Fallback ──────────────────────────────────────────────────────────────────
// function fallbackChunk(json, sourceName, handType, piece) {
//   return {
//     id:   mkId(sourceName),
//     text: `${handType.toUpperCase()} "${sourceName}" (piece:"${piece}"). Key:${json.key||'C'} Tempo:${json.tempo||120}BPM Bars:${json.bars?.length||0}.`,
//     metadata: mkMeta(sourceName, handType === 'full' ? 'exact_ref' : `patterns_${handType}`, json),
//   }
// }

// // ── Plain text/doc ─────────────────────────────────────────────────────────────
// function chunkDoc(text, sourceName) {
//   const MAX   = 800
//   const paras = text.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p.length > 20)
//   const out   = []
//   for (const para of paras) {
//     if (para.length <= MAX) { out.push(para); continue }
//     const sents = para.match(/[^.!?]+[.!?]+/g) || [para]
//     let buf = ''
//     for (const s of sents) {
//       if ((buf + s).length > MAX && buf) { out.push(buf.trim()); buf = s } else buf += s
//     }
//     if (buf.trim()) out.push(buf.trim())
//   }
//   return out.map((t, i) => ({
//     id:       `${sourceName.replace(/[^a-zA-Z0-9]/g,'_').slice(0,40)}_doc_${i}_${uuid().slice(0,8)}`,
//     text:     t,
//     metadata: { source: sourceName, type: 'doc' },
//   }))
// }

// module.exports = { chunkMidi, chunkDoc, detectHandType, extractPieceName }













'use strict'
// backend/services/chunkingService.js  v3.0
//
// ── WHAT CHANGED ──────────────────────────────────────────────────────────────
//  - Removed MusicAnalyzerEngine entirely (was causing wrong hand splits)
//  - Removed ALL auto hand detection from audio analysis
//  - Hand type is now detected from FILENAME ONLY (100% reliable)
//  - Added note_pattern chunks (actual bar JSON — this is what AI needs most)
//  - Added structure chunk (bar density map)
//  - Simpler, faster, zero engine dependencies
//
// ── FILENAME NAMING CONVENTION (tell users this) ──────────────────────────────
//  Right hand : track_name_rh.txt / track_name_right_hand.txt / track_name_right.txt
//  Left hand  : track_name_lh.txt / track_name_left_hand.txt  / track_name_left.txt
//  Full track : track_name_full.txt / track_name.txt (default)
//
// ── CHUNKS PRODUCED PER FILE ─────────────────────────────────────────────────
//  1. metadata      — tempo, key, bars, time sig, hand type, register
//  2. note_pattern  — opening 8 bars + mid 4 bars (real compact JSON)
//  3. style         — articulation feel, rhythm density, register guide
//  4. structure     — per-bar note count map (full density picture)
// ─────────────────────────────────────────────────────────────────────────────

// ── Pitch utilities ────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const NOTE_MAP   = {
  C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,
  G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,
}

function pitchToMidi(pitch) {
  if (!pitch) return null
  const m = String(pitch).match(/^([A-G][#b]?)(-?\d+)$/i)
  if (!m) return null
  const key = m[1].charAt(0).toUpperCase() + m[1].slice(1)
  const pc  = NOTE_MAP[key]
  if (pc === undefined) return null
  return (parseInt(m[2]) + 1) * 12 + pc
}

function midiToName(midi) {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1)
}

// ── Note field accessors (handles both compact and full format) ────────────────
function getPitch(n)    { return n.pitch                ?? n.p               }
function getDur(n)      { return n.duration_subdivisions ?? n.d ?? 4         }
function getStart(n)    { return n.start_subdivision    ?? n.s ?? 0          }
function getOffset(n)   { return n.offset_percent       ?? n.o ?? 0          }
function getCutoff(n)   { return n.end_cutoff_percent   ?? n.c ?? null       }

// ── UUID helper ────────────────────────────────────────────────────────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function mkId(src) {
  return `${src.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${uuid().slice(0, 8)}`
}

// ── Hand type detection — FILENAME ONLY ───────────────────────────────────────
function detectHandType(filename) {
  // Strip extension for cleaner matching
  const base = filename.toLowerCase().replace(/\.[^.]+$/, '')

  // Right hand markers
  if (/(_rh|_right_hand|_righthand|_right)$/.test(base)) return 'rh'
  if (/(_rh|_right_hand|_righthand|_right)[_-]/.test(base)) return 'rh'

  // Left hand markers
  if (/(_lh|_left_hand|_lefthand|_left)$/.test(base)) return 'lh'
  if (/(_lh|_left_hand|_lefthand|_left)[_-]/.test(base)) return 'lh'

  // Default: full track (both hands combined, or no distinction needed)
  return 'full'
}

// ── Extract clean piece name ───────────────────────────────────────────────────
function extractPieceName(filename) {
  return filename
    .replace(/\.[^.]+$/, '')                                          // remove extension
    .replace(/[_-]*(rh|right_hand|righthand|right)$/i, '')            // remove rh suffix
    .replace(/[_-]*(lh|left_hand|lefthand|left)$/i, '')              // remove lh suffix
    .replace(/[_-]*(full_track|full)$/i, '')                         // remove full suffix
    .replace(/[-_]+/g, ' ')                                          // underscores → spaces
    .trim()
}

// ── Compute basic statistics from note array ───────────────────────────────────
function computeStats(notes) {
  if (!notes.length) return null

  const midis = notes.map(n => pitchToMidi(getPitch(n))).filter(Boolean)
  if (!midis.length) return null

  const minMidi = Math.min(...midis)
  const maxMidi = Math.max(...midis)
  const avgDur  = notes.reduce((s, n) => s + getDur(n), 0) / notes.length
  const hasOffset  = notes.some(n => getOffset(n) > 0)
  const hasCutoff  = notes.some(n => getCutoff(n) != null)

  return {
    low:         midiToName(minMidi),
    high:        midiToName(maxMidi),
    avgDur:      avgDur.toFixed(1),
    count:       notes.length,
    articulation: describeArticulation(avgDur),
    hasSwing:    hasOffset,
    hasStaccato: hasCutoff,
  }
}

function describeArticulation(avgDur) {
  if (avgDur >= 12) return 'very sustained / whole-note phrasing'
  if (avgDur >= 8)  return 'sustained / half-note phrasing'
  if (avgDur >= 4)  return 'lyrical / quarter-note phrasing'
  if (avgDur >= 2)  return 'flowing / eighth-note movement'
  return 'dense / sixteenth-note passages'
}

function tempoFeel(tempo) {
  if (!tempo) return 'moderate'
  if (tempo < 45)  return 'extremely slow / meditative'
  if (tempo < 60)  return 'very slow / contemplative'
  if (tempo < 76)  return 'slow / expressive'
  if (tempo < 96)  return 'slow-moderate / lyrical'
  if (tempo < 116) return 'moderate / flowing'
  if (tempo < 132) return 'moderately fast / energetic'
  return 'fast / driven'
}

// ── Bar density map ────────────────────────────────────────────────────────────
function buildDensityMap(bars) {
  return bars.map(bar => {
    const bn    = bar.bar_number ?? bar.bn ?? '?'
    const count = (bar.notes || []).length
    return `b${bn}:${count}`
  }).join(' ')
}

function describeStructurePattern(bars) {
  const densities = bars.map(b => (b.notes || []).length)
  const total  = densities.reduce((s, d) => s + d, 0)
  const avg    = total / densities.length
  const max    = Math.max(...densities)
  const zeros  = densities.filter(d => d === 0).length
  const peaks  = densities.filter(d => d > avg * 1.8).length

  const parts = [`avg ${avg.toFixed(1)} notes/bar`]
  if (zeros > 0) parts.push(`${zeros} empty bars (breathing room)`)
  if (peaks > 0) parts.push(`${peaks} climax bars (density spikes)`)
  if (max > avg * 2.5) parts.push(`peak density: ${max} notes/bar`)
  return parts.join(', ')
}

// ── Convert a bar to compact note format ──────────────────────────────────────
function compactBar(bar) {
  const bn    = bar.bar_number ?? bar.bn
  const notes = (bar.notes || []).map(n => {
    const out = { p: getPitch(n), s: getStart(n), d: getDur(n) }
    const o = getOffset(n)
    const c = getCutoff(n)
    if (o && o !== 0) out.o = o
    if (c != null)    out.c = c
    return out
  })
  return { bn, notes }
}

// ── Build note pattern sample (opening + mid-section) ─────────────────────────
function buildNotePatternSample(bars) {
  if (!bars.length) return null

  const openEnd  = Math.min(8, bars.length)
  const opening  = bars.slice(0, openEnd)

  const lines = []
  const firstBn = opening[0]?.bar_number ?? opening[0]?.bn ?? 1
  const lastBn  = opening[opening.length - 1]?.bar_number ?? opening[opening.length - 1]?.bn ?? openEnd

  lines.push(`OPENING (bars ${firstBn}–${lastBn}):`)
  lines.push(JSON.stringify(opening.map(compactBar)))

  // Add mid-section if track is long enough
  if (bars.length > 16) {
    const midStart = Math.floor(bars.length / 2)
    const mid      = bars.slice(midStart, midStart + 4)
    if (mid.length > 0) {
      const midFirstBn = mid[0]?.bar_number ?? mid[0]?.bn ?? midStart + 1
      const midLastBn  = mid[mid.length - 1]?.bar_number ?? mid[mid.length - 1]?.bn ?? midStart + 4
      lines.push(`\nMID-SECTION (bars ${midFirstBn}–${midLastBn}):`)
      lines.push(JSON.stringify(mid.map(compactBar)))
    }
  }

  // Add ending if track is long enough
  if (bars.length > 20) {
    const ending = bars.slice(-4)
    if (ending.length > 0) {
      const endFirstBn = ending[0]?.bar_number ?? ending[0]?.bn ?? bars.length - 3
      const endLastBn  = ending[ending.length - 1]?.bar_number ?? ending[ending.length - 1]?.bn ?? bars.length
      lines.push(`\nENDING (bars ${endFirstBn}–${endLastBn}):`)
      lines.push(JSON.stringify(ending.map(compactBar)))
    }
  }

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

function chunkMidi(json, sourceName) {
  const handType = detectHandType(sourceName)
  const piece    = extractPieceName(sourceName)
  const bars     = json.bars || []
  const allNotes = bars.flatMap(b => (b.notes || []))
  const stats    = computeStats(allNotes)

  console.log(`[chunking] "${sourceName}" → hand:${handType}  piece:"${piece}"  bars:${bars.length}  notes:${allNotes.length}`)

  const chunks = []

  // ── CHUNK 1: METADATA ────────────────────────────────────────────────────
  chunks.push({
    id:   mkId(sourceName),
    text: [
      `METADATA [${handType.toUpperCase()}] "${sourceName}" piece:"${piece}".`,
      `Key:${json.key}  Tempo:${json.tempo}BPM  Time:${json.time_signature}  Bars:${bars.length}  spb:${json.subdivisions_per_bar}.`,
      stats ? `Notes:${stats.count}  Register:${stats.low}–${stats.high}  AvgDuration:${stats.avgDur}subdivisions.` : '',
      stats ? `Feel: ${stats.articulation}.` : '',
      stats?.hasSwing    ? 'Has swing/groove offset.' : '',
      stats?.hasStaccato ? 'Has staccato articulation.' : '',
      `Hand: ${
        handType === 'rh'   ? 'RIGHT HAND — melody/upper voice.' :
        handType === 'lh'   ? 'LEFT HAND — bass/accompaniment.' :
                              'FULL TRACK — both hands combined.'
      }`,
    ].filter(Boolean).join(' '),
    metadata: { source: sourceName, type: 'metadata', key: json.key, tempo: json.tempo },
  })

  // ── CHUNK 2: NOTE PATTERN (most valuable chunk) ───────────────────────────
  const patternSample = buildNotePatternSample(bars)
  if (patternSample) {
    chunks.push({
      id:   mkId(sourceName),
      text: [
        `NOTE_PATTERN [${handType.toUpperCase()}] "${sourceName}" piece:"${piece}":`,
        `Key:${json.key}  Tempo:${json.tempo}BPM  spb:${json.subdivisions_per_bar}`,
        `IMPORTANT: Study this pattern carefully. Mirror the structure, rhythm density,`,
        `note spacing, and duration patterns. Do NOT copy notes verbatim.`,
        `Use as structural/rhythmic blueprint only.`,
        ``,
        patternSample,
      ].join('\n'),
      metadata: { source: sourceName, type: `note_pattern_${handType}`, key: json.key, tempo: json.tempo },
    })
  }

  // ── CHUNK 3: STYLE GUIDE ──────────────────────────────────────────────────
  if (stats) {
    const densitySnippet = buildDensityMap(bars.slice(0, Math.min(16, bars.length)))
    chunks.push({
      id:   mkId(sourceName),
      text: [
        `STYLE [${handType.toUpperCase()}] "${sourceName}" piece:"${piece}":`,
        `Key:${json.key}  Tempo:${json.tempo}BPM  Feel:${tempoFeel(json.tempo)}.`,
        `Register: ${stats.low} to ${stats.high}.`,
        `Articulation: ${stats.articulation}.`,
        stats.hasSwing    ? 'Timing: has swing/groove (use o field on some notes).' : 'Timing: straight grid.',
        stats.hasStaccato ? 'Some notes are staccato (use c:50–75 on relevant notes).' : 'Mostly legato (omit c field).',
        `Density (first 16 bars): ${densitySnippet}.`,
        ``,
        handType === 'rh' ? [
          `RIGHT HAND COMPOSITION GUIDE for "${piece}":`,
          `- Write melody in ${stats.high} region, lower passages in ${stats.low} region`,
          `- Match articulation: ${stats.articulation}`,
          `- Keep rhythmic character consistent with the note_pattern above`,
        ].join('\n') : handType === 'lh' ? [
          `LEFT HAND COMPOSITION GUIDE for "${piece}":`,
          `- Stay in register ${stats.low} to ${stats.high}`,
          `- Match the bass rhythm density: ${stats.articulation}`,
          `- Do NOT put notes above ${stats.high} — this is bass/accompaniment only`,
        ].join('\n') : [
          `FULL TRACK COMPOSITION GUIDE for "${piece}":`,
          `- Upper voice (melody): near ${stats.high} region`,
          `- Lower voice (bass): near ${stats.low} region`,
          `- Both voices must follow the rhythm and density pattern shown above`,
        ].join('\n'),
      ].filter(Boolean).join('\n'),
      metadata: { source: sourceName, type: 'style', key: json.key, tempo: json.tempo },
    })
  }

  // ── CHUNK 4: STRUCTURE (density map for full piece) ───────────────────────
  if (bars.length > 0) {
    const fullDensity = buildDensityMap(bars)
    chunks.push({
      id:   mkId(sourceName),
      text: [
        `STRUCTURE [${handType.toUpperCase()}] "${sourceName}" — note density all bars:`,
        fullDensity,
        `Total bars: ${bars.length}.`,
        `Pattern summary: ${describeStructurePattern(bars)}.`,
      ].join('\n'),
      metadata: { source: sourceName, type: 'structure', key: json.key, tempo: json.tempo },
    })
  }

  console.log(`[chunking] "${sourceName}" → ${chunks.length} chunks (${handType})`)
  return chunks
}

// ── Plain text / PDF doc chunking ─────────────────────────────────────────────
function chunkDoc(text, sourceName) {
  const MAX   = 1200
  const paras = text.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p.length > 20)
  const out   = []

  for (const para of paras) {
    if (para.length <= MAX) {
      out.push(para)
      continue
    }
    const sents = para.match(/[^.!?]+[.!?]+/g) || [para]
    let buf = ''
    for (const s of sents) {
      if ((buf + s).length > MAX && buf) { out.push(buf.trim()); buf = s } else buf += s
    }
    if (buf.trim()) out.push(buf.trim())
  }

  return out.map((t, i) => ({
    id:       mkId(`${sourceName}_doc_${i}`),
    text:     `DOC "${sourceName}" (part ${i + 1}):\n${t}`,
    metadata: { source: sourceName, type: 'doc' },
  }))
}

module.exports = { chunkMidi, chunkDoc, detectHandType, extractPieceName }