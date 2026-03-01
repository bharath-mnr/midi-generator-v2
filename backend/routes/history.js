//E:\pro\midigenerator_v2\backend\routes\history.js

'use strict'

const { Router } = require('express')
const controller  = require('../controllers/historyController')

const router = Router()

// GET /api/history
// Returns: [{ id, prompt, filename, midiUrl, key, tempo, bars, created_at }]
router.get('/', controller.list)

// GET /api/history/:id
// Returns: { id, prompt, filename, midiUrl, json_data, key, tempo, bars, created_at }
router.get('/:id', controller.getOne)

module.exports = router
