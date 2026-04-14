// ═══════════════════════════════════════════════════════════════════
// MIDI ANALYZER — BACKEND SERVER  v1.1
// Express.js · Port 3002 (separate from main MidiGen backend on 3001)
//
// Endpoints:
//   POST /api/analyze          — full analysis
//   POST /api/analyze/patterns — patterns only (lightweight)
//   POST /api/analyze/yaml     — YAML blueprint only
//   GET  /api/health           — health check
//
// FIX v1.1:
//   - Engine's buildGraph now returns adjacency as a plain object
//     (not a Map), so JSON.stringify works without the sanitizer.
//   - sanitizeForJson still present as a safety net but no longer
//     needs to handle Maps in normal output.
//   - adjacency key is no longer skipped — it's safe to serialize.
// ═══════════════════════════════════════════════════════════════════

'use strict';

const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const engine     = require('./engines/musicAnalyzerEngine');

const app  = express();
const PORT = process.env.ANALYZER_PORT || 3002;

// ─── MIDDLEWARE ──────────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// ─── HEALTH CHECK ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', engine: 'MusicAnalyzerEngine v1.1', port: PORT });
});

// ─── FULL ANALYSIS ───────────────────────────────────────────────
// Body: { json: <MIDI_JSON>, splitMidi?: <number> }
app.post('/api/analyze', (req, res) => {
  try {
    const { json: inputJson, splitMidi } = req.body;
    if (!inputJson) return res.status(400).json({ error: 'Missing json field in request body' });

    const parsed = typeof inputJson === 'string' ? JSON.parse(inputJson) : inputJson;
    const result = engine.analyze(parsed, { splitMidi });

    // adjacency is now a plain object — no Map serialization issue.
    // sanitizeForJson is kept as a safety net only.
    res.json({ success: true, data: sanitize(result) });

  } catch (err) {
    console.error('[/api/analyze]', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// ─── PATTERNS ONLY ───────────────────────────────────────────────
app.post('/api/analyze/patterns', (req, res) => {
  try {
    const { json: inputJson, splitMidi } = req.body;
    if (!inputJson) return res.status(400).json({ error: 'Missing json field' });

    const parsed     = typeof inputJson === 'string' ? JSON.parse(inputJson) : inputJson;
    const normalized = engine.normalizeJson(parsed);
    const { rhBars } = engine.separateHands(normalized.bars, splitMidi);
    const nonEmpty   = rhBars.filter(b => b.notes.length > 0);
    const patterns   = engine.detectPatterns(nonEmpty, normalized.subdivisions_per_bar);

    res.json({ success: true, patterns: sanitize(patterns) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── YAML ONLY ───────────────────────────────────────────────────
app.post('/api/analyze/yaml', (req, res) => {
  try {
    const { json: inputJson, splitMidi } = req.body;
    if (!inputJson) return res.status(400).json({ error: 'Missing json field' });

    const parsed = typeof inputJson === 'string' ? JSON.parse(inputJson) : inputJson;
    const result = engine.analyze(parsed, { splitMidi });

    res.json({ success: true, yaml: result.yamlBlueprint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SANITIZER ───────────────────────────────────────────────────
// Safety net: converts any stray Maps/Sets to plain objects/arrays.
// The engine should no longer produce Maps in output, but this
// guards against future regressions.
function sanitize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (obj instanceof Map) {
    const plain = {};
    for (const [k, v] of obj) plain[String(k)] = sanitize(v);
    return plain;
  }
  if (obj instanceof Set) return [...obj].map(sanitize);
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = sanitize(v);
  return out;
}

// ─── START ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎼  MIDI Analyzer Backend v1.1 on http://localhost:${PORT}`);
  console.log(`  POST /api/analyze        — full analysis`);
  console.log(`  POST /api/analyze/yaml   — YAML blueprint only`);
  console.log(`  POST /api/analyze/patterns — patterns only`);
  console.log(`  GET  /api/health         — health check\n`);
});

module.exports = app;
