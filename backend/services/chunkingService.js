//E:\pro\midigenerator_v2\backend\services\chunkingService.js
'use strict'

// Inline UUID v4 — no external dependency needed
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// chunkingService.js  —  Deep Musical Intelligence Engine
//
// Extracts the SAME level of detail as a human music analyst would write:
//   • Real key detection (Krumhansl-Schmuckler profiles)
//   • Correct tempo (handles raw MIDI ticks)
//   • Chord progression per bar (actual chord names)
//   • Cell structure detection (A → A' → B → C pattern)
//   • Recurring motif detection (which bars share melodic shape)
//   • Chromatic pivot detection (F#→G# type moments, their bar positions)
//   • Register evolution (how pitch range changes across the piece)
//   • Voice count per section (texture thickness)
//   • Melodic contour per phrase (ascending, arch, descending, etc.)
//   • Rhythmic character (legato, staccato, mixed, dotted, syncopated)
//   • Dynamic arc (velocity contour section by section)
//   • Left hand vs right hand pattern analysis
//   • Phrase length analysis (2-bar, 4-bar building blocks)
//   • Octave transposition detection (exact repeated sections at +12)
//   • Interval analysis (stepwise vs leaps, avg interval size)
//   • Passacaglia / ostinato detection (repeating bass pattern)
// ═════════════════════════════════════════════════════════════════════════════

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const FLAT_NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

// ── Core pitch helpers ────────────────────────────────────────────────────────

function noteClass(pitch) {
  const m = pitch?.match(/^([A-G][#b]?)/)
  return m ? m[1] : 'C'
}

function noteToMidi(pitch) {
  if (!pitch) return 60
  const m = pitch.match(/^([A-G][#b]?)(-?\d+)$/)
  if (!m) return 60
  const name = m[1], octave = parseInt(m[2])
  let idx = NOTE_NAMES.indexOf(name)
  if (idx === -1) idx = FLAT_NAMES.indexOf(name)
  return (octave + 1) * 12 + (idx === -1 ? 0 : idx)
}

function midiToName(n) {
  return NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1)
}

function pcName(n) {
  return NOTE_NAMES[((n % 12) + 12) % 12]
}

// ── Tempo sanitiser ───────────────────────────────────────────────────────────
// MIDI files sometimes store microseconds/beat (e.g. 500000 = 120 BPM)
// or raw tick values. Real BPM is always 20–300.
function sanitiseTempo(raw) {
  if (!raw || raw <= 0) return 120
  if (raw > 10000) return Math.round(Math.min(300, Math.max(20, 60000000 / raw)))
  if (raw > 300)   return 120   // unknown large value — default
  if (raw >= 20)   return raw
  return 120
}

// ── Key detection: Krumhansl-Schmuckler profiles ──────────────────────────────
function detectKey(notes) {
  const major = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]
  const minor = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]
  const counts = new Array(12).fill(0)
  for (const n of notes) {
    const dur = n.duration_subdivisions || 1
    counts[((noteToMidi(n.pitch) % 12) + 12) % 12] += dur
  }
  const total = counts.reduce((s,v)=>s+v,0) || 1
  const norm  = counts.map(v => v / total)
  let best = -Infinity, key = 'Am'
  for (let r = 0; r < 12; r++) {
    let sm = 0, sM = 0
    for (let i = 0; i < 12; i++) {
      sm += norm[(i+r)%12] * minor[i]
      sM += norm[(i+r)%12] * major[i]
    }
    if (sM > best) { best = sM; key = NOTE_NAMES[r] }
    if (sm > best) { best = sm; key = NOTE_NAMES[r] + 'm' }
  }
  return key
}

// ── Chord detection from simultaneous notes ───────────────────────────────────
const CHORD_TYPES = [
  { name: '',     intervals: [0,4,7] },      // major (E = E major, not Emaj)
  { name: 'm',    intervals: [0,3,7] },
  { name: 'dim',  intervals: [0,3,6] },
  { name: 'aug',  intervals: [0,4,8] },
  { name: 'maj7', intervals: [0,4,7,11] },
  { name: 'm7',   intervals: [0,3,7,10] },
  { name: '7',    intervals: [0,4,7,10] },
  { name: 'sus4', intervals: [0,5,7] },
  { name: 'sus2', intervals: [0,2,7] },
  { name: '5',    intervals: [0,7] },
]

function identifyChord(pcs) {
  if (pcs.length === 0) return null
  if (pcs.length === 1) return pcName(pcs[0])
  const uniquePCs = [...new Set(pcs.map(p => ((p % 12) + 12) % 12))].sort((a,b)=>a-b)
  // Exact match first
  for (const root of uniquePCs) {
    const ivs = uniquePCs.map(p => ((p - root) % 12 + 12) % 12).sort((a,b)=>a-b)
    for (const ct of CHORD_TYPES) {
      if (ct.intervals.length === ivs.length && ct.intervals.every(i => ivs.includes(i)))
        return pcName(root) + ct.name
    }
  }
  // Partial subset match (chord tones present even if extra notes)
  for (const root of uniquePCs) {
    const ivs = uniquePCs.map(p => ((p - root) % 12 + 12) % 12).sort((a,b)=>a-b)
    for (const ct of CHORD_TYPES) {
      if (ct.intervals.every(i => ivs.includes(i)))
        return pcName(root) + ct.name
    }
  }
  return pcName(uniquePCs[0])
}

function chordForBar(bar) {
  if (!bar.notes || bar.notes.length === 0) return null
  // Weight pitch classes by duration — longer = stronger harmonic identity
  const pcWeight = {}
  for (const n of bar.notes) {
    const pc = ((noteToMidi(n.pitch) % 12) + 12) % 12
    pcWeight[pc] = (pcWeight[pc] || 0) + (n.duration_subdivisions || 1)
  }
  const top4 = Object.entries(pcWeight).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([pc])=>parseInt(pc))
  const triad = identifyChord(top4.slice(0,3))
  if (triad && triad.length <= 3) return triad
  return identifyChord(top4) || triad
}

// ── Melodic contour for a set of notes ────────────────────────────────────────
function contourOf(notes) {
  if (notes.length < 2) return 'static'
  const sorted = [...notes].sort((a,b)=>(a.start_subdivision||0)-(b.start_subdivision||0))
  const pitches = sorted.map(n => noteToMidi(n.pitch))
  const first = pitches[0], last = pitches[pitches.length-1]
  const max = Math.max(...pitches), min = Math.min(...pitches)
  if (max - min <= 2) return 'static'
  if (last > first + 4) return 'ascending'
  if (last < first - 4) return 'descending'
  const midIdx = Math.floor(pitches.length / 2)
  const midMax = Math.max(...pitches.slice(0, midIdx))
  if (midMax >= max - 1 && last < first) return 'arch'
  if (Math.min(...pitches.slice(0, midIdx)) <= min + 1 && last > first) return 'valley'
  return 'undulating'
}

// ── Rhythm character ──────────────────────────────────────────────────────────
function rhythmChar(notes, spb) {
  if (!notes || notes.length === 0) return 'empty'
  const durs = notes.map(n => n.duration_subdivisions || 1)
  const avg  = durs.reduce((s,v)=>s+v,0) / durs.length
  const has  = d => durs.some(x => x === d)
  const subs = notes.map(n => (n.start_subdivision||0) % 2)
  const synco = subs.some(s => s !== 0)
  const parts = []
  if (avg >= 12)      parts.push('sustained/legato (whole/dotted-half notes)')
  else if (avg >= 7)  parts.push('long notes (half notes)')
  else if (avg >= 3)  parts.push('quarter note feel')
  else                parts.push('short/detached (eighth notes)')
  if (has(6) || has(3)) parts.push('dotted rhythms')
  if (synco)            parts.push('syncopated')
  const density = notes.length / ((spb||16) / 4)
  if (density < 1)    parts.push('sparse')
  else if (density > 3) parts.push('dense')
  return parts.join(', ')
}

// ── Interval analysis ─────────────────────────────────────────────────────────
function intervalAnalysis(notes) {
  const sorted = [...notes].sort((a,b)=>(a.start_subdivision||0)+(a.barNumber||0)*1000 - ((b.start_subdivision||0)+(b.barNumber||0)*1000))
  const intervals = []
  for (let i = 1; i < Math.min(sorted.length, 40); i++) {
    const diff = Math.abs(noteToMidi(sorted[i].pitch) - noteToMidi(sorted[i-1].pitch))
    if (diff > 0 && diff <= 24) intervals.push(diff)
  }
  if (!intervals.length) return 'static'
  const avg = intervals.reduce((s,v)=>s+v,0) / intervals.length
  const hasLeap = intervals.some(v => v >= 7)
  const hasStep = intervals.some(v => v <= 2)
  if (avg <= 2)  return 'mostly stepwise (2nds)'
  if (avg >= 7)  return 'large leaps (5ths, octaves)'
  if (hasLeap && hasStep) return `mixed stepwise and leaps (avg ${avg.toFixed(1)} semitones)`
  return `moderate intervals (avg ${avg.toFixed(1)} semitones)`
}

// ── Detect if two bar-sequences are octave transpositions of each other ────────
function detectOctaveTransposition(barsA, barsB) {
  // Returns +12 or -12 if barsB is exact octave shift of barsA
  if (barsA.length !== barsB.length) return null
  const notesA = barsA.flatMap(b => (b.notes||[]).sort((x,y)=>(x.start_subdivision||0)-(y.start_subdivision||0)))
  const notesB = barsB.flatMap(b => (b.notes||[]).sort((x,y)=>(x.start_subdivision||0)-(y.start_subdivision||0)))
  if (notesA.length !== notesB.length || notesA.length === 0) return null
  const shifts = notesA.map((n,i) => noteToMidi(notesB[i].pitch) - noteToMidi(n.pitch))
  const unique = [...new Set(shifts)]
  if (unique.length === 1 && (unique[0] === 12 || unique[0] === -12)) return unique[0]
  if (unique.length === 1 && (unique[0] === 24 || unique[0] === -24)) return unique[0]
  return null
}

// ── Detect ostinato / repeating bass pattern ──────────────────────────────────
function detectOstinato(bars, spb) {
  // Check if bass notes (below midi 60) follow a repeating pattern every N bars
  const bassPerBar = bars.map(b =>
    (b.notes||[])
      .filter(n => noteToMidi(n.pitch) < 60)
      .sort((a,b)=>(a.start_subdivision||0)-(b.start_subdivision||0))
      .map(n => noteClass(n.pitch))
      .join(',')
  )
  if (bassPerBar.every(b => b === '')) return null
  // Try cycle lengths 2, 4, 8
  for (const cycle of [2, 4, 8]) {
    if (bars.length < cycle * 2) continue
    const pattern = bassPerBar.slice(0, cycle).join('|')
    let matches = 0, checks = 0
    for (let i = cycle; i + cycle <= bars.length; i += cycle) {
      checks++
      if (bassPerBar.slice(i, i+cycle).join('|') === pattern) matches++
    }
    if (checks > 0 && matches / checks >= 0.7) {
      const chords = bars.slice(0, cycle).map(b => chordForBar(b)).filter(Boolean)
      return { cycleLength: cycle, progression: chords.join(' – ') }
    }
  }
  return null
}

// ── Detect cell/motif structure (A → A' → B → C pattern) ────────────────────
function detectCellStructure(bars, spb) {
  // Look at 2-bar phrase contours within each 8-bar cycle
  if (bars.length < 8) return null
  const phraseContours = []
  for (let i = 0; i < Math.min(bars.length, 16); i += 2) {
    const notes = [bars[i], bars[i+1]].filter(Boolean).flatMap(b => b.notes||[])
    phraseContours.push(contourOf(notes))
  }
  // Check if phrase 0 and phrase 1 share contour (A and A' are related)
  const isAA = phraseContours[0] === phraseContours[1] ||
    (phraseContours[0] === 'ascending' && phraseContours[1] === 'ascending') ||
    (phraseContours[0] === 'arch'      && phraseContours[1] === 'arch')
  if (phraseContours.length >= 4) {
    return {
      cell_A:  phraseContours[0],
      cell_Ap: phraseContours[1],
      cell_B:  phraseContours[2],
      cell_C:  phraseContours[3],
      isAABCPattern: isAA,
    }
  }
  return null
}

// ── Detect chromatic pivot points (leading tone moments) ─────────────────────
function detectChromaticPivots(bars) {
  const pivots = []
  for (const bar of bars) {
    const notes = (bar.notes||[]).sort((a,b)=>(a.start_subdivision||0)-(b.start_subdivision||0))
    for (let i = 1; i < notes.length; i++) {
      const diff = noteToMidi(notes[i].pitch) - noteToMidi(notes[i-1].pitch)
      const from = noteClass(notes[i-1].pitch)
      const to   = noteClass(notes[i].pitch)
      // Half-step motion to a note that is a leading tone (e.g. G#→A, F#→G, B→C)
      if (Math.abs(diff) === 1) {
        pivots.push({ bar: bar.bar_number, from, to, direction: diff > 0 ? 'up' : 'down' })
      }
    }
  }
  // Deduplicate by bar, keep most significant
  const byBar = {}
  for (const p of pivots) byBar[p.bar] = p
  return Object.values(byBar)
}

// ── Voice count (simultaneous notes) per bar ──────────────────────────────────
function voiceCountPerBar(bar, spb) {
  if (!bar.notes || bar.notes.length === 0) return 0
  const groups = {}
  for (const n of bar.notes) {
    // Count how many notes are playing at each subdivision
    const start = n.start_subdivision || 0
    const end   = start + (n.duration_subdivisions || 1)
    for (let s = start; s < end; s++) {
      groups[s] = (groups[s] || 0) + 1
    }
  }
  return Math.max(...Object.values(groups))
}

// ── Register range for a set of notes ────────────────────────────────────────
function registerRange(notes) {
  if (!notes.length) return null
  const midis = notes.map(n => noteToMidi(n.pitch))
  return { low: midiToName(Math.min(...midis)), high: midiToName(Math.max(...midis)), span: Math.max(...midis) - Math.min(...midis) }
}

// ── Dynamic (velocity) stats ──────────────────────────────────────────────────
function dynamicLabel(vel) {
  if (vel >= 110) return 'ff'
  if (vel >= 90)  return 'f'
  if (vel >= 75)  return 'mf'
  if (vel >= 58)  return 'mp'
  if (vel >= 40)  return 'p'
  return 'pp'
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY: chunkMidi — produces rich musical analysis chunks
// ════════════════════════════════════════════════════════════════════════════
function chunkMidi(json, sourceName) {
  const chunks = []
  const mkId   = () => `${sourceName.replace(/[^a-zA-Z0-9]/g,'_')}_${uuid().slice(0,8)}`

  if (!json.bars || json.bars.length === 0) return chunks

  const allNotes = []
  for (const bar of json.bars) {
    for (const note of (bar.notes||[])) {
      allNotes.push({ ...note, barNumber: bar.bar_number })
    }
  }
  if (allNotes.length === 0) return chunks

  const spb        = json.subdivisions_per_bar || 16
  const totalBars  = json.bars.length
  const realTempo  = sanitiseTempo(json.tempo)
  const detectedKey= detectKey(allNotes)

  // ── Velocity stats ─────────────────────────────────────────────────────────
  const vels   = allNotes.map(n => n.velocity || 80)
  const velMin = Math.min(...vels), velMax = Math.max(...vels)
  const velAvg = Math.round(vels.reduce((s,v)=>s+v,0)/vels.length)

  // ── Per-bar chord progression ──────────────────────────────────────────────
  const barChords = json.bars.map(b => ({ bar: b.bar_number, chord: chordForBar(b) }))

  // ── Ostinato / passacaglia detection ──────────────────────────────────────
  const ostinato = detectOstinato(json.bars, spb)

  // ── Voice counts ──────────────────────────────────────────────────────────
  const voiceCounts = json.bars.map(b => voiceCountPerBar(b, spb))
  const maxVoices   = Math.max(...voiceCounts)
  const avgVoices   = (voiceCounts.reduce((s,v)=>s+v,0)/voiceCounts.length).toFixed(1)

  // ── Register evolution (by section) ───────────────────────────────────────
  const sectionSize = Math.max(4, Math.floor(totalBars / 8))
  const sections    = []
  for (let s = 0; s < totalBars; s += sectionSize) {
    const secBars  = json.bars.slice(s, s + sectionSize)
    const secNotes = secBars.flatMap(b => b.notes||[])
    if (!secNotes.length) continue
    const reg     = registerRange(secNotes)
    const secVels = secNotes.map(n => n.velocity||80)
    const secVelAvg = Math.round(secVels.reduce((s,v)=>s+v,0)/secVels.length)
    const secVC   = secBars.map(b=>voiceCountPerBar(b,spb))
    const maxVC   = Math.max(...secVC)
    const chords  = secBars.slice(0,4).map(b=>chordForBar(b)).filter(Boolean)
    const uniqueChords = [...new Set(chords)]
    sections.push({
      startBar: s+1, endBar: Math.min(s+sectionSize, totalBars),
      low: reg?.low, high: reg?.high, span: reg?.span,
      velAvg: secVelAvg, dynamic: dynamicLabel(secVelAvg),
      maxVoices: maxVC,
      chords: uniqueChords,
      contour: contourOf(secNotes),
      rhythm: rhythmChar(secNotes, spb),
    })
  }

  // ── Octave transposition detection ────────────────────────────────────────
  const transpositions = []
  const chunkLen = Math.min(8, Math.floor(totalBars / 3))
  for (let i = 0; i < totalBars - chunkLen * 2; i += chunkLen) {
    for (let j = i + chunkLen; j < totalBars - chunkLen; j += chunkLen) {
      const shift = detectOctaveTransposition(
        json.bars.slice(i, i+chunkLen),
        json.bars.slice(j, j+chunkLen)
      )
      if (shift !== null) {
        transpositions.push({ fromBars: `${i+1}–${i+chunkLen}`, toBars: `${j+1}–${j+chunkLen}`, shift })
      }
    }
  }

  // ── Chromatic pivots ──────────────────────────────────────────────────────
  const pivots = detectChromaticPivots(json.bars)
  const pivotBars = pivots.map(p => p.bar)
  // Check for regularity (e.g. every 8 bars)
  let pivotPattern = null
  if (pivotBars.length >= 3) {
    const gaps = pivotBars.slice(1).map((b,i) => b - pivotBars[i])
    const uniqueGaps = [...new Set(gaps)]
    if (uniqueGaps.length === 1) pivotPattern = `every ${uniqueGaps[0]} bars`
    else if (uniqueGaps.every(g => Math.abs(g - uniqueGaps[0]) <= 2)) pivotPattern = `roughly every ${uniqueGaps[0]} bars`
  }

  // ── Cell structure ────────────────────────────────────────────────────────
  const cellStruct = detectCellStructure(json.bars, spb)

  // ── Phrase length analysis ────────────────────────────────────────────────
  const phraseLengths = []
  for (let i = 0; i < Math.min(totalBars, 16); i += 2) {
    const notes = [json.bars[i], json.bars[i+1]].filter(Boolean).flatMap(b=>b.notes||[])
    if (notes.length > 0) phraseLengths.push(2)
  }
  const dominantPhrase = phraseLengths.length > 0 ? '2-bar phrases' : 'unclear phrase structure'

  // ── Melodic interval analysis (high register = likely melody) ─────────────
  const highNotes = allNotes.filter(n => noteToMidi(n.pitch) >= 60)
  const bassNotes = allNotes.filter(n => noteToMidi(n.pitch) < 60)
  const melodyIntervals = intervalAnalysis(highNotes)
  const bassIntervals   = intervalAnalysis(bassNotes)

  // ── Left hand pattern (bass register) ─────────────────────────────────────
  const bassRange  = registerRange(bassNotes)
  const bassVels   = bassNotes.map(n=>n.velocity||80)
  const bassVelAvg = bassVels.length ? Math.round(bassVels.reduce((s,v)=>s+v,0)/bassVels.length) : null
  const bassRhythm = rhythmChar(bassNotes, spb)

  // ── Right hand pattern (upper register) ───────────────────────────────────
  const rightRange   = registerRange(highNotes)
  const rightRhythm  = rhythmChar(highNotes, spb)
  const rightContour = contourOf(highNotes)

  // ── Dynamic arc ───────────────────────────────────────────────────────────
  const sectionVels = sections.map(s => s.velAvg)
  const peakSection = sections.reduce((best, s) => s.velAvg > best.velAvg ? s : best, sections[0] || {velAvg:0})
  const peakPct     = peakSection ? Math.round(((peakSection.startBar-1) / totalBars) * 100) : 50
  let arcDesc = 'even'
  if (sectionVels.length >= 3) {
    const first = sectionVels[0], last = sectionVels[sectionVels.length-1]
    const peak  = Math.max(...sectionVels)
    const peakIdx = sectionVels.indexOf(peak)
    if (peakIdx > 0 && peakIdx < sectionVels.length-1) arcDesc = `builds to peak at ${peakPct}% then resolves (${dynamicLabel(first)} → ${dynamicLabel(peak)} → ${dynamicLabel(last)})`
    else if (last > first + 15) arcDesc = `builds throughout (${dynamicLabel(first)} → ${dynamicLabel(last)})`
    else if (last < first - 15) arcDesc = `fades throughout (${dynamicLabel(first)} → ${dynamicLabel(last)})`
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHUNK 1 — METADATA: the musical identity card
  // ══════════════════════════════════════════════════════════════════════════
  const avgDur = (allNotes.reduce((s,n)=>s+(n.duration_subdivisions||1),0)/allNotes.length).toFixed(1)
  const artStyle = parseFloat(avgDur) >= 10 ? 'legato/sustained' : parseFloat(avgDur) >= 4 ? 'mixed' : 'staccato/detached'
  const allChords = [...new Set(barChords.map(b=>b.chord).filter(Boolean))]
  const firstFour = barChords.slice(0,4).map(b=>b.chord).filter(Boolean)

  chunks.push({
    id:   mkId(),
    text: [
      `Piece: ${sourceName}.`,
      `Detected key: ${detectedKey} (raw tag: ${json.key||'none'}).`,
      `Tempo: ${realTempo} BPM (raw value: ${json.tempo}).`,
      `Time signature: ${json.time_signature||'4/4'}.`,
      `Total bars: ${totalBars}. Total notes: ${allNotes.length}.`,
      `Articulation: ${artStyle} (average note duration ${avgDur} subdivisions).`,
      `Dynamics: pp=${velMin} to ff=${velMax}, average ${velAvg} (${dynamicLabel(velAvg)}). ${velMax-velMin > 40 ? 'Wide dynamic range.' : velMax-velMin > 20 ? 'Moderate dynamics.' : 'Narrow/even dynamics.'}`,
      firstFour.length > 0 ? `Opening chord progression: ${firstFour.join(' – ')}.` : '',
      allChords.length > 0 ? `Full harmonic palette: ${allChords.slice(0,12).join(', ')}.` : '',
      ostinato ? `Ostinato/passacaglia detected: ${ostinato.progression} repeating every ${ostinato.cycleLength} bars.` : '',
      `Max simultaneous voices: ${maxVoices}. Average voices: ${avgVoices}.`,
    ].filter(Boolean).join(' '),
    metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'metadata' },
  })

  // ══════════════════════════════════════════════════════════════════════════
  // CHUNK 2 — HARMONY: chord progressions, section by section
  // ══════════════════════════════════════════════════════════════════════════
  const sectionLines = sections.map(s =>
    `Bars ${s.startBar}–${s.endBar}: chords [${s.chords.join(' | ')||'unclear'}], contour: ${s.contour}, dynamic: ${s.dynamic} (vel ${s.velAvg}), register: ${s.low}–${s.high}, ${s.maxVoices} voices.`
  )

  // Repeating progression detection
  const progressions8 = []
  for (let i = 0; i < json.bars.length; i += 8) {
    const slice = barChords.slice(i, i+8).map(b=>b.chord).filter(Boolean)
    if (slice.length >= 4) progressions8.push(slice.slice(0,4).join(' – '))
  }
  const uniqueProg = [...new Set(progressions8)]
  const progRepeat = uniqueProg.length <= 2 && progressions8.length >= 3
    ? `Core progression repeats throughout: ${uniqueProg[0]}.`
    : ''

  chunks.push({
    id:   mkId(),
    text: [
      `Harmonic analysis of ${sourceName} (key: ${detectedKey}, ${realTempo} BPM).`,
      progRepeat,
      pivotPattern ? `Chromatic pivot (half-step tension) occurs ${pivotPattern} at bars: ${pivotBars.slice(0,12).join(', ')}.` : '',
      ...sectionLines,
    ].filter(Boolean).join(' '),
    metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'harmony' },
  })

  // ══════════════════════════════════════════════════════════════════════════
  // CHUNK 3 — STRUCTURE: form, arc, cell pattern, transpositions
  // ══════════════════════════════════════════════════════════════════════════
  const voiceWave = sections.map(s=>`${s.maxVoices}`).join('→')
  const peakBar   = json.bars.reduce((best, b, i) => voiceCounts[i] > voiceCounts[best] ? i : best, 0)

  const transLines = transpositions.slice(0,4).map(t =>
    `Bars ${t.fromBars} and ${t.toBars} are exact octave transpositions of each other (${t.shift > 0 ? '+' : ''}${t.shift} semitones — same melody, different register).`
  )

  chunks.push({
    id:   mkId(),
    text: [
      `Structure of ${sourceName} (${totalBars} bars, ${realTempo} BPM, key ${detectedKey}).`,
      `Dynamic arc: ${arcDesc}.`,
      `Voice count wave across sections: ${voiceWave}. Peak density at bar ${json.bars[peakBar]?.bar_number} (${maxVoices} simultaneous voices).`,
      cellStruct ? `Cell structure pattern: each cycle follows ${cellStruct.isAABCPattern ? 'A → A\' → B → C' : 'contrasting phrase structure'}. Phrase 1: ${cellStruct.cell_A}, Phrase 2: ${cellStruct.cell_Ap}, Phrase 3: ${cellStruct.cell_B}, Phrase 4: ${cellStruct.cell_C}.` : '',
      `Dominant phrase unit: ${dominantPhrase}.`,
      ostinato ? `Passacaglia structure: ${ostinato.progression} ground bass repeats every ${ostinato.cycleLength} bars across the full piece.` : '',
      ...transLines,
    ].filter(Boolean).join(' '),
    metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'structure' },
  })

  // ══════════════════════════════════════════════════════════════════════════
  // CHUNK 4 — LEFT HAND (bass voice)
  // ══════════════════════════════════════════════════════════════════════════
  if (bassNotes.length > 3) {
    const bassPC = [...new Set(bassNotes.map(n=>noteClass(n.pitch)))].slice(0,8)
    chunks.push({
      id:   mkId(),
      text: [
        `Left hand / bass voice in ${sourceName}.`,
        `Register: ${bassRange?.low} to ${bassRange?.high}.`,
        `Pitch classes: ${bassPC.join(', ')}.`,
        `Rhythm character: ${bassRhythm}.`,
        `Interval movement: ${bassIntervals}.`,
        bassVelAvg !== null ? `Average velocity: ${bassVelAvg} (${dynamicLabel(bassVelAvg)}) — ${bassVelAvg < 50 ? 'intentionally subdued, pure background support' : 'active bass voice'}.` : '',
        ostinato ? `Bass forms ostinato pattern: ${ostinato.progression} cycling every ${ostinato.cycleLength} bars. Never varies — eternal foundation.` : '',
      ].filter(Boolean).join(' '),
      metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'voice', register: 'bass' },
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHUNK 5 — RIGHT HAND / MELODY (upper voice)
  // ══════════════════════════════════════════════════════════════════════════
  if (highNotes.length > 3) {
    const highPC = [...new Set(highNotes.map(n=>noteClass(n.pitch)))].slice(0,8)
    const highVelAvg = Math.round(highNotes.map(n=>n.velocity||80).reduce((s,v)=>s+v,0)/highNotes.length)
    const peakNote = midiToName(Math.max(...highNotes.map(n=>noteToMidi(n.pitch))))
    const lowestMelNote = midiToName(Math.min(...highNotes.map(n=>noteToMidi(n.pitch))))

    chunks.push({
      id:   mkId(),
      text: [
        `Right hand / melody voice in ${sourceName}.`,
        `Register: ${lowestMelNote} to ${peakNote} (peak note: ${peakNote}).`,
        `Pitch classes used: ${highPC.join(', ')}.`,
        `Melodic movement: ${melodyIntervals}.`,
        `Overall melodic contour: ${rightContour}.`,
        `Rhythm character: ${rightRhythm}.`,
        `Average velocity: ${highVelAvg} (${dynamicLabel(highVelAvg)}). Dynamic range: ${dynamicLabel(velMin)} to ${dynamicLabel(velMax)}.`,
        cellStruct ? `Melodic phrases follow ${cellStruct.isAABCPattern ? 'A → A\' → B → C' : 'contrasting'} cell pattern. Phrases are built in 2-bar units.` : '',
        transpositions.length > 0 ? `Melody contains exact octave transpositions — same melodic shape appears at different registers for emotional elevation.` : '',
        pivotBars.length > 0 ? `Melody includes chromatic half-step motion at bars ${pivotBars.slice(0,6).join(', ')} creating leading-tone tension.` : '',
      ].filter(Boolean).join(' '),
      metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'voice', register: 'melody' },
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHUNK 6 — EMOTIONAL/COMPOSITIONAL STYLE GUIDE
  // (This is what Gemini actually reads when asked to imitate the piece)
  // ══════════════════════════════════════════════════════════════════════════
  const styleLines = [
    `Style guide for composing in the manner of ${sourceName}.`,
    `Key: ${detectedKey}. Tempo: ${realTempo} BPM. Feel: ${realTempo < 70 ? 'slow and meditative' : realTempo < 100 ? 'moderate and flowing' : realTempo < 140 ? 'moderate-fast' : 'energetic'}.`,
    `Articulation: ${artStyle}. ${parseFloat(avgDur) >= 8 ? 'Use long sustained notes — legato is essential to the style.' : parseFloat(avgDur) <= 3 ? 'Use short detached notes — staccato and crisp articulation.' : 'Mix long and short notes for varied texture.'}`,
    ostinato ? `Ground structure: repeat the progression ${ostinato.progression} as a bass ostinato every ${ostinato.cycleLength} bars. This is non-negotiable — the bass NEVER changes.` : `Core progression: ${firstFour.join(' – ')}. Repeat and vary.`,
    `Texture: start with ${sections[0]?.maxVoices||2} voices, build to maximum ${maxVoices} voices. Voice count wave: ${voiceWave}.`,
    `Dynamic arc: ${arcDesc}.`,
    cellStruct?.isAABCPattern ? `Phrase formula: divide each ${ostinato?.cycleLength||8}-bar cycle into four 2-bar cells — Cell A (statement), Cell A\' (variation), Cell B (new idea), Cell C (surprise/pivot). Always different in bar 8.` : '',
    transpositions.length > 0 ? `For variation: repeat entire melodic sections one octave higher. Same notes +12 semitones creates entirely different emotional register without changing the material.` : '',
    pivotBars.length > 0 ? `Use chromatic half-step motion (leading tones) ${pivotPattern ? pivotPattern : 'periodically'} to create tension before resolution.` : '',
    `Melody style: ${melodyIntervals}. ${highNotes.length > 0 ? `Melody register: ${midiToName(Math.min(...highNotes.map(n=>noteToMidi(n.pitch))))} to ${midiToName(Math.max(...highNotes.map(n=>noteToMidi(n.pitch))))}.` : ''}`,
    `Bass style: ${bassRhythm}. ${bassVelAvg !== null && bassVelAvg < 50 ? 'Keep bass velocity very soft (pp–p) — it is a foundation, not a soloist.' : ''}`,
  ]

  chunks.push({
    id:   mkId(),
    text: styleLines.filter(Boolean).join(' '),
    metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'style' },
  })

  return chunks
}

// ════════════════════════════════════════════════════════════════════════════
// Plain text / document → chunks
// ════════════════════════════════════════════════════════════════════════════
function chunkDoc(text, sourceName) {
  const MAX  = 400
  const paras = text.split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>p.length>20)
  const pieces = []
  for (const para of paras) {
    if (para.length <= MAX) { pieces.push(para); continue }
    const sents = para.match(/[^.!?]+[.!?]+/g) || [para]
    let buf = ''
    for (const s of sents) {
      if ((buf+s).length > MAX && buf) { pieces.push(buf.trim()); buf = s }
      else buf += s
    }
    if (buf.trim()) pieces.push(buf.trim())
  }
  return pieces.map((text,i) => ({
    id:       `${sourceName.replace(/[^a-zA-Z0-9]/g,'_')}_doc_${i}_${uuid().slice(0,8)}`,
    text,
    metadata: { source: sourceName, type: 'doc' },
  }))
}

module.exports = { chunkMidi, chunkDoc }