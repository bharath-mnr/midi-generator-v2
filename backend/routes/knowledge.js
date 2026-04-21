
'use strict'
// backend/routes/knowledge.js
// Pinecone-only. syncPinecone route removed.

const express = require('express')
const router  = express.Router()
const ctrl    = require('../controllers/knowledgeController')

router.get('/',              ctrl.list)
router.get('/stats',         ctrl.stats)          // NEW — Pinecone vector count
router.delete('/all',        ctrl.removeAll)
router.delete('/by-name/:name', ctrl.removeByName)
router.delete('/:id',        ctrl.remove)

module.exports = router