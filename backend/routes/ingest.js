//E:\pro\midigenerator_v2\backend\routes\ingest.js

'use strict'

const { Router } = require('express')
const controller  = require('../controllers/ingestController')

const router = Router()

// POST /api/ingest/midi
// multipart/form-data: file (.mid/.midi)
// Returns: { success, id, name, chunks, key, tempo }
router.post('/midi', controller.ingestMidi)

// POST /api/ingest/doc
// multipart/form-data: file (.pdf/.txt/.md)
// Returns: { success, id, name, chunks }
router.post('/doc', controller.ingestDoc)

module.exports = router
