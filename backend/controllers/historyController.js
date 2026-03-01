//E:\pro\midigenerator_v2\backend\controllers\historyController.js
'use strict'

const path     = require('path')
const fs       = require('fs')
const { getDb } = require('../db/database')

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/history
// ─────────────────────────────────────────────────────────────────────────────
function list(req, res, next) {
  try {
    const db   = getDb()
    const rows = db.prepare(`
      SELECT id, prompt, midi_path, tempo, key, bars, created_at
      FROM history
      ORDER BY created_at DESC
      LIMIT 100
    `).all()

    const items = rows.map(row => ({
      id:         row.id,
      prompt:     row.prompt,
      filename:   path.basename(row.midi_path),
      midiUrl:    `/outputs/${path.basename(row.midi_path)}`,
      tempo:      row.tempo,
      key:        row.key,
      bars:       row.bars,
      date:       formatRelative(row.created_at),
      created_at: row.created_at,
    }))

    res.json(items)
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/history/:id
// ─────────────────────────────────────────────────────────────────────────────
function getOne(req, res, next) {
  try {
    const { id } = req.params
    const db  = getDb()
    const row = db.prepare(`
      SELECT id, prompt, midi_path, json_data, tempo, key, bars, created_at
      FROM history
      WHERE id = ?
    `).get(id)

    if (!row) {
      return res.status(404).json({ error: 'Not found' })
    }

    // Verify MIDI file still exists on disk
    const midiExists = fs.existsSync(row.midi_path)

    res.json({
      id:         row.id,
      prompt:     row.prompt,
      filename:   path.basename(row.midi_path),
      midiUrl:    midiExists ? `/outputs/${path.basename(row.midi_path)}` : null,
      json_data:  row.json_data ? JSON.parse(row.json_data) : null,
      tempo:      row.tempo,
      key:        row.key,
      bars:       row.bars,
      date:       formatRelative(row.created_at),
      created_at: row.created_at,
    })
  } catch (err) {
    next(err)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRelative(isoString) {
  const d    = new Date(isoString)
  const now  = new Date()
  const diff = now - d
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 172_800_000) return 'Yesterday'
  return d.toLocaleDateString()
}

module.exports = { list, getOne }