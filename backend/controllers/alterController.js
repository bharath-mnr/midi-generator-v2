// // 'use strict'
// // // backend/controllers/alterController.js
// // // Handles compact note format (p/s/d/bn) — normalises before merge.

// // const fs   = require('fs')
// // const path = require('path')

// // function uuid() {
// //   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
// //     const r = Math.random() * 16 | 0
// //     return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
// //   })
// // }

// // const { uploadMidi, multerPromise } = require('../middleware/upload')
// // const midiToJson        = require('../services/converters/midiToJson')
// // const jsonToMidi        = require('../services/converters/jsonToMidi')
// // const geminiService     = require('../services/geminiService')
// // const claudeService     = require('../services/claudeService')
// // const validationService = require('../services/validationService')
// // const { getDb }         = require('../db/database')

// // const OUTPUTS_DIR       = process.env.OUTPUTS_DIR || './outputs'
// // const ALTER_PROMPT_PATH = path.join(__dirname, '../prompts/alter.prompt.txt')

// // // ── Normalise a single note — expand compact shorthand to full field names ──────
// // function normaliseNote(n) {
// //   return {
// //     pitch:                 n.pitch                ?? n.p,
// //     start_subdivision:     n.start_subdivision    ?? n.s ?? 0,
// //     offset_percent:        n.offset_percent       ?? n.o ?? 0,
// //     duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
// //     end_cutoff_percent:    n.end_cutoff_percent   ?? n.c ?? null,
// //     velocity:              100,   // always fixed — never from AI output
// //   }
// // }

// // // ── Normalise a bar — handles both bn and bar_number ─────────────────────────
// // function normaliseBar(b) {
// //   return {
// //     bar_number: b.bar_number ?? b.bn,
// //     notes: (b.notes ?? []).map(normaliseNote),
// //   }
// // }

// // async function alter(req, res, next) {
// //   try {
// //     await multerPromise(uploadMidi)(req, res)

// //     if (!req.file) return res.status(400).json({ error: 'No MIDI file uploaded' })
// //     const prompt = req.body?.prompt?.trim()
// //     if (!prompt)  return res.status(400).json({ error: 'prompt is required' })

// //     const isOpus    = req.body?.model === 'opus'
// //     const aiService = isOpus ? claudeService : geminiService
// //     const modelLabel = isOpus ? 'opus' : 'aria'

// //     const buffer   = fs.readFileSync(req.file.path)
// //     const original = midiToJson.convert(buffer)
// //     fs.unlink(req.file.path, () => {})

// //     if (!original.bars || original.bars.length === 0) {
// //       return res.status(400).json({ error: 'Could not parse MIDI file — no bars found' })
// //     }

// //     const tempo   = original.tempo || 120
// //     const key     = original.key   || 'C'
// //     const timeSig = original.time_signature || '4/4'
// //     const spb     = original.subdivisions_per_bar || 16
// //     const bars    = original.bars.length

// //     // Summary for the prompt — omit velocity since AI never outputs it
// //     const existingSummary = original.bars.map(bar => {
// //       const notes = (bar.notes || []).map(n =>
// //         `${n.pitch}@${n.start_subdivision}(d:${n.duration_subdivisions})`
// //       ).join(' ')
// //       return `Bar ${bar.bar_number}: ${notes || '(empty)'}`
// //     }).join('\n')

// //     const [tn] = timeSig.split('/').map(Number)
// //     const b2 = Math.floor(spb / tn), b3 = b2 * 2, b4 = b2 * 3

// //     const promptText = fs.readFileSync(ALTER_PROMPT_PATH, 'utf8')
// //       .replace(/{{TEMPO}}/g,         tempo)
// //       .replace(/{{KEY}}/g,           key)
// //       .replace(/{{TIME_SIG}}/g,      timeSig)
// //       .replace(/{{BAR_COUNT}}/g,     bars)
// //       .replace(/{{SPB}}/g,           spb)
// //       .replace(/{{SPB_MAX}}/g,       spb - 1)
// //       .replace(/{{B2}}/g,            b2)
// //       .replace(/{{B3}}/g,            b3)
// //       .replace(/{{B4}}/g,            b4)
// //       .replace('{{EXISTING_NOTES}}', existingSummary)
// //       .replace('{{USER_PROMPT}}',    prompt)

// //     const raw = await aiService.alterCompose(promptText)

// //     const validated = validationService.validate(raw)
// //     let additionsJson = raw
// //     if (!validated.ok) {
// //       const retried = await aiService.retry(prompt, [], raw, validated.errors)
// //       const rev     = validationService.validate(retried)
// //       if (!rev.ok) throw new Error(`Validation failed: ${rev.errors.join(', ')}`)
// //       additionsJson = retried
// //     }

// //     // Normalise addition bars (compact → full)
// //     const normalisedAdditionBars = (additionsJson.bars || []).map(normaliseBar)

// //     const merged = {
// //       tempo,
// //       time_signature:       timeSig,
// //       key,
// //       subdivisions_per_bar: spb,
// //       bars: original.bars.map(origBar => {
// //         const addBar   = normalisedAdditionBars.find(b => b.bar_number === origBar.bar_number)
// //         const addNotes = addBar?.notes || []
// //         // Original notes already have velocity from midiToJson; override to 100
// //         const origNotes = (origBar.notes || []).map(n => ({ ...n, velocity: 100 }))
// //         return { bar_number: origBar.bar_number, notes: [...origNotes, ...addNotes] }
// //       }),
// //     }

// //     const midiBytes  = jsonToMidi.convert(merged)
// //     const filename   = `altered_${uuid()}.mid`
// //     const filePath   = path.join(OUTPUTS_DIR, filename)
// //     fs.writeFileSync(filePath, Buffer.from(midiBytes))

// //     const db     = getDb()
// //     const result = db.prepare(`
// //       INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
// //       VALUES (?, ?, ?, ?, ?, ?)
// //     `).run(
// //       `[ALTER] ${prompt}`, filePath, JSON.stringify(merged), tempo, key, bars,
// //     )

// //     const addedNotes = normalisedAdditionBars.reduce((s, b) => s + (b.notes?.length || 0), 0)

// //     res.json({
// //       id:           result.lastInsertRowid,
// //       midiUrl:      `/outputs/${filename}`,
// //       filename,
// //       key,
// //       tempo,
// //       bars,
// //       addedNotes,
// //       model:        modelLabel,
// //       originalFile: req.file.originalname,
// //     })
// //   } catch (err) {
// //     next(err)
// //   }
// // }

// // module.exports = { alter }










// 'use strict'
// // backend/controllers/alterController.js  — FIXED
// //
// // ── BUGS FIXED ────────────────────────────────────────────────────────────────
// //
// //  BUG 1 (MAIN — caused "creates nothing"):
// //    midiToJson.convert() returns COMPACT format: bars use `bn`, notes use `p/s/d`.
// //    Old existingSummary read `n.pitch`, `n.start_subdivision`, `bar.bar_number`
// //    → all undefined → AI got "Bar undefined: undefined@undefined(d:undefined)"
// //    for every bar. AI had zero useful information about existing notes.
// //    FIX: existingSummary now uses `n.p ?? n.pitch`, `bar.bn ?? bar.bar_number` etc.
// //
// //  BUG 2 (caused "creates nothing"):
// //    Merge find: `find(b => b.bar_number === origBar.bar_number)`
// //    origBar.bar_number = undefined (because midiToJson uses `bn`).
// //    `undefined === undefined` always false → addNotes always [] → 0 notes added.
// //    FIX: merge now reads `origBar.bn ?? origBar.bar_number` on both sides.
// //
// //  BUG 3 (caused bad retry):
// //    Retry was called with `prompt` (user's short text: "add a bass line")
// //    instead of `promptText` (the full built alter prompt with all substitutions).
// //    FIX: retry now receives `promptText`.
// //
// //  BUG 4 (caused bad MIDI output):
// //    Merged bar was emitted as `{ bar_number: origBar.bar_number, ... }`
// //    = `{ bar_number: undefined, ... }`. jsonToMidi calculated NaN tick offsets.
// //    FIX: merged bar now uses `{ bn: barNum, notes: [...] }` (compact format).
// // ─────────────────────────────────────────────────────────────────────────────

// const fs   = require('fs')
// const path = require('path')

// function uuid() {
//   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
//     const r = Math.random() * 16 | 0
//     return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
//   })
// }

// const { uploadMidi, multerPromise } = require('../middleware/upload')
// const midiToJson        = require('../services/converters/midiToJson')
// const jsonToMidi        = require('../services/converters/jsonToMidi')
// const geminiService     = require('../services/geminiService')
// const claudeService     = require('../services/claudeService')
// const validationService = require('../services/validationService')
// const { getDb }         = require('../db/database')

// const OUTPUTS_DIR       = process.env.OUTPUTS_DIR || './outputs'
// const ALTER_PROMPT_PATH = path.join(__dirname, '../prompts/alter.prompt.txt')

// // ── Normalise note — handles BOTH compact (p/s/d) and full field names ─────────
// // midiToJson returns compact. AI returns compact. Both handled here.
// function normaliseNote(n) {
//   return {
//     pitch:                 n.pitch                ?? n.p,
//     start_subdivision:     n.start_subdivision    ?? n.s    ?? 0,
//     offset_percent:        n.offset_percent       ?? n.o    ?? 0,
//     duration_subdivisions: n.duration_subdivisions ?? n.d   ?? 4,
//     end_cutoff_percent:    n.end_cutoff_percent   ?? n.c    ?? null,
//     velocity:              100,
//   }
// }

// // ── Normalise bar — handles BOTH compact (bn) and full (bar_number) ───────────
// function normaliseBar(b) {
//   return {
//     bar_number: b.bar_number ?? b.bn,   // unified to bar_number internally
//     notes:      (b.notes ?? []).map(normaliseNote),
//   }
// }

// // ── Get bar number from a raw bar — handles both formats ──────────────────────
// function getBarNum(bar) {
//   return bar.bar_number ?? bar.bn
// }

// async function alter(req, res, next) {
//   try {
//     await multerPromise(uploadMidi)(req, res)

//     if (!req.file) return res.status(400).json({ error: 'No MIDI file uploaded' })
//     const prompt = req.body?.prompt?.trim()
//     if (!prompt)  return res.status(400).json({ error: 'prompt is required' })

//     const isOpus     = req.body?.model === 'opus'
//     const aiService  = isOpus ? claudeService : geminiService
//     const modelLabel = isOpus ? 'opus' : 'aria'

//     const buffer   = fs.readFileSync(req.file.path)
//     const original = midiToJson.convert(buffer)
//     fs.unlink(req.file.path, () => {})

//     if (!original.bars || original.bars.length === 0) {
//       return res.status(400).json({ error: 'Could not parse MIDI file — no bars found' })
//     }

//     const tempo   = original.tempo || 120
//     const key     = original.key   || 'C'
//     const timeSig = original.time_signature || '4/4'
//     const spb     = original.subdivisions_per_bar || 16
//     const bars    = original.bars.length

//     // ── Build existing notes summary ───────────────────────────────────────────
//     // FIX: midiToJson returns compact format (p/s/d/bn). Must use ?? fallbacks.
//     const existingSummary = original.bars.map(bar => {
//       const barNum = getBarNum(bar)   // FIX: was `bar.bar_number` → always undefined
//       const notes  = (bar.notes || []).map(n => {
//         const pitch = n.pitch ?? n.p                             // FIX: was `n.pitch` only
//         const sub   = n.start_subdivision ?? n.s ?? 0           // FIX: was `n.start_subdivision` only
//         const dur   = n.duration_subdivisions ?? n.d ?? 4       // FIX: was `n.duration_subdivisions` only
//         return `${pitch}@${sub}(d:${dur})`
//       }).join(' ')
//       return `Bar ${barNum}: ${notes || '(empty)'}`
//     }).join('\n')

//     // ── Subdivision beat positions ─────────────────────────────────────────────
//     const [tn] = timeSig.split('/').map(Number)
//     const b2 = Math.floor(spb / tn), b3 = b2 * 2, b4 = b2 * 3

//     // ── Build and fill the alter prompt ───────────────────────────────────────
//     const promptText = fs.readFileSync(ALTER_PROMPT_PATH, 'utf8')
//       .replace(/{{TEMPO}}/g,         tempo)
//       .replace(/{{KEY}}/g,           key)
//       .replace(/{{TIME_SIG}}/g,      timeSig)
//       .replace(/{{BAR_COUNT}}/g,     bars)
//       .replace(/{{SPB}}/g,           spb)
//       .replace(/{{SPB_MAX}}/g,       spb - 1)
//       .replace(/{{B2}}/g,            b2)
//       .replace(/{{B3}}/g,            b3)
//       .replace(/{{B4}}/g,            b4)
//       .replace('{{EXISTING_NOTES}}', existingSummary)
//       .replace('{{USER_PROMPT}}',    prompt)

//     // ── Generate additions ─────────────────────────────────────────────────────
//     const raw       = await aiService.alterCompose(promptText)
//     const validated = validationService.validate(raw)
//     let additionsJson = raw

//     if (!validated.ok) {
//       // FIX: was `prompt` (short user text) — must be `promptText` (full built prompt)
//       const retried = await aiService.retry(promptText, [], raw, validated.errors)
//       const rev     = validationService.validate(retried)
//       if (!rev.ok) throw new Error(`Validation failed: ${rev.errors.join(', ')}`)
//       additionsJson = retried
//     }

//     // ── Normalise addition bars to unified format ──────────────────────────────
//     const normalisedAdditionBars = (additionsJson.bars || []).map(normaliseBar)

//     // ── Merge additions into original ──────────────────────────────────────────
//     // FIX: was `origBar.bar_number` → undefined. Now uses getBarNum() for both sides.
//     // FIX: merged bar now uses `bn` (compact) so jsonToMidi gets correct bar numbers.
//     const merged = {
//       tempo,
//       time_signature:       timeSig,
//       key,
//       subdivisions_per_bar: spb,
//       bars: original.bars.map(origBar => {
//         const barNum = getBarNum(origBar)   // FIX: was `origBar.bar_number` → undefined

//         const addBar   = normalisedAdditionBars.find(b => b.bar_number === barNum)
//         const addNotes = addBar?.notes || []

//         // Keep original notes in compact format — jsonToMidi handles both formats
//         const origNotes = (origBar.notes || []).map(n => ({ ...n, velocity: 100 }))

//         return {
//           bn:    barNum,  // FIX: was `bar_number: origBar.bar_number` → undefined → NaN ticks
//           notes: [...origNotes, ...addNotes],
//         }
//       }),
//     }

//     // ── Convert to MIDI and save ───────────────────────────────────────────────
//     const midiBytes = jsonToMidi.convert(merged)
//     const filename  = `altered_${uuid()}.mid`
//     const filePath  = path.join(OUTPUTS_DIR, filename)
//     fs.writeFileSync(filePath, Buffer.from(midiBytes))

//     const db     = getDb()
//     const result = db.prepare(`
//       INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
//       VALUES (?, ?, ?, ?, ?, ?)
//     `).run(
//       `[ALTER] ${prompt}`, filePath, JSON.stringify(merged), tempo, key, bars,
//     )

//     const addedNotes = normalisedAdditionBars.reduce(
//       (s, b) => s + (b.notes?.length || 0), 0
//     )

//     res.json({
//       id:           result.lastInsertRowid,
//       midiUrl:      `/outputs/${filename}`,
//       filename,
//       key,
//       tempo,
//       bars,
//       addedNotes,
//       model:        modelLabel,
//       originalFile: req.file.originalname,
//     })
//   } catch (err) {
//     next(err)
//   }
// }

// module.exports = { alter }













'use strict'
// backend/controllers/alterController.js  v3.0
//
// ── WHAT CHANGED ──────────────────────────────────────────────────────────────
//  midiToJson  → midiToString   (uploaded MIDI → compact string doc)
//  jsonToMidi  → jsonToMidi     (still works — handles bar_number from new doc)
//  AI output   → compact string (parsed by claudeService/geminiService → doc)
//  existingSummary — reads directly from doc (bar_number, p/s/d fields)
//  Merge       — uses bar_number on both sides (no more bn ambiguity)
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs')
const path = require('path')

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const { uploadMidi, multerPromise } = require('../middleware/upload')
const midiToString      = require('../services/converters/midiToString')   // ← NEW
const jsonToMidi        = require('../services/converters/jsonToMidi')      // still handles bar_number
const geminiService     = require('../services/geminiService')
const claudeService     = require('../services/claudeService')
const validationService = require('../services/validationService')
const { getDb }         = require('../db/database')

const OUTPUTS_DIR       = process.env.OUTPUTS_DIR || './outputs'
const ALTER_PROMPT_PATH = path.join(__dirname, '../prompts/alter.prompt.txt')

async function alter(req, res, next) {
  try {
    await multerPromise(uploadMidi)(req, res)

    if (!req.file) return res.status(400).json({ error: 'No MIDI file uploaded' })
    const prompt = req.body?.prompt?.trim()
    if (!prompt)  return res.status(400).json({ error: 'prompt is required' })

    const isOpus     = req.body?.model === 'opus'
    const aiService  = isOpus ? claudeService : geminiService
    const modelLabel = isOpus ? 'opus' : 'aria'

    // ── Parse uploaded MIDI → doc (bar_number format) ──────────────────────
    const buffer          = fs.readFileSync(req.file.path)
    const { doc: original } = midiToString.convert(buffer)   // ← NEW
    fs.unlink(req.file.path, () => {})

    if (!original.bars || original.bars.length === 0) {
      return res.status(400).json({ error: 'Could not parse MIDI file — no bars found' })
    }

    const tempo   = original.tempo || 120
    const key     = original.key   || 'C'
    const timeSig = original.time_signature || '4/4'
    const spb     = original.subdivisions_per_bar || 16
    const bars    = original.bars.length

    // ── Build existing notes summary ───────────────────────────────────────
    // New doc format uses bar_number (no ambiguity) and p/s/d directly on notes
    const existingSummary = original.bars.map(bar => {
      const barNum = bar.bar_number
      const notes  = (bar.notes || []).map(n => `${n.p}@${n.s}(d:${n.d})`).join(' ')
      return `Bar ${barNum}: ${notes || '(empty)'}`
    }).join('\n')

    // ── Beat position reference ────────────────────────────────────────────
    const [tn]  = timeSig.split('/').map(Number)
    const b2 = Math.floor(spb / tn), b3 = b2 * 2, b4 = b2 * 3

    // ── Build alter prompt ─────────────────────────────────────────────────
    const promptText = fs.readFileSync(ALTER_PROMPT_PATH, 'utf8')
      .replace(/{{TEMPO}}/g,         tempo)
      .replace(/{{KEY}}/g,           key)
      .replace(/{{TIME_SIG}}/g,      timeSig)
      .replace(/{{BAR_COUNT}}/g,     bars)
      .replace(/{{SPB}}/g,           spb)
      .replace(/{{SPB_MAX}}/g,       spb - 1)
      .replace(/{{B2}}/g,            b2)
      .replace(/{{B3}}/g,            b3)
      .replace(/{{B4}}/g,            b4)
      .replace('{{EXISTING_NOTES}}', existingSummary)
      .replace('{{USER_PROMPT}}',    prompt)

    // ── Generate additions (AI returns compact string → parsed to doc) ─────
    const additionsDoc = await aiService.alterCompose(promptText)
    const validated    = validationService.validate(additionsDoc)
    let finalAdditions = additionsDoc

    if (!validated.ok) {
      const retried = await aiService.retry(promptText, [], additionsDoc, validated.errors)
      const rev     = validationService.validate(retried)
      if (!rev.ok) throw new Error(`Validation failed: ${rev.errors.join(', ')}`)
      finalAdditions = retried
    }

    // ── Merge additions into original ──────────────────────────────────────
    // Both original.bars and finalAdditions.bars use bar_number — no normalization needed
    const addBarMap = new Map(
      (finalAdditions.bars || []).map(b => [b.bar_number, b])
    )

    const merged = {
      tempo,
      time_signature:       timeSig,
      key,
      subdivisions_per_bar: spb,
      bars: original.bars.map(origBar => {
        const barNum   = origBar.bar_number
        const addBar   = addBarMap.get(barNum)
        const addNotes = (addBar?.notes || []).map(n => ({ ...n, velocity: 100 }))
        const origNotes = (origBar.notes || []).map(n => ({ ...n, velocity: 100 }))
        return {
          bar_number: barNum,
          notes: [...origNotes, ...addNotes],
        }
      }),
    }

    // ── Convert merged doc → MIDI binary ──────────────────────────────────
    const midiBytes = jsonToMidi.convert(merged)
    const filename  = `altered_${uuid()}.mid`
    const filePath  = path.join(OUTPUTS_DIR, filename)
    fs.writeFileSync(filePath, Buffer.from(midiBytes))

    // ── Persist to history ─────────────────────────────────────────────────
    const db     = getDb()
    const result = await db.prepare(`
      INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `[ALTER] ${prompt}`, filePath, JSON.stringify(merged), tempo, key, bars,
    )

    const addedNotes = (finalAdditions.bars || []).reduce(
      (s, b) => s + (b.notes?.length || 0), 0
    )

    res.json({
      id:           result.lastInsertRowid,
      midiUrl:      `/outputs/${filename}`,
      filename,
      key,
      tempo,
      bars,
      addedNotes,
      model:        modelLabel,
      originalFile: req.file.originalname,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { alter }