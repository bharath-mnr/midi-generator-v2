'use strict'
// backend/controllers/alterController.js
// Handles compact note format (p/s/d/bn) — normalises before merge.

const fs   = require('fs')
const path = require('path')

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const { uploadMidi, multerPromise } = require('../middleware/upload')
const midiToJson        = require('../services/converters/midiToJson')
const jsonToMidi        = require('../services/converters/jsonToMidi')
const geminiService     = require('../services/geminiService')
const claudeService     = require('../services/claudeService')
const validationService = require('../services/validationService')
const { getDb }         = require('../db/database')

const OUTPUTS_DIR       = process.env.OUTPUTS_DIR || './outputs'
const ALTER_PROMPT_PATH = path.join(__dirname, '../prompts/alter.prompt.txt')

// ── Normalise a single note — expand compact shorthand to full field names ──────
function normaliseNote(n) {
  return {
    pitch:                 n.pitch                ?? n.p,
    start_subdivision:     n.start_subdivision    ?? n.s ?? 0,
    offset_percent:        n.offset_percent       ?? n.o ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
    end_cutoff_percent:    n.end_cutoff_percent   ?? n.c ?? null,
    velocity:              100,   // always fixed — never from AI output
  }
}

// ── Normalise a bar — handles both bn and bar_number ─────────────────────────
function normaliseBar(b) {
  return {
    bar_number: b.bar_number ?? b.bn,
    notes: (b.notes ?? []).map(normaliseNote),
  }
}

async function alter(req, res, next) {
  try {
    await multerPromise(uploadMidi)(req, res)

    if (!req.file) return res.status(400).json({ error: 'No MIDI file uploaded' })
    const prompt = req.body?.prompt?.trim()
    if (!prompt)  return res.status(400).json({ error: 'prompt is required' })

    const isOpus    = req.body?.model === 'opus'
    const aiService = isOpus ? claudeService : geminiService
    const modelLabel = isOpus ? 'opus' : 'aria'

    const buffer   = fs.readFileSync(req.file.path)
    const original = midiToJson.convert(buffer)
    fs.unlink(req.file.path, () => {})

    if (!original.bars || original.bars.length === 0) {
      return res.status(400).json({ error: 'Could not parse MIDI file — no bars found' })
    }

    const tempo   = original.tempo || 120
    const key     = original.key   || 'C'
    const timeSig = original.time_signature || '4/4'
    const spb     = original.subdivisions_per_bar || 16
    const bars    = original.bars.length

    // Summary for the prompt — omit velocity since AI never outputs it
    const existingSummary = original.bars.map(bar => {
      const notes = (bar.notes || []).map(n =>
        `${n.pitch}@${n.start_subdivision}(d:${n.duration_subdivisions})`
      ).join(' ')
      return `Bar ${bar.bar_number}: ${notes || '(empty)'}`
    }).join('\n')

    const [tn] = timeSig.split('/').map(Number)
    const b2 = Math.floor(spb / tn), b3 = b2 * 2, b4 = b2 * 3

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

    const raw = await aiService.alterCompose(promptText)

    const validated = validationService.validate(raw)
    let additionsJson = raw
    if (!validated.ok) {
      const retried = await aiService.retry(prompt, [], raw, validated.errors)
      const rev     = validationService.validate(retried)
      if (!rev.ok) throw new Error(`Validation failed: ${rev.errors.join(', ')}`)
      additionsJson = retried
    }

    // Normalise addition bars (compact → full)
    const normalisedAdditionBars = (additionsJson.bars || []).map(normaliseBar)

    const merged = {
      tempo,
      time_signature:       timeSig,
      key,
      subdivisions_per_bar: spb,
      bars: original.bars.map(origBar => {
        const addBar   = normalisedAdditionBars.find(b => b.bar_number === origBar.bar_number)
        const addNotes = addBar?.notes || []
        // Original notes already have velocity from midiToJson; override to 100
        const origNotes = (origBar.notes || []).map(n => ({ ...n, velocity: 100 }))
        return { bar_number: origBar.bar_number, notes: [...origNotes, ...addNotes] }
      }),
    }

    const midiBytes  = jsonToMidi.convert(merged)
    const filename   = `altered_${uuid()}.mid`
    const filePath   = path.join(OUTPUTS_DIR, filename)
    fs.writeFileSync(filePath, Buffer.from(midiBytes))

    const db     = getDb()
    const result = db.prepare(`
      INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `[ALTER] ${prompt}`, filePath, JSON.stringify(merged), tempo, key, bars,
    )

    const addedNotes = normalisedAdditionBars.reduce((s, b) => s + (b.notes?.length || 0), 0)

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
