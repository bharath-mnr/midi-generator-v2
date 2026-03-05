//E:\pro\midigenerator_v2\backend\controllers\alterController.js
'use strict'

const fs   = require('fs')
const path = require('path')

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const { uploadMidi, multerPromise } = require('../middleware/upload')
const midiToJson      = require('../services/converters/midiToJson')
const jsonToMidi      = require('../services/converters/jsonToMidi')
const geminiService   = require('../services/geminiService')
const validationService = require('../services/validationService')
const { getDb }       = require('../db/database')

const OUTPUTS_DIR      = process.env.OUTPUTS_DIR || './outputs'
const ALTER_PROMPT_PATH = path.join(__dirname, '../prompts/alter.prompt.txt')

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/alter
// multipart: file (.mid) + body.prompt (string)
// ─────────────────────────────────────────────────────────────────────────────
async function alter(req, res, next) {
  try {
    // 1. Receive file
    await multerPromise(uploadMidi)(req, res)

    if (!req.file) return res.status(400).json({ error: 'No MIDI file uploaded' })
    const prompt = req.body?.prompt?.trim()
    if (!prompt)  return res.status(400).json({ error: 'prompt is required' })

    // 2. Parse uploaded MIDI → generation JSON
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

    // 3. Build compact existing-notes summary for the prompt
    const existingSummary = original.bars.map(bar => {
      const notes = (bar.notes || []).map(n =>
        `${n.pitch}@${n.start_subdivision}(dur:${n.duration_subdivisions},vel:${n.velocity})`
      ).join(' ')
      return `Bar ${bar.bar_number}: ${notes || '(empty)'}`
    }).join('\n')

    // 4. Build prompt
    const [tn] = timeSig.split('/').map(Number)
    const b2 = Math.floor(spb / tn), b3 = b2 * 2, b4 = b2 * 3

    const promptText = fs.readFileSync(ALTER_PROMPT_PATH, 'utf8')
      .replace(/{{TEMPO}}/g,          tempo)
      .replace(/{{KEY}}/g,            key)
      .replace(/{{TIME_SIG}}/g,       timeSig)
      .replace(/{{BAR_COUNT}}/g,      bars)
      .replace(/{{SPB}}/g,            spb)
      .replace(/{{SPB_MAX}}/g,        spb - 1)
      .replace(/{{B2}}/g,             b2)
      .replace(/{{B3}}/g,             b3)
      .replace(/{{B4}}/g,             b4)
      .replace('{{EXISTING_NOTES}}',  existingSummary)
      .replace('{{USER_PROMPT}}',     prompt)

    // 5. Call Gemini with alter prompt
    const raw = await geminiService.alterCompose(promptText)

    // 6. Validate additions JSON
    const validated = validationService.validate(raw)
    let additionsJson = raw
    if (!validated.ok) {
      const retried = await geminiService.retry(prompt, [], raw, validated.errors)
      const rev = validationService.validate(retried)
      if (!rev.ok) throw new Error(`Validation failed: ${rev.errors.join(', ')}`)
      additionsJson = retried
    }

    // 7. Merge: combine original notes + new notes bar by bar
    const merged = {
      tempo,
      time_signature: timeSig,
      key,
      subdivisions_per_bar: spb,
      bars: original.bars.map(origBar => {
        const addBar = (additionsJson.bars || []).find(b => b.bar_number === origBar.bar_number)
        const addNotes = addBar?.notes || []
        return {
          bar_number: origBar.bar_number,
          notes: [...(origBar.notes || []), ...addNotes],
        }
      }),
    }

    // 8. Convert merged JSON → MIDI bytes
    const midiBytes = jsonToMidi.convert(merged)

    // 9. Save file
    const filename = `altered_${uuid()}.mid`
    const filePath = path.join(OUTPUTS_DIR, filename)
    fs.writeFileSync(filePath, Buffer.from(midiBytes))

    // 10. Save to history
    const db = getDb()
    const result = db.prepare(`
      INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `[ALTER] ${prompt}`,
      filePath,
      JSON.stringify(merged),
      tempo,
      key,
      bars,
    )

    const addedNotes = (additionsJson.bars || []).reduce((s, b) => s + (b.notes?.length || 0), 0)

    res.json({
      id:          result.lastInsertRowid,
      midiUrl:     `/outputs/${filename}`,
      filename,
      key,
      tempo,
      bars,
      addedNotes,
      originalFile: req.file.originalname,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { alter }