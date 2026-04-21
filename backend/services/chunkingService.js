
'use strict'
// backend/services/chunkingService.js
//
// HAND-AWARE CHUNKING
//
// Detects hand type from filename:
//   *_rh.*, *right_hand.*, *right* → RIGHT HAND only → 2 chunks
//   *_lh.*, *left_hand.*,  *left*  → LEFT HAND only  → 2 chunks
//   anything else (full track)      → FULL ANALYSIS   → 3 chunks
//
// Per piece total: full(3) + rh(2) + lh(2) = 7 chunks — same as before
// but hand separation is USER-DEFINED (accurate) not auto-guessed (wrong).
//
// Enables prompts like:
//   "create legato like two_steps_from_hell evergreen left hand"
//   → getAllContext finds lh_style chunk → AI uses it as reference

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

let engine = null
function getEngine() {
  if (!engine) {
    try { engine = require('../engines/musicAnalyzerEngine') }
    catch (e) { console.warn('[chunking] Engine not found:', e.message); engine = null }
  }
  return engine
}

// ── Pitch helpers ──────────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const NOTE_MAP   = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,
  'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11,
}
function midiOf(pitch) {
  if (!pitch) return 60
  const m = String(pitch).match(/^([A-G][#Bb]?)(-?\d+)$/i)
  if (!m) return 60
  const pc = NOTE_MAP[m[1].toUpperCase()]
  return (parseInt(m[2]) + 1) * 12 + (pc !== undefined ? pc : 0)
}
function midiToName(m) {
  return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1)
}
function normNote(n) {
  return {
    pitch:                 n.pitch                ?? n.p,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
  }
}
function rangeOf(notes) {
  const midis = notes.map(n => midiOf(n.pitch)).filter(m => m > 0)
  if (!midis.length) return null
  return `${midiToName(Math.min(...midis))}–${midiToName(Math.max(...midis))}`
}
function avgDurOf(notes) {
  if (!notes.length) return 4
  return notes.reduce((s, n) => s + (n.duration_subdivisions || 4), 0) / notes.length
}
function artStyle(avgDur) {
  if (avgDur >= 8) return 'sustained/legato (whole/half notes)'
  if (avgDur >= 4) return 'quarter-note feel'
  return 'short/detached (eighth notes)'
}
function feel(tempo) {
  return tempo < 70  ? 'slow/meditative'
       : tempo < 100 ? 'moderate/flowing'
       : tempo < 140 ? 'moderate-fast'
       : 'energetic'
}

// ── Hand type detection ────────────────────────────────────────────────────────
function detectHandType(filename) {
  const base  = filename.toLowerCase().replace(/\.[^.]+$/, '')
  const clean = base.replace(/[-_.\s]+/g, ' ')
  if ([/\brh\b/, /right.?hand/, /\bright\b/].some(p => p.test(clean))) return 'rh'
  if ([/\blh\b/, /left.?hand/,  /\bleft\b/ ].some(p => p.test(clean))) return 'lh'
  return 'full'
}

function extractPieceName(filename) {
  return filename.toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/_rh$|_lh$|_right_hand$|_left_hand$|_righthand$|_lefthand$|_right$|_left$|_full$|_full_track$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}

// ── ID / metadata helpers ──────────────────────────────────────────────────────
function mkId(src) {
  return `${src.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${uuid().slice(0, 8)}`
}
function mkMeta(src, type, json) {
  return { source: src, key: json.key || 'C', tempo: json.tempo || 120, type }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

function chunkMidi(json, sourceName) {
  const eng      = getEngine()
  const handType = detectHandType(sourceName)
  const piece    = extractPieceName(sourceName)
  console.log(`[chunking] "${sourceName}" → hand:${handType}  piece:"${piece}"`)

  if (!eng) {
    console.warn('[chunking] Engine unavailable — using fallback')
    return [fallbackChunk(json, sourceName, handType, piece)]
  }

  let analysis
  try { analysis = eng.analyze(json) }
  catch (e) {
    console.warn(`[chunking] Engine failed: ${e.message}`)
    return [fallbackChunk(json, sourceName, handType, piece)]
  }

  if (handType === 'rh')   return chunksRH(json, sourceName, piece, analysis)
  if (handType === 'lh')   return chunksLH(json, sourceName, piece, analysis)
  return chunksFull(json, sourceName, piece, analysis)
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL TRACK → 3 CHUNKS  (exact_ref + blueprint + style)
// ═══════════════════════════════════════════════════════════════════════════════

function chunksFull(json, sourceName, piece, analysis) {
  const { metadata, rightHand, leftHand, yamlBlueprint } = analysis
  const chunks = []
  const rhFams = rightHand.families  || []
  const lhFams = leftHand.families   || []
  const rhSecs = rightHand.sections  || []
  const rhBnds = rightHand.boundaries || []
  const allN   = (json.bars || []).flatMap(b => (b.notes || []).map(normNote))
  const rhN    = (rightHand.labeled || []).flatMap(b => b.notes || []).filter(n => n?.pitch)
  const lhN    = (leftHand.labeled  || []).flatMap(b => b.notes || []).filter(n => n?.pitch)

  // 1. EXACT REF
  chunks.push({
    id:   mkId(sourceName),
    text: [
      `FULL TRACK: "${sourceName}" (piece:"${piece}").`,
      `Key:${metadata.key} Tempo:${metadata.tempo}BPM Time:${metadata.time_signature} Bars:${metadata.bars.length}.`,
      `RH patterns:${rhFams.length} LH patterns:${lhFams.length}.`,
      `Section order: ${rhSecs.map(s=>s.fullLabel).join('→') || 'N/A'}.`,
      `Exact JSON retrievable by filename "${sourceName}".`,
    ].join(' '),
    metadata: mkMeta(sourceName, 'exact_ref', json),
  })

  // 2. YAML BLUEPRINT
  if (yamlBlueprint) {
    const MAX = 2000
    const parts = []
    for (let i = 0; i < yamlBlueprint.length; i += MAX) parts.push(yamlBlueprint.slice(i, i + MAX))
    parts.forEach((p, i) => chunks.push({
      id:   mkId(sourceName),
      text: `BLUEPRINT "${sourceName}"${parts.length>1?` (${i+1}/${parts.length})`:''}:\n${p}`,
      metadata: mkMeta(sourceName, 'blueprint', json),
    }))
  }

  // 3. STYLE GUIDE
  const ad = allN.length ? avgDurOf(allN) : 4
  chunks.push({
    id:   mkId(sourceName),
    text: [
      `STYLE GUIDE — compose like "${sourceName}" (piece:"${piece}").`,
      `Key:${metadata.key} Tempo:${metadata.tempo}BPM Feel:${feel(metadata.tempo)}.`,
      `Articulation: ${artStyle(ad)}.`,
      `Section flow: ${rhSecs.map(s=>s.fullLabel).join('→')||'N/A'}.`,
      `Phrase units: [${(rightHand.windowSizes||[]).join(',')}] bars.`,
      rhN.length ? `RH register: ${rangeOf(rhN)}.` : '',
      lhN.length ? `LH register: ${rangeOf(lhN)}.` : '',
      rhFams.length ? `RH motifs: ${rhFams.slice(0,3).map(f=>{const d=f.occurrences[0]?.descriptors?.[0]; return `${f.label}(${d?.textureType||'?'} ${d?.melodyDirection||''} ${d?.stepType||''})`}).join(', ')}.` : '',
      lhFams.length ? `LH motifs: ${lhFams.slice(0,3).map(f=>{const d=f.occurrences[0]?.descriptors?.[0]; return `${f.label}(${d?.textureType||'?'})`}).join(', ')}.` : '',
      rhBnds.length ? `Boundaries at bars: ${rhBnds.map(b=>b.afterBarNumber).join(',')}.` : '',
    ].filter(Boolean).join(' '),
    metadata: mkMeta(sourceName, 'style', json),
  })

  console.log(`[chunking] FULL "${sourceName}" → ${chunks.length} chunks`)
  return chunks
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIGHT HAND → 2 CHUNKS  (patterns_rh + rh_style)
// ═══════════════════════════════════════════════════════════════════════════════

function chunksRH(json, sourceName, piece, analysis) {
  const { metadata, rightHand } = analysis
  const fams  = rightHand.families   || []
  const secs  = rightHand.sections   || []
  const bnds  = rightHand.boundaries || []
  const notes = (rightHand.labeled   || []).flatMap(b => b.notes || []).filter(n => n?.pitch)
  const allN  = (json.bars || []).flatMap(b => (b.notes || []).map(normNote))
  const ad    = allN.length ? avgDurOf(allN) : 4
  const chunks = []

  // 1. PATTERNS
  const famLines = fams.map(f => {
    const d = f.occurrences[0]?.descriptors?.[0]
    return `  ${f.label}(win:${f.windowSize} ${f.matchLevel} ×${f.occurrenceCount}): `
      + f.occurrences.map(o=>`bars${o.startBar}-${o.endBar}[${o.variationType||'proto'}]`).join(',')
      + (d ? ` — ${d.textureType} ${d.melodyDirection} ${d.stepType}` : '')
  }).join('\n')

  chunks.push({
    id:   mkId(sourceName),
    text: [
      `RIGHT HAND patterns: "${sourceName}" (piece:"${piece}").`,
      `Key:${metadata.key} Tempo:${metadata.tempo}BPM.`,
      `${fams.length} motif families. Phrase lengths:[${(rightHand.windowSizes||[]).join(',')}]bars.`,
      `Section order: ${secs.map(s=>s.fullLabel).join('→')||'N/A'}.`,
      fams.length ? `\nMotifs:\n${famLines}` : '',
      bnds.length ? `\nBoundaries: ${bnds.map(b=>`bar${b.afterBarNumber}[${b.type}]`).join(',')}` : '',
    ].filter(Boolean).join(' '),
    metadata: mkMeta(sourceName, 'patterns_rh', json),
  })

  // 2. RH STYLE GUIDE
  chunks.push({
    id:   mkId(sourceName),
    text: [
      `RIGHT HAND STYLE GUIDE — "${sourceName}" (piece:"${piece}").`,
      `Key:${metadata.key} Tempo:${metadata.tempo}BPM Feel:${feel(metadata.tempo)}.`,
      `Articulation: ${artStyle(ad)}.`,
      notes.length ? `Register: ${rangeOf(notes)}.` : '',
      `Section flow: ${secs.map(s=>s.fullLabel).join('→')||'N/A'}.`,
      fams.length ? `Core motifs: ${fams.slice(0,3).map(f=>{const d=f.occurrences[0]?.descriptors?.[0]; return `${f.label}:${d?.melodyDirection||'?'}-${d?.stepType||'?'}`}).join(', ')}.` : '',
      `To compose RIGHT HAND like "${piece}": use ${artStyle(ad)},`,
      notes.length ? `stay in ${rangeOf(notes)} register,` : '',
      fams[0] ? `follow the ${fams[0].label} pattern established in bars ${fams[0].occurrences[0]?.startBar||1}-${fams[0].occurrences[0]?.endBar||4}.` : '',
    ].filter(Boolean).join(' '),
    metadata: mkMeta(sourceName, 'rh_style', json),
  })

  console.log(`[chunking] RH "${sourceName}" → ${chunks.length} chunks`)
  return chunks
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEFT HAND → 2 CHUNKS  (patterns_lh + lh_style)
// ═══════════════════════════════════════════════════════════════════════════════

function chunksLH(json, sourceName, piece, analysis) {
  const { metadata, leftHand } = analysis
  const fams  = leftHand.families   || []
  const secs  = leftHand.sections   || []
  const bnds  = leftHand.boundaries || []
  const notes = (leftHand.labeled   || []).flatMap(b => b.notes || []).filter(n => n?.pitch)
  const allN  = (json.bars || []).flatMap(b => (b.notes || []).map(normNote))
  const ad    = allN.length ? avgDurOf(allN) : 4
  const chunks = []

  // Detect ostinato (repeating bass — exact match ≥ 3 occurrences)
  const ostinatoFam = fams.find(f => f.matchLevel === 'exact' && f.occurrenceCount >= 3)

  // 1. PATTERNS
  const famLines = fams.map(f => {
    const d = f.occurrences[0]?.descriptors?.[0]
    return `  ${f.label}(win:${f.windowSize} ${f.matchLevel} ×${f.occurrenceCount}): `
      + f.occurrences.map(o=>`bars${o.startBar}-${o.endBar}[${o.variationType||'proto'}]`).join(',')
      + (d ? ` — ${d.textureType} ${d.stepType}` : '')
  }).join('\n')

  chunks.push({
    id:   mkId(sourceName),
    text: [
      `LEFT HAND patterns: "${sourceName}" (piece:"${piece}").`,
      `Key:${metadata.key} Tempo:${metadata.tempo}BPM.`,
      `${fams.length} bass/accompaniment families.`,
      ostinatoFam ? `OSTINATO detected: ${ostinatoFam.label} repeats every ${ostinatoFam.windowSize} bars (${ostinatoFam.occurrenceCount}× exact).` : '',
      `Phrase lengths:[${(leftHand.windowSizes||[]).join(',')}]bars.`,
      `Section order: ${secs.map(s=>s.fullLabel).join('→')||'N/A'}.`,
      fams.length ? `\nMotifs:\n${famLines}` : '',
      bnds.length ? `\nBoundaries: ${bnds.map(b=>`bar${b.afterBarNumber}[${b.type}]`).join(',')}` : '',
    ].filter(Boolean).join(' '),
    metadata: mkMeta(sourceName, 'patterns_lh', json),
  })

  // 2. LH STYLE GUIDE
  chunks.push({
    id:   mkId(sourceName),
    text: [
      `LEFT HAND STYLE GUIDE — "${sourceName}" (piece:"${piece}").`,
      `Key:${metadata.key} Tempo:${metadata.tempo}BPM Feel:${feel(metadata.tempo)}.`,
      `Articulation: ${artStyle(ad)}.`,
      notes.length ? `Register: ${rangeOf(notes)}.` : '',
      ostinatoFam
        ? `RULE: Repeat ${ostinatoFam.label} pattern every ${ostinatoFam.windowSize} bars without ANY variation — this is the ground bass of "${piece}".`
        : `Bass follows: ${secs.map(s=>s.fullLabel).join('→')||'N/A'}.`,
      fams.length ? `Bass motifs: ${fams.slice(0,3).map(f=>{const d=f.occurrences[0]?.descriptors?.[0]; return `${f.label}:${d?.textureType||'?'}-${d?.stepType||'?'}`}).join(', ')}.` : '',
      `To compose LEFT HAND like "${piece}": use ${artStyle(ad)},`,
      notes.length ? `stay in ${rangeOf(notes)} register,` : '',
      ostinatoFam
        ? `repeat the same bass pattern every ${ostinatoFam.windowSize} bars — never change it.`
        : fams[0] ? `use ${fams[0].label} pattern from bars ${fams[0].occurrences[0]?.startBar||1}-${fams[0].occurrences[0]?.endBar||4} as the foundation.` : '',
    ].filter(Boolean).join(' '),
    metadata: mkMeta(sourceName, 'lh_style', json),
  })

  console.log(`[chunking] LH "${sourceName}" → ${chunks.length} chunks`)
  return chunks
}

// ── Fallback ──────────────────────────────────────────────────────────────────
function fallbackChunk(json, sourceName, handType, piece) {
  return {
    id:   mkId(sourceName),
    text: `${handType.toUpperCase()} "${sourceName}" (piece:"${piece}"). Key:${json.key||'C'} Tempo:${json.tempo||120}BPM Bars:${json.bars?.length||0}.`,
    metadata: mkMeta(sourceName, handType === 'full' ? 'exact_ref' : `patterns_${handType}`, json),
  }
}

// ── Plain text/doc ─────────────────────────────────────────────────────────────
function chunkDoc(text, sourceName) {
  const MAX   = 800
  const paras = text.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p.length > 20)
  const out   = []
  for (const para of paras) {
    if (para.length <= MAX) { out.push(para); continue }
    const sents = para.match(/[^.!?]+[.!?]+/g) || [para]
    let buf = ''
    for (const s of sents) {
      if ((buf + s).length > MAX && buf) { out.push(buf.trim()); buf = s } else buf += s
    }
    if (buf.trim()) out.push(buf.trim())
  }
  return out.map((t, i) => ({
    id:       `${sourceName.replace(/[^a-zA-Z0-9]/g,'_').slice(0,40)}_doc_${i}_${uuid().slice(0,8)}`,
    text:     t,
    metadata: { source: sourceName, type: 'doc' },
  }))
}

module.exports = { chunkMidi, chunkDoc, detectHandType, extractPieceName }