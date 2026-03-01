
//E:\pro\midigenerator_v2\backend\services\validationService.js

'use strict'

// ── validationService.js ──────────────────────────────────────────────────────
// Validates Gemini-generated JSON before it reaches the MIDI converter.
// The most common failure mode is wrong subdivision counts per bar.
// ─────────────────────────────────────────────────────────────────────────────

function getSubsPerBar(timeSig) {
  const [n, d] = timeSig.split('/').map(Number)
  const s = n * (16 / d)
  if (!Number.isInteger(s)) return null
  return s
}

// ── Top-level validate ────────────────────────────────────────────────────────
function validate(json) {
  const errors = []

  // 1. Required top-level fields
  if (!json || typeof json !== 'object') {
    return { ok: false, errors: ['Response is not a JSON object'] }
  }
  if (!json.tempo || typeof json.tempo !== 'number' || json.tempo < 20 || json.tempo > 300) {
    errors.push(`Invalid or missing tempo: ${json.tempo} (must be 20–300)`)
  }
  if (!json.time_signature || !json.time_signature.match(/^\d+\/\d+$/)) {
    errors.push(`Invalid or missing time_signature: "${json.time_signature}"`)
  }
  if (!json.key || typeof json.key !== 'string') {
    errors.push('Missing key')
  }
  if (!Array.isArray(json.bars) || json.bars.length === 0) {
    errors.push('Missing or empty bars array')
    return { ok: false, errors }
  }

  // 2. Per-note validation
  const subs    = getSubsPerBar(json.time_signature)
  const maxSub  = subs ? subs - 1 : 15

  for (const bar of json.bars) {
    if (typeof bar.bar_number !== 'number') {
      errors.push(`Bar missing bar_number: ${JSON.stringify(bar).slice(0, 60)}`)
      continue
    }
    if (!Array.isArray(bar.notes)) continue

    for (const note of bar.notes) {
      const loc = `Bar ${bar.bar_number}, pitch ${note.pitch}`

      // pitch format
      if (!note.pitch || !note.pitch.match(/^[A-G][#b]?-?\d+$/i)) {
        errors.push(`${loc}: invalid pitch format "${note.pitch}"`)
      }

      // start_subdivision in range
      if (typeof note.start_subdivision !== 'number'
          || note.start_subdivision < 0
          || note.start_subdivision > maxSub) {
        errors.push(`${loc}: start_subdivision ${note.start_subdivision} out of range (0–${maxSub})`)
      }

      // duration must be positive
      if (typeof note.duration_subdivisions !== 'number' || note.duration_subdivisions < 0) {
        errors.push(`${loc}: invalid duration_subdivisions ${note.duration_subdivisions}`)
      }

      // note does not extend unreasonably far beyond this bar
      if (subs) {
        const startAbs = (bar.bar_number - 1) * subs + (note.start_subdivision || 0)
        const endAbs   = startAbs + (note.duration_subdivisions || 0)
        const maxBars  = json.bars.length
        if (endAbs > maxBars * subs + subs) {
          errors.push(`${loc}: note extends beyond end of piece (endAbs=${endAbs}, maxAbs=${maxBars * subs})`)
        }
      }

      // velocity
      if (typeof note.velocity !== 'number' || note.velocity < 1 || note.velocity > 127) {
        errors.push(`${loc}: velocity ${note.velocity} out of range (1–127)`)
      }

      // offset_percent
      if (note.offset_percent !== undefined && note.offset_percent !== null) {
        if (typeof note.offset_percent !== 'number' || note.offset_percent < 0 || note.offset_percent > 100) {
          errors.push(`${loc}: offset_percent ${note.offset_percent} out of range (0–100)`)
        }
      }

      // end_cutoff_percent
      if (note.end_cutoff_percent !== undefined && note.end_cutoff_percent !== null) {
        if (typeof note.end_cutoff_percent !== 'number' || note.end_cutoff_percent < 0 || note.end_cutoff_percent > 100) {
          errors.push(`${loc}: end_cutoff_percent ${note.end_cutoff_percent} out of range (0–100)`)
        }
      }
    }
  }

  // 3. Bar number continuity — warn if gaps exist (non-fatal)
  const barNums = json.bars.map(b => b.bar_number).sort((a, b) => a - b)
  for (let i = 1; i < barNums.length; i++) {
    if (barNums[i] - barNums[i - 1] > 8) {
      errors.push(`Large gap in bar numbers: ${barNums[i - 1]} → ${barNums[i]}`)
    }
  }

  return { ok: errors.length === 0, errors }
}

// ── Summarise errors into a short string for retry prompt ─────────────────────
function summarise(errors) {
  if (!errors || errors.length === 0) return 'No errors.'
  if (errors.length <= 5) return errors.join('\n')
  return errors.slice(0, 5).join('\n') + `\n…and ${errors.length - 5} more errors`
}

module.exports = { validate, summarise }
