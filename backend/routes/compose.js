//E:\pro\midigenerator_v2\backend\routes\compose.js

'use strict'

const { Router } = require('express')
const controller  = require('../controllers/composeController')

const router = Router()

// POST /api/compose
// Body: { prompt: string, section?: number }
// Returns: { json, midiUrl, filename, key, tempo, bars, metadata }
router.post('/', controller.compose)

module.exports = router
