'use strict'
// backend/routes/analyze.js
//
// Analyzer endpoints — now lives inside the main backend (port 3001).
// Previously ran as a separate server on port 3002.
//
// Endpoints (all under /api/analyze):
//   POST /api/analyze          — full analysis
//   POST /api/analyze/patterns — patterns only (lightweight)
//   POST /api/analyze/yaml     — YAML blueprint only
//
// Body for all three: { json: <MIDI_JSON_object_or_string>, splitMidi?: <number> }

const express = require('express')
const router  = express.Router()
const engine  = require('../engines/musicAnalyzerEngine')

// ─── SANITIZER ─────────────────────────────────────────────────────
// Safety net: converts any stray Maps/Sets to plain objects/arrays.
function sanitize(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitize)
  if (obj instanceof Map) {
    const plain = {}
    for (const [k, v] of obj) plain[String(k)] = sanitize(v)
    return plain
  }
  if (obj instanceof Set) return [...obj].map(sanitize)
  const out = {}
  for (const [k, v] of Object.entries(obj)) out[k] = sanitize(v)
  return out
}

// ─── FULL ANALYSIS ─────────────────────────────────────────────────
// Body: { json: <MIDI_JSON>, splitMidi?: <number> }
router.post('/', (req, res, next) => {
  try {
    const { json: inputJson, splitMidi } = req.body
    if (!inputJson) return res.status(400).json({ error: 'Missing json field in request body' })

    const parsed = typeof inputJson === 'string' ? JSON.parse(inputJson) : inputJson
    const result = engine.analyze(parsed, { splitMidi })

    res.json({ success: true, data: sanitize(result) })
  } catch (err) {
    next(err)
  }
})

// ─── PATTERNS ONLY ─────────────────────────────────────────────────
router.post('/patterns', (req, res, next) => {
  try {
    const { json: inputJson, splitMidi } = req.body
    if (!inputJson) return res.status(400).json({ error: 'Missing json field' })

    const parsed     = typeof inputJson === 'string' ? JSON.parse(inputJson) : inputJson
    const normalized = engine.normalizeJson(parsed)
    const { rhBars } = engine.separateHands(normalized.bars, splitMidi)
    const nonEmpty   = rhBars.filter(b => b.notes.length > 0)

    const { patterns, phrases, cadencePairs } =
      engine.detectPatternsHierarchical(nonEmpty, normalized.subdivisions_per_bar)

    res.json({ success: true, patterns: sanitize(patterns), cadencePairs: sanitize(cadencePairs) })
  } catch (err) {
    next(err)
  }
})

// ─── YAML ONLY ─────────────────────────────────────────────────────
router.post('/yaml', (req, res, next) => {
  try {
    const { json: inputJson, splitMidi } = req.body
    if (!inputJson) return res.status(400).json({ error: 'Missing json field' })

    const parsed = typeof inputJson === 'string' ? JSON.parse(inputJson) : inputJson
    const result = engine.analyze(parsed, { splitMidi })

    res.json({ success: true, yaml: result.yamlBlueprint })
  } catch (err) {
    next(err)
  }
})

module.exports = router