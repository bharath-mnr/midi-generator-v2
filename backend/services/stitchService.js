// //E:\pro\midigenerator_v2\backend\services\stitchService.js

// 'use strict'

// // ── stitchService.js ──────────────────────────────────────────────────────────
// // Merges multiple section JSONs into one continuous piece.
// // Handles:
// //   - Bar number renumbering
// //   - Tempo / key continuity warnings
// //   - Time signature consistency enforcement
// // ─────────────────────────────────────────────────────────────────────────────

// function merge(sections) {
//   if (!sections || sections.length === 0) {
//     throw new Error('stitchService.merge: no sections provided')
//   }
//   if (sections.length === 1) return sections[0]

//   const first = sections[0]

//   // Validate all sections share the same time signature
//   for (let i = 1; i < sections.length; i++) {
//     if (sections[i].time_signature !== first.time_signature) {
//       console.warn(
//         `[stitchService] Section ${i + 1} has time_signature ${sections[i].time_signature}, ` +
//         `expected ${first.time_signature}. Using first section's value.`
//       )
//     }
//   }

//   // Build merged bar list with renumbered bar_numbers
//   const mergedBars = []
//   let barOffset    = 0

//   for (const section of sections) {
//     const sectionBars = section.bars || []

//     for (const bar of sectionBars) {
//       mergedBars.push({
//         ...bar,
//         bar_number: bar.bar_number + barOffset,
//         // Deep-copy notes to avoid reference sharing
//         notes: (bar.notes || []).map(n => ({ ...n })),
//       })
//     }

//     barOffset += sectionBars.length
//   }

//   // Use the tempo/key from the last section if they differ (e.g. key changes)
//   const last = sections[sections.length - 1]

//   return {
//     tempo:                first.tempo,
//     time_signature:       first.time_signature,
//     key:                  first.key,
//     subdivisions_per_bar: first.subdivisions_per_bar,
//     bars:                 mergedBars,
//     // Metadata about the merge
//     _stitched: {
//       sections:    sections.length,
//       total_bars:  mergedBars.length,
//       final_key:   last.key,
//       final_tempo: last.tempo,
//     },
//   }
// }

// // ── Split a long JSON into N roughly-equal sections ───────────────────────────
// // Useful for breaking existing compositions into sections for re-generation
// function split(json, sectionCount) {
//   if (!json.bars || json.bars.length === 0) return [json]
//   const barsPerSection = Math.ceil(json.bars.length / sectionCount)
//   const sections       = []

//   for (let i = 0; i < json.bars.length; i += barsPerSection) {
//     const slice = json.bars.slice(i, i + barsPerSection)
//     // Renumber bars to start at 1 within each section
//     const firstBar = slice[0]?.bar_number || 1
//     sections.push({
//       ...json,
//       bars: slice.map(b => ({ ...b, bar_number: b.bar_number - firstBar + 1 })),
//     })
//   }

//   return sections
// }

// module.exports = { merge, split }














'use strict'
// backend/services/stitchService.js  v2.0
//
// ── WHAT CHANGED ──────────────────────────────────────────────────────────────
//  Bars from parseCompactString() have `bar_number` (integer), not `bn`.
//  Previous version did `bar.bar_number + barOffset` which was NaN when bars
//  only had `bn`. This is now fixed — both field names are handled.
//
//  merge() accepts an array of doc objects (from AI services) and stitches
//  them into a single doc with sequential bar numbers.
// ─────────────────────────────────────────────────────────────────────────────

function getBarNum(bar) {
  return bar.bar_number ?? bar.bn ?? 1
}

// ── Merge an array of section docs into one doc ────────────────────────────────
// sections: array of doc objects { tempo, time_signature, key, subdivisions_per_bar, bars: [...] }
// All sections are assumed to share the same tempo/key/time_sig (use first section's values).
function merge(sections) {
  if (!sections || sections.length === 0) throw new Error('stitchService.merge: no sections provided')
  if (sections.length === 1) return sections[0]

  const base = sections[0]
  const mergedBars = []
  let barOffset = 0

  for (const section of sections) {
    if (!section.bars || section.bars.length === 0) continue

    for (const bar of section.bars) {
      const rawBarNum = getBarNum(bar)
      const newBarNum = rawBarNum + barOffset
      mergedBars.push({
        bar_number: newBarNum,       // always use bar_number going forward
        notes: (bar.notes || []).map(n => ({ ...n })),
      })
    }

    // Advance offset by the number of bars in this section
    barOffset += section.bars.length
  }

  // Re-sort and fill gaps
  mergedBars.sort((a, b) => a.bar_number - b.bar_number)

  return {
    tempo:                base.tempo,
    time_signature:       base.time_signature,
    key:                  base.key,
    subdivisions_per_bar: base.subdivisions_per_bar,
    bars:                 mergedBars,
  }
}

// ── Append a new section after an existing doc ────────────────────────────────
function append(existingDoc, newSection) {
  if (!existingDoc || !existingDoc.bars) return newSection
  return merge([existingDoc, newSection])
}

// ── Trim a doc to a specific bar range ───────────────────────────────────────
function trimToRange(doc, startBar, endBar) {
  const bars = (doc.bars || []).filter(b => {
    const bn = getBarNum(b)
    return bn >= startBar && bn <= endBar
  }).map(b => ({ ...b, bar_number: getBarNum(b) - startBar + 1 }))

  return { ...doc, bars }
}

module.exports = { merge, append, trimToRange }