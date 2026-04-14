'use strict'
// backend/services/validationService.js
// Handles BOTH full field names AND compact shorthand (p/s/d/bn).
// velocity is never validated — AI doesn't output it; converter always uses 100.

function getSubsPerBar(ts) {
  if (!ts) return null
  const m = ts.match(/^(\d+)\/(\d+)$/)
  if (!m) return null
  const s = parseInt(m[1]) * (16 / parseInt(m[2]))
  return Number.isInteger(s) ? s : null
}

// ── Normalise a note — compact or full ────────────────────────────────────────
function norm(n) {
  return {
    pitch:                 n.pitch                ?? n.p,
    start_subdivision:     n.start_subdivision    ?? n.s ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 1,
    offset_percent:        n.offset_percent       ?? n.o ?? 0,
    end_cutoff_percent:    n.end_cutoff_percent   ?? n.c ?? null,
  }
}

function validate(json) {
  const errors = []

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

  const subs   = getSubsPerBar(json.time_signature)
  const maxSub = subs ? subs - 1 : 15

  for (const bar of json.bars) {
    // Accept both bar_number and bn
    const barNum = bar.bar_number ?? bar.bn
    if (typeof barNum !== 'number') {
      errors.push(`Bar missing bar_number/bn: ${JSON.stringify(bar).slice(0, 60)}`)
      continue
    }
    if (!Array.isArray(bar.notes)) continue

    for (const rawNote of bar.notes) {
      const note = norm(rawNote)
      const loc  = `Bar ${barNum}, pitch ${note.pitch}`

      if (!note.pitch || !note.pitch.match(/^[A-G][#b]?-?\d+$/i)) {
        errors.push(`${loc}: invalid pitch format "${note.pitch}"`)
      }

      if (typeof note.start_subdivision !== 'number'
          || note.start_subdivision < 0
          || note.start_subdivision > maxSub) {
        errors.push(`${loc}: start_subdivision ${note.start_subdivision} out of range (0–${maxSub})`)
      }

      if (typeof note.duration_subdivisions !== 'number' || note.duration_subdivisions < 1) {
        errors.push(`${loc}: invalid duration_subdivisions ${note.duration_subdivisions}`)
      }

      // Auto-clamp notes that extend beyond end of piece
      if (subs) {
        const startAbs = (barNum - 1) * subs + (note.start_subdivision || 0)
        const endAbs   = startAbs + (note.duration_subdivisions || 0)
        const maxAbs   = json.bars.length * subs
        if (endAbs > maxAbs) {
          rawNote.d = rawNote.duration_subdivisions = Math.max(1, maxAbs - startAbs)
        }
      }

      // velocity intentionally NOT validated — always 100, never from AI

      if (note.offset_percent !== null && note.offset_percent !== undefined) {
        if (typeof note.offset_percent !== 'number' || note.offset_percent < 0 || note.offset_percent > 100) {
          errors.push(`${loc}: offset_percent ${note.offset_percent} out of range (0–100)`)
        }
      }

      if (note.end_cutoff_percent !== null && note.end_cutoff_percent !== undefined) {
        if (typeof note.end_cutoff_percent !== 'number' || note.end_cutoff_percent < 0 || note.end_cutoff_percent > 100) {
          errors.push(`${loc}: end_cutoff_percent ${note.end_cutoff_percent} out of range (0–100)`)
        }
      }
    }
  }

  // Bar number continuity — non-fatal warning only for large gaps
  const barNums = json.bars.map(b => b.bar_number ?? b.bn).sort((a, b) => a - b)
  for (let i = 1; i < barNums.length; i++) {
    if (barNums[i] - barNums[i - 1] > 8) {
      errors.push(`Large gap in bar numbers: ${barNums[i - 1]} → ${barNums[i]}`)
    }
  }

  return { ok: errors.length === 0, errors }
}

function summarise(errors) {
  if (!errors || errors.length === 0) return 'No errors.'
  if (errors.length <= 5) return errors.join('\n')
  return errors.slice(0, 5).join('\n') + `\n…and ${errors.length - 5} more errors`
}

module.exports = { validate, summarise }
