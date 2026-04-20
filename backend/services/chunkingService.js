// // //E:\pro\midigenerator_v2\backend\services\chunkingService.js
// // 'use strict'

// // // Inline UUID v4 — no external dependency needed
// // function uuid() {
// //   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
// //     const r = Math.random() * 16 | 0
// //     return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
// //   })
// // }

// // // ═════════════════════════════════════════════════════════════════════════════
// // // chunkingService.js  —  Deep Musical Intelligence Engine
// // //
// // // Extracts the SAME level of detail as a human music analyst would write:
// // //   • Real key detection (Krumhansl-Schmuckler profiles)
// // //   • Correct tempo (handles raw MIDI ticks)
// // //   • Chord progression per bar (actual chord names)
// // //   • Cell structure detection (A → A' → B → C pattern)
// // //   • Recurring motif detection (which bars share melodic shape)
// // //   • Chromatic pivot detection (F#→G# type moments, their bar positions)
// // //   • Register evolution (how pitch range changes across the piece)
// // //   • Voice count per section (texture thickness)
// // //   • Melodic contour per phrase (ascending, arch, descending, etc.)
// // //   • Rhythmic character (legato, staccato, mixed, dotted, syncopated)
// // //   • Dynamic arc (velocity contour section by section)
// // //   • Left hand vs right hand pattern analysis
// // //   • Phrase length analysis (2-bar, 4-bar building blocks)
// // //   • Octave transposition detection (exact repeated sections at +12)
// // //   • Interval analysis (stepwise vs leaps, avg interval size)
// // //   • Passacaglia / ostinato detection (repeating bass pattern)
// // // ═════════════════════════════════════════════════════════════════════════════

// // const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
// // const FLAT_NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

// // // ── Core pitch helpers ────────────────────────────────────────────────────────

// // function noteClass(pitch) {
// //   const m = pitch?.match(/^([A-G][#b]?)/)
// //   return m ? m[1] : 'C'
// // }

// // function noteToMidi(pitch) {
// //   if (!pitch) return 60
// //   const m = pitch.match(/^([A-G][#b]?)(-?\d+)$/)
// //   if (!m) return 60
// //   const name = m[1], octave = parseInt(m[2])
// //   let idx = NOTE_NAMES.indexOf(name)
// //   if (idx === -1) idx = FLAT_NAMES.indexOf(name)
// //   return (octave + 1) * 12 + (idx === -1 ? 0 : idx)
// // }

// // function midiToName(n) {
// //   return NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1)
// // }

// // function pcName(n) {
// //   return NOTE_NAMES[((n % 12) + 12) % 12]
// // }

// // // ── Tempo sanitiser ───────────────────────────────────────────────────────────
// // // MIDI files sometimes store microseconds/beat (e.g. 500000 = 120 BPM)
// // // or raw tick values. Real BPM is always 20–300.
// // function sanitiseTempo(raw) {
// //   if (!raw || raw <= 0) return 120
// //   if (raw > 10000) return Math.round(Math.min(300, Math.max(20, 60000000 / raw)))
// //   if (raw > 300)   return 120   // unknown large value — default
// //   if (raw >= 20)   return raw
// //   return 120
// // }

// // // ── Key detection: Krumhansl-Schmuckler profiles ──────────────────────────────
// // function detectKey(notes) {
// //   const major = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]
// //   const minor = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]
// //   const counts = new Array(12).fill(0)
// //   for (const n of notes) {
// //     const dur = n.duration_subdivisions || 1
// //     counts[((noteToMidi(n.pitch) % 12) + 12) % 12] += dur
// //   }
// //   const total = counts.reduce((s,v)=>s+v,0) || 1
// //   const norm  = counts.map(v => v / total)
// //   let best = -Infinity, key = 'Am'
// //   for (let r = 0; r < 12; r++) {
// //     let sm = 0, sM = 0
// //     for (let i = 0; i < 12; i++) {
// //       sm += norm[(i+r)%12] * minor[i]
// //       sM += norm[(i+r)%12] * major[i]
// //     }
// //     if (sM > best) { best = sM; key = NOTE_NAMES[r] }
// //     if (sm > best) { best = sm; key = NOTE_NAMES[r] + 'm' }
// //   }
// //   return key
// // }

// // // ── Chord detection from simultaneous notes ───────────────────────────────────
// // const CHORD_TYPES = [
// //   { name: '',     intervals: [0,4,7] },      // major (E = E major, not Emaj)
// //   { name: 'm',    intervals: [0,3,7] },
// //   { name: 'dim',  intervals: [0,3,6] },
// //   { name: 'aug',  intervals: [0,4,8] },
// //   { name: 'maj7', intervals: [0,4,7,11] },
// //   { name: 'm7',   intervals: [0,3,7,10] },
// //   { name: '7',    intervals: [0,4,7,10] },
// //   { name: 'sus4', intervals: [0,5,7] },
// //   { name: 'sus2', intervals: [0,2,7] },
// //   { name: '5',    intervals: [0,7] },
// // ]

// // function identifyChord(pcs) {
// //   if (pcs.length === 0) return null
// //   if (pcs.length === 1) return pcName(pcs[0])
// //   const uniquePCs = [...new Set(pcs.map(p => ((p % 12) + 12) % 12))].sort((a,b)=>a-b)
// //   // Exact match first
// //   for (const root of uniquePCs) {
// //     const ivs = uniquePCs.map(p => ((p - root) % 12 + 12) % 12).sort((a,b)=>a-b)
// //     for (const ct of CHORD_TYPES) {
// //       if (ct.intervals.length === ivs.length && ct.intervals.every(i => ivs.includes(i)))
// //         return pcName(root) + ct.name
// //     }
// //   }
// //   // Partial subset match (chord tones present even if extra notes)
// //   for (const root of uniquePCs) {
// //     const ivs = uniquePCs.map(p => ((p - root) % 12 + 12) % 12).sort((a,b)=>a-b)
// //     for (const ct of CHORD_TYPES) {
// //       if (ct.intervals.every(i => ivs.includes(i)))
// //         return pcName(root) + ct.name
// //     }
// //   }
// //   return pcName(uniquePCs[0])
// // }

// // function chordForBar(bar) {
// //   if (!bar.notes || bar.notes.length === 0) return null
// //   // Weight pitch classes by duration — longer = stronger harmonic identity
// //   const pcWeight = {}
// //   for (const n of bar.notes) {
// //     const pc = ((noteToMidi(n.pitch) % 12) + 12) % 12
// //     pcWeight[pc] = (pcWeight[pc] || 0) + (n.duration_subdivisions || 1)
// //   }
// //   const top4 = Object.entries(pcWeight).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([pc])=>parseInt(pc))
// //   const triad = identifyChord(top4.slice(0,3))
// //   if (triad && triad.length <= 3) return triad
// //   return identifyChord(top4) || triad
// // }

// // // ── Melodic contour for a set of notes ────────────────────────────────────────
// // function contourOf(notes) {
// //   if (notes.length < 2) return 'static'
// //   const sorted = [...notes].sort((a,b)=>(a.start_subdivision||0)-(b.start_subdivision||0))
// //   const pitches = sorted.map(n => noteToMidi(n.pitch))
// //   const first = pitches[0], last = pitches[pitches.length-1]
// //   const max = Math.max(...pitches), min = Math.min(...pitches)
// //   if (max - min <= 2) return 'static'
// //   if (last > first + 4) return 'ascending'
// //   if (last < first - 4) return 'descending'
// //   const midIdx = Math.floor(pitches.length / 2)
// //   const midMax = Math.max(...pitches.slice(0, midIdx))
// //   if (midMax >= max - 1 && last < first) return 'arch'
// //   if (Math.min(...pitches.slice(0, midIdx)) <= min + 1 && last > first) return 'valley'
// //   return 'undulating'
// // }

// // // ── Rhythm character ──────────────────────────────────────────────────────────
// // function rhythmChar(notes, spb) {
// //   if (!notes || notes.length === 0) return 'empty'
// //   const durs = notes.map(n => n.duration_subdivisions || 1)
// //   const avg  = durs.reduce((s,v)=>s+v,0) / durs.length
// //   const has  = d => durs.some(x => x === d)
// //   const subs = notes.map(n => (n.start_subdivision||0) % 2)
// //   const synco = subs.some(s => s !== 0)
// //   const parts = []
// //   if (avg >= 12)      parts.push('sustained/legato (whole/dotted-half notes)')
// //   else if (avg >= 7)  parts.push('long notes (half notes)')
// //   else if (avg >= 3)  parts.push('quarter note feel')
// //   else                parts.push('short/detached (eighth notes)')
// //   if (has(6) || has(3)) parts.push('dotted rhythms')
// //   if (synco)            parts.push('syncopated')
// //   const density = notes.length / ((spb||16) / 4)
// //   if (density < 1)    parts.push('sparse')
// //   else if (density > 3) parts.push('dense')
// //   return parts.join(', ')
// // }

// // // ── Interval analysis ─────────────────────────────────────────────────────────
// // function intervalAnalysis(notes) {
// //   const sorted = [...notes].sort((a,b)=>(a.start_subdivision||0)+(a.barNumber||0)*1000 - ((b.start_subdivision||0)+(b.barNumber||0)*1000))
// //   const intervals = []
// //   for (let i = 1; i < Math.min(sorted.length, 40); i++) {
// //     const diff = Math.abs(noteToMidi(sorted[i].pitch) - noteToMidi(sorted[i-1].pitch))
// //     if (diff > 0 && diff <= 24) intervals.push(diff)
// //   }
// //   if (!intervals.length) return 'static'
// //   const avg = intervals.reduce((s,v)=>s+v,0) / intervals.length
// //   const hasLeap = intervals.some(v => v >= 7)
// //   const hasStep = intervals.some(v => v <= 2)
// //   if (avg <= 2)  return 'mostly stepwise (2nds)'
// //   if (avg >= 7)  return 'large leaps (5ths, octaves)'
// //   if (hasLeap && hasStep) return `mixed stepwise and leaps (avg ${avg.toFixed(1)} semitones)`
// //   return `moderate intervals (avg ${avg.toFixed(1)} semitones)`
// // }

// // // ── Detect if two bar-sequences are octave transpositions of each other ────────
// // function detectOctaveTransposition(barsA, barsB) {
// //   // Returns +12 or -12 if barsB is exact octave shift of barsA
// //   if (barsA.length !== barsB.length) return null
// //   const notesA = barsA.flatMap(b => (b.notes||[]).sort((x,y)=>(x.start_subdivision||0)-(y.start_subdivision||0)))
// //   const notesB = barsB.flatMap(b => (b.notes||[]).sort((x,y)=>(x.start_subdivision||0)-(y.start_subdivision||0)))
// //   if (notesA.length !== notesB.length || notesA.length === 0) return null
// //   const shifts = notesA.map((n,i) => noteToMidi(notesB[i].pitch) - noteToMidi(n.pitch))
// //   const unique = [...new Set(shifts)]
// //   if (unique.length === 1 && (unique[0] === 12 || unique[0] === -12)) return unique[0]
// //   if (unique.length === 1 && (unique[0] === 24 || unique[0] === -24)) return unique[0]
// //   return null
// // }

// // // ── Detect ostinato / repeating bass pattern ──────────────────────────────────
// // function detectOstinato(bars, spb) {
// //   // Check if bass notes (below midi 60) follow a repeating pattern every N bars
// //   const bassPerBar = bars.map(b =>
// //     (b.notes||[])
// //       .filter(n => noteToMidi(n.pitch) < 60)
// //       .sort((a,b)=>(a.start_subdivision||0)-(b.start_subdivision||0))
// //       .map(n => noteClass(n.pitch))
// //       .join(',')
// //   )
// //   if (bassPerBar.every(b => b === '')) return null
// //   // Try cycle lengths 2, 4, 8
// //   for (const cycle of [2, 4, 8]) {
// //     if (bars.length < cycle * 2) continue
// //     const pattern = bassPerBar.slice(0, cycle).join('|')
// //     let matches = 0, checks = 0
// //     for (let i = cycle; i + cycle <= bars.length; i += cycle) {
// //       checks++
// //       if (bassPerBar.slice(i, i+cycle).join('|') === pattern) matches++
// //     }
// //     if (checks > 0 && matches / checks >= 0.7) {
// //       const chords = bars.slice(0, cycle).map(b => chordForBar(b)).filter(Boolean)
// //       return { cycleLength: cycle, progression: chords.join(' – ') }
// //     }
// //   }
// //   return null
// // }

// // // ── Detect cell/motif structure (A → A' → B → C pattern) ────────────────────
// // function detectCellStructure(bars, spb) {
// //   // Look at 2-bar phrase contours within each 8-bar cycle
// //   if (bars.length < 8) return null
// //   const phraseContours = []
// //   for (let i = 0; i < Math.min(bars.length, 16); i += 2) {
// //     const notes = [bars[i], bars[i+1]].filter(Boolean).flatMap(b => b.notes||[])
// //     phraseContours.push(contourOf(notes))
// //   }
// //   // Check if phrase 0 and phrase 1 share contour (A and A' are related)
// //   const isAA = phraseContours[0] === phraseContours[1] ||
// //     (phraseContours[0] === 'ascending' && phraseContours[1] === 'ascending') ||
// //     (phraseContours[0] === 'arch'      && phraseContours[1] === 'arch')
// //   if (phraseContours.length >= 4) {
// //     return {
// //       cell_A:  phraseContours[0],
// //       cell_Ap: phraseContours[1],
// //       cell_B:  phraseContours[2],
// //       cell_C:  phraseContours[3],
// //       isAABCPattern: isAA,
// //     }
// //   }
// //   return null
// // }

// // // ── Detect chromatic pivot points (leading tone moments) ─────────────────────
// // function detectChromaticPivots(bars) {
// //   const pivots = []
// //   for (const bar of bars) {
// //     const notes = (bar.notes||[]).sort((a,b)=>(a.start_subdivision||0)-(b.start_subdivision||0))
// //     for (let i = 1; i < notes.length; i++) {
// //       const diff = noteToMidi(notes[i].pitch) - noteToMidi(notes[i-1].pitch)
// //       const from = noteClass(notes[i-1].pitch)
// //       const to   = noteClass(notes[i].pitch)
// //       // Half-step motion to a note that is a leading tone (e.g. G#→A, F#→G, B→C)
// //       if (Math.abs(diff) === 1) {
// //         pivots.push({ bar: bar.bar_number, from, to, direction: diff > 0 ? 'up' : 'down' })
// //       }
// //     }
// //   }
// //   // Deduplicate by bar, keep most significant
// //   const byBar = {}
// //   for (const p of pivots) byBar[p.bar] = p
// //   return Object.values(byBar)
// // }

// // // ── Voice count (simultaneous notes) per bar ──────────────────────────────────
// // function voiceCountPerBar(bar, spb) {
// //   if (!bar.notes || bar.notes.length === 0) return 0
// //   const groups = {}
// //   for (const n of bar.notes) {
// //     // Count how many notes are playing at each subdivision
// //     const start = n.start_subdivision || 0
// //     const end   = start + (n.duration_subdivisions || 1)
// //     for (let s = start; s < end; s++) {
// //       groups[s] = (groups[s] || 0) + 1
// //     }
// //   }
// //   return Math.max(...Object.values(groups))
// // }

// // // ── Register range for a set of notes ────────────────────────────────────────
// // function registerRange(notes) {
// //   if (!notes.length) return null
// //   const midis = notes.map(n => noteToMidi(n.pitch))
// //   return { low: midiToName(Math.min(...midis)), high: midiToName(Math.max(...midis)), span: Math.max(...midis) - Math.min(...midis) }
// // }

// // // ── Dynamic (velocity) stats ──────────────────────────────────────────────────
// // function dynamicLabel(vel) {
// //   if (vel >= 110) return 'ff'
// //   if (vel >= 90)  return 'f'
// //   if (vel >= 75)  return 'mf'
// //   if (vel >= 58)  return 'mp'
// //   if (vel >= 40)  return 'p'
// //   return 'pp'
// // }

// // // ════════════════════════════════════════════════════════════════════════════
// // // MAIN ENTRY: chunkMidi — produces rich musical analysis chunks
// // // ════════════════════════════════════════════════════════════════════════════
// // function chunkMidi(json, sourceName) {
// //   const chunks = []
// //   const mkId   = () => `${sourceName.replace(/[^a-zA-Z0-9]/g,'_')}_${uuid().slice(0,8)}`

// //   if (!json.bars || json.bars.length === 0) return chunks

// //   const allNotes = []
// //   for (const bar of json.bars) {
// //     for (const note of (bar.notes||[])) {
// //       allNotes.push({ ...note, barNumber: bar.bar_number })
// //     }
// //   }
// //   if (allNotes.length === 0) return chunks

// //   const spb        = json.subdivisions_per_bar || 16
// //   const totalBars  = json.bars.length
// //   const realTempo  = sanitiseTempo(json.tempo)
// //   const detectedKey= detectKey(allNotes)

// //   // ── Velocity stats ─────────────────────────────────────────────────────────
// //   const vels   = allNotes.map(n => n.velocity || 80)
// //   const velMin = Math.min(...vels), velMax = Math.max(...vels)
// //   const velAvg = Math.round(vels.reduce((s,v)=>s+v,0)/vels.length)

// //   // ── Per-bar chord progression ──────────────────────────────────────────────
// //   const barChords = json.bars.map(b => ({ bar: b.bar_number, chord: chordForBar(b) }))

// //   // ── Ostinato / passacaglia detection ──────────────────────────────────────
// //   const ostinato = detectOstinato(json.bars, spb)

// //   // ── Voice counts ──────────────────────────────────────────────────────────
// //   const voiceCounts = json.bars.map(b => voiceCountPerBar(b, spb))
// //   const maxVoices   = Math.max(...voiceCounts)
// //   const avgVoices   = (voiceCounts.reduce((s,v)=>s+v,0)/voiceCounts.length).toFixed(1)

// //   // ── Register evolution (by section) ───────────────────────────────────────
// //   const sectionSize = Math.max(4, Math.floor(totalBars / 8))
// //   const sections    = []
// //   for (let s = 0; s < totalBars; s += sectionSize) {
// //     const secBars  = json.bars.slice(s, s + sectionSize)
// //     const secNotes = secBars.flatMap(b => b.notes||[])
// //     if (!secNotes.length) continue
// //     const reg     = registerRange(secNotes)
// //     const secVels = secNotes.map(n => n.velocity||80)
// //     const secVelAvg = Math.round(secVels.reduce((s,v)=>s+v,0)/secVels.length)
// //     const secVC   = secBars.map(b=>voiceCountPerBar(b,spb))
// //     const maxVC   = Math.max(...secVC)
// //     const chords  = secBars.slice(0,4).map(b=>chordForBar(b)).filter(Boolean)
// //     const uniqueChords = [...new Set(chords)]
// //     sections.push({
// //       startBar: s+1, endBar: Math.min(s+sectionSize, totalBars),
// //       low: reg?.low, high: reg?.high, span: reg?.span,
// //       velAvg: secVelAvg, dynamic: dynamicLabel(secVelAvg),
// //       maxVoices: maxVC,
// //       chords: uniqueChords,
// //       contour: contourOf(secNotes),
// //       rhythm: rhythmChar(secNotes, spb),
// //     })
// //   }

// //   // ── Octave transposition detection ────────────────────────────────────────
// //   const transpositions = []
// //   const chunkLen = Math.min(8, Math.floor(totalBars / 3))
// //   for (let i = 0; i < totalBars - chunkLen * 2; i += chunkLen) {
// //     for (let j = i + chunkLen; j < totalBars - chunkLen; j += chunkLen) {
// //       const shift = detectOctaveTransposition(
// //         json.bars.slice(i, i+chunkLen),
// //         json.bars.slice(j, j+chunkLen)
// //       )
// //       if (shift !== null) {
// //         transpositions.push({ fromBars: `${i+1}–${i+chunkLen}`, toBars: `${j+1}–${j+chunkLen}`, shift })
// //       }
// //     }
// //   }

// //   // ── Chromatic pivots ──────────────────────────────────────────────────────
// //   const pivots = detectChromaticPivots(json.bars)
// //   const pivotBars = pivots.map(p => p.bar)
// //   // Check for regularity (e.g. every 8 bars)
// //   let pivotPattern = null
// //   if (pivotBars.length >= 3) {
// //     const gaps = pivotBars.slice(1).map((b,i) => b - pivotBars[i])
// //     const uniqueGaps = [...new Set(gaps)]
// //     if (uniqueGaps.length === 1) pivotPattern = `every ${uniqueGaps[0]} bars`
// //     else if (uniqueGaps.every(g => Math.abs(g - uniqueGaps[0]) <= 2)) pivotPattern = `roughly every ${uniqueGaps[0]} bars`
// //   }

// //   // ── Cell structure ────────────────────────────────────────────────────────
// //   const cellStruct = detectCellStructure(json.bars, spb)

// //   // ── Phrase length analysis ────────────────────────────────────────────────
// //   const phraseLengths = []
// //   for (let i = 0; i < Math.min(totalBars, 16); i += 2) {
// //     const notes = [json.bars[i], json.bars[i+1]].filter(Boolean).flatMap(b=>b.notes||[])
// //     if (notes.length > 0) phraseLengths.push(2)
// //   }
// //   const dominantPhrase = phraseLengths.length > 0 ? '2-bar phrases' : 'unclear phrase structure'

// //   // ── Melodic interval analysis (high register = likely melody) ─────────────
// //   const highNotes = allNotes.filter(n => noteToMidi(n.pitch) >= 60)
// //   const bassNotes = allNotes.filter(n => noteToMidi(n.pitch) < 60)
// //   const melodyIntervals = intervalAnalysis(highNotes)
// //   const bassIntervals   = intervalAnalysis(bassNotes)

// //   // ── Left hand pattern (bass register) ─────────────────────────────────────
// //   const bassRange  = registerRange(bassNotes)
// //   const bassVels   = bassNotes.map(n=>n.velocity||80)
// //   const bassVelAvg = bassVels.length ? Math.round(bassVels.reduce((s,v)=>s+v,0)/bassVels.length) : null
// //   const bassRhythm = rhythmChar(bassNotes, spb)

// //   // ── Right hand pattern (upper register) ───────────────────────────────────
// //   const rightRange   = registerRange(highNotes)
// //   const rightRhythm  = rhythmChar(highNotes, spb)
// //   const rightContour = contourOf(highNotes)

// //   // ── Dynamic arc ───────────────────────────────────────────────────────────
// //   const sectionVels = sections.map(s => s.velAvg)
// //   const peakSection = sections.reduce((best, s) => s.velAvg > best.velAvg ? s : best, sections[0] || {velAvg:0})
// //   const peakPct     = peakSection ? Math.round(((peakSection.startBar-1) / totalBars) * 100) : 50
// //   let arcDesc = 'even'
// //   if (sectionVels.length >= 3) {
// //     const first = sectionVels[0], last = sectionVels[sectionVels.length-1]
// //     const peak  = Math.max(...sectionVels)
// //     const peakIdx = sectionVels.indexOf(peak)
// //     if (peakIdx > 0 && peakIdx < sectionVels.length-1) arcDesc = `builds to peak at ${peakPct}% then resolves (${dynamicLabel(first)} → ${dynamicLabel(peak)} → ${dynamicLabel(last)})`
// //     else if (last > first + 15) arcDesc = `builds throughout (${dynamicLabel(first)} → ${dynamicLabel(last)})`
// //     else if (last < first - 15) arcDesc = `fades throughout (${dynamicLabel(first)} → ${dynamicLabel(last)})`
// //   }

// //   // ══════════════════════════════════════════════════════════════════════════
// //   // CHUNK 1 — METADATA: the musical identity card
// //   // ══════════════════════════════════════════════════════════════════════════
// //   const avgDur = (allNotes.reduce((s,n)=>s+(n.duration_subdivisions||1),0)/allNotes.length).toFixed(1)
// //   const artStyle = parseFloat(avgDur) >= 10 ? 'legato/sustained' : parseFloat(avgDur) >= 4 ? 'mixed' : 'staccato/detached'
// //   const allChords = [...new Set(barChords.map(b=>b.chord).filter(Boolean))]
// //   const firstFour = barChords.slice(0,4).map(b=>b.chord).filter(Boolean)

// //   chunks.push({
// //     id:   mkId(),
// //     text: [
// //       `Piece: ${sourceName}.`,
// //       `Detected key: ${detectedKey} (raw tag: ${json.key||'none'}).`,
// //       `Tempo: ${realTempo} BPM (raw value: ${json.tempo}).`,
// //       `Time signature: ${json.time_signature||'4/4'}.`,
// //       `Total bars: ${totalBars}. Total notes: ${allNotes.length}.`,
// //       `Articulation: ${artStyle} (average note duration ${avgDur} subdivisions).`,
// //       `Dynamics: pp=${velMin} to ff=${velMax}, average ${velAvg} (${dynamicLabel(velAvg)}). ${velMax-velMin > 40 ? 'Wide dynamic range.' : velMax-velMin > 20 ? 'Moderate dynamics.' : 'Narrow/even dynamics.'}`,
// //       firstFour.length > 0 ? `Opening chord progression: ${firstFour.join(' – ')}.` : '',
// //       allChords.length > 0 ? `Full harmonic palette: ${allChords.slice(0,12).join(', ')}.` : '',
// //       ostinato ? `Ostinato/passacaglia detected: ${ostinato.progression} repeating every ${ostinato.cycleLength} bars.` : '',
// //       `Max simultaneous voices: ${maxVoices}. Average voices: ${avgVoices}.`,
// //     ].filter(Boolean).join(' '),
// //     metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'metadata' },
// //   })

// //   // ══════════════════════════════════════════════════════════════════════════
// //   // CHUNK 2 — HARMONY: chord progressions, section by section
// //   // ══════════════════════════════════════════════════════════════════════════
// //   const sectionLines = sections.map(s =>
// //     `Bars ${s.startBar}–${s.endBar}: chords [${s.chords.join(' | ')||'unclear'}], contour: ${s.contour}, dynamic: ${s.dynamic} (vel ${s.velAvg}), register: ${s.low}–${s.high}, ${s.maxVoices} voices.`
// //   )

// //   // Repeating progression detection
// //   const progressions8 = []
// //   for (let i = 0; i < json.bars.length; i += 8) {
// //     const slice = barChords.slice(i, i+8).map(b=>b.chord).filter(Boolean)
// //     if (slice.length >= 4) progressions8.push(slice.slice(0,4).join(' – '))
// //   }
// //   const uniqueProg = [...new Set(progressions8)]
// //   const progRepeat = uniqueProg.length <= 2 && progressions8.length >= 3
// //     ? `Core progression repeats throughout: ${uniqueProg[0]}.`
// //     : ''

// //   chunks.push({
// //     id:   mkId(),
// //     text: [
// //       `Harmonic analysis of ${sourceName} (key: ${detectedKey}, ${realTempo} BPM).`,
// //       progRepeat,
// //       pivotPattern ? `Chromatic pivot (half-step tension) occurs ${pivotPattern} at bars: ${pivotBars.slice(0,12).join(', ')}.` : '',
// //       ...sectionLines,
// //     ].filter(Boolean).join(' '),
// //     metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'harmony' },
// //   })

// //   // ══════════════════════════════════════════════════════════════════════════
// //   // CHUNK 3 — STRUCTURE: form, arc, cell pattern, transpositions
// //   // ══════════════════════════════════════════════════════════════════════════
// //   const voiceWave = sections.map(s=>`${s.maxVoices}`).join('→')
// //   const peakBar   = json.bars.reduce((best, b, i) => voiceCounts[i] > voiceCounts[best] ? i : best, 0)

// //   const transLines = transpositions.slice(0,4).map(t =>
// //     `Bars ${t.fromBars} and ${t.toBars} are exact octave transpositions of each other (${t.shift > 0 ? '+' : ''}${t.shift} semitones — same melody, different register).`
// //   )

// //   chunks.push({
// //     id:   mkId(),
// //     text: [
// //       `Structure of ${sourceName} (${totalBars} bars, ${realTempo} BPM, key ${detectedKey}).`,
// //       `Dynamic arc: ${arcDesc}.`,
// //       `Voice count wave across sections: ${voiceWave}. Peak density at bar ${json.bars[peakBar]?.bar_number} (${maxVoices} simultaneous voices).`,
// //       cellStruct ? `Cell structure pattern: each cycle follows ${cellStruct.isAABCPattern ? 'A → A\' → B → C' : 'contrasting phrase structure'}. Phrase 1: ${cellStruct.cell_A}, Phrase 2: ${cellStruct.cell_Ap}, Phrase 3: ${cellStruct.cell_B}, Phrase 4: ${cellStruct.cell_C}.` : '',
// //       `Dominant phrase unit: ${dominantPhrase}.`,
// //       ostinato ? `Passacaglia structure: ${ostinato.progression} ground bass repeats every ${ostinato.cycleLength} bars across the full piece.` : '',
// //       ...transLines,
// //     ].filter(Boolean).join(' '),
// //     metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'structure' },
// //   })

// //   // ══════════════════════════════════════════════════════════════════════════
// //   // CHUNK 4 — LEFT HAND (bass voice)
// //   // ══════════════════════════════════════════════════════════════════════════
// //   if (bassNotes.length > 3) {
// //     const bassPC = [...new Set(bassNotes.map(n=>noteClass(n.pitch)))].slice(0,8)
// //     chunks.push({
// //       id:   mkId(),
// //       text: [
// //         `Left hand / bass voice in ${sourceName}.`,
// //         `Register: ${bassRange?.low} to ${bassRange?.high}.`,
// //         `Pitch classes: ${bassPC.join(', ')}.`,
// //         `Rhythm character: ${bassRhythm}.`,
// //         `Interval movement: ${bassIntervals}.`,
// //         bassVelAvg !== null ? `Average velocity: ${bassVelAvg} (${dynamicLabel(bassVelAvg)}) — ${bassVelAvg < 50 ? 'intentionally subdued, pure background support' : 'active bass voice'}.` : '',
// //         ostinato ? `Bass forms ostinato pattern: ${ostinato.progression} cycling every ${ostinato.cycleLength} bars. Never varies — eternal foundation.` : '',
// //       ].filter(Boolean).join(' '),
// //       metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'voice', register: 'bass' },
// //     })
// //   }

// //   // ══════════════════════════════════════════════════════════════════════════
// //   // CHUNK 5 — RIGHT HAND / MELODY (upper voice)
// //   // ══════════════════════════════════════════════════════════════════════════
// //   if (highNotes.length > 3) {
// //     const highPC = [...new Set(highNotes.map(n=>noteClass(n.pitch)))].slice(0,8)
// //     const highVelAvg = Math.round(highNotes.map(n=>n.velocity||80).reduce((s,v)=>s+v,0)/highNotes.length)
// //     const peakNote = midiToName(Math.max(...highNotes.map(n=>noteToMidi(n.pitch))))
// //     const lowestMelNote = midiToName(Math.min(...highNotes.map(n=>noteToMidi(n.pitch))))

// //     chunks.push({
// //       id:   mkId(),
// //       text: [
// //         `Right hand / melody voice in ${sourceName}.`,
// //         `Register: ${lowestMelNote} to ${peakNote} (peak note: ${peakNote}).`,
// //         `Pitch classes used: ${highPC.join(', ')}.`,
// //         `Melodic movement: ${melodyIntervals}.`,
// //         `Overall melodic contour: ${rightContour}.`,
// //         `Rhythm character: ${rightRhythm}.`,
// //         `Average velocity: ${highVelAvg} (${dynamicLabel(highVelAvg)}). Dynamic range: ${dynamicLabel(velMin)} to ${dynamicLabel(velMax)}.`,
// //         cellStruct ? `Melodic phrases follow ${cellStruct.isAABCPattern ? 'A → A\' → B → C' : 'contrasting'} cell pattern. Phrases are built in 2-bar units.` : '',
// //         transpositions.length > 0 ? `Melody contains exact octave transpositions — same melodic shape appears at different registers for emotional elevation.` : '',
// //         pivotBars.length > 0 ? `Melody includes chromatic half-step motion at bars ${pivotBars.slice(0,6).join(', ')} creating leading-tone tension.` : '',
// //       ].filter(Boolean).join(' '),
// //       metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'voice', register: 'melody' },
// //     })
// //   }

// //   // ══════════════════════════════════════════════════════════════════════════
// //   // CHUNK 6 — EMOTIONAL/COMPOSITIONAL STYLE GUIDE
// //   // (This is what Gemini actually reads when asked to imitate the piece)
// //   // ══════════════════════════════════════════════════════════════════════════
// //   const styleLines = [
// //     `Style guide for composing in the manner of ${sourceName}.`,
// //     `Key: ${detectedKey}. Tempo: ${realTempo} BPM. Feel: ${realTempo < 70 ? 'slow and meditative' : realTempo < 100 ? 'moderate and flowing' : realTempo < 140 ? 'moderate-fast' : 'energetic'}.`,
// //     `Articulation: ${artStyle}. ${parseFloat(avgDur) >= 8 ? 'Use long sustained notes — legato is essential to the style.' : parseFloat(avgDur) <= 3 ? 'Use short detached notes — staccato and crisp articulation.' : 'Mix long and short notes for varied texture.'}`,
// //     ostinato ? `Ground structure: repeat the progression ${ostinato.progression} as a bass ostinato every ${ostinato.cycleLength} bars. This is non-negotiable — the bass NEVER changes.` : `Core progression: ${firstFour.join(' – ')}. Repeat and vary.`,
// //     `Texture: start with ${sections[0]?.maxVoices||2} voices, build to maximum ${maxVoices} voices. Voice count wave: ${voiceWave}.`,
// //     `Dynamic arc: ${arcDesc}.`,
// //     cellStruct?.isAABCPattern ? `Phrase formula: divide each ${ostinato?.cycleLength||8}-bar cycle into four 2-bar cells — Cell A (statement), Cell A\' (variation), Cell B (new idea), Cell C (surprise/pivot). Always different in bar 8.` : '',
// //     transpositions.length > 0 ? `For variation: repeat entire melodic sections one octave higher. Same notes +12 semitones creates entirely different emotional register without changing the material.` : '',
// //     pivotBars.length > 0 ? `Use chromatic half-step motion (leading tones) ${pivotPattern ? pivotPattern : 'periodically'} to create tension before resolution.` : '',
// //     `Melody style: ${melodyIntervals}. ${highNotes.length > 0 ? `Melody register: ${midiToName(Math.min(...highNotes.map(n=>noteToMidi(n.pitch))))} to ${midiToName(Math.max(...highNotes.map(n=>noteToMidi(n.pitch))))}.` : ''}`,
// //     `Bass style: ${bassRhythm}. ${bassVelAvg !== null && bassVelAvg < 50 ? 'Keep bass velocity very soft (pp–p) — it is a foundation, not a soloist.' : ''}`,
// //   ]

// //   chunks.push({
// //     id:   mkId(),
// //     text: styleLines.filter(Boolean).join(' '),
// //     metadata: { source: sourceName, key: detectedKey, tempo: realTempo, type: 'style' },
// //   })

// //   return chunks
// // }

// // // ════════════════════════════════════════════════════════════════════════════
// // // Plain text / document → chunks
// // // ════════════════════════════════════════════════════════════════════════════
// // function chunkDoc(text, sourceName) {
// //   const MAX  = 400
// //   const paras = text.split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>p.length>20)
// //   const pieces = []
// //   for (const para of paras) {
// //     if (para.length <= MAX) { pieces.push(para); continue }
// //     const sents = para.match(/[^.!?]+[.!?]+/g) || [para]
// //     let buf = ''
// //     for (const s of sents) {
// //       if ((buf+s).length > MAX && buf) { pieces.push(buf.trim()); buf = s }
// //       else buf += s
// //     }
// //     if (buf.trim()) pieces.push(buf.trim())
// //   }
// //   return pieces.map((text,i) => ({
// //     id:       `${sourceName.replace(/[^a-zA-Z0-9]/g,'_')}_doc_${i}_${uuid().slice(0,8)}`,
// //     text,
// //     metadata: { source: sourceName, type: 'doc' },
// //   }))
// // }

// // module.exports = { chunkMidi, chunkDoc }












// 'use strict'
// // backend/services/chunkingService.js
// //
// // REWRITTEN — now uses MusicAnalyzerEngine v4.0 for deep musical analysis.
// //
// // Per MIDI file it creates these chunks for Pinecone:
// //   1. exact_ref    — reference pointer (actual JSON stored in SQLite tracks table)
// //   2. blueprint    — full YAML structural analysis from engine
// //   3. patterns_rh  — right hand motif families with variation types
// //   4. patterns_lh  — left hand pattern families
// //   5. structure    — section order, boundaries, surprise bars
// //   6. harmony      — pitch ranges, registers, note density
// //   7. style        — compositional DNA guide for generation
// //
// // This beats NotebookLM because the engine extracts MUSICAL MEANING
// // (chord progressions, alternating patterns, structural fingerprints)
// // instead of just treating the JSON as plain text.

// // ── Inline UUID ────────────────────────────────────────────────────────────────
// function uuid() {
//   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
//     const r = Math.random() * 16 | 0
//     return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
//   })
// }

// // ── Load engine (same path the analyze route uses) ────────────────────────────
// let engine = null
// function getEngine() {
//   if (!engine) {
//     try {
//       engine = require('../engines/musicAnalyzerEngine')
//     } catch (e) {
//       console.warn('[chunking] Engine not found at ../engines/musicAnalyzerEngine:', e.message)
//       engine = null
//     }
//   }
//   return engine
// }

// // ── Pitch helpers (lightweight, no engine dependency) ─────────────────────────
// const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
// const NOTE_MAP   = { 'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,'A':9,'A#':10,'BB':10,'B':11 }

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

// // ── Normalise compact note to full field names ─────────────────────────────────
// function normNote(n) {
//   return {
//     pitch:                 n.pitch                ?? n.p,
//     start_subdivision:     n.start_subdivision    ?? n.s ?? 0,
//     duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
//   }
// }

// // ── Main chunk generator using MusicAnalyzerEngine ───────────────────────────
// function chunkMidi(json, sourceName) {
//   const eng = getEngine()

//   if (!eng) {
//     console.warn('[chunking] Engine unavailable — falling back to basic chunking')
//     return chunkMidiBasic(json, sourceName)
//   }

//   let analysis
//   try {
//     analysis = eng.analyze(json)
//   } catch (e) {
//     console.warn(`[chunking] Engine analysis failed for ${sourceName}: ${e.message}`)
//     return chunkMidiBasic(json, sourceName)
//   }

//   const { metadata, rightHand, leftHand, yamlBlueprint } = analysis
//   const mkId = () => `${sourceName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${uuid().slice(0, 8)}`
//   const meta = (type) => ({ source: sourceName, key: metadata.key || 'C', tempo: metadata.tempo || 120, type })

//   const chunks = []

//   // ────────────────────────────────────────────────────────────────────────────
//   // CHUNK 1 — EXACT REFERENCE
//   // Points to the full JSON stored in SQLite tracks table.
//   // Pinecone finds this chunk → composeController fetches exact JSON from SQLite.
//   // ────────────────────────────────────────────────────────────────────────────
//   chunks.push({
//     id:   mkId(),
//     text: [
//       `EXACT TRACK: "${sourceName}".`,
//       `Key: ${metadata.key}. Tempo: ${metadata.tempo} BPM.`,
//       `Time signature: ${metadata.time_signature}.`,
//       `Total bars: ${metadata.bars.length}.`,
//       `Subdivisions per bar: ${metadata.subdivisions_per_bar}.`,
//       `Full playback-ready JSON is stored and available for exact retrieval.`,
//       `To reproduce or analyse this track exactly, retrieve by source file name: "${sourceName}".`,
//     ].join(' '),
//     metadata: meta('exact_ref'),
//   })

//   // ────────────────────────────────────────────────────────────────────────────
//   // CHUNK 2 — YAML BLUEPRINT (split if > 1500 chars)
//   // Full structural fingerprint output from engine v4.
//   // ────────────────────────────────────────────────────────────────────────────
//   const yamlText = yamlBlueprint || ''
//   const MAX_YAML = 1500
//   if (yamlText.length > 0) {
//     if (yamlText.length <= MAX_YAML) {
//       chunks.push({
//         id:   mkId(),
//         text: `STRUCTURAL BLUEPRINT for "${sourceName}":\n${yamlText}`,
//         metadata: meta('blueprint'),
//       })
//     } else {
//       const parts = []
//       for (let i = 0; i < yamlText.length; i += MAX_YAML) parts.push(yamlText.slice(i, i + MAX_YAML))
//       parts.forEach((p, i) => chunks.push({
//         id:   mkId(),
//         text: `STRUCTURAL BLUEPRINT for "${sourceName}" (part ${i + 1}/${parts.length}):\n${p}`,
//         metadata: meta('blueprint'),
//       }))
//     }
//   }

//   // ────────────────────────────────────────────────────────────────────────────
//   // CHUNK 3 — RIGHT HAND PATTERN FAMILIES
//   // Motif A, Motif B, occurrence positions, variation types (exact/inverted/transposed…)
//   // ────────────────────────────────────────────────────────────────────────────
//   const rhFamilies = rightHand.families || []
//   if (rhFamilies.length > 0) {
//     const famLines = rhFamilies.map(f => {
//       const occText = f.occurrences.map(o =>
//         `bars ${o.startBar}-${o.endBar}[${o.variationType || 'prototype'}]`
//       ).join(', ')
//       const desc = f.occurrences[0]?.descriptors?.[0]
//       const structInfo = desc
//         ? `texture:${desc.textureType} dir:${desc.melodyDirection} step:${desc.stepType}`
//         : ''
//       return `  ${f.label}(win:${f.windowSize}, match:${f.matchLevel}, count:${f.occurrenceCount}): ${occText}. ${structInfo}`
//     }).join('\n')

//     chunks.push({
//       id:   mkId(),
//       text: [
//         `Right hand / melody patterns in "${sourceName}".`,
//         `${rhFamilies.length} motif families detected.`,
//         `Natural phrase lengths: [${(rightHand.windowSizes || []).join(', ')}] bars.`,
//         `Section order: ${(rightHand.sections || []).map(s => s.fullLabel).join(' → ') || 'N/A'}.`,
//         `\nFamilies:\n${famLines}`,
//       ].join(' '),
//       metadata: meta('patterns_rh'),
//     })
//   }

//   // ────────────────────────────────────────────────────────────────────────────
//   // CHUNK 4 — LEFT HAND PATTERN FAMILIES
//   // Bass / accompaniment pattern structure
//   // ────────────────────────────────────────────────────────────────────────────
//   const lhFamilies = leftHand.families || []
//   if (lhFamilies.length > 0) {
//     const famLines = lhFamilies.map(f => {
//       const occText = f.occurrences.map(o =>
//         `bars ${o.startBar}-${o.endBar}[${o.variationType || 'prototype'}]`
//       ).join(', ')
//       return `  ${f.label}(win:${f.windowSize}, match:${f.matchLevel}): ${occText}`
//     }).join('\n')

//     chunks.push({
//       id:   mkId(),
//       text: [
//         `Left hand / bass patterns in "${sourceName}".`,
//         `${lhFamilies.length} bass pattern families.`,
//         `Section order: ${(leftHand.sections || []).map(s => s.fullLabel).join(' → ') || 'N/A'}.`,
//         `\nFamilies:\n${famLines}`,
//       ].join(' '),
//       metadata: meta('patterns_lh'),
//     })
//   }

//   // ────────────────────────────────────────────────────────────────────────────
//   // CHUNK 5 — SECTION STRUCTURE + BOUNDARIES
//   // Where the music changes and what type of change it is
//   // ────────────────────────────────────────────────────────────────────────────
//   const rhSections   = rightHand.sections   || []
//   const rhBoundaries = rightHand.boundaries || []
//   const rhLabeled    = rightHand.labeled    || []

//   if (rhSections.length > 0 || rhBoundaries.length > 0) {
//     const secText = rhSections.map(s =>
//       `${s.fullLabel}(bars ${s.startBar}-${s.endBar}, ${s.barCount} bars)`
//     ).join(' → ')

//     const boundText = rhBoundaries.map(b =>
//       `bar ${b.afterBarNumber}[${b.type}, novelty:${b.noveltyScore.toFixed(2)}]`
//     ).join(', ')

//     const surpriseText = rhLabeled.filter(b => b.isSurprise).map(b => b.barNumber).join(', ') || 'none'

//     chunks.push({
//       id:   mkId(),
//       text: [
//         `Section and boundary structure of "${sourceName}".`,
//         secText ? `Section order: ${secText}.` : '',
//         rhBoundaries.length > 0 ? `${rhBoundaries.length} structural boundaries at: ${boundText}.` : '',
//         `Surprise / unclassified bars: [${surpriseText}].`,
//         `Right hand: ${rhFamilies.length} pattern families. Left hand: ${lhFamilies.length} pattern families.`,
//       ].filter(Boolean).join(' '),
//       metadata: meta('structure'),
//     })
//   }

//   // ────────────────────────────────────────────────────────────────────────────
//   // CHUNK 6 — PITCH RANGES + HARMONY + REGISTER
//   // ────────────────────────────────────────────────────────────────────────────
//   const allNotesRaw = (json.bars || []).flatMap(b => (b.notes || []).map(normNote))
//   if (allNotesRaw.length > 0) {
//     const rhNotes = (rhLabeled).flatMap(b => b.notes || []).filter(n => n.pitch)
//     const lhNotes = (leftHand.labeled || []).flatMap(b => b.notes || []).filter(n => n.pitch)

//     const rangeStr = (notes) => {
//       if (!notes.length) return null
//       const midis = notes.map(n => midiOf(n.pitch)).filter(m => m > 0)
//       if (!midis.length) return null
//       return `${midiToName(Math.min(...midis))} to ${midiToName(Math.max(...midis))}`
//     }

//     const rhRange  = rangeStr(rhNotes)
//     const lhRange  = rangeStr(lhNotes)
//     const totalBars = metadata.bars.length || 1
//     const avgDur   = (allNotesRaw.reduce((s, n) => s + n.duration_subdivisions, 0) / allNotesRaw.length).toFixed(1)
//     const artStyle = parseFloat(avgDur) >= 8 ? 'sustained/legato (whole/half notes)' :
//                      parseFloat(avgDur) >= 4 ? 'quarter-note feel' : 'short/detached (eighth notes)'

//     chunks.push({
//       id:   mkId(),
//       text: [
//         `Pitch, register and harmony analysis of "${sourceName}".`,
//         rhRange ? `Right hand register: ${rhRange}.` : '',
//         lhRange ? `Left hand register: ${lhRange}.` : '',
//         `Total notes: ${allNotesRaw.length}. Notes per bar: ${(allNotesRaw.length / totalBars).toFixed(1)}.`,
//         `Average note duration: ${avgDur} subdivisions — ${artStyle}.`,
//         `Key: ${metadata.key}. Tempo: ${metadata.tempo} BPM.`,
//       ].filter(Boolean).join(' '),
//       metadata: meta('harmony'),
//     })
//   }

//   // ────────────────────────────────────────────────────────────────────────────
//   // CHUNK 7 — STYLE GUIDE FOR COMPOSITION
//   // The "how to compose like this" guide that Gemini reads when generating
//   // ────────────────────────────────────────────────────────────────────────────
//   const feel = metadata.tempo < 70  ? 'slow and meditative'
//              : metadata.tempo < 100 ? 'moderate and flowing'
//              : metadata.tempo < 140 ? 'moderate-fast'
//              : 'energetic'

//   const sectionOrder = rhSections.map(s => s.fullLabel).join(' → ') || 'undetermined'
//   const windowSizes  = (rightHand.windowSizes || []).join(', ') || 'unknown'
//   const boundTypes   = [...new Set(rhBoundaries.map(b => b.type))].join(', ')

//   // Get the prototype bar from each family for compositional reference
//   const familyGuides = rhFamilies.slice(0, 4).map(f => {
//     const proto = f.occurrences[0]
//     const desc  = proto?.descriptors?.[0]
//     if (!desc) return null
//     return `${f.label}: ${desc.textureType} texture, ${desc.melodyDirection} direction, ${desc.stepType} motion`
//   }).filter(Boolean)

//   chunks.push({
//     id:   mkId(),
//     text: [
//       `STYLE GUIDE — How to compose in the manner of "${sourceName}".`,
//       `Key: ${metadata.key}. Tempo: ${metadata.tempo} BPM. Time: ${metadata.time_signature}. Feel: ${feel}.`,
//       `Phrase structure to follow: ${sectionOrder}.`,
//       `Natural phrase unit lengths: [${windowSizes}] bars.`,
//       `${rhFamilies.length} distinct motif types — alternate and develop these.`,
//       boundTypes ? `Transition types between sections: ${boundTypes}.` : '',
//       familyGuides.length > 0 ? `Core motif characteristics:\n  ${familyGuides.join('\n  ')}` : '',
//       `Composition rule: open with ${rhSections[0]?.fullLabel || 'A'} section, follow the section order, resolve in final bar.`,
//       `Register rule: right hand stays in ${rangeShort(rhLabeled)}, left hand stays in ${rangeShort(leftHand.labeled || [])}.`,
//     ].filter(Boolean).join(' '),
//     metadata: meta('style'),
//   })

//   console.log(`[chunking] "${sourceName}" → ${chunks.length} chunks via MusicAnalyzerEngine v4`)
//   return chunks
// }

// // Helper for style guide — compact range string
// function rangeShort(labeled) {
//   const notes = labeled.flatMap(b => b.notes || []).filter(n => n?.pitch)
//   if (!notes.length) return 'unknown register'
//   const midis = notes.map(n => midiOf(n.pitch)).filter(m => m > 0)
//   if (!midis.length) return 'unknown register'
//   return `${midiToName(Math.min(...midis))}–${midiToName(Math.max(...midis))}`
// }

// // ── Fallback: basic chunks if engine fails ────────────────────────────────────
// function chunkMidiBasic(json, sourceName) {
//   const mkId = () => `${sourceName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${uuid().slice(0, 8)}`
//   const bars = json.bars?.length || 0
//   return [
//     {
//       id:   mkId(),
//       text: [
//         `TRACK: "${sourceName}".`,
//         `Key: ${json.key || 'C'}. Tempo: ${json.tempo || 120} BPM.`,
//         `Time signature: ${json.time_signature || '4/4'}. Total bars: ${bars}.`,
//         `Full JSON stored and available for exact retrieval.`,
//       ].join(' '),
//       metadata: { source: sourceName, key: json.key || 'C', tempo: json.tempo || 120, type: 'exact_ref' },
//     }
//   ]
// }

// // ── Plain text / doc → chunks ─────────────────────────────────────────────────
// function chunkDoc(text, sourceName) {
//   const MAX   = 800
//   const paras = text.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p.length > 20)
//   const pieces = []
//   for (const para of paras) {
//     if (para.length <= MAX) { pieces.push(para); continue }
//     const sents = para.match(/[^.!?]+[.!?]+/g) || [para]
//     let buf = ''
//     for (const s of sents) {
//       if ((buf + s).length > MAX && buf) { pieces.push(buf.trim()); buf = s }
//       else buf += s
//     }
//     if (buf.trim()) pieces.push(buf.trim())
//   }
//   return pieces.map((t, i) => ({
//     id:       `${sourceName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_doc_${i}_${uuid().slice(0, 8)}`,
//     text:     t,
//     metadata: { source: sourceName, type: 'doc' },
//   }))
// }

// module.exports = { chunkMidi, chunkDoc }








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